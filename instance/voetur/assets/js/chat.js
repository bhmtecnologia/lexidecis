import AuthService from "../js/auth.js";
import { registerRoute } from "../js/router.js";

export async function renderChat() {
  const content = document.getElementById('content');

  // Define o template HTML com a estrutura do portal, título e área para o chat embed
  content.innerHTML = `
    <div class="container-fluid">
      <!-- Título e Breadcrumb -->
      <div class="page-title">
        <div class="row">
          <div class="col-sm-12">
            <h2>Chat</h2>
            <p class="mb-0 text-title-gray">Interaja com nosso chatbot.</p>
          </div>
        </div>
      </div>

      <!-- Área do Chat Embed -->
      <div class="row">
        <div class="col-12">
          <div class="card">
            <div class="card-body">
              <!-- Container com altura definida em 60vh para limitar o chat -->
              <div style="height: 60vh; overflow: hidden;">
                <flowise-fullchatbot style="height: 60vh !important;"></flowise-fullchatbot>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Aguarda o carregamento do usuário (caso haja validação de login, por exemplo)
  await new Promise(resolve => {
    const interval = setInterval(() => {
      if (AuthService.user) {
        clearInterval(interval);
        resolve();
      }
    }, 100);
  });

  // Cria e insere dinamicamente o script de inicialização do Flowise com type module
  const script = document.createElement('script');
  script.type = 'module';
  script.textContent = `
    import Chatbot from "https://cdn.jsdelivr.net/npm/flowise-embed/dist/web.js";
    Chatbot.initFull({
        chatflowid: "efe59701-afe2-4f4c-8448-bb8e3a32161a",
        apiHost: "https://flowise.power.tec.br",
    });
  `;
  document.body.appendChild(script);
}

// Registra a rota "#chat" para que essa página seja exibida quando necessário
registerRoute('#chat', renderChat);