/**
 * @file vtc-financeiro-gestor.js
 * @description Responsável por renderizar a página de "VTC Financeiro - Visão Gestor",
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
            <h2>VTC Financeiro – Visão Gestor</h2>
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
            <h5 class="modal-title" id="logModalLabel">Histórico de Logs</h5>
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
                dados: l.dados,
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
              if (!data || !data.id) {
                return '-';
              }
              const statusLC = (data.status || '').toLowerCase();
              const isEditable = statusLC === 'novo'
                || statusLC === 'salvo'
                || statusLC.includes('devolvido')
                || statusLC === 'importado por lote';
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
              style="background-color: #d1ecf1; border: 1px solid #bee5eb; color: #0c5460;">
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
            render: (data, type, row) => {
              const display = data || '-';
              return `<span class="status-clickable" data-id="${row.id}" style="cursor:pointer; color: var(--theme-default);">${display}</span>`;
            }
          },
          { data: 'filial_nome',       title: 'Filial',            defaultContent: '-' },
          { data: 'fornecedor_nome',   title: 'Fornecedor',        defaultContent: '-' },
          { data: 'valor_nominal',     title: 'Valor',             defaultContent: '-', render: v => isNaN(v) ? '-' : parseFloat(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) },
          { data: 'data_emissao',      title: 'Data Emissão',      defaultContent: '-', render: d => d ? new Date(d).toLocaleDateString('pt-BR') : '-' },
          { data: 'updated_at',        title: 'Atualizado Em',     defaultContent: '-', render: u => u ? new Date(u).toLocaleString('pt-BR') : '-' },
          { data: 'forma_pagamento',   title: 'Forma de Pagamento', defaultContent: '-' },
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

  // Handler para abrir modal de edição com estrutura estática (igual create-v3)
  $('#lancamentosTable tbody').on('click', 'button[data-action="edit"]', function() {
    const id = $(this).data('id');
    const lanc = lancamentosData.find(l => l.id === id);
    if (lanc) {
      currentLanc = lanc;
      $('#editFormContainer').empty();
      const data = currentLanc.dados;
      // Normalize log content
      const logContent = Array.isArray(data.log)
        ? data.log.join('\n')
        : (typeof data.log === 'string' ? data.log : '');
      // Normalize attachments for edit form
      let attachments = [];
      try {
        attachments = Array.isArray(data.anexo) ? data.anexo
          : (typeof data.anexo === 'string' ? JSON.parse(data.anexo) : []);
      } catch (e) {
        attachments = [];
      }
      // Build edit form based on document type
      const isNF = data.tipo_documento === 'Nota Fiscal';
      const isCP = data.tipo_documento === 'Conta a pagar';
      const formHtml = `
        <div class="mb-3">
          <label for="tipoDocumento" class="form-label">Tipo de Documento</label>
          <select id="tipoDocumento" name="tipo_documento" class="form-control" disabled>
            <option>${data.tipo_documento}</option>
          </select>
        </div>
        <!-- Link dos anexos -->
        <div class="mb-3" id="attachmentLink">
          ${attachments.length
            ? attachments.map(a => `<a href="${a.url}" target="_blank">${a.categoria}</a>`).join('<br>')
            : '-'}
        </div>
        <div class="mb-3">
          <label for="filialSelect" class="form-label mb-0">Filial <span class="text-danger">*</span></label>
          <select id="filialSelect" name="filial_id" class="form-control select2"></select>
        </div>
        <div class="mb-3">
          <label for="fornecedorSelect" class="form-label mb-0">Fornecedor <span class="text-danger">*</span></label>
          <select id="fornecedorSelect" name="fornecedor_id" class="form-control select2"></select>
        </div>
        <div class="mb-3">
          <label for="centroCustoSelect" class="form-label mb-0">Centro de Custo <span class="text-danger">*</span></label>
          <select id="centroCustoSelect" name="centro_custo_id" class="form-control select2"></select>
        </div>
        <div class="mb-3">
          <label for="projetoSelect" class="form-label mb-0">Projeto</label>
          <select id="projetoSelect" name="projeto_id" class="form-control select2"></select>
        </div>
        <div class="mb-3">
          <label for="formaPagamentoSelect" class="form-label">Forma de Pagamento <span class="text-danger">*</span></label>
          <select id="formaPagamentoSelect" name="forma_pagamento" class="form-control">
            <option value="">Selecione...</option>
            <option value="boleto" ${data.forma_pagamento === 'boleto' ? 'selected' : ''}>Boleto</option>
            <option value="pix" ${data.forma_pagamento === 'pix' ? 'selected' : ''}>Pix</option>
            <option value="deposito" ${data.forma_pagamento === 'deposito' ? 'selected' : ''}>Depósito</option>
          </select>
        </div>
        ${isCP ? `
        <div class="mb-3">
          <label for="moedaSelect" class="form-label">Moeda</label>
          <select id="moedaSelect" name="moeda" class="form-control">
            <option ${data.moeda === 'BRL' ? 'selected' : ''}>BRL</option>
            <option ${data.moeda === 'USD' ? 'selected' : ''}>USD</option>
          </select>
        </div>` : ''}
        <div class="mb-3">
          <label for="valorInput" class="form-label">Valor Nominal <span class="text-danger">*</span></label>
          <input type="text" id="valorInput" name="valor_nominal" class="form-control mask-currency" value="${data.valor_nominal != null ? parseFloat(data.valor_nominal).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}" required>
        </div>
        <div class="mb-3">
          <label for="dataEmissaoInput" class="form-label">Data Emissão <span class="text-danger">*</span></label>
          <input type="date" id="dataEmissaoInput" name="data_emissao" class="form-control" value="${data.data_emissao ? data.data_emissao.split('T')[0] : ''}" required>
        </div>
        ${isNF ? `
        <div class="mb-3">
          <label class="form-label">Itens da Nota Fiscal <span class="text-danger">*</span></label>
          <table class="table table-sm" id="itensTable">
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Quantidade</th>
                <th>Valor Unitário</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              ${Array.isArray(data.itens) ? data.itens.map((item, idx) => `
                <tr>
                  <td><input type="text" name="itemDescricao[]" class="form-control" value="${item.descricao || ''}" /></td>
                  <td><input type="number" name="itemQuantidade[]" class="form-control" step="0.0001" value="${item.quantidade || ''}" /></td>
                  <td><input type="text" name="itemValorUnitario[]" class="form-control mask-currency" value="${item.valor_unitario != null ? parseFloat(item.valor_unitario).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}" /></td>
                  <td><button type="button" class="btn btn-sm btn-danger remove-item">Remover</button></td>
                </tr>`).join('') : ''}
            </tbody>
          </table>
          <button type="button" id="addItemBtn" class="btn btn-sm btn-secondary">Adicionar item</button>
        </div>` : ''}
        <div class="mb-3">
          <label for="justificativaInput" class="form-label">Justificativa <span class="text-danger">*</span></label>
          <textarea id="justificativaInput" name="justificativa" class="form-control" rows="3">${data.justificativa || ''}</textarea>
        </div>
        <!-- Log de ações -->
        <div class="mb-3">
          <label for="logTextarea" class="form-label">Log</label>
          <textarea id="logTextarea" name="log" class="form-control" rows="5" readonly>${logContent}</textarea>
        </div>
        <!-- add other common fields as needed -->
      `;
        $('#editFormContainer').html(formHtml);
        // Handler to add and remove NF item rows
        $('#addItemBtn').on('click', function() {
          $('#itensTable tbody').append(`
            <tr>
              <td><input type="text" name="itemDescricao[]" class="form-control" /></td>
              <td><input type="number" name="itemQuantidade[]" class="form-control" step="0.0001" /></td>
              <td><input type="text" name="itemValorUnitario[]" class="form-control mask-currency" /></td>
              <td><button type="button" class="btn btn-sm btn-danger remove-item">Remover</button></td>
            </tr>
          `);
        });
        $('#editFormContainer').on('click', '.remove-item', function() {
          const rows = $('#itensTable tbody tr');
          if (rows.length > 1) {
            $(this).closest('tr').remove();
          } else {
            alert('Deve ter pelo menos um item na nota fiscal');
          }
        });
        // Apply currency mask on inputs
        function formatCurrencyInput(el) {
          const oldValue = el.value;
          const oldLen = oldValue.length;
          const oldPos = el.selectionStart;
          let v = el.value.replace(/[^\d,]/g, '').replace(/\./g, '');
          v = v.replace(/,/, '.') || '0';
          const num = parseFloat(v);
          if (!isNaN(num)) {
            el.value = num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const newValue = el.value;
            const newLen = newValue.length;
            const newPos = oldPos + (newLen - oldLen);
            el.setSelectionRange(newPos, newPos);
          }
        }
        $('#valorInput').on('keyup', function(e) {
          if (e.key !== 'Backspace' && e.key !== 'Delete') {
            formatCurrencyInput(this);
          }
        });
        $('#editFormContainer').on('keyup', 'input.mask-currency', function(e) {
          if (e.key !== 'Backspace' && e.key !== 'Delete') {
            formatCurrencyInput(this);
          }
        });

      // --- Select2 initialization logic as in create-v3 ---
      // Filial
      listFiliais(AuthService).then(filiais => {
        const select = $('#filialSelect');
        select.empty();
        if (data.filial_id && data.filial_nome) {
          select.append(`<option value="${data.filial_id}" selected>${data.filial_nome}</option>`);
        }
        filiais.forEach(f => {
          if (String(f.id) !== String(data.filial_id)) {
            select.append(`<option value="${f.id}">${f.nome}</option>`);
          }
        });
        select.val(data.filial_id).trigger('change');
        select.select2({
          placeholder: 'Selecione a filial',
          allowClear: true,
          width: '100%'
        });
      });
      // Fornecedor
      listFornecedores(AuthService).then(fornecedores => {
        const select = $('#fornecedorSelect');
        select.empty();
        if (data.fornecedor_id && data.fornecedor_nome) {
          select.append(`<option value="${data.fornecedor_id}" data-cnpj="${data.fornecedor_cnpj}" selected>${data.fornecedor_nome}</option>`);
        }
        fornecedores.forEach(f => {
          if (String(f.id) !== String(data.fornecedor_id)) {
            select.append(`<option value="${f.id}" data-cnpj="${f.cnpj}">${f.nome}</option>`);
          }
        });
        select.val(data.fornecedor_id).trigger('change');
        select.select2({
          placeholder: 'Selecione o fornecedor',
          allowClear: true,
          width: '100%',
          minimumResultsForSearch: 0,
          minimumInputLength: 3,
          dropdownParent: $('#editModal'),
          templateResult: function(option) {
            if (!option.id) return option.text;
            const cnpj = $(option.element).data('cnpj') || '';
            return $('<span>' + option.text + (cnpj ? ' – ' + cnpj : '') + '</span>');
          },
          templateSelection: function(option) {
            const cnpj = $(option.element).data('cnpj') || '';
            return option.text + (cnpj ? ' – ' + cnpj : '');
          },
          matcher: function(params, data) {
            // If there is no search term, return all options
            if ($.trim(params.term) === '') {
              return data;
            }
            // Match term against option text and CNPJ data attribute
            const term = params.term.toLowerCase();
            const text = data.text.toLowerCase();
            const rawCnpj = $(data.element).data('cnpj');
            const cnpj = rawCnpj != null ? String(rawCnpj) : '';
            const digitsTerm = term.replace(/\D/g, '');
            const digitsCnpj = typeof cnpj === 'string' ? cnpj.replace(/\D/g, '') : '';
            if (text.indexOf(term) > -1 || (digitsCnpj && digitsTerm && digitsCnpj.indexOf(digitsTerm) > -1)) {
              return data;
            }
            // Return `null` if no match
            return null;
          }
        });
      });
      // Centro de Custo
      listCentrosCustos(AuthService).then(centros => {
        const select = $('#centroCustoSelect');
        select.empty();
        if (data.centro_custo_id && data.centro_custo_nome) {
          select.append(`<option value="${data.centro_custo_id}" selected>${data.centro_custo_nome}</option>`);
        }
        centros.forEach(c => {
          if (String(c.id) !== String(data.centro_custo_id)) {
            select.append(`<option value="${c.id}">${c.nome}</option>`);
          }
        });
        select.val(data.centro_custo_id).trigger('change');
        select.select2({
          placeholder: 'Selecione o centro de custo',
          allowClear: true,
          width: '100%'
        });
      });
      // Projeto
      listProjetos(AuthService).then(projetos => {
        const select = $('#projetoSelect');
        select.empty();
        if (data.projeto_id && data.projeto_nome) {
          select.append(`<option value="${data.projeto_id}" selected>${data.projeto_nome}</option>`);
        }
        projetos.forEach(p => {
          if (String(p.id) !== String(data.projeto_id)) {
            select.append(`<option value="${p.id}">${p.nome}</option>`);
          }
        });
        select.val(data.projeto_id).trigger('change');
        select.select2({
          placeholder: 'Selecione o projeto',
          allowClear: true,
          width: '100%'
        });
      });

      // Forma de Pagamento
      $('#formaPagamentoSelect').select2({
        placeholder: 'Selecione a forma de pagamento',
        allowClear: true,
        width: '100%'
      });

      // Manual-toggle buttons: attach click handler as in create-v3
      $('#editFormContainer').on('click', '.manual-toggle', function() {
        const target = $($(this).data('target'));
        if (target.prop('tagName') === 'SELECT') {
          // Replace select with input text
          const name = target.attr('name');
          const val = target.find('option:selected').text() || '';
          const input = $(`<input type="text" class="form-control manual-input" name="${name}" value="${val}" />`);
          target.closest('.input-group').find('.select2-container').remove();
          target.replaceWith(input);
        } else if (target.prop('tagName') === 'INPUT') {
          // Replace input text with select2 again
          const name = target.attr('name');
          let selectId = '';
          if (name === 'filial_id') selectId = 'filialSelect';
          if (name === 'fornecedor_id') selectId = 'fornecedorSelect';
          if (name === 'centro_custo_id') selectId = 'centroCustoSelect';
          if (name === 'projeto_id') selectId = 'projetoSelect';
          const select = $(`<select id="${selectId}" name="${name}" class="form-control select2"></select>`);
          target.replaceWith(select);
          // Re-initialize select2 for the replaced element
          if (name === 'filial_id') {
            listFiliais(AuthService).then(filiais => {
              select.empty();
              if (data.filial_id && data.filial_nome) {
                select.append(`<option value="${data.filial_id}" selected>${data.filial_nome}</option>`);
              }
              filiais.forEach(f => {
                if (String(f.id) !== String(data.filial_id)) {
                  select.append(`<option value="${f.id}">${f.nome}</option>`);
                }
              });
              select.val(data.filial_id).trigger('change');
              select.select2({
                placeholder: 'Selecione a filial',
                allowClear: true,
                width: '100%'
              });
            });
          }
          if (name === 'fornecedor_id') {
            listFornecedores(AuthService).then(fornecedores => {
              select.empty();
              if (data.fornecedor_id && data.fornecedor_nome) {
                select.append(`<option value="${data.fornecedor_id}" data-cnpj="${data.fornecedor_cnpj}" selected>${data.fornecedor_nome}</option>`);
              }
              fornecedores.forEach(f => {
                if (String(f.id) !== String(data.fornecedor_id)) {
                  select.append(`<option value="${f.id}" data-cnpj="${f.cnpj}">${f.nome}</option>`);
                }
              });
              select.val(data.fornecedor_id).trigger('change');
              select.select2({
                placeholder: 'Selecione o fornecedor',
                allowClear: true,
                width: '100%',
                minimumResultsForSearch: 0,
                minimumInputLength: 3,
                dropdownParent: $('#editModal'),
                matcher: function(params, data) {
                  // If there is no search term, return all options
                  if ($.trim(params.term) === '') {
                    return data;
                  }
                  // Match term against option text and CNPJ data attribute
                  const term = params.term.toLowerCase();
                  const text = data.text.toLowerCase();
                  const rawCnpj = $(data.element).data('cnpj');
                  const cnpj = rawCnpj != null ? String(rawCnpj) : '';
                  const digitsTerm = term.replace(/\D/g, '');
                  const digitsCnpj = typeof cnpj === 'string' ? cnpj.replace(/\D/g, '') : '';
                  if (text.indexOf(term) > -1 || (digitsCnpj && digitsTerm && digitsCnpj.indexOf(digitsTerm) > -1)) {
                    return data;
                  }
                  // Return `null` if no match
                  return null;
                }
              });
            });
          }
          if (name === 'centro_custo_id') {
            listCentrosCustos(AuthService).then(centros => {
              select.empty();
              if (data.centro_custo_id && data.centro_custo_nome) {
                select.append(`<option value="${data.centro_custo_id}" selected>${data.centro_custo_nome}</option>`);
              }
              centros.forEach(c => {
                if (String(c.id) !== String(data.centro_custo_id)) {
                  select.append(`<option value="${c.id}">${c.nome}</option>`);
                }
              });
              select.val(data.centro_custo_id).trigger('change');
              select.select2({
                placeholder: 'Selecione o centro de custo',
                allowClear: true,
                width: '100%'
              });
            });
          }
          if (name === 'projeto_id') {
            listProjetos(AuthService).then(projetos => {
              select.empty();
              if (data.projeto_id && data.projeto_nome) {
                select.append(`<option value="${data.projeto_id}" selected>${data.projeto_nome}</option>`);
              }
              projetos.forEach(p => {
                if (String(p.id) !== String(data.projeto_id)) {
                  select.append(`<option value="${p.id}">${p.nome}</option>`);
                }
              });
              select.val(data.projeto_id).trigger('change');
              select.select2({
                placeholder: 'Selecione o projeto',
                allowClear: true,
                width: '100%'
              });
            });
          }
        }
      });

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
    // Validate currency fields
    const rawValor = document.getElementById('valorInput').value;
    const cleanValor = rawValor.replace(/[^\d,]/g, '').replace(/\./g, '').replace(',', '.');
    if (isNaN(parseFloat(cleanValor))) {
      alert('Valor Nominal inválido.');
      return;
    }
    let invalidItem = false;
    document.querySelectorAll('input[name="itemValorUnitario[]"]').forEach(el => {
      const v = el.value.replace(/[^\d,]/g, '').replace(/\./g, '').replace(',', '.');
      if (isNaN(parseFloat(v))) {
        invalidItem = true;
      }
    });
    if (invalidItem) {
      alert('Todos os valores unitários devem ser números válidos.');
      return;
    }

    // Required fields validation
    const requiredFields = [
      { el: document.getElementById('filialSelect'), name: 'Filial' },
      { el: document.getElementById('fornecedorSelect'), name: 'Fornecedor' },
      { el: document.getElementById('centroCustoSelect'), name: 'Centro de Custo' },
      { el: document.getElementById('formaPagamentoSelect'), name: 'Forma de Pagamento' },
      { el: document.getElementById('valorInput'), name: 'Valor Nominal' },
      { el: document.getElementById('dataEmissaoInput'), name: 'Data Emissão' }
    ];
    for (const field of requiredFields) {
      if (!field.el || !field.el.value || field.el.value.trim() === '') {
        alert(`${field.name} é obrigatório.`);
        return;
      }
    }
    // Justificativa non-empty
    const justEl = document.getElementById('justificativaInput');
    if (!justEl.value || justEl.value.trim() === '') {
      alert('Justificativa é obrigatória.');
      return;
    }
    // If NF, ensure each item row is fully filled
    const form = document.getElementById('editFormContainer');
    const isNF = currentLanc && currentLanc.dados && currentLanc.dados.tipo_documento === 'Nota Fiscal';
    if (isNF) {
      let invalid = false;
      $('#itensTable tbody tr').each(function() {
        const desc = $(this).find('input[name="itemDescricao[]"]').val();
        const qtd  = $(this).find('input[name="itemQuantidade[]"]').val();
        const val  = $(this).find('input[name="itemValorUnitario[]"]').val();
        if (!desc || !desc.trim() || !qtd || isNaN(parseFloat(qtd)) || !val || isNaN(parseFloat(val.replace(/[^\d,]/g,'').replace(/\./g,'').replace(',', '.')))) {
          invalid = true;
        }
      });
      if (invalid) {
        alert('Todos os itens da Nota Fiscal devem ter Descrição, Quantidade e Valor Unitário válidos.');
        return;
      }
    }

    // Clone original dados
    const payload = { ...currentLanc.dados };
    // Build itens array from form inputs
    const descrs = form.querySelectorAll('input[name="itemDescricao[]"]');
    const qtys   = form.querySelectorAll('input[name="itemQuantidade[]"]');
    const vals   = form.querySelectorAll('input[name="itemValorUnitario[]"]');
    const itensArr = [];
    descrs.forEach((el, idx) => {
      const descricao = el.value;
      const quantidade = parseFloat(qtys[idx].value);
      // strip mask for unit value
      const raw = vals[idx].value.replace(/[^\d,]/g,'').replace(/\./g,'').replace(',', '.');
      const valor_unitario = parseFloat(raw);
      itensArr.push({ descricao, quantidade, valor_unitario });
    });
    payload.itens = itensArr;
    // Collect all inputs and textareas
    form.querySelectorAll('[name]').forEach(el => {
      if (el.name === 'itemDescricao[]' || el.name === 'itemQuantidade[]' || el.name === 'itemValorUnitario[]') {
        return;
      }
      let val = el.value;
      // Parse numbers
      if (el.type === 'number') {
        val = el.value !== '' ? parseFloat(el.value) : null;
      }
      // Parse JSON from textarea if value looks like JSON
      if (el.tagName.toLowerCase() === 'textarea') {
        try {
          val = JSON.parse(el.value);
        } catch (e) {
          // keep original string if not valid JSON
        }
      }
      if (el.name === 'valor_nominal') {
        // strip mask and parse to decimal string
        const cleaned = el.value.replace(/[R$\s\.]/g, '').replace(',', '.');
        val = cleaned !== '' ? parseFloat(cleaned) : null;
      }
      payload[el.name] = val;
    });
    // Update fornecedor_nome, fornecedor_id, fornecedor_cnpj based on selected option
    const fSelect = document.getElementById('fornecedorSelect');
    if (fSelect) {
      const selectedOption = fSelect.options[fSelect.selectedIndex];
      payload.fornecedor_nome = selectedOption.text || '';
      payload.fornecedor_id = fSelect.value;
      payload.fornecedor_cnpj = selectedOption.getAttribute('data-cnpj') || '';
    }
    // Update status
    payload.status = 'Salvo';
    // Send update with full payload
    updateLancamento(AuthService, currentLanc.id, payload)
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