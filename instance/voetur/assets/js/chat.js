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
  <div class="container-fluid">
    <!-- Título e Breadcrumb -->
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

    <!-- Layout principal -->
    <div class="row g-0" style="height: 75vh;">
      <!-- Sidebar de conversas -->
      <div id="chat-sidebar" class="col-md-4 border-end" style="height: 75vh; overflow-y: auto;">
        <div class="p-3 d-flex flex-column" style="min-height: 0;">
          <!-- Search -->
          <div class="mb-3">
            <input type="text" id="chat-search" class="form-control" placeholder="Search here.." />
          </div>
          <!-- Tabs -->
          <ul class="nav nav-tabs mb-3" role="tablist">
            <li class="nav-item" role="presentation">
              <button class="nav-link active" data-bs-toggle="tab" data-bs-target="#chats-tab" type="button" role="tab">Chats</button>
            </li>
            <li class="nav-item" role="presentation">
              <button class="nav-link" data-bs-toggle="tab" data-bs-target="#contacts-tab" type="button" role="tab">Contacts</button>
            </li>
          </ul>
          <!-- Tab panes -->
          <div class="tab-content flex-grow-1 flex-shrink-1" style="min-height: 0;">
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

      <!-- Área de mensagens -->
      <div class="col-md-8">
        <div class="h-100 d-flex flex-column">
          <!-- Header da conversa -->
          <div class="d-flex justify-content-between align-items-center p-3 border-bottom">
            <div class="d-flex align-items-center">
              <img id="chat-header-avatar" src="" class="rounded-circle me-2" alt="Avatar"/>
              <div>
                <div id="chat-header-name"></div>
                <div id="chat-header-status" class="small"></div>
              </div>
            </div>
            <div>
              <button class="btn btn-light me-2"><i class="iconly-Info-Circle icli"></i></button>
              <button class="btn btn-light"><i class="iconly-Three-Dots icli"></i></button>
            </div>
          </div>
          <!-- Mensagens -->
          <div id="chat-messages" class="flex-grow-1 overflow-auto p-3"></div>
          <!-- Input -->
          <div class="d-flex align-items-center p-3 border-top">
            <button class="btn btn-link me-2"><i class="iconly-Plus icli"></i></button>
            <input type="text" id="message-input" class="form-control me-2" placeholder="Type Message here.." />
            <button class="btn btn-link me-2"><i class="iconly-Emoji icli"></i></button>
            <button id="send-button" class="btn btn-primary"><i class="iconly-Paper-Plane icli"></i></button>
          </div>
        </div>
      </div>
    </div>
  </div>
  `;

  // Toggle da lista
  const toggleBtn = document.getElementById('toggle-list');
  const sidebar = document.getElementById('chat-sidebar');
  toggleBtn.addEventListener('click', () => sidebar.classList.toggle('d-none'));

  // Aguarda autenticação
  await new Promise(resolve => {
    const interval = setInterval(() => {
      if (AuthService.user) { clearInterval(interval); resolve(); }
    }, 100);
  });

  // Renderização da lista de chats
  let chatItems = [];
  function renderChatList(chats) {
    const list = document.getElementById('chat-list');
    list.innerHTML = '';
    chats.forEach((chat, idx) => {
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
      li.addEventListener('click', () => {
        document.getElementById('chat-header-name').textContent = chat.name;
        document.getElementById('chat-header-avatar').src = '';
        document.getElementById('chat-header-status').textContent = 'Online';
        document.getElementById('chat-messages').innerHTML = '';
      });
      list.appendChild(li);
    });
  }

  // Busca e filtra chats
  document.getElementById('chat-search').addEventListener('input', e => {
    const term = e.target.value.toLowerCase();
    renderChatList(chatItems.filter(c => c.name.toLowerCase().includes(term)));
  });

  // Carrega chats do servidor
  try {
    let resp = await listChats(AuthService);
    if (typeof resp === 'string') resp = JSON.parse(resp);
    const items = Array.isArray(resp) ? resp : resp.data ? [resp] : [];
    chatItems = [];
    items.forEach(item => {
      let raw = item.data;
      let parsed = typeof raw === 'string' ? JSON.parse(raw) : Array.isArray(raw) ? raw : [raw];
      chatItems = chatItems.concat(parsed);
    });
    renderChatList(chatItems);
  } catch (err) {
    console.error('Erro carregando chats:', err);
  }

  // Elementos de mensagem
  const messagesContainer = document.getElementById('chat-messages');
  const input = document.getElementById('message-input');
  const sendButton = document.getElementById('send-button');

  function appendMessage(text, isUser = false) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `mb-2 ${isUser ? 'text-end' : 'text-start'}`;
    msgDiv.textContent = text;
    messagesContainer.appendChild(msgDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    return msgDiv;
  }

  // Envio com streaming
  sendButton.addEventListener('click', async () => {
    const question = input.value.trim();
    if (!question) return;
    appendMessage(question, true);
    input.value = '';

    // Placeholder para resposta do bot
    const botMsgDiv = appendMessage('', false);

    try {
      const response = await fetch('https://flowise.power.tec.br/api/v1/prediction/a81719cf-4c31-49a2-89b6-f532d6318a94', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, streaming: true })
      });
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep the last (possibly incomplete) line

        for (let line of lines) {
          line = line.trim();
          if (!line.startsWith('data:')) continue;
          const payload = line.slice(5).trim();
          if (payload === '[DONE]') {
            // Stream ended
            return;
          }
          try {
            const msg = JSON.parse(payload);
            if (msg.event === 'token') {
              botMsgDiv.textContent += msg.data;
            }
          } catch (e) {
            console.error('Erro parsing streaming payload:', payload, e);
          }
        }
      }
    } catch (error) {
      botMsgDiv.textContent = 'Erro ao obter resposta do chatbot.';
      console.error(error);
    }
  });

  input.addEventListener('keyup', e => { if (e.key === 'Enter') sendButton.click(); });
}

// Registra a rota "#chat"
registerRoute('#chat', renderChat);