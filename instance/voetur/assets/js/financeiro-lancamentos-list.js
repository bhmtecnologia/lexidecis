/**
 * @file financeiro-lancamentos-list.js
 * @description Responsável por renderizar a página de "Financeiro - Listagem de Lançamentos" no módulo financeiro,
 * realizando a consulta dos dados via API e exibindo-os em uma tabela completa com todas as informações.
 */

import { registerRoute } from "./router.js";
import AuthService from "./auth.js";
import { listLancamentos, updateLancamento, listFornecedores } from "./api.js";

// Global DataTable instance
let lancamentosTable;

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
            <button id="reloadTable" class="btn btn-sm btn-secondary ms-2" title="Recarregar tabela">
              <i class="iconly-Refresh icli svg-color"></i>
            </button>
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
                    <th>Ações</th>
                    <th>status</th>
                    <th>analise_ia</th>
                    <th>comentario_analista</th>
                    <th>anexo(s)</th>
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
      <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header bg-theme-default text-white">
            <h5 class="modal-title" id="editModalLabel">Editar Lançamento</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Fechar"></button>
          </div>
          <form id="editForm">
            <div class="modal-body">
              <div class="row g-3">
                <div class="col-md-6 form-floating">
                  <select class="form-select" id="editStatus" required>
                    <option value="">Selecione o status</option>
                    <option value="Novo">Novo</option>
                    <option value="Salvo">Salvo</option>
                    <option value="Enviado Controladoria">Enviado Controladoria</option>
                    <option value="Devolvido">Devolvido</option>
                  </select>
                  <label for="editStatus">Status</label>
                </div>
                <div class="col-md-6 form-floating">
                  <input type="text" class="form-control" id="editNumeroDocumento" placeholder="N° Documento" required>
                  <label for="editNumeroDocumento">N° Documento</label>
                </div>
                <div class="col-md-6 form-floating">
                  <select class="form-select" id="editTipoDocumento" required>
                    <option value="">Selecione</option>
                    <option value="Nota Fiscal">Nota Fiscal</option>
                    <option value="Fatura">Fatura</option>
                    <option value="Boleto">Boleto</option>
                    <option value="Reembolso">Reembolso</option>
                    <option value="Outros">Outros</option>
                  </select>
                  <label for="editTipoDocumento">Tipo de Documento</label>
                </div>
                <div class="col-md-6 form-floating">
                  <select class="form-select" id="editFornecedor" required aria-required="true"></select>
                  <label for="editFornecedor">Fornecedor</label>
                </div>
                <div class="col-md-6 form-floating">
                  <input type="text" class="form-control" id="editFilial" placeholder="Filial" readonly>
                  <label for="editFilial">Filial</label>
                </div>
                <div class="col-md-6 form-floating">
                  <input type="text" class="form-control" id="editProjeto" placeholder="Projeto">
                  <label for="editProjeto">Projeto</label>
                </div>
                <div class="col-md-6 form-floating">
                  <input type="text" class="form-control" id="editCentroCusto" placeholder="Centro de Custo">
                  <label for="editCentroCusto">Centro de Custo</label>
                </div>
                <div class="col-md-6 form-floating">
                  <input type="date" class="form-control" id="editDataEmissao" placeholder="Data de Emissão" required>
                  <label for="editDataEmissao">Data de Emissão</label>
                </div>
                <div class="col-md-6 form-floating">
                  <input type="date" class="form-control" id="editDataVencimento" placeholder="Data de Vencimento" required>
                  <label for="editDataVencimento">Data de Vencimento</label>
                </div>
                <div class="col-md-6 form-floating">
                  <input type="text" class="form-control" id="editValor" placeholder="Valor Bruto" required>
                  <label for="editValor">Valor Bruto</label>
                </div>
                <div class="col-md-6 form-floating">
                  <select class="form-select" id="editFormaPagamento" required>
                    <option value="">Selecione</option>
                    <option value="Boleto">Boleto</option>
                    <option value="Pix">Pix</option>
                    <option value="Depósito">Depósito</option>
                  </select>
                  <label for="editFormaPagamento">Forma de Pagamento</label>
                </div>
                <div class="col-12 form-floating">
                  <textarea class="form-control" id="editJustificativa" placeholder="Justificativa" style="height: 100px;" required></textarea>
                  <label for="editJustificativa">Justificativa</label>
                </div>
                <div class="col-12 mb-3">
                  <label for="editAnexo" class="form-label">Anexo(s)</label>
                  <input type="file" class="form-control" id="editAnexo" accept="image/png, image/jpeg" multiple>
                </div>
                <div class="col-12 mb-3" id="editAnexoPreview"></div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
              <button type="submit" class="btn btn-theme-default">Salvar alterações</button>
            </div>
          </form>
        </div>
      </div>
    </div>
    <!-- Modal de Análise IA -->
    <div class="modal fade" id="analysisModal" tabindex="-1" aria-labelledby="analysisModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header bg-theme-default text-white">
            <h5 class="modal-title" id="analysisModalLabel">Análise IA</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Fechar"></button>
          </div>
          <div class="modal-body">
            <div id="analysisContent" style="font-size:0.85rem; max-height:60vh; overflow:auto; padding:1rem; word-break: break-word;"></div>
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
   * Inicializa o plugin DataTables na tabela de lançamentos com AJAX.
   */
  function initializeDataTable() {
    if (window.jQuery && $.fn.DataTable) {
      // Destroy existing instance if present
      if (lancamentosTable) {
        lancamentosTable.destroy();
      }
      // Initialize DataTable with AJAX using listLancamentos
      lancamentosTable = $('#lancamentosTable').DataTable({
        ajax: function(data, callback) {
          listLancamentos(AuthService)
            .then(lancs => {
              // Achata o objeto, trazendo dados para o root e anexos corretamente
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
              console.log('Flattened sample:', JSON.stringify(flattened[0], null, 2));
              window.lancamentosData = flattened;
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
              // encode to safely include in data attribute
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
          { data: 'valor',              title: 'valor',              defaultContent: '-', render: v => isNaN(v)?'-':parseFloat(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) },
          { data: 'filial_nome',        title: 'filial_nome',        defaultContent: '-' },
          { data: 'data_emissao',       title: 'data_emissao',       defaultContent: '-', render: d => d?new Date(d).toLocaleDateString('pt-BR'): '-' },
          { data: 'projeto_nome',       title: 'projeto_nome',       defaultContent: '-' },
          { data: 'data_inclusao',      title: 'data_inclusao',      defaultContent: '-' },
          { data: 'justificativa',      title: 'justificativa',      defaultContent: '-' },
          { data: 'tipo_documento',     title: 'tipo_documento',     defaultContent: '-' },
          { data: 'data_vencimento',    title: 'data_vencimento',    defaultContent: '-', render: d => d?new Date(d).toLocaleDateString('pt-BR'): '-' },
          { data: 'forma_pagamento',    title: 'forma_pagamento',    defaultContent: '-' },
          { data: 'fornecedor_cnpj',    title: 'fornecedor_cnpj',    defaultContent: '-' },
          { data: 'fornecedor_nome',    title: 'fornecedor_nome',    defaultContent: '-' },
          { data: 'numero_documento',   title: 'numero_documento',   defaultContent: '-' },
          { data: 'usuario_inclusao',   title: 'usuario_inclusao',   defaultContent: '-' },
          { data: 'centro_custo_nome',  title: 'centro_custo_nome',  defaultContent: '-' },
          { data: 'created_at',         title: 'created_at',         defaultContent: '-', render: d => d?new Date(d).toLocaleString('pt-BR'): '-' },
          { data: 'updated_at',         title: 'updated_at',         defaultContent: '-', render: d => d?new Date(d).toLocaleString('pt-BR'): '-' },
          { data: 'created_by',         title: 'created_by',         defaultContent: '-' },
          { data: 'updated_by',         title: 'updated_by',         defaultContent: '-' }
        ]
      });
    } else {
      console.error('DataTables não está carregado.');
    }
  }


  // Monitora a autenticação para exibir a tabela somente se o usuário estiver logado
  AuthService.onAuthChange(async (user) => {
    if (user) {
      window.fornecedoresData = await listFornecedores(AuthService);
      // Popula e inicializa Select2 de fornecedores para edição
      if (window.$ && $.fn.select2) {
        const $editFor = $('#editFornecedor');
        $editFor.empty().append('<option value=""></option>');
        window.fornecedoresData.forEach(f => {
          const text = `${f.nome} - ${f.cnpj}`;
          $editFor.append(new Option(text, f.cnpj));
        });
        $editFor.select2({
          placeholder: 'Selecione um fornecedor',
          width: '100%',
          minimumInputLength: 3,
          allowClear: true
        });
      }
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

  // Handler para reload manual: recarrega via AJAX
  document.getElementById('reloadTable').addEventListener('click', () => {
    if (lancamentosTable) {
      lancamentosTable.ajax.reload(null, false);
    }
  });

  // Handle "Enviar" action buttons
  document.getElementById('content').addEventListener('click', async (event) => {
    const btn = event.target.closest('button[data-action="send"]');
    if (!btn) return;
    // Find the row data from DataTables
    let id = btn.getAttribute('data-id');
    let rowData = null;
    if (lancamentosTable) {
      lancamentosTable.rows().every(function() {
        const d = this.data();
        if (String(d.id) === id) {
          rowData = d;
        }
      });
    }
    if (!rowData) {
      console.error('Lançamento não encontrado para id', id);
      return;
    }
    // Agora os dados estão achatados, então reenvia todos os campos exceto campos extras e atualiza o status
    const updatedDados = { ...rowData, status: 'Enviado Controladoria' };
    // Remove campos que não pertencem a dados (id, created_at, updated_at, created_by, updated_by, anexos)
    delete updatedDados.id;
    delete updatedDados.created_at;
    delete updatedDados.updated_at;
    delete updatedDados.created_by;
    delete updatedDados.updated_by;
    delete updatedDados.anexos;
    btn.disabled = true;
    const originalContent = btn.innerHTML;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm text-white" role="status" aria-hidden="true"></span>';
    try {
      await updateLancamento(AuthService, id, updatedDados);
      lancamentosTable.ajax.reload(null, false);
    } catch (error) {
      console.error('Erro ao enviar lançamento:', error);
      alert('Falha ao enviar lançamento: ' + error.message);
    } finally {
      if (document.body.contains(btn)) {
        btn.disabled = false;
        btn.innerHTML = originalContent;
      }
    }
  });

  // Initialize Bootstrap modal for editing
  const editModal = new bootstrap.Modal(document.getElementById('editModal'));

  // Função para aplicar máscara de moeda BRL no input
  function applyCurrencyMask(input) {
    input.addEventListener('input', function(e) {
      const raw = this.value.replace(/\D/g, '');
      const num = parseFloat(raw) / 100 || 0;
      this.value = num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    });
    input.addEventListener('blur', function() {
      const num = parseFloat(this.value.replace(/\./g, '').replace(',', '.')) || 0;
      this.value = num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    });
  }
  // Aplica a máscara imediatamente
  applyCurrencyMask(document.getElementById('editValor'));
  // Inicializa select2 no campo de fornecedor, se disponível
  if (window.$ && $.fn.select2) {
    $('#editFornecedor').select2({
      placeholder: 'Selecione um fornecedor',
      width: '100%',
      minimumInputLength: 3,
      allowClear: true
    });
  }

  // Handle "Editar" action buttons
  document.getElementById('content').addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-action="edit"]');
    if (btn) {
      const id = btn.getAttribute('data-id');
      // Get row data from DataTables
      let lanc = null;
      if (lancamentosTable) {
        lancamentosTable.rows().every(function() {
          const d = this.data();
          if (String(d.id) === id) {
            lanc = d;
          }
        });
      }
      if (!lanc) return;
      // Preencher campos do formulário com as propriedades achatadas
      document.getElementById('editStatus').value = lanc.status || '';
      document.getElementById('editNumeroDocumento').value = lanc.numero_documento || '';
      document.getElementById('editTipoDocumento').value = lanc.tipo_documento || '';
      document.getElementById('editDataEmissao').value = lanc.data_emissao ? new Date(lanc.data_emissao).toISOString().split('T')[0] : '';
      document.getElementById('editDataVencimento').value = lanc.data_vencimento ? new Date(lanc.data_vencimento).toISOString().split('T')[0] : '';
      // Formata valor para padrão BRL
      const rawValor = lanc.valor != null ? parseFloat(lanc.valor) : 0;
      document.getElementById('editValor').value = rawValor.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      document.getElementById('editFormaPagamento').value = lanc.forma_pagamento || '';
      document.getElementById('editJustificativa').value = lanc.justificativa || '';
      // Seleciona fornecedor pelo CNPJ (select2 já está populado)
      $('#editFornecedor').val(lanc.fornecedor_cnpj).trigger('change');
      document.getElementById('editFilial').value = lanc.filial_nome || '';
      document.getElementById('editProjeto').value = lanc.projeto_nome || '';
      document.getElementById('editCentroCusto').value = lanc.centro_custo_nome || '';
      // Preenche preview de anexos existentes
      const preview = document.getElementById('editAnexoPreview');
      preview.innerHTML = formatAnexos(lanc.anexos);
      // Armazenar id no form
      document.getElementById('editForm').setAttribute('data-id', id);
      // Set form fields to readonly/disabled if not editable status
      const statusLC = (lanc.status || '').toLowerCase();
      const isEditable = statusLC === 'novo' || statusLC === 'salvo' || statusLC.includes('devolvido');
      [
        'editStatus',
        'editNumeroDocumento',
        'editTipoDocumento',
        'editFornecedor',
        'editFilial',
        'editProjeto',
        'editCentroCusto',
        'editDataEmissao',
        'editDataVencimento',
        'editValor',
        'editFormaPagamento',
        'editJustificativa'
      ].forEach(fid => {
        const field = document.getElementById(fid);
        if (!field) return;
        if (field.tagName === 'SELECT') field.disabled = !isEditable;
        else field.readOnly = !isEditable;
      });
      const saveBtn = document.querySelector('#editForm button[type="submit"]');
      if (saveBtn) saveBtn.disabled = !isEditable;
      editModal.show();
      return;
    }
    // Handle "Ver Análise IA" button clicks
    const analysisBtn = event.target.closest('.view-analysis');
    if (analysisBtn) {
      const md = decodeURIComponent(analysisBtn.getAttribute('data-md') || '');
      // Render Markdown to HTML
      const html = (marked.parse ? marked.parse(md) : marked(md));
      document.getElementById('analysisContent').innerHTML = html;
      // Show modal
      const analysisModal = new bootstrap.Modal(document.getElementById('analysisModal'));
      analysisModal.show();
      return;
    }
    // Handle "Ver OCR" button clicks
    const ocrBtn = event.target.closest('.view-ocr');
    if (!ocrBtn) return;
    const md = decodeURIComponent(ocrBtn.getAttribute('data-md') || '');
    // Clean markdown fences for raw JSON display
    const clean = md.replace(/```json|```/g, '');
    document.getElementById('analysisContent').innerHTML = `<pre style="white-space: pre-wrap; font-size:0.85rem;">${clean}</pre>`;
    const analysisModal = new bootstrap.Modal(document.getElementById('analysisModal'));
    analysisModal.show();
  });

  // Handle form submission for editing
  document.getElementById('editForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = e.currentTarget.getAttribute('data-id');
    // Get row data from DataTables
    let lanc = null;
    if (lancamentosTable) {
      lancamentosTable.rows().every(function() {
        const d = this.data();
        if (String(d.id) === id) {
          lanc = d;
        }
      });
    }
    // Monta objeto de atualização apenas com os campos editáveis em snake_case
    const updated = {
      status: document.getElementById('editStatus').value,
      numero_documento: document.getElementById('editNumeroDocumento').value,
      tipo_documento: document.getElementById('editTipoDocumento').value,
      data_emissao: document.getElementById('editDataEmissao').value,
      data_vencimento: document.getElementById('editDataVencimento').value,
      valor: parseFloat(document.getElementById('editValor').value.replace(/[\D]/g, '').replace(',', '.')),
      forma_pagamento: document.getElementById('editFormaPagamento').value,
      justificativa: document.getElementById('editJustificativa').value,
      fornecedor_cnpj: lanc.fornecedor_cnpj,
      fornecedor_nome: lanc.fornecedor_nome,
      fornecedor_id_benner: lanc.fornecedor_id_benner,
      fornecedor_uuid: lanc.fornecedor_uuid,
      filial_nome: lanc.filial_nome,
      filial_id_benner: lanc.filial_id_benner,
      projeto_nome: document.getElementById('editProjeto').value,
      projeto_id_benner: lanc.projeto_id_benner,
      centro_custo_nome: document.getElementById('editCentroCusto').value,
      centro_custo_id_benner: lanc.centro_custo_id_benner
    };
    try {
      await updateLancamento(AuthService, id, updated);
      editModal.hide();
      if (lancamentosTable) {
        lancamentosTable.ajax.reload(null, false);
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar alterações: ' + err.message);
    }
  });
}

// Registra a rota para a página de "Financeiro - Listagem de Lançamentos"
registerRoute('#financeiro-lancamentos-list', renderFinanceiroLancamentosList);