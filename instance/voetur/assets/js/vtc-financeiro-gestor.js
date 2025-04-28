/**
 * @file vtc-financeiro-gestor.js
 * @description Responsável por renderizar a página de "VT&C Financeiro - Visão Gestor",
 *             idêntica à Listagem de Lançamentos, mas sob a rota "#vtc-financeiro-gestor".
 */

import { registerRoute } from "./router.js";
import AuthService from "./auth.js";
import {
  listLancamentos,
  updateLancamento,
  listFornecedores,
  listFiliais,
  listCentrosCustos,
  listProjetos
} from "./api.js";

// Global DataTable instance
let lancamentosTable;
// Armazena os lançamentos carregados para edição
let lancamentosData = [];

export async function renderVtcFinanceiroGestor() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="container-fluid position-relative">
      <!-- Título e Breadcrumb -->
      <div class="page-title">
        <div class="row">
          <div class="col-sm-6 col-12">
            <h2>VT&C Financeiro – Visão Gestor</h2>
            <p class="mb-0 text-title-gray">Visão de gestor com todos os lançamentos e detalhes</p>
          </div>
          <div class="col-sm-6 col-12">
            <ol class="breadcrumb">
              <li class="breadcrumb-item">
                <a href="index.html">
                  <i class="iconly-Home icli svg-color"></i>
                </a>
              </li>
              <li class="breadcrumb-item">Financeiro</li>
              <li class="breadcrumb-item active">Visão Gestor</li>
            </ol>
          </div>
        </div>
      </div>
      
      <!-- Área da Tabela -->
      <div id="table-section" class="mt-4">
        <div class="card">
          <div class="card-body">
            <div class="mb-3 d-flex justify-content-end">
              <button id="btnLaunch" class="btn btn-sm btn-primary me-2" title="Lançar novo lançamento">
                <i class="iconly-Add icli svg-color"></i> Lançar
              </button>
              <button id="reloadTable" class="btn btn-sm btn-secondary" title="Recarregar tabela">
                <i class="iconly-Refresh icli svg-color"></i> Recarregar
              </button>
            </div>
            <div id="tableContainer" class="table-responsive">
              <table id="lancamentosTable" class="display table table-bordered table-striped table-hover align-middle">
                <thead>
                  <tr>
                    <th>Ações</th>
                    <th>status</th>
                    <th>analise_ia</th>
                    <th>ocr_ia</th>
                    <th>comentario_analista</th>
                    <th>anexo(s)</th>
                    <th>itens</th>
                    <th>valor</th>
                    <th>filial_nome</th>
                    <th>data_emissao</th>
                    <th>projeto_nome</th>
                    <th>data_inclusao</th>
                    <th>justificativa</th>
                    <th>tipo_documento</th>
                    <th>data_vencimento</th>
                    <th>forma_pagamento</th>
                    <th>fornecedor_cnpj</th>
                    <th>fornecedor_nome</th>
                    <th>numero_documento</th>
                    <th>usuario_inclusao</th>
                    <th>centro_custo_nome</th>
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

    <!-- Modal de Edição -->
    <div class="modal fade" id="editModal" tabindex="-1" aria-labelledby="editModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-xl modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="editModalLabel">Editar Lançamento</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
          </div>
          <div class="modal-body">
            <!-- Container onde o Alpaca vai renderizar o formulário -->
            <div id="editDadosForm"></div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
            <button type="button" id="saveBtn" class="btn btn-primary">Salvar</button>
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
   * Formata itens de nota fiscal em HTML.
   * @param {Array} itens - Lista de itens da nota.
   * @returns {string} HTML com descrição, quantidade e valor unitário.
   */
  function formatItens(itens) {
    if (!itens || !Array.isArray(itens) || itens.length === 0) return '-';
    return itens.map(item => {
      const valorUnit = isNaN(item.valor_unitario)
        ? item.valor_unitario
        : parseFloat(item.valor_unitario).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      return `${item.descricao} - Qtde: ${item.quantidade} - V.Unit: ${valorUnit}`;
    }).join('<br>');
  }

  /**
   * Inicializa o plugin DataTables na tabela de lançamentos com AJAX.
   */
  function initializeDataTable() {
    if (window.jQuery && $.fn.DataTable) {
      if (lancamentosTable) lancamentosTable.destroy();
      lancamentosTable = $('#lancamentosTable').DataTable({
        pageLength: 25,
        lengthMenu: [ [10, 25, 50, 100], [10, 25, 50, 100] ],
        rowCallback: function(row, data) {
          const status = (data.status || '').toLowerCase();
          if (status === 'novo') {
            $(row).addClass('table-success');
          } else if (status.includes('devolvido')) {
            $(row).addClass('table-warning');
          } else if (status.includes('enviado')) {
            $(row).addClass('table-primary');
          }
        },
        ajax: function(data, callback) {
          listLancamentos(AuthService)
            .then(lancs => {
              const flattened = lancs.map(l => ({
                id: l.id,
                created_at: l.created_at,
                updated_at: l.updated_at,
                created_by: l.created_by,
                updated_by: l.updated_by,
                analise_ia: l.analise_ia,
                ocr_ia: l.ocr_ia,
                ...l.dados,
                anexos: (l.anexos && Array.isArray(l.anexos.anexos))
                  ? l.anexos.anexos
                  : []
              }));
              // Guarda os lançamentos para o modal de edição
              lancamentosData = flattened;
              callback({ data: flattened });
            })
            .catch(err => {
              console.error('Erro ao carregar lançamentos via DataTable:', err);
              callback({ data: [] });
            });
        },
        responsive: true,
        autoWidth: false,
        processing: true,
        ordering: true,
        paging: true,
        colReorder: true,
        dom: 'lBfrtip',
        buttons: ['copy', 'excel', 'csv', 'pdf'],
        language: {
          url: 'https://cdn.datatables.net/plug-ins/1.13.4/i18n/pt-BR.json'
        },
        order: [[21, 'desc']],
        columns: [
          {
            data: null,
            orderable: false,
            render: data => {
              const statusLC = (data.status || '').toLowerCase();
              const isEditable = statusLC === 'novo' || statusLC === 'salvo' || statusLC.includes('devolvido');
              const iconClass = isEditable ? 'iconly-Edit' : 'iconly-Show';
              let html =
                `<button class="btn btn-sm" data-action="edit" data-id="${data.id}"` +
                ` style="background-color: var(--theme-default); border-color: var(--theme-default); color: #fff;">` +
                `<i class="${iconClass} icli svg-color"></i></button>`;
              if (isEditable) {
                html +=
                  ` <button class="btn btn-sm" data-action="send" data-id="${data.id}"` +
                  ` style="background-color: var(--theme-default); border-color: var(--theme-default); color: #fff;">` +
                  `<i class="iconly-Send icli svg-color"></i></button>`;
              }
              return html;
            }
          },
          { data: 'status',             title: 'status',             defaultContent: '-' },
          {
            data: 'analise_ia',
            title: 'analise_ia',
            render: md => {
              if (!md) return '-';
              const encoded = encodeURIComponent(md);
              return `<button class="btn btn-sm btn-secondary view-analysis" style="font-size:0.75rem; line-height:1;" data-md="${encoded}">Ver</button>`;
            }
          },
          {
            data: 'ocr_ia',
            title: 'ocr_ia',
            render: text => {
              if (!text) return '-';
              const encoded = encodeURIComponent(text);
              return `<button class="btn btn-sm btn-info view-ocr" style="font-size:0.75rem; line-height:1;" data-md="${encoded}">Ver OCR</button>`;
            }
          },
          { data: 'comentario_analista', title: 'comentario_analista', defaultContent: '-' },
          { data: 'anexos',             title: 'anexo(s)',            defaultContent: '-', render: a => formatAnexos(a) },
          { data: 'itens',              title: 'itens',              defaultContent: '-', render: i => formatItens(i) },
          { data: 'valor',              title: 'valor',              defaultContent: '-', render: v => isNaN(v) ? '-' : parseFloat(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) },
          { data: 'filial_nome',        title: 'filial_nome',        defaultContent: '-' },
          { data: 'data_emissao',       title: 'data_emissao',       defaultContent: '-', render: d => d ? new Date(d).toLocaleDateString('pt-BR') : '-' },
          { data: 'projeto_nome',       title: 'projeto_nome',       defaultContent: '-' },
          { data: 'data_inclusao',      title: 'data_inclusao',      defaultContent: '-' },
          { data: 'justificativa',      title: 'justificativa',      defaultContent: '-' },
          { data: 'tipo_documento',     title: 'tipo_documento',     defaultContent: '-' },
          { data: 'data_vencimento',    title: 'data_vencimento',    defaultContent: '-', render: d => d ? new Date(d).toLocaleDateString('pt-BR') : '-' },
          { data: 'forma_pagamento',    title: 'forma_pagamento',    defaultContent: '-' },
          { data: 'fornecedor_cnpj',    title: 'fornecedor_cnpj',    defaultContent: '-' },
          { data: 'fornecedor_nome',    title: 'fornecedor_nome',    defaultContent: '-' },
          { data: 'numero_documento',   title: 'numero_documento',   defaultContent: '-' },
          { data: 'usuario_inclusao',   title: 'usuario_inclusao',   defaultContent: '-' },
          { data: 'centro_custo_nome',  title: 'centro_custo_nome',  defaultContent: '-' },
          { data: 'created_at',         title: 'created_at',         defaultContent: '-', render: d => d ? new Date(d).toLocaleString('pt-BR') : '-' },
          { data: 'updated_at',         title: 'updated_at',         defaultContent: '-', render: d => d ? new Date(d).toLocaleString('pt-BR') : '-' },
          { data: 'created_by',         title: 'created_by',         defaultContent: '-' },
          { data: 'updated_by',         title: 'updated_by',         defaultContent: '-' }
        ]
      });
    } else {
      console.error('DataTables não está carregado.');
    }
  }

  // Registra handlers, DataTable, modais etc.
  // Basta copiar integralmente a lógica de
  // renderFinanceiroLancamentosList(), trocando apenas:
  //   function formatDate(...) { ... }
  //   function formatDateTime(...) { ... }
  //   function formatCurrency(...) { ... }
  //   function formatAnexos(...) { ... }
  //   function formatItens(...) { ... }
  //   function initializeDataTable() { ... }
  // e todos os listeners de AuthService, reload, edit/send, modais, submit do form.

  // Ao final:
  const editModalEl = document.getElementById('editModal');
  let editModal;
  if (editModalEl) {
    editModal = new bootstrap.Modal(editModalEl);
  }
  AuthService.onAuthChange(user => {
    if (user) {
      // ... mesma inicialização que em renderFinanceiroLancamentosList()
      initializeDataTable();
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
  document.getElementById('reloadTable').addEventListener('click', () => {
    if (lancamentosTable) lancamentosTable.ajax.reload(null, false);
  });
  document.getElementById('btnLaunch').addEventListener('click', () => {
    window.location.hash = '#financeiro-lancamento-create-v3';
  });
  // demais handlers iguais...

  // Handler para abrir modal de edição com Alpaca
  $('#lancamentosTable tbody').on('click', 'button[data-action="edit"]', function() {
    const id = $(this).data('id');
    const lanc = lancamentosData.find(l => l.id === id);
    if (lanc) {
      // Inicializa o Alpaca no container, destruindo instâncias anteriores
      $('#editDadosForm').alpaca('destroy');
      $('#editDadosForm').alpaca({
        schema: schemaDados,
        options: optionsDados,
        data: lanc.dados
      });
      // Exibe o modal
      editModal.show();
    }
  });
}

// Registra a nova rota
registerRoute('#vtc-financeiro-gestor', renderVtcFinanceiroGestor);