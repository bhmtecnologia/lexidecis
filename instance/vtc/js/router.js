// router.js - Versão corrigida com suporte a hash vazia ("#") e permissões por rota

const routes = new Map();
const routePermissions = new Map();

/**
 * Registra uma rota com função de renderização e chave de permissão opcional.
 * Se permissionKey não for passado, assume o próprio hash como chave de permissão.
 * @param {string} hash - Ex: "#dashboard" ou "#" para home
 * @param {Function} renderFunction - Função assíncrona que renderiza a página
 * @param {string|null} [permissionKey] - Chave que será comparada com userProfile.routes; null = sem validação
 */
export function registerRoute(hash, renderFunction, permissionKey) {
  console.log(`Registrando rota: ${hash}`);
  routes.set(hash, renderFunction);
  // Se permissionKey explicitamente fornecido (mesmo que seja null), use-o; senão, use o próprio hash
  routePermissions.set(hash, permissionKey !== undefined ? permissionKey : hash);
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

  // Tratar hash vazia ou apenas "#" como rota de home ("#")
  if (!hash || hash === "#") {
    hash = "#";
    window.location.hash = "#";
  }

  // Obtém a chave de permissão para esta rota (pode ser string, null, ou undefined)
  const permissionKey = routePermissions.get(hash);

  // Se não houver rota registrada (permissionKey undefined), exibe 404
  if (permissionKey === undefined) {
    console.warn(`Nenhuma rota registrada para ${hash}.`);
    const content = document.getElementById("content");
    if (content) {
      content.innerHTML = `<h1>Página não encontrada</h1>`;
    }
    return;
  }

  // Somente se permissionKey não for null, aguarda perfil e valida permissão
  if (permissionKey !== null) {
    // Aguarda que o perfil seja carregado (até timeout)
    await waitProfile(3000);
    if (!window.userProfile) {
      console.warn("Perfil do usuário não carregado; acesso negado.");
      const content = document.getElementById("content");
      if (content) {
        content.innerHTML = `<h1>Acesso negado</h1>`;
      }
      return;
    }
  }

  // Verifica permissão: se permissionKey null, libera; senão, checa em userProfile.routes
  const hasPermission = permissionKey === null
    ? true
    : (window.userProfile?.routes || []).includes(permissionKey);

  const renderFunc = routes.get(hash);

  if (renderFunc && hasPermission) {
    // Se for rota home ("#"), não exibe loading nem limpa scripts
    if (hash === "#") {
      console.log(`Renderizando home para ${hash}...`);
      await renderFunc();
      console.log(`Home (${hash}) renderizada com sucesso.`);
    }
    // Se for rota Prestação de Contas ("#vtc-prestacao-de-contas-gestor"), também pulamos o loading
   else if (hash === "#vtc-prestacao-de-contas-gestor") {
      console.log(`Abrindo Prestação de Contas (nova janela) para ${hash}...`);
      await renderFunc();
      console.log(`Prestação de Contas (${hash}) executado.`);
    }
    else {
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
    }
  } else if (!hasPermission) {
    console.warn(`Usuário sem permissão para acessar a rota ${hash}.`);
    const content = document.getElementById("content");
    if (content) {
      content.innerHTML = `<h1>Acesso negado</h1>`;
    }
  } else {
    // Caso tenha função de render mas não passou na permissão, já tratado acima.
    // Se chegou aqui, significa que não há renderFunc (mas permissionKey não era undefined) -> 404
    console.warn(`Nenhuma rota registrada para ${hash}.`);
    const content = document.getElementById("content");
    if (content) {
      content.innerHTML = `<h1>Página não encontrada</h1>`;
    }
  }
}

// Escuta mudanças de hash
window.addEventListener("hashchange", router);

// OBS: Não chama router() no "load" automaticamente; página principal precisa definir hash e então chamar router()

export { router };