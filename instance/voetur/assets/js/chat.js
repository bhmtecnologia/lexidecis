import AuthService from "../js/auth.js";
import { registerRoute } from "../js/router.js";
import { listChats } from "../js/api.js";

function formatTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins} min`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs} h`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays} d`;
}

export async function renderChat() {
  const content = document.getElementById('content');
  content.innerHTML = `
  <div id="chat-layout" style="display: flex; flex-direction: column; height: 100vh;">
    <!-- Cabeçalho -->
    <div class="page-title">
      <div class="row">
        <div class="col-sm-6 col-12">
          <h2>
            Chat
            <button id="toggle-list" class="btn btn-sm btn-outline-secondary ms-2">
              <i class="iconly-Arrow-Left-2 icli"></i>
            </button>
          </h2>
          <p class="mb-0 text-title-gray">Converse com nosso chatbot.</p>
        </div>
        <div class="col-sm-6 col-12">
          <ol class="breadcrumb">
            <li class="breadcrumb-item">
              <a href="index.html">
                <i class="iconly-Home icli svg-color"></i>
              </a>
            </li>
            <li class="breadcrumb-item active">Chat</li>
          </ol>
        </div>
      </div>
    </div>

    <!-- Corpo (sidebar + chat) -->
    <div style="flex: 1; display: flex; overflow: hidden;">
      <!-- Sidebar de conversas -->
      <div id="chat-sidebar" class="col-md-4 border-end" style="overflow-y: auto; width: 30%;">
        <div class="p-3 d-flex flex-column" style="height: 100%;">
          <div class="mb-3">
          <select id="chat-search" class="form-control" style="width: 100%;"></select>
          </div>
          <ul class="nav nav-tabs mb-3" role="tablist">
            <li class="nav-item" role="presentation">
              <button class="nav-link active" data-bs-toggle="tab" data-bs-target="#chats-tab" type="button" role="tab">Chats</button>
            </li>
            <li class="nav-item" role="presentation">
              <button class="nav-link" data-bs-toggle="tab" data-bs-target="#contacts-tab" type="button" role="tab">Contacts</button>
            </li>
          </ul>
          <div class="tab-content flex-grow-1" style="overflow-y: auto;">
            <div class="tab-pane fade show active" id="chats-tab" role="tabpanel">
              <ul class="list-group list-group-flush" id="chat-list"></ul>
            </div>
            <div class="tab-pane fade" id="contacts-tab" role="tabpanel">
              <ul class="list-group list-group-flush" id="contacts-list">
                <li class="list-group-item">Contato 1</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      <!-- Área de mensagens (Flowise Embed) -->
      <div style="flex: 1; position: relative; overflow: auto;">
        <flowise-fullchatbot style="height: 100%; width: 100%;"></flowise-fullchatbot>
      </div>
    </div>
  </div>
  `;
  
  // Carrega Select2 (JS + CSS) dinamicamente se ainda não estiver presente
  async function ensureSelect2() {
    if (window.jQuery && window.jQuery.fn && window.jQuery.fn.select2) return;
    await new Promise((resolve, reject) => {
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = 'https://cdnjs.cloudflare.com/ajax/libs/select2/4.1.0-rc.0/css/select2.min.css';
      css.onload = () => resolve();
      css.onerror = reject;
      document.head.appendChild(css);
    });
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/select2/4.1.0-rc.0/js/select2.min.js';
      script.onload = () => resolve();
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  document.getElementById('toggle-list')
    .addEventListener('click', () => document.getElementById('chat-sidebar').classList.toggle('d-none'));

  await new Promise(r => {
    const iv = setInterval(() => { if (AuthService.user) { clearInterval(iv); r(); } }, 100);
  });

  let chatItems = [];
  function renderChatList(chats) {
    const list = document.getElementById('chat-list');
    list.innerHTML = '';
    chats.forEach(chat => {
      const li = document.createElement('li');
      li.className = 'list-group-item d-flex justify-content-between align-items-center';
      li.innerHTML = `
        <div>
          <div>${chat.name}</div>
          <div class="text-muted small">${formatTime(chat.last_modified)}</div>
        </div>
        <div class="text-end">
          <span class="badge bg-secondary rounded-pill">${chat.total_messages}</span>
        </div>`;
      list.appendChild(li);
    });
  }
  await ensureSelect2();
  
  const $search = window.jQuery('#chat-search');
  function populateSelect(items) {
    const data = items.map(c => ({ id: c.name, text: c.name }));
    $search.empty().select2({ data, placeholder: 'Search here...' });
  }
  
  $search.on('select2:select', e => {
    const name = e.params.data.id.toLowerCase();
    renderChatList(chatItems.filter(c => c.name.toLowerCase().includes(name)));
  });
  
  $search.on('select2:clear', () => renderChatList(chatItems));

  try {
    let resp = await listChats(AuthService);
    if (typeof resp === 'string') resp = JSON.parse(resp);
    const items = Array.isArray(resp) ? resp : resp.data ? [resp] : [];
    chatItems = items.flatMap(i => {
      const raw = i.data;
      return Array.isArray(raw) ? raw : typeof raw === 'string' ? JSON.parse(raw) : [raw];
    });
    renderChatList(chatItems);
    populateSelect(chatItems);
  } catch (err) {
    console.error('Erro carregando chats:', err);
  }

  // Inicializa Flowise com tema customizado para remover rodapé
  import('https://proxy-5cun.onrender.com/web.js')
    .then(({ default: Chatbot }) => {
      // Calcula altura disponível para o chat (viewport total menos o cabeçalho)
      const headerEl = document.querySelector('#chat-layout .page-title');
      const headerHeight = headerEl ? headerEl.offsetHeight : 0;
      const availableHeight = window.innerHeight - headerHeight;

      console.log('✅ AuthService.user:', AuthService.user);

      console.log('✅ Enviando para proxy:', {
        'x-user-email': AuthService.user?.email,
        'x-user-uuid': AuthService.user?.uid
      });
      
      // Intercepta todas as chamadas fetch para forçar headers de usuário
      const originalFetch = window.fetch;
      window.fetch = function(url, options = {}) {
        options.headers = {
          ...(options.headers || {}),
          'x-user-email': AuthService.user?.email ?? '',
          'x-user-uuid': AuthService.user?.uid ?? ''
        };
        return originalFetch(url, options);
      };
      
      Chatbot.initFull({
        chatflowid: "MAIN_CHAT",
        apiHost: "https://proxy-5cun.onrender.com",
        theme: {
          chatWindow: {
            // Preenche o container, respeitando altura disponível
            height: availableHeight,
            width: "100%"
          }
        },
        headers: {
          'x-user-email': AuthService.user?.email ?? '',
          'x-user-uuid': AuthService.user?.uid ?? ''
        }
      });
    })
    .catch(err => console.error('Erro ao carregar Flowise embed:', err));
}

registerRoute('#chat', renderChat);