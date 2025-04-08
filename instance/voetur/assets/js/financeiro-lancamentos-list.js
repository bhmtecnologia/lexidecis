/**
 * @file financeiro-lancamentos-list.js
 * @description Responsável por renderizar a página de "Financeiro - Listagem de Lançamentos" no módulo financeiro,
 * realizando a consulta dos dados via API e exibindo-os em uma tabela completa com todas as informações.
 */

import { registerRoute } from "./router.js";
import AuthService, { auth, db, analytics } from "./auth.js";
import { listLancamentos, listFiliais, listFornecedores, listProjetos, listCentrosCustos } from "./api.js";

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
                    <th>Filial</th>
                    <th>Fornecedor</th>
                    <th>N° Documento</th>
                    <th>Tipo de Documento</th>
                    <th>Data de Emissão</th>
                    <th>Valor</th>
                    <th>Forma de Pagamento</th>
                    <th>Vencimento</th>
                    <th>Centro de Custo</th>
                    <th>Projeto</th>
                    <th>Justificativa</th>
                    <th>Email</th>
                    <th>Anexos</th>
                    <th>Status</th>
                    <th>Data Inclusão</th>
                    <th>Criado Em</th>
                    <th>Atualizado Em</th>
                    <th>Updated By</th>
                  </tr>
                </thead>
                <tbody></tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Overlay de Loading -->
      <div id="tableOverlay" class="d-none position-absolute top-0 start-0 w-100 h-100 bg-light bg-opacity-75 d-flex align-items-center justify-content-center" style="z-index: 1000;">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Carregando...</span>
        </div>
      </div>
    </div>
  `;

  /**
   * Formata uma data (string ISO) para o padrão 'pt-BR'.
   * @param {string} dateStr - Data no formato ISO.
   * @returns {string} Data formatada.
   */
  function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
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
   * Gera os links dos anexos.
   * Trata tanto o formato antigo (array direto) quanto o novo (objeto com propriedade "anexos").
   * @param {Object|Array} anexos - Objeto ou array de anexos.
   * @returns {string} HTML com os links dos anexos.
   */
  function formatAnexos(anexos) {
    if (!anexos) return '-';
    let lista = [];
    if (anexos.anexos && Array.isArray(anexos.anexos)) {
      lista = anexos.anexos;
    } else if (Array.isArray(anexos)) {
      lista = anexos;
    } else if (typeof anexos === 'object' && anexos.url) {
      return `<a href="${anexos.url}" target="_blank">${anexos.categoria}</a>`;
    } else {
      return '-';
    }
    return lista.map(anexo => `<a href="${anexo.url}" target="_blank">${anexo.categoria}</a>`).join('<br>');
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
        ordering: true,
        paging: true,
        dom: 'lBfrtip',
        buttons: ['copy', 'excel', 'csv', 'pdf'],
        language: {
          url: "https://cdn.datatables.net/plug-ins/1.13.4/i18n/pt-BR.json"
        },
        columnDefs: [
          { type: 'num', targets: 5 }
        ]
      });
    } else {
      console.error("DataTables não está carregado.");
    }
  }

  /**
   * Atualiza a tabela com os lançamentos obtidos via API, mapeando os IDs para os nomes dos campos gerenciais.
   */
  async function updateTable() {
    const overlay = document.getElementById('tableOverlay');
    overlay.classList.remove('d-none');

    try {
      // Carrega os dados de mapeamento para filiais, fornecedores, projetos e centros de custo
      const [filiais, fornecedores, projetos, centros] = await Promise.all([
        listFiliais(AuthService),
        listFornecedores(AuthService),
        listProjetos(AuthService),
        listCentrosCustos(AuthService)
      ]);
      window.filiaisData = filiais;
      window.fornecedoresData = fornecedores;
      window.projetosData = projetos;
      window.centrosData = centros;

      const lancamentos = await listLancamentos(AuthService);
      const tbody = document.querySelector('#lancamentosTable tbody');
      tbody.innerHTML = '';

      lancamentos.forEach(lanc => {
        const dados = lanc.dados || {};

        // Mapeia os IDs para os nomes correspondentes
        const filialObj = window.filiaisData.find(f => f.uuid === dados.filial);
        const filialName = filialObj ? filialObj.nome : dados.filial || '-';

        const fornecedorObj = window.fornecedoresData.find(f => f.uuid === dados.fornecedor);
        const fornecedorName = fornecedorObj ? fornecedorObj.nome : dados.fornecedor || '-';

        const centroObj = window.centrosData.find(c => c.uuid === dados.centro_custo);
        const centroName = centroObj ? centroObj.nome : dados.centro_custo || '-';

        const projetoObj = window.projetosData.find(p => p.uuid === dados.projeto);
        const projetoName = projetoObj ? projetoObj.nome : dados.projeto || '-';

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${lanc.id || '-'}</td>
          <td>${filialName}</td>
          <td>${fornecedorName}</td>
          <td>${dados.numeroDocumento || '-'}</td>
          <td>${dados.tipoDocumento || '-'}</td>
          <td>${dados.dataEmissao ? formatDate(dados.dataEmissao) : '-'}</td>
          <td>${dados.valor ? formatCurrency(dados.valor) : '-'}</td>
          <td>${dados.forma_pagamento || '-'}</td>
          <td>${dados.vencimento ? formatDate(dados.vencimento) : '-'}</td>
          <td>${centroName}</td>
          <td>${projetoName}</td>
          <td>${dados.justificativa || '-'}</td>
          <td>${dados.email || '-'}</td>
          <td>${formatAnexos(lanc.anexos)}</td>
          <td>${dados.status || '-'}</td>
          <td>${dados.data_inclusao ? formatDate(dados.data_inclusao) : '-'}</td>
          <td>${lanc.created_at ? formatDate(lanc.created_at) : '-'}</td>
          <td>${lanc.updated_at ? formatDate(lanc.updated_at) : '-'}</td>
          <td>${lanc.updated_by ? lanc.updated_by : '-'}</td>
        `;
        tbody.appendChild(tr);
      });

      initializeDataTable();
    } catch (error) {
      console.error("Erro ao listar lançamentos:", error);
      alert("Erro ao listar lançamentos: " + error.message);
    } finally {
      overlay.classList.add('d-none');
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