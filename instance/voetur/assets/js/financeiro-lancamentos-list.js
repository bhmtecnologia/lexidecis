/**
 * @file financeiro-lancamentos-list.js
 * @description Responsável por renderizar a página de "Financeiro - Listagem de Lançamentos" no módulo financeiro,
 * realizando a consulta dos dados via API e exibindo-os em uma tabela completa com todas as informações.
 */

import { registerRoute } from "./router.js";
import AuthService from "./auth.js";
import { listLancamentos } from "./api.js";

/**
 * Renderiza a tela de "Financeiro - Listagem de Lançamentos".
 * Define a estrutura HTML da página, configura a tabela e atualiza os dados via API.
 */
export async function renderFinanceiroLancamentosList() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="container-fluid position-relative">
      <!-- Título e Breadcrumb -->
      <div class="page-title">
        <div class="row">
          <div class="col-sm-6 col-12">
            <h2>Financeiro - Listagem de Lançamentos</h2>
            <p class="mb-0 text-title-gray">Visualize todos os lançamentos cadastrados com todos os detalhes</p>
          </div>
          <div class="col-sm-6 col-12">
            <ol class="breadcrumb">
              <li class="breadcrumb-item">
                <a href="index.html">
                  <i class="iconly-Home icli svg-color"></i>
                </a>
              </li>
              <li class="breadcrumb-item">Financeiro</li>
              <li class="breadcrumb-item active">Listagem de Lançamentos</li>
            </ol>
          </div>
        </div>
      </div>
      
      <!-- Área da Tabela -->
      <div id="table-section" class="mt-4">
        <div class="card">
          <div class="card-body">
            <div id="tableContainer" class="table-responsive">
              <table id="lancamentosTable" class="display table table-bordered table-striped">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>uid</th>
                    <th>app_id</th>
                    <th>status</th>
                    <th>valor</th>
                    <th>filial_nome</th>
                    <th>filial_uuid</th>
                    <th>data_emissao</th>
                    <th>projeto_nome</th>
                    <th>projeto_uuid</th>
                    <th>data_inclusao</th>
                    <th>justificativa</th>
                    <th>tipo_documento</th>
                    <th>data_vencimento</th>
                    <th>forma_pagamento</th>
                    <th>fornecedor_cnpj</th>
                    <th>fornecedor_nome</th>
                    <th>fornecedor_uuid</th>
                    <th>filial_id_benner</th>
                    <th>numero_documento</th>
                    <th>usuario_inclusao</th>
                    <th>centro_custo_nome</th>
                    <th>centro_custo_uuid</th>
                    <th>projeto_id_benner</th>
                    <th>fornecedor_id_benner</th>
                    <th>conta_financeira_nome</th>
                    <th>conta_financeira_uuid</th>
                    <th>centro_custo_id_benner</th>
                    <th>conta_financeira_codigo</th>
                    <th>conta_financeira_estrutura</th>
                    <th>conta_financeira_id_benner</th>
                    <th>anexo(s)</th>
                    <th>created_at</th>
                    <th>updated_at</th>
                    <th>created_by</th>
                    <th>updated_by</th>
                  </tr>
                </thead>
                <tbody></tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  /**
   * Formata uma data (string ISO) para o padrão 'pt-BR' (apenas data).
   * @param {string} dateStr - Data no formato ISO.
   * @returns {string} Data formatada.
   */
  function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  }

  /**
   * Formata uma data e hora (string ISO) para o formato 'dd/mm/aaaa hh:mm:ss'.
   * @param {string} dateStr - Data no formato ISO.
   * @returns {string} Data e hora formatadas.
   */
  function formatDateTime(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
      timeZone: 'UTC'
    });
  }

  /**
   * Formata um valor numérico para o formato de moeda BRL.
   * @param {number|string} value - Valor a ser formatado.
   * @returns {string} Valor formatado como moeda.
   */
  function formatCurrency(value) {
    if (isNaN(value)) return '-';
    return parseFloat(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  /**
   * Gera os links dos anexos a partir do array de anexos.
   * @param {Array} anexos - Array de anexos.
   * @returns {string} HTML com os links dos anexos.
   */
  function formatAnexos(anexos) {
    if (!anexos || !Array.isArray(anexos) || anexos.length === 0) return '-';
    return anexos.map(anexo => `<a href="${anexo.url}" target="_blank">${anexo.categoria}</a>`).join('<br>');
  }

  /**
   * Inicializa o plugin DataTables na tabela de lançamentos.
   */
  function initializeDataTable() {
    if (window.jQuery && $.fn.DataTable) {
      if ($.fn.DataTable.isDataTable("#lancamentosTable")) {
        $("#lancamentosTable").DataTable().destroy();
      }
      $("#lancamentosTable").DataTable({
        responsive: true,
        autoWidth: false,
        processing: true,
        ordering: true,
        paging: true,
        colReorder: true,
        dom: 'lBfrtip',
        buttons: ['copy', 'excel', 'csv', 'pdf'],
        language: {
          url: "https://cdn.datatables.net/plug-ins/1.13.4/i18n/pt-BR.json"
        },
        order: [[33, 'desc']],
        columnDefs: [
          { type: 'num', targets: 0 }
        ]
      });
    } else {
      console.error("DataTables não está carregado.");
    }
  }

  /**
   * Atualiza a tabela com os lançamentos obtidos via API, exibindo todos os campos do objeto dados e os campos top-level.
   */
  async function updateTable() {
    try {
      const lancamentos = await listLancamentos(AuthService);
      const tbody = document.querySelector('#lancamentosTable tbody');
      tbody.innerHTML = '';

      lancamentos.forEach(lanc => {
        const dados = lanc.dados || {};
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${lanc.id || '-'}</td>
          <td>${dados.uid || '-'}</td>
          <td>${dados.app_id || '-'}</td>
          <td>${dados.status || '-'}</td>
          <td>${dados.valor ? formatCurrency(dados.valor) : '-'}</td>
          <td>${dados.filial_nome || '-'}</td>
          <td>${dados.filial_uuid || '-'}</td>
          <td>${dados.data_emissao ? formatDate(dados.data_emissao) : '-'}</td>
          <td>${dados.projeto_nome || '-'}</td>
          <td>${dados.projeto_uuid || '-'}</td>
          <td>${dados.data_inclusao ? dados.data_inclusao : '-'}</td>
          <td>${dados.justificativa || '-'}</td>
          <td>${dados.tipo_documento || '-'}</td>
          <td>${dados.data_vencimento ? formatDate(dados.data_vencimento) : '-'}</td>
          <td>${dados.forma_pagamento || '-'}</td>
          <td>${dados.fornecedor_cnpj || '-'}</td>
          <td>${dados.fornecedor_nome || '-'}</td>
          <td>${dados.fornecedor_uuid || '-'}</td>
          <td>${dados.filial_id_benner || '-'}</td>
          <td>${dados.numero_documento || '-'}</td>
          <td>${dados.usuario_inclusao || '-'}</td>
          <td>${dados.centro_custo_nome || '-'}</td>
          <td>${dados.centro_custo_uuid || '-'}</td>
          <td>${dados.projeto_id_benner || '-'}</td>
          <td>${dados.fornecedor_id_benner || '-'}</td>
          <td>${dados.conta_financeira_nome || '-'}</td>
          <td>${dados.conta_financeira_uuid || '-'}</td>
          <td>${dados.centro_custo_id_benner || '-'}</td>
          <td>${dados.conta_financeira_codigo || '-'}</td>
          <td>${dados.conta_financeira_estrutura || '-'}</td>
          <td>${dados.conta_financeira_id_benner || '-'}</td>
          <td>${(dados.anexo && Array.isArray(dados.anexo)) ? formatAnexos(dados.anexo) : '-'}</td>
          <td>${lanc.created_at ? formatDateTime(lanc.created_at) : '-'}</td>
          <td>${lanc.updated_at ? formatDateTime(lanc.updated_at) : '-'}</td>
          <td>${lanc.created_by || '-'}</td>
          <td>${lanc.updated_by || '-'}</td>
        `;
        tbody.appendChild(tr);
      });

      initializeDataTable();
    } catch (error) {
      console.error("Erro ao listar lançamentos:", error);
      alert("Erro ao listar lançamentos: " + error.message);
    }
  }

  // Monitora a autenticação para exibir a tabela somente se o usuário estiver logado
  AuthService.onAuthChange((user) => {
    if (user) {
      updateTable();
    } else {
      content.innerHTML = `
        <div class="container-fluid">
          <div class="alert alert-warning text-center mt-4">
            Autenticação necessária
          </div>
        </div>
      `;
    }
  });
}

// Registra a rota para a página de "Financeiro - Listagem de Lançamentos"
registerRoute('#financeiro-lancamentos-list', renderFinanceiroLancamentosList);