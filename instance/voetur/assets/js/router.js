// router.js - Versão com suporte a permissões por rota e espera pelo perfil do usuário

const routes = new Map();
const routePermissions = new Map();

/**
 * Registra uma rota com função de renderização e chave de permissão opcional.
 * Se permissionKey não for passado, assume o próprio hash como chave de permissão.
 * @param {string} hash - Ex: "#dashboard"
 * @param {Function} renderFunction - Função assíncrona que renderiza a página
 * @param {string} [permissionKey] - Chave que será comparada com userProfile.routes
 */
export function registerRoute(hash, renderFunction, permissionKey) {
  console.log(`Registrando rota: ${hash}`);
  routes.set(hash, renderFunction);
  // Se permissionKey não for informado, usa o próprio hash
  routePermissions.set(hash, permissionKey || hash);
}

// Exibe um spinner enquanto a página carrega
function showLoading() {
  console.log("Exibindo loading...");
  const content = document.getElementById("content");
  if (content) {
    content.innerHTML = `<div id="loading">Carregando...</div>`;
  } else {
    console.error("Elemento #content não encontrado para exibir o loading.");
  }
}

// Remove scripts antigos para evitar duplicação
function clearOldScripts() {
  console.log("Limpando scripts antigos...");
  document.querySelectorAll("script.dynamic-script").forEach(script => script.remove());
}

/**
 * Aguarda até que window.userProfile esteja definido ou até timeout (ms)
 * @param {number} timeout Tempo máximo em milissegundos para aguardar
 */
async function waitProfile(timeout = 3000) {
  const start = Date.now();
  while (!window.userProfile && Date.now() - start < timeout) {
    await new Promise(res => setTimeout(res, 50));
  }
}

// Função principal do roteador
async function router() {
  let hash = window.location.hash;
  console.log("Roteador iniciado. Hash atual:", hash);

  if (!hash || hash === "#") {
    hash = "#dashboard"; // Rota padrão
    console.log("Nenhuma hash definida. Redirecionando para a rota padrão:", hash);
    window.location.hash = hash;
    return;
  }

  // Aguarda que o perfil seja carregado (até 3 segundos)
  await waitProfile(3000);
  if (!window.userProfile) {
    console.warn("Perfil do usuário não carregado; acesso negado.");
    const content = document.getElementById("content");
    if (content) content.innerHTML = `<h1>Acesso negado</h1>`;
    return;
  }

  const renderFunc = routes.get(hash);
  const permissionKey = routePermissions.get(hash) || hash;
  const hasPermission = (window.userProfile?.routes || []).includes(permissionKey);

  if (renderFunc && hasPermission) {
    console.log(`Rota encontrada para ${hash}. Iniciando carregamento...`);
    showLoading();

    try {
      setTimeout(async () => {
        console.log(`Executando função de renderização para ${hash}...`);
        await renderFunc();
        clearOldScripts();
        console.log(`Rota ${hash} renderizada com sucesso.`);
      }, 100);
    } catch (error) {
      console.error("Erro na renderização da rota:", error);
      const content = document.getElementById("content");
      if (content) {
        content.innerHTML = `<h1>Erro ao carregar a página.</h1>`;
      }
    }
  } else if (!hasPermission) {
    console.warn(`Usuário sem permissão para acessar a rota ${hash}.`);
    const content = document.getElementById("content");
    if (content) {
      content.innerHTML = `<h1>Acesso negado</h1>`;
    }
  } else {
    console.warn(`Nenhuma rota registrada para ${hash}.`);
    const content = document.getElementById("content");
    if (content) {
      content.innerHTML = `<h1>Página não encontrada</h1>`;
    }
  }
}

// Escuta mudanças de hash e carregamento inicial
window.addEventListener("hashchange", router);

export { router };