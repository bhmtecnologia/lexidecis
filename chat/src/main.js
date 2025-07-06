/**
 * Aplicação Principal do Chat LexiDecis
 * 
 * Este arquivo integra todos os módulos e gerencia o estado global da aplicação
 */

// Importações dos serviços
import AuthService from '../assets/js/auth.js';
import { ApiBaseService } from './services/api.base.service.js';
import { GptService } from './services/gpt.service.js';
import { ChatService } from './services/chat.service.js';

// Importações dos componentes
import { SidebarComponent } from './components/sidebar.component.js';

// Importações das configurações
import { FLOWISE_CONFIG } from './config/api.config.js';

/**
 * Classe principal da aplicação
 */
class ChatApplication {
  constructor() {
    this.authService = null;
    this.apiService = null;
    this.gptService = null;
    this.chatService = null;
    this.sidebarComponent = null;
    
    this.state = {
      gpts: [],
      gptMap: {},
      chats: [],
      configCache: {},
      currentChat: null,
      currentGpt: null,
      isLoading: false
    };
    
    this.init();
  }

  /**
   * Inicializa a aplicação
   */
  async init() {
    try {
      console.log('Inicializando aplicação...');
      
      // Aguarda autenticação
      await this.waitForAuth();
      
      // Inicializa serviços
      this.initServices();
      
      // Inicializa componentes
      this.initComponents();
      
      // Configura Flowise
      this.setupFlowise();
      
      // Carrega dados iniciais
      await this.loadInitialData();
      
      console.log('Aplicação inicializada com sucesso!');
    } catch (error) {
      console.error('Erro ao inicializar aplicação:', error);
      this.showError('Erro ao inicializar aplicação');
    }
  }

  /**
   * Aguarda autenticação do usuário
   */
  async waitForAuth() {
    return new Promise((resolve) => {
      const checkAuth = () => {
        if (AuthService.user) {
          this.authService = AuthService;
          resolve();
        } else {
          setTimeout(checkAuth, 100);
        }
      };
      checkAuth();
    });
  }

  /**
   * Inicializa os serviços
   */
  initServices() {
    this.apiService = new ApiBaseService(this.authService);
    this.gptService = new GptService(this.authService);
    this.chatService = new ChatService(this.authService);
  }

  /**
   * Inicializa os componentes
   */
  initComponents() {
    const wrapper = document.getElementById('wrapper');
    if (wrapper) {
      this.sidebarComponent = new SidebarComponent(wrapper);
      this.sidebarComponent.addObserver((event, data) => this.handleSidebarEvent(event, data));
    }
  }

  /**
   * Configura o Flowise
   */
  setupFlowise() {
    // Intercepta requisições para adicionar cabeçalhos
    this.setupFetchInterceptor();
    
    // Configura o Flowise global
    window.flowiseConfig = FLOWISE_CONFIG;
  }

  /**
   * Configura interceptador de fetch para adicionar cabeçalhos
   */
  setupFetchInterceptor() {
    const originalFetch = window.fetch;
    
    window.fetch = async (resource, init = {}) => {
      const headers = new Headers(init.headers || {});
      
      if (this.authService?.user) {
        headers.set('x-user-email', this.authService.user.email);
        headers.set('x-user-uuid', this.authService.user.uid);
        
        // Adiciona JWT se disponível
        let jwt = this.authService.token;
        if (!jwt && typeof this.authService.user.getIdToken === 'function') {
          jwt = await this.authService.user.getIdToken();
        }
        
        if (jwt) {
          headers.set('x-user-jwt', jwt);
          if (!headers.has('Authorization')) {
            headers.set('Authorization', `Bearer ${jwt}`);
          }
        }
        
        // Adiciona GPT ID se disponível
        if (this.state.currentGpt) {
          headers.set('x-gpt-id', this.state.currentGpt.id);
        }
      }
      
      return originalFetch(resource, { ...init, headers });
    };
  }

  /**
   * Carrega dados iniciais
   */
  async loadInitialData() {
    this.setLoading(true);
    
    try {
      // Carrega GPTs
      await this.loadGpts();
      
      // Carrega chats
      await this.loadChats();
      
      // Verifica se há chat ID na URL
      this.checkUrlForChatId();
      
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error);
      this.showError('Erro ao carregar dados');
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Carrega lista de GPTs
   */
  async loadGpts() {
    try {
      const gpts = await this.gptService.listGpts();
      this.state.gpts = gpts;
      this.state.gptMap = this.gptService.createGptMap(gpts);
      
      // Renderiza GPTs no sidebar
      this.sidebarComponent?.renderGpts(gpts);
      
      console.log(`${gpts.length} GPTs carregados`);
    } catch (error) {
      console.error('Erro ao carregar GPTs:', error);
      throw error;
    }
  }

  /**
   * Carrega lista de chats
   */
  async loadChats() {
    try {
      const chats = await this.chatService.listChats();
      this.state.chats = chats;
      
      // Renderiza chats no sidebar
      this.sidebarComponent?.renderChats(chats);
      
      console.log(`${chats.length} chats carregados`);
      
      // Carrega contadores de mensagens
      await this.loadMessageCounts();
      
    } catch (error) {
      console.error('Erro ao carregar chats:', error);
      throw error;
    }
  }

  /**
   * Carrega contadores de mensagens para cada chat
   */
  async loadMessageCounts() {
    const messageCounts = {};
    
    for (const chat of this.state.chats) {
      try {
        const gptKey = chat.fk_gpt_id || chat.gpt_id || chat.gptId;
        const gpt = this.state.gptMap[gptKey];
        
        if (gpt?.flowiseConfig?.flowise) {
          const apiHost = gpt.flowiseConfig.flowise.apiHost || window.location.origin;
          const history = await this.chatService.fetchChatHistory(
            chat.id,
            gpt.flowiseConfig.flowise.chatflowId,
            apiHost.replace(/\/$/, ''),
            gpt.flowiseConfig.flowise.token
          );
          
          messageCounts[chat.id] = history.length;
        }
      } catch (error) {
        console.debug(`Erro ao carregar contador para chat ${chat.id}:`, error);
        messageCounts[chat.id] = 0;
      }
    }
    
    this.sidebarComponent?.updateMessageCounts(messageCounts);
  }

  /**
   * Verifica se há chat ID na URL
   */
  checkUrlForChatId() {
    const urlParams = new URLSearchParams(window.location.search);
    const chatId = urlParams.get('chatId');
    
    if (chatId) {
      const chat = this.state.chats.find(c => c.id === chatId);
      if (chat) {
        this.loadChat(chat);
      }
    }
  }

  /**
   * Lida com eventos do sidebar
   */
  handleSidebarEvent(event, data) {
    switch (event) {
      case 'gptSelect':
        this.loadGpt(data.gptId);
        break;
      case 'chatSelect':
        this.loadChatById(data.sessionId);
        break;
      case 'newChat':
        this.createNewChat();
        break;
      case 'newConversation':
        this.createNewConversation(data.gptKey);
        break;
      case 'logout':
        this.logout();
        break;
    }
  }

  /**
   * Carrega um GPT específico
   */
  async loadGpt(gptId) {
    try {
      this.setLoading(true);
      
      const gpt = this.state.gptMap[gptId];
      if (!gpt) {
        throw new Error(`GPT ${gptId} não encontrado`);
      }
      
      // Carrega configuração se não estiver em cache
      if (!this.state.configCache[gptId]) {
        this.state.configCache[gptId] = await this.gptService.getGptConfig(gptId);
      }
      
      this.state.currentGpt = gpt;
      
      // Inicializa chat com novo GPT
      await this.initializeChat(gpt);
      
    } catch (error) {
      console.error('Erro ao carregar GPT:', error);
      this.showError('Erro ao carregar GPT');
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Carrega um chat específico
   */
  async loadChatById(sessionId) {
    const chat = this.state.chats.find(c => c.id === sessionId);
    if (chat) {
      await this.loadChat(chat);
    }
  }

  /**
   * Carrega um chat
   */
  async loadChat(chat) {
    try {
      this.setLoading(true);
      
      const gptKey = chat.fk_gpt_id || chat.gpt_id || chat.gptId;
      const gpt = this.state.gptMap[gptKey];
      
      if (!gpt) {
        throw new Error(`GPT ${gptKey} não encontrado para o chat ${chat.id}`);
      }
      
      // Carrega configuração se não estiver em cache
      if (!this.state.configCache[gptKey]) {
        this.state.configCache[gptKey] = await this.gptService.getGptConfig(gptKey);
      }
      
      this.state.currentChat = chat;
      this.state.currentGpt = gpt;
      
      // Atualiza URL
      window.history.replaceState(null, '', `${window.location.pathname}?chatId=${chat.id}`);
      
      // Inicializa chat com histórico
      await this.initializeChatWithHistory(chat, gpt);
      
    } catch (error) {
      console.error('Erro ao carregar chat:', error);
      this.showError('Erro ao carregar chat');
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Inicializa um novo chat
   */
  async initializeChat(gpt) {
    const sessionId = crypto.randomUUID();
    const config = this.buildChatConfig(gpt, sessionId);
    
    // Limpa área do chat
    const chatArea = document.getElementById('chat-area');
    if (chatArea) {
      chatArea.innerHTML = '<flowise-fullchatbot></flowise-fullchatbot>';
    }
    
    // Inicializa Flowise
    if (window.Chatbot) {
      window.Chatbot.initFull(config);
    }
  }

  /**
   * Inicializa chat com histórico
   */
  async initializeChatWithHistory(chat, gpt) {
    const config = this.buildChatConfig(gpt, chat.id);
    
    // Carrega histórico se disponível
    if (gpt.flowiseConfig?.flowise) {
      try {
        const apiHost = gpt.flowiseConfig.flowise.apiHost || window.location.origin;
        const history = await this.chatService.fetchChatHistory(
          chat.id,
          gpt.flowiseConfig.flowise.chatflowId,
          apiHost.replace(/\/$/, ''),
          gpt.flowiseConfig.flowise.token
        );
        
        // Injeta histórico
        this.chatService.injectChatHistory(
          gpt.flowiseConfig.flowise.chatflowId,
          chat.id,
          history
        );
      } catch (error) {
        console.warn('Erro ao carregar histórico:', error);
      }
    }
    
    // Limpa área do chat
    const chatArea = document.getElementById('chat-area');
    if (chatArea) {
      chatArea.innerHTML = '<flowise-fullchatbot></flowise-fullchatbot>';
    }
    
    // Inicializa Flowise
    if (window.Chatbot) {
      window.Chatbot.initFull(config);
    }
  }

  /**
   * Constrói configuração para o chat
   */
  buildChatConfig(gpt, sessionId) {
    const override = this.state.configCache[gpt.id] || {};
    const flowiseConfig = gpt.flowiseConfig?.flowise || {};
    
    return {
      chatflowid: flowiseConfig.chatflowId || gpt.id,
      apiHost: flowiseConfig.apiHost || window.location.origin,
      token: flowiseConfig.token,
      headers: {
        'x-user-email': this.authService.user.email,
        'x-user-uuid': this.authService.user.uid,
        'x-user-jwt': this.authService.token,
        'x-gpt-id': gpt.id
      },
      chatflowConfig: { ...override, sessionId },
      theme: window.flowiseConfig.theme,
      observersConfig: {
        observeLoading: async (loading) => {
          if (loading) {
            try {
              const userInput = this.getChatbotInput();
              if (userInput) {
                await this.chatService.createChatMessage(
                  flowiseConfig.chatflowId || gpt.id,
                  sessionId,
                  'user',
                  userInput
                );
              }
            } catch (error) {
              console.error('Erro ao salvar mensagem:', error);
            }
          }
        }
      }
    };
  }

  /**
   * Obtém input do chatbot
   */
  getChatbotInput() {
    try {
      const chatbot = document.querySelector('flowise-fullchatbot');
      if (chatbot?.shadowRoot) {
        const textarea = chatbot.shadowRoot.querySelector('textarea');
        return textarea?.value || '';
      }
    } catch (error) {
      console.debug('Erro ao obter input do chatbot:', error);
    }
    return '';
  }

  /**
   * Cria novo chat
   */
  createNewChat() {
    // Seleciona primeiro GPT disponível
    if (this.state.gpts.length > 0) {
      this.loadGpt(this.state.gpts[0].id);
    }
  }

  /**
   * Cria nova conversa com GPT específico
   */
  createNewConversation(gptKey) {
    if (gptKey && this.state.gptMap[gptKey]) {
      this.loadGpt(gptKey);
    }
  }

  /**
   * Logout
   */
  async logout() {
    try {
      await this.authService.logout();
      window.location.href = 'login.html';
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  }

  /**
   * Define estado de loading
   */
  setLoading(isLoading) {
    this.state.isLoading = isLoading;
    document.body.classList.toggle('loading', isLoading);
  }

  /**
   * Exibe erro
   */
  showError(message) {
    console.error(message);
    // Aqui você pode implementar uma notificação visual
    alert(message);
  }
}

// Inicializa a aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  new ChatApplication();
});

// Exporta para uso global se necessário
window.ChatApplication = ChatApplication; 