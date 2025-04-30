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
                    <th>Status</th>
                    <th>Filial</th>
                    <th>Fornecedor</th>
                    <th>Valor</th>
                    <th>Data Emissão</th>
                    <th>Atualizado Em</th>
                    <th>Forma de Pagamento</th>
                    <th>Comentário</th>
                    <th>Anexos</th>
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
            <form id="editFormContainer"></form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
            <button type="button" id="saveBtn" class="btn btn-primary">Salvar</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de Log -->
    <div class="modal fade" id="logModal" tabindex="-1" aria-labelledby="logModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-lg modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="logModalLabel">Log do Lançamento</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
          </div>
          <div class="modal-body">
            <ul id="logList" class="list-group"></ul>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
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
        buttons: ['copy', 'excel'],
        language: {
          url: 'https://cdn.datatables.net/plug-ins/1.13.4/i18n/pt-BR.json'
        },
        order: [[6, 'desc']],
        columns: [
          {
            data: null,
            orderable: false,
            render: data => {
              const statusLC = (data.status || '').toLowerCase();
              const isEditable = statusLC === 'novo' || statusLC === 'salvo' || statusLC.includes('devolvido');
              let html = `<div style="display:inline-flex; gap:4px;">`;
              if (isEditable) {
                html += `
      <button class="btn btn-sm btn-aprovar" data-action="send" data-id="${data.id}" title="Enviar"
              style="background-color: #d4edda; border: 1px solid #c3e6cb; color: #155724;">
        <i class="iconly-Send icli svg-color"></i>
      </button>
      <button class="btn btn-sm btn-editar" data-action="edit" data-id="${data.id}" title="Editar"
              style="background-color: #fff3cd; border: 1px solid #ffeeba; color: #856404;">
        <i class="iconly-Edit icli svg-color"></i>
      </button>`;
              } else {
                html += `
      <button class="btn btn-sm btn-editar" data-action="view" data-id="${data.id}" title="Visualizar"
              style="background-color: #fff3cd; border: 1px solid #ffeeba; color: #856404;">
        <i class="iconly-Show icli svg-color"></i>
      </button>`;
              }
              html += `</div>`;
              return html;
            }
          },
          {
            data: 'status',
            title: 'Status',
            defaultContent: '-',
            render: (data, type, row) =>
              `<span class="status-clickable" data-id="${row.id}" style="cursor:pointer; color: var(--theme-default);">${data}</span>`
          },
          { data: 'filial_nome',       title: 'Filial',            defaultContent: '-' },
          { data: 'fornecedor_nome',   title: 'Fornecedor',        defaultContent: '-' },
          { data: 'valor_nominal',     title: 'Valor',             defaultContent: '-', render: v => isNaN(v) ? '-' : parseFloat(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) },
          { data: 'data_emissao',      title: 'Data Emissão',      defaultContent: '-', render: d => d ? new Date(d).toLocaleDateString('pt-BR') : '-' },
          { data: 'updated_at',        title: 'Atualizado Em',     defaultContent: '-', render: u => u ? new Date(u).toLocaleString('pt-BR') : '-' },
          { data: 'forma_pagamento',   title: 'Forma de Pagamento', defaultContent: '-' },
          { data: 'comentario_analista', title: 'Comentário',       defaultContent: '-' },
          { data: 'anexos',            title: 'Anexos',            defaultContent: '-', render: a => formatAnexos(a) }
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

  let currentLanc;

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
      currentLanc = lanc;
      // Gera formulário editável com campos principais
      const fields = ['justificativa', 'data_emissao', 'valor_nominal', 'forma_pagamento'];
      let formHtml = '';
      fields.forEach(key => {
        const value = lanc[key] !== null && lanc[key] !== undefined ? lanc[key] : '';
        // Escolhe tipo de input baseado na chave
        const type = key === 'data_emissao' ? 'date' : key === 'valor' ? 'number' : 'text';
        formHtml +=
          `<div class="mb-3">
             <label for="field_${key}" class="form-label">${key.replace('_', ' ').replace(/\b\w/g, l=>l.toUpperCase())}</label>
             <input type="${type}" class="form-control" id="field_${key}" name="${key}" value="${value}">
           </div>`;
      });
      $('#editFormContainer').html(formHtml);
      // Exibe o modal
      editModal.show();
    }
  });
  // Handler para enviar lançamento
  $('#lancamentosTable tbody').on('click', 'button[data-action="send"]', function() {
    // Disable button and show loading spinner
    const btn = $(this);
    const originalHtml = btn.html();
    btn.prop('disabled', true)
       .html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>');
    
    const id = btn.data('id');
    const lanc = lancamentosData.find(l => l.id === id);
    if (!lanc) {
      console.error('Lançamento não encontrado para envio:', id);
      // Restore button state if no lanc found
      btn.prop('disabled', false).html(originalHtml);
      return;
    }
    const now = new Date();
    const isoString = now.toISOString();
    const userEmail = AuthService.user.email;
    console.log(`Enviado para a controladoria pelo usuário: ${userEmail}`);
    console.log(`Data: ${isoString}`);
    const { id: _, created_at, updated_at, created_by, updated_by, analise_ia, ocr_ia, ...dados } = lanc;
    const logEntry = `${now.toLocaleString('pt-BR', { hour12: false })} - Enviado para a controladoria pelo usuário: ${userEmail}`;
    const dadosComLog = {
      ...dados,
      log: Array.isArray(dados.log) ? [...dados.log, logEntry] : [logEntry]
    };
    const payload = {
      ...dadosComLog,
      status: 'Enviado Controladoria',
      enviado_por: userEmail,
      data_envio: isoString
    };
    
    updateLancamento(AuthService, id, payload)
      .then(() => {
        if (lancamentosTable) lancamentosTable.ajax.reload(null, false);
      })
      .catch(err => {
        console.error('Erro ao enviar lançamento:', err);
      })
      .finally(() => {
        // Restore button state
        btn.prop('disabled', false).html(originalHtml);
      });
  });

  // Handler para salvar edição
  document.getElementById('saveBtn').addEventListener('click', () => {
    const form = document.getElementById('editFormContainer');
    const updated = {};
    ['justificativa', 'data_emissao', 'valor_nominal', 'forma_pagamento'].forEach(key => {
      const el = form.querySelector(`[name="${key}"]`);
      if (el) {
        updated[key] = el.value;
      }
    });
    // Envia atualização
    updateLancamento(AuthService, currentLanc.id, updated)
      .then(() => {
        if (lancamentosTable) lancamentosTable.ajax.reload(null, false);
        editModal.hide();
      })
      .catch(err => console.error('Erro ao salvar edição:', err));
  });

  // Inicializa modal de log
  const logModalEl = document.getElementById('logModal');
  const logModal = logModalEl ? new bootstrap.Modal(logModalEl) : null;
  $('#lancamentosTable tbody').on('click', 'span.status-clickable', function() {
    const id = $(this).data('id');
    const lanc = lancamentosData.find(l => l.id === id);
    if (!lanc) {
      console.error('Lançamento não encontrado para exibir log:', id);
      return;
    }
    const logList = document.getElementById('logList');
    logList.innerHTML = '';
    if (Array.isArray(lanc.log) && lanc.log.length) {
      lanc.log.forEach(entry => {
        const li = document.createElement('li');
        li.className = 'list-group-item';
        li.textContent = entry;
        logList.appendChild(li);
      });
    } else {
      const li = document.createElement('li');
      li.className = 'list-group-item';
      li.textContent = 'Nenhum log disponível.';
      logList.appendChild(li);
    }
    if (logModal) logModal.show();
  });
}

// Registra a nova rota
registerRoute('#vtc-financeiro-gestor', renderVtcFinanceiroGestor);