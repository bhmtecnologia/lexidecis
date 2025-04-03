/**
 * @file chat.js
 * @description Responsável por renderizar a página de Chat da LexiDecis 
 * (baseado no conteúdo do chat.html) e integrá-la à SPA. 
 * O embed do Flowise é incluído como um placeholder no container do chatbot.
 */

import { registerRoute } from "./router.js";
import { verifyAuthState, logout } from "./services/auth.js";

export async function renderChat() {
  const content = document.getElementById("content");
  content.innerHTML = `
    <!-- Conteúdo interno do chat.html -->
    <!-- Botão para dispositivos móveis -->
    <button id="toggle-sidebar-btn" class="btn btn-primary">
      <i class="bi bi-list"></i>
    </button>

    <!-- Sidebar -->
    <nav id="sidebarMenu" class="sidebar d-flex flex-column p-3 bg-dark">
      <!-- Barra de Ícones como Botões -->
      <div class="d-flex justify-content-around mb-3">
        <button id="profile-icon" class="btn btn-link text-white" data-bs-toggle="tooltip" data-bs-placement="bottom" title="Perfil">
          <i class="bi bi-person-circle" style="font-size: 1.5rem;"></i>
        </button>
        <button id="select-gpt-button" class="btn btn-link text-white" data-bs-toggle="tooltip" data-bs-placement="bottom" title="Escolher GPT">
          <i class="bi bi-robot" style="font-size: 1.5rem;"></i>
        </button>
        <button id="new-chat-button" class="btn btn-link text-white" data-bs-toggle="tooltip" data-bs-placement="bottom" title="Nova conversa">
          <i class="bi bi-chat-dots" style="font-size: 1.5rem;"></i>
        </button>
      </div>

      <!-- Campo de pesquisa -->
      <div class="input-group mb-3">
        <span class="input-group-text" id="search-icon"><i class="bi bi-search"></i></span>
        <input type="text" class="form-control" id="search-input" placeholder="Buscar" aria-label="Pesquisar chats" aria-describedby="search-icon">
        <button class="btn btn-outline-secondary" type="button" id="clear-search-button">&times;</button>
      </div>

      <!-- Lista de chats -->
      <ul id="chat-list" class="list-group chat-list overflow-auto custom-chat-list-height">
        <!-- Lista será populada dinamicamente -->
      </ul>

      <hr class="bg-white">

      <!-- Botões e campos na sidebar -->
      <ul class="nav nav-pills flex-column overflow-auto mb-auto">
        <li>
          <a href="#" class="nav-link text-white" id="logout-button">
            <i class="bi bi-box-arrow-right"></i> Sair
          </a>
        </li>
      </ul>

      <hr class="bg-white">
    </nav>

    <!-- Overlay para sidebar em dispositivos móveis -->
    <div id="sidebarOverlay"></div>

    <!-- Conteúdo Principal -->
    <div class="content">
      <div id="welcome-message" class="d-flex justify-content-center align-items-center vh-100">
        <h1>Bem-vindo à LexiDecis!</h1>
      </div>
      
      <!-- Container do Chatbot: aqui o embed do Flowise será inserido -->
      <div id="chatbot-container" class="d-none">
        <!-- Placeholder para o embed do Flowise -->
        <div id="flowise-embed">
          <!-- Exemplo: se for via iframe, descomente a linha abaixo e ajuste a URL -->
          <!-- <iframe src="URL_DO_FLOWISE" frameborder="0" style="width:100%; height:100%;"></iframe> -->
        </div>
      </div>
    </div>

    <!-- Container para mensagens de erro -->
    <div id="error-container" class="alert alert-danger position-fixed bottom-0 end-0 m-3 d-none" role="alert">
      <!-- Mensagem de erro -->
    </div>
  `;

  // Verifica o estado de autenticação
  verifyAuthState();

  // Configura o botão de logout
  const logoutButton = document.getElementById("logout-button");
  if (logoutButton) {
    logoutButton.addEventListener("click", async (event) => {
      event.preventDefault();
      try {
        await logout();
      } catch (error) {
        console.error("Erro ao realizar logout:", error);
      }
    });
  }

  // Configuração do toggle da sidebar para telas pequenas
  const sidebar = document.getElementById("sidebarMenu");
  const toggleBtn = document.getElementById("toggle-sidebar-btn");
  const overlay = document.getElementById("sidebarOverlay");

  toggleBtn.addEventListener("click", () => {
    sidebar.classList.toggle("active");
    overlay.classList.toggle("active");
  });

  overlay.addEventListener("click", () => {
    sidebar.classList.remove("active");
    overlay.classList.remove("active");
  });

  // Gerencia a exibição do chatbot
  const welcomeMessage = document.getElementById("welcome-message");
  const chatbotContainer = document.getElementById("chatbot-container");

  // Função para iniciar um novo chat (incluir embed do Flowise, se necessário)
  const iniciarNovoChat = () => {
    if (welcomeMessage) welcomeMessage.classList.add("d-none");
    chatbotContainer.classList.remove("d-none");
    // Aqui você pode iniciar o embed do Flowise, por exemplo, configurando o iframe ou chamando uma função do renderer.js
  };

  // Função para selecionar um chat existente
  const selecionarChat = (chatId) => {
    if (welcomeMessage) welcomeMessage.classList.add("d-none");
    chatbotContainer.classList.remove("d-none");
    // Aqui você pode carregar o chat existente identificado por chatId
  };

  // Associa o evento para iniciar novo chat
  const newChatButton = document.getElementById("new-chat-button");
  if (newChatButton) {
    newChatButton.addEventListener("click", iniciarNovoChat);
  }

  // Associa o evento para seleção de chat na lista
  const chatList = document.getElementById("chat-list");
  if (chatList) {
    chatList.addEventListener("click", (event) => {
      const chatItem = event.target.closest("li");
      if (chatItem) {
        const chatId = chatItem.getAttribute("data-chat-id");
        selecionarChat(chatId);
      }
    });
  }
}

registerRoute("#chat", renderChat);