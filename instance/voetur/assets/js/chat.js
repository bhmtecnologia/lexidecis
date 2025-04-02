/**
 * @file chat.js
 * @description Renderiza a página de Chat da LexiDecis apenas com o embed do Flowise (default GPT),
 * removendo a lista de chats e demais funcionalidades não essenciais.
 */

import { registerRoute } from "./router.js";
import { logout } from "./auth.js";

export async function renderChat() {
  const content = document.getElementById("content");
  content.innerHTML = `
    <div id="chat-page">
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

          <!-- Apenas o botão de logout -->
          <ul class="nav nav-pills flex-column overflow-auto mb-auto">
              <li>
                  <a href="#" class="nav-link text-white" id="logout-button">
                      <i class="bi bi-box-arrow-right"></i> Sair
                  </a>
              </li>
          </ul>
      </nav>

      <!-- Overlay para sidebar -->
      <div id="sidebarOverlay"></div>

      <!-- Conteúdo Principal -->
      <div class="content">
          <div id="welcome-message" class="d-flex justify-content-center align-items-center vh-100">
              <h1>Bem-vindo à LexiDecis!</h1>
          </div>

          <!-- Container do Chatbot: embed do Flowise -->
          <div id="chatbot-container" class="d-none">
              <iframe id="flowise-embed" 
                      src="https://your-flowise-url/default-gpt" 
                      frameborder="0" 
                      style="width: 100%; height: 100vh;">
              </iframe>
          </div>
      </div>

      <!-- Container para mensagens de erro -->
      <div id="error-container" class="alert alert-danger position-fixed bottom-0 end-0 m-3 d-none" role="alert">
          <!-- Mensagem de erro -->
      </div>
    </div>
  `;

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

  // Exibe o embed do Flowise (chatbot)
  const welcomeMessage = document.getElementById("welcome-message");
  const chatbotContainer = document.getElementById("chatbot-container");
  if (welcomeMessage) welcomeMessage.classList.add("d-none");
  if (chatbotContainer) chatbotContainer.classList.remove("d-none");
}

registerRoute("#chat", renderChat);