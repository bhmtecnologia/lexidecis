import AuthService from "../js/auth.js";
import { registerRoute } from "../js/router.js";

export async function renderChat() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div id="chat-layout" style="display: flex; flex-direction: column; height: 100vh;">
      <!-- Cabeçalho -->
      <div class="page-title">
        <div class="row">
          <div class="col-sm-6 col-12">
            <h2>Chat</h2>
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
      <!-- Área de chat -->
      <div style="flex: 1; position: relative; overflow: auto;">
        <iframe src="chat.html" style="height: 100%; width: 100%; border: none;"></iframe>
      </div>
    </div>
  `;
}

registerRoute('#chat', renderChat);