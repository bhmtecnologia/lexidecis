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
            <div style="font-size: 10px; color: #000;">Contas</div>
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

    // Quando o usuário estiver autenticado, executa a busca
    AuthService.onAuthChange(async (user) => {
      if (!user) {
        console.warn("Usuário não autenticado ao abrir Financeiro.");
        return;
      }

      try {
        // Chama a API para obter o array de lançamentos (via GET)
        const lancamentos = await listLancamentos(AuthService);

        // 5. Popula o <tbody> da tabela
        const tbody = table.querySelector("tbody");
        tbody.innerHTML = ""; // limpa linhas existentes, se houver

        // Supondo que 'lancamentos' seja um array de objetos
        lancamentos.forEach((item) => {
          const tr = document.createElement("tr");

          // Coluna ID (campo top-level 'id')
          const tdId = document.createElement("td");
          tdId.textContent = item.id || "";
          tr.appendChild(tdId);

          // Coluna Descrição (exemplo: nome do fornecedor dentro de 'dados')
          const tdDesc = document.createElement("td");
          const fornecedorNome = item.dados && item.dados.fornecedor_nome 
                                 ? item.dados.fornecedor_nome 
                                 : "";
          tdDesc.textContent = fornecedorNome;
          tr.appendChild(tdDesc);

          // Coluna Valor (exemplo: 'valor_nominal' dentro de 'dados')
          const tdValor = document.createElement("td");
          const valorNominal = item.dados && item.dados.valor_nominal 
                               ? item.dados.valor_nominal 
                               : "";
          tdValor.textContent = valorNominal;
          tr.appendChild(tdValor);

          tbody.appendChild(tr);
        });

        // 6. (Re)Inicializa o DataTable
        if (window.$ && $.fn.DataTable) {
          const selector = "#finance-table";
          if ($.fn.DataTable.isDataTable(selector)) {
            $(selector).DataTable().clear().destroy();
          }
          $(selector).DataTable({
            // Aqui você pode adicionar opções de DataTables, se necessário.
          });
        }
      } catch (err) {
        console.error("Erro ao buscar lançamentos:", err);
        // Opcional: exibir mensagem de erro na tela
        const uploadResult = document.getElementById("uploadResult");
        if (uploadResult) {
          uploadResult.style.color = "red";
          uploadResult.textContent = "Erro ao carregar lançamentos: " + err.message;
        }
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