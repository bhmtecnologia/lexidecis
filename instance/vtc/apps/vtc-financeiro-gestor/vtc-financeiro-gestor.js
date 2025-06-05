// File: instance/vtc/apps/vtc-financeiro-gestor/vtc-financeiro-gestor.js

import AuthService from "../../js/auth.js";
import { listLancamentos } from "../../js/api.js";

/**
 * Ao chamar a rota "#vtc-financeiro-gestor", essa função será executada:
 * - Esconde a página Home
 * - Exibe a página de lançamentos (Financeiro)
 * - Chama a API para buscar lançamentos e popula a tabela
 * - Inicializa (ou re-desenha) o DataTable
 */
export function openLancar() {
  // 1. Esconder a Home e exibir a página "lancar-page"
  const homePage = document.getElementById("home-page");
  const lancarPage = document.getElementById("lancar-page");
  if (homePage) homePage.style.display = "none";
  if (lancarPage) lancarPage.style.display = "block";

  // 2. Esconder o dock de aplicativos
  const dock = document.querySelector(".dock");
  if (dock) dock.style.display = "none";

  // 3. Esconder bloco de upload (caso exista)
  const uploadBlock = document.getElementById("uploadBlock");
  if (uploadBlock) uploadBlock.style.display = "none";

  // 4. Mostrar a tabela e chamar a API para carregar os dados
  const table = document.getElementById("finance-table");
  if (table) {
    table.style.display = "table";

    // Ajustar cabeçalho da tabela para três colunas: Status, Descrição, Valor
    const headerRow = table.querySelector("thead tr");
    if (headerRow) {
      headerRow.innerHTML = `
        <th>Status</th>
        <th>Descrição</th>
        <th>Valor</th>
      `;
    }

    // Adicionar o menu inferior de ícones financeiro, se ainda não existir
    if (!document.getElementById("finance-icon-menu")) {
      const menuHtml = `
        <!-- Financeiro Bottom Icon Menu -->
        <div id="finance-icon-menu"
             style="position: fixed; bottom: 56px; left: 0; right: 0; height: 56px;
                    background-color: #ffffff; display: flex; justify-content: space-around;
                    align-items: center; z-index: 45;">
          <div style="text-align: center;">
            <i class="fa-solid fa-chart-line" style="font-size: 24px; color: #007AFF;"></i>
            <div style="font-size: 10px; color: #000;">Resumo2</div>
          </div>
          <div style="text-align: center;">
            <i class="fa-solid fa-list" style="font-size: 24px; color: #34C759;"></i>
            <div style="font-size: 10px; color: #000;">Lançamentos</div>
          </div>
          <div style="text-align: center;">
            <a href="#" id="btnNovoOption" style="text-decoration: none; color: inherit;">
              <i class="fa-solid fa-plus-circle" style="font-size: 24px; color: #5856D6;"></i>
              <div style="font-size: 10px; color: #000;">Novo</div>
            </a>
          </div>
          <div style="text-align: center;">
            <i class="fa-solid fa-gear" style="font-size: 24px; color: #8E8E93;"></i>
            <div style="font-size: 10px; color: #000;">Ajustes</div>
          </div>
        </div>`;
      const div = document.createElement("div");
      div.innerHTML = menuHtml;
      document.body.appendChild(div.firstElementChild);
    }

    // Função para buscar e popular a tabela
    async function fetchAndPopulate() {
      const user = AuthService.user;
      if (!user) {
        console.warn("Usuário não autenticado ao abrir Financeiro.");
        return;
      }
      try {
        const lancamentos = await listLancamentos(AuthService);
        const selector = "#finance-table";
        // Se já existe DataTable, destrói antes de alterar o tbody
        if (window.$ && $.fn.DataTable && $.fn.DataTable.isDataTable(selector)) {
          $(selector).DataTable().clear().destroy();
        }
        const tbody = table.querySelector("tbody");
        tbody.innerHTML = "";
        lancamentos.forEach((item) => {
          const tr = document.createElement("tr");
          const tdStatus = document.createElement("td");
          // Use nested status if available, otherwise top-level status
          const statusText = (item.dados && item.dados.status) ? item.dados.status : item.status || "";
          tdStatus.textContent = statusText;
          tr.appendChild(tdStatus);
          const tdDesc = document.createElement("td");
          const fornecedorNome = item.dados && item.dados.fornecedor_nome
                                 ? item.dados.fornecedor_nome
                                 : "";
          tdDesc.textContent = fornecedorNome;
          tr.appendChild(tdDesc);
          const tdValor = document.createElement("td");
          const valorNominal = item.dados && item.dados.valor_nominal
                               ? item.dados.valor_nominal
                               : "";
          tdValor.textContent = valorNominal;
          tr.appendChild(tdValor);
          tbody.appendChild(tr);
        });
        // Inicializa o DataTable com as novas linhas
        if (window.$ && $.fn.DataTable) {
          $(selector).DataTable();
        }
      } catch (err) {
        console.error("Erro ao buscar lançamentos:", err);
        const uploadResult = document.getElementById("uploadResult");
        if (uploadResult) {
          uploadResult.style.color = "red";
          uploadResult.textContent = "Erro ao carregar lançamentos: " + err.message;
        }
      }
    }

    // Tenta buscar imediatamente; se não houver usuário, aguarda autenticação
    fetchAndPopulate();
    AuthService.onAuthChange((user) => {
      if (user) {
        fetchAndPopulate();
      }
    });
  }
}

/**
 * Ao clicar no botão "voltar" (ícone Home/Back):
 * - Esconde a página "lancar-page" e "#mail-page", se estiverem visíveis
 * - Exibe novamente a página Home
 * - Mostra o dock de apps
 * - Ajusta o hash para "#"
 */
export function goHome() {
  // Remove o menu de ícones financeiros se existir
  const financeMenu = document.getElementById("finance-icon-menu");
  if (financeMenu) {
    financeMenu.remove();
  }

  const lancarPage = document.getElementById("lancar-page");
  const mailPage = document.getElementById("mail-page");
  if (lancarPage) lancarPage.style.display = "none";
  if (mailPage) mailPage.style.display = "none";

  const homePage = document.getElementById("home-page");
  if (homePage) {
    homePage.style.display = "block";
    const homeGrid = homePage.querySelector(".home-grid");
    if (homeGrid) homeGrid.style.display = "grid";
  }

  const dock = document.querySelector(".dock");
  if (dock) dock.style.display = "flex";

  // Ajusta o hash para a rota Home
window.location.hash = "#";
}

// Tornar as funções acessíveis globalmente para os onclick inline
window.openLancar = openLancar;
window.goHome = goHome;