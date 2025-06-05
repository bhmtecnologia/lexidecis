

import { registerRoute } from "../../js/router.js";

/**
 * Quando a rota "#vtc-prestacao-de-contas-gestor" for acionada, essa função será executada.
 * Ela simplesmente abre uma nova janela com o link especificado.
 */
export async function renderPrestacao() {
  // URL da prestação de contas
  const url = "https://voetur.bennercloud.com.br/CORPORATIVO/Pages/Prestacaodecontas.aspx?i=K_PRESTACAODECONTAS&m=MAIN";
  // Abre em nova aba/janela
  window.open(url, "_blank");
}
// Registra a rota para Prestação de Contas
registerRoute("#vtc-prestacao-de-contas-gestor", renderPrestacao);