/**
 * Componente Sidebar
 * Gerencia a barra lateral com lista de chats e GPTs
 */
export class SidebarComponent {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      storageKey: 'chatSidebarHidden',
      breakpoint: 768,
      ...options
    };
    
    this.isHidden = false;
    this.isMobile = false;
    this.observers = [];
    
    this.init();
  }

  /**
   * Inicializa o componente
   */
  init() {
    this.setupElements();
    this.setupEventListeners();
    this.loadInitialState();
    this.updateUI();
  }

  /**
   * Configura elementos DOM
   */
  setupElements() {
    this.sidebar = this.container.querySelector('#chat-sidebar');
    this.toggleBtn = this.container.querySelector('#toggle-sidebar');
    this.miniSidebar = this.container.querySelector('#sidebar-mini');
    this.chatList = this.container.querySelector('#chat-list');
    this.gptList = this.container.querySelector('#ai-providers-list');
    this.searchInput = this.container.querySelector('#chat-search');
    this.newChatBtn = this.container.querySelector('#new-chat');
    this.newConversationBtn = this.container.querySelector('#new-conversation');
    this.userMenuBtn = this.container.querySelector('#userMenuBtn');
    this.userMenu = this.container.querySelector('#userMenu');
    this.logoutBtn = this.container.querySelector('#logout-btn');
  }

  /**
   * Configura event listeners
   */
  setupEventListeners() {
    // Toggle sidebar
    if (this.toggleBtn) {
      this.toggleBtn.addEventListener('click', () => this.toggle());
    }

    // Mini sidebar toggle
    const miniToggle = this.container.querySelector('#mini-toggle');
    if (miniToggle) {
      miniToggle.addEventListener('click', () => this.toggle());
    }

    // New chat buttons
    if (this.newChatBtn) {
      this.newChatBtn.addEventListener('click', () => this.onNewChat());
    }

    if (this.newConversationBtn) {
      this.newConversationBtn.addEventListener('click', () => this.onNewConversation());
    }

    // User menu
    if (this.userMenuBtn) {
      this.userMenuBtn.addEventListener('click', () => this.toggleUserMenu());
    }

    // Logout
    if (this.logoutBtn) {
      this.logoutBtn.addEventListener('click', () => this.onLogout());
    }

    // Window resize
    window.addEventListener('resize', () => this.handleResize());

    // Click outside to close user menu
    document.addEventListener('click', (e) => {
      if (!this.userMenuBtn?.contains(e.target) && !this.userMenu?.contains(e.target)) {
        this.closeUserMenu();
      }
    });
  }

  /**
   * Carrega estado inicial
   */
  loadInitialState() {
    this.isMobile = window.innerWidth <= this.options.breakpoint;
    
    if (this.isMobile) {
      this.isHidden = true;
    } else {
      const savedState = localStorage.getItem(this.options.storageKey);
      this.isHidden = savedState === 'true';
    }
  }

  /**
   * Atualiza UI baseado no estado
   */
  updateUI() {
    if (this.sidebar) {
      this.sidebar.classList.toggle('hidden', this.isHidden);
    }

    if (this.miniSidebar) {
      this.miniSidebar.classList.toggle('hidden', !this.isHidden);
    }

    if (this.toggleBtn) {
      const icon = this.toggleBtn.querySelector('i');
      if (icon) {
        icon.className = this.isHidden ? 'bi bi-chevron-right' : 'bi bi-chevron-left';
      }
    }

    document.body.classList.toggle('with-mini-sidebar', this.isHidden);
  }

  /**
   * Alterna visibilidade do sidebar
   */
  toggle() {
    this.isHidden = !this.isHidden;
    localStorage.setItem(this.options.storageKey, this.isHidden.toString());
    this.updateUI();
    this.notifyObservers('toggle', { isHidden: this.isHidden });
  }

  /**
   * Mostra o sidebar
   */
  show() {
    if (this.isHidden) {
      this.toggle();
    }
  }

  /**
   * Esconde o sidebar
   */
  hide() {
    if (!this.isHidden) {
      this.toggle();
    }
  }

  /**
   * Lida com redimensionamento da janela
   */
  handleResize() {
    const wasMobile = this.isMobile;
    this.isMobile = window.innerWidth <= this.options.breakpoint;

    if (this.isMobile && !wasMobile) {
      // Mudou para mobile
      this.isHidden = true;
      localStorage.setItem(this.options.storageKey, 'true');
    } else if (!this.isMobile && wasMobile) {
      // Mudou para desktop
      this.isHidden = false;
      localStorage.setItem(this.options.storageKey, 'false');
    }

    this.updateUI();
  }

  /**
   * Renderiza lista de chats
   * @param {Array} chats - Lista de chats
   */
  renderChats(chats) {
    if (!this.chatList) return;

    if (chats.length === 0) {
      this.chatList.innerHTML = '<li class="px-3 py-2 text-muted">Nenhum chat encontrado</li>';
      return;
    }

    this.chatList.innerHTML = chats.map(chat => `
      <li data-session-id="${chat.id}" data-gpt-key="${chat.fk_gpt_id || chat.gpt_id || chat.gptId}">
        <i class="bi bi-chat-dots me-2"></i>
        <span>${chat.name || chat.id}</span>
        <button class="btn btn-sm btn-outline-secondary ms-auto chat-options-btn" data-chat-id="${chat.id}">
          <i class="bi bi-gear" aria-hidden="true"></i>
        </button>
      </li>
    `).join('');

    // Adiciona event listeners aos itens de chat
    this.chatList.querySelectorAll('li').forEach(item => {
      item.addEventListener('click', (e) => {
        if (!e.target.closest('.chat-options-btn')) {
          this.onChatSelect(item);
        }
      });

      // Event listener específico para o botão da engrenagem
      const optionsBtn = item.querySelector('.chat-options-btn');
      if (optionsBtn) {
        optionsBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          // Aqui você pode adicionar a lógica para abrir o menu de opções
          console.log('Botão de opções clicado para o chat:', item.dataset.sessionId);
        });
      }
    });
  }

  /**
   * Renderiza lista de GPTs
   * @param {Array} gpts - Lista de GPTs
   */
  renderGpts(gpts) {
    if (!this.gptList) return;

    if (gpts.length === 0) {
      this.gptList.innerHTML = '<li class="px-3 py-2 text-muted">Nenhum GPT encontrado</li>';
      return;
    }

    this.gptList.innerHTML = gpts.map(gpt => {
      const isVideo = gpt.imageUrl?.toLowerCase().endsWith('.mp4');
      const mediaElem = isVideo
        ? `<video src="${gpt.imageUrl}" class="provider-icon" autoplay loop muted playsinline></video>`
        : `<img src="${gpt.imageUrl}" class="provider-icon" alt="${gpt.name} icon"/>`;

      return `
        <li id="${gpt.id}" tabindex="0">
          <div class="d-flex align-items-center">
            ${mediaElem}
            <span class="ms-2">${gpt.name}</span>
          </div>
          <span class="badge small bg-light text-dark">${gpt.category || 'Sem categoria'}</span>
        </li>
      `;
    }).join('');

    // Adiciona event listeners aos itens de GPT
    this.gptList.querySelectorAll('li').forEach(item => {
      item.addEventListener('click', () => {
        this.onGptSelect(item);
      });
    });
  }

  /**
   * Atualiza contadores de mensagens
   * @param {Object} messageCounts - Contadores por chat
   */
  updateMessageCounts(messageCounts) {
    this.chatList?.querySelectorAll('li').forEach(item => {
      const sessionId = item.dataset.sessionId;
      const badge = item.querySelector('.badge');
      
      if (badge && messageCounts[sessionId]) {
        badge.textContent = messageCounts[sessionId];
      }
    });
  }

  /**
   * Marca chat como selecionado
   * @param {HTMLElement} chatElement - Elemento do chat
   */
  selectChat(chatElement) {
    // Remove seleção anterior
    this.chatList?.querySelectorAll('li').forEach(item => {
      item.classList.remove('selected');
    });

    // Adiciona seleção ao chat atual
    chatElement.classList.add('selected');
  }

  /**
   * Alterna menu do usuário
   */
  toggleUserMenu() {
    if (this.userMenu) {
      this.userMenu.classList.toggle('hidden');
      const sidebarBottom = this.container.querySelector('.sidebar-bottom');
      if (sidebarBottom) {
        sidebarBottom.classList.toggle('open');
      }
    }
  }

  /**
   * Fecha menu do usuário
   */
  closeUserMenu() {
    if (this.userMenu) {
      this.userMenu.classList.add('hidden');
      const sidebarBottom = this.container.querySelector('.sidebar-bottom');
      if (sidebarBottom) {
        sidebarBottom.classList.remove('open');
      }
    }
  }

  /**
   * Handlers de eventos
   */
  onNewChat() {
    this.notifyObservers('newChat');
  }

  onNewConversation() {
    const selectedChat = this.chatList?.querySelector('li.selected');
    if (selectedChat) {
      const gptKey = selectedChat.dataset.gptKey;
      this.notifyObservers('newConversation', { gptKey });
    }
  }

  onChatSelect(chatElement) {
    this.selectChat(chatElement);
    const sessionId = chatElement.dataset.sessionId;
    const gptKey = chatElement.dataset.gptKey;
    this.notifyObservers('chatSelect', { sessionId, gptKey });
  }

  onGptSelect(gptElement) {
    const gptId = gptElement.id;
    this.notifyObservers('gptSelect', { gptId });
  }

  onLogout() {
    this.notifyObservers('logout');
  }

  /**
   * Sistema de observadores
   */
  addObserver(callback) {
    this.observers.push(callback);
  }

  removeObserver(callback) {
    const index = this.observers.indexOf(callback);
    if (index > -1) {
      this.observers.splice(index, 1);
    }
  }

  notifyObservers(event, data = {}) {
    this.observers.forEach(callback => callback(event, data));
  }
} 