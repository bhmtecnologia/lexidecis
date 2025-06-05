import { registerRoute } from "../../js/router.js";

/**
 * Quando a rota "#vtc-prestacao-de-contas-gestor" for acionada, essa função será executada.
 * Ela simplesmente abre uma nova janela com o link especificado.
 */
export async function renderMail() {
  const url = "https://outlook.office365.com/mail/none";

  // Esconde outras páginas (Home e Financeiro)
  const homePage = document.getElementById('home-page');
  const lancarPage = document.getElementById('lancar-page');
  if (homePage) homePage.style.display = 'none';
  if (lancarPage) lancarPage.style.display = 'none';

  // Cria ou obtém container mail-page
  let mailPage = document.getElementById('mail-page');
  if (!mailPage) {
    mailPage = document.createElement('div');
    mailPage.id = 'mail-page';
    mailPage.style.position = 'absolute';
    mailPage.style.top = 'calc(env(safe-area-inset-top, 0px) + 44px)';
    mailPage.style.left = '0';
    mailPage.style.right = '0';
    mailPage.style.bottom = '0';
    mailPage.style.backgroundColor = '#ffffff';
    mailPage.style.overflow = 'hidden';
    document.body.appendChild(mailPage);
  }
  // Garante que mailPage esteja visível
  mailPage.style.display = 'block';

  // Limpa conteúdo anterior
  mailPage.innerHTML = '';

  // 1) Mostra splash screen por 1 segundo
  const splash = document.createElement('div');
  splash.style.display = 'flex';
  splash.style.flexDirection = 'column';
  splash.style.justifyContent = 'center';
  splash.style.alignItems = 'center';
  splash.style.height = '100%';
  splash.style.backgroundColor = '#007AFF';
  splash.innerHTML = `
    <i class="fa-solid fa-envelope-open-text" style="font-size: 60px; color: #fff; margin-bottom: 16px;"></i>
    <h1 style="color: #fff; font-size: 24px; margin: 0;">Mail</h1>
  `;
  mailPage.appendChild(splash);

  // Aguarda 1 segundo, depois remove splash e exibe carregamento
  setTimeout(() => {
    // Remove splash
    mailPage.removeChild(splash);

    // 2) Exibe mensagem amigável de carregamento
    const message = document.createElement('div');
    message.style.display = 'flex';
    message.style.flexDirection = 'column';
    message.style.justifyContent = 'center';
    message.style.alignItems = 'center';
    message.style.height = '100%';
    message.style.backgroundColor = '#f2f2f2';
    message.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
    message.innerHTML = `
      <div style="background: #ffffff; border-radius: 12px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.1); text-align: center; width: 80%; max-width: 400px;">
        <h2 style="margin: 0 0 1rem; font-size: 1.5rem; color: #333;">Seu e-mail está sendo carregado...</h2>
        <div class="spinner" style="width: 40px; height: 40px; border: 4px solid #ccc; border-top-color: #007AFF; border-radius: 50%; animation: spin 1s linear infinite;"></div>
      </div>
    `;
    mailPage.appendChild(message);

    // Adiciona keyframes para spinner (se ainda não existir)
    if (!document.getElementById('mail-spinner-style')) {
      const styleElem = document.createElement('style');
      styleElem.id = 'mail-spinner-style';
      styleElem.textContent = `
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(styleElem);
    }

    // Após mais 1 segundo, abre o Outlook em nova aba e atualiza mensagem
    setTimeout(() => {
      window.open(url, '_blank');
      message.innerHTML = `
        <div style="background: #ffffff; border-radius: 12px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.1); text-align: center; width: 80%; max-width: 400px;">
          <h2 style="margin: 0; font-size: 1.5rem; color: #333;">O Outlook foi aberto em uma nova aba.</h2>
        </div>
      `;
    }, 1000);
  }, 1000);
}
// Registra a rota para Mail
registerRoute("#mail", renderMail);