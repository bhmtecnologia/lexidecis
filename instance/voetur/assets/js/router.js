// router.js - Versão Melhorada com logs
const routes = new Map();

// Registra as rotas e loga a ação
export function registerRoute(hash, renderFunction) {
  console.log(`Registrando rota: ${hash}`);
  routes.set(hash, renderFunction);
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

// Roteador que procura a rota atual e a renderiza
async function router() {
  let hash = window.location.hash;
  console.log("Roteador iniciado. Hash atual:", hash);
  
  if (!hash || hash === "#") {
    hash = "#dashboard"; // Define página padrão
    console.log("Nenhuma hash definida. Redirecionando para a rota padrão:", hash);
    window.location.hash = hash;
  }

  const renderFunc = routes.get(hash);
  
  if (renderFunc) {
    console.log(`Rota encontrada para ${hash}. Iniciando carregamento...`);
    showLoading();
    
    try {
      // Atraso mínimo para o loading ser visível
      setTimeout(async () => {
        console.log(`Executando função de renderização para ${hash}...`);
        await renderFunc(); // Suporta funções assíncronas
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
  } else {
    console.warn(`Nenhuma rota registrada para ${hash}.`);
    const content = document.getElementById("content");
    if (content) {
      content.innerHTML = `<h1>Página não encontrada</h1>`;
    }
  }
}

window.addEventListener("hashchange", router);
window.addEventListener("load", router);

export { router };