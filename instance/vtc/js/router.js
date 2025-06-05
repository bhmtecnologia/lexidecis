// Roteador: mantém lista de rotas e permissões
const routes = new Map();
const routePermissions = new Map();

/**
 * Registra uma rota com sua função de renderização e chave de permissão (ou null para liberar sem validar).
 * @param {string} hash Hash da rota (por exemplo, "#home" ou "#mail")
 * @param {Function} renderFunction Função assíncrona que renderiza a tela correspondente
 * @param {string|null} [permissionKey] Chave de permissão; null = sem validação
 */
export function registerRoute(hash, renderFunction, permissionKey) {
  console.log(`router: registrando rota ${hash}`);
  routes.set(hash, renderFunction);
  routePermissions.set(hash, permissionKey !== undefined ? permissionKey : hash);
}

/**
 * Função principal que escuta mudanças de hash e chama a renderFunction correta.
 * (Implementação básica; adapte conforme sua versão original.)
 */
export async function router() {
  let hash = window.location.hash;
  if (!hash || hash === "#") {
    hash = "#";
    window.location.hash = "#";
  }
  const permissionKey = routePermissions.get(hash);
  if (permissionKey === undefined) {
    console.warn(`router: nenhuma rota registrada para ${hash}`);
    return;
  }
  if (permissionKey !== null) {
    await new Promise((res) => setTimeout(res, 50));
    if (!window.userProfile) {
      console.warn("router: perfil do usuário não carregado; acesso negado.");
      return;
    }
  }
  const hasPermission = permissionKey === null || (window.userProfile?.routes || []).includes(permissionKey);
  const renderFunc = routes.get(hash);
  if (renderFunc && hasPermission) {
    if (hash === "#") {
      await renderFunc();
    } else if (hash === "#mail") {
      await renderFunc();
    } else {
      await renderFunc();
    }
  } else {
    console.warn(`router: sem permissão para ${hash} ou rota ausente`);
  }
}

// Escuta hashchange para disparar o roteador
window.addEventListener("hashchange", () => {
  router().catch(err => console.error("router erro:", err));
});

  export async function renderMail() {
    const url = "https://outlook.office365.com/mail/none";
    // Esconde outras páginas
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
    // Garanta que mailPage esteja visível
    mailPage.style.display = 'block';

    // Limpa conteúdo anterior
    mailPage.innerHTML = '';

    // Exibe mensagem amigável de carregamento
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

    // Adiciona keyframes para spinner
    const styleElem = document.createElement('style');
    styleElem.textContent = `
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(styleElem);

    // Após breve intervalo, abre o Outlook em nova aba/janela
    setTimeout(() => {
      window.open(url, '_blank');
      // Atualiza para mensagem final de confirmação
      message.innerHTML = `
        <div style="background: #ffffff; border-radius: 12px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.1); text-align: center; width: 80%; max-width: 400px;">
          <h2 style="margin: 0; font-size: 1.5rem; color: #333;">O Outlook foi aberto em uma nova aba.</h2>
        </div>
      `;
    }, 1000);
  }