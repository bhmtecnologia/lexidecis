/**
 * @file financeiro-analise-dashboard.js
 * @description Responsável por renderizar a página do Dashboard de Análise de Lançamentos, 
 * onde os analistas podem visualizar, editar e aprovar lançamentos pendentes.
 */

import { registerRoute } from "./router.js";
import AuthService, { auth, db, analytics } from "./auth.js";
import { listLancamentos, updateLancamento, listFiliais, listFornecedores, listProjetos, listCentrosCustos } from "./api.js";

// Funções utilitárias para formatação
function formatDate(dateStr) {
  if (!dateStr) return '-';
  // Determine separator ('T' or space) and extract date portion YYYY-MM-DD
  let datePart = dateStr.split('T')[0];
  if (datePart.includes(' ')) {
    datePart = datePart.split(' ')[0];
  }
  const [year, month, day] = datePart.split('-');
  // Return in DD/MM/YYYY format
  if (!year || !month || !day) return dateStr;
  return `${day}/${month}/${year}`;
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  // Split on 'T' or space to separate date and time
  let [datePart, timePart] = dateStr.includes('T') ? dateStr.split('T') : dateStr.split(' ');
  // Remove milliseconds if present
  timePart = timePart ? timePart.split('.')[0] : '';
  const [year, month, day] = datePart.split('-');
  if (!year || !month || !day) return dateStr;
  return `${day}/${month}/${year} ${timePart}`;
}

function formatCurrency(value) {
  if (isNaN(value)) return '-';
  return parseFloat(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatAnexos(anexos) {
  if (!anexos) return '-';
  let lista = [];
  if (anexos.anexos && Array.isArray(anexos.anexos)) {
    lista = anexos.anexos;
  } else if (Array.isArray(anexos)) {
    lista = anexos;
  } else if (typeof anexos === 'object' && anexos.url) {
    return `<a href="${anexos.url}" target="_blank">${anexos.categoria || 'Anexo'}</a>`;
  } else {
    return '-';
  }
  return lista.map(anexo => `<a href="${anexo.url}" target="_blank">${anexo.categoria || 'Anexo'}</a>`).join('<br>');
}

async function loadLancamentosNoCache() {
  const user = AuthService.user;
  if (!user) throw new Error("Usuário não autenticado");
  const token = await user.getIdToken();
  const response = await fetch('https://n8n.power.tec.br/webhook/voetur/v1/lancamentos?all=true&ts=' + Date.now(), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    cache: "no-store"
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error("Erro ao listar lançamentos: " + errorText);
  }
  return await response.json();
}


export async function renderFinanceiroAnaliseDashboard() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="container-fluid">
      <!-- Título e Breadcrumb -->
      <div class="page-title">
        <div class="row">
          <div class="col-sm-6 col-12">
            <h2>Dashboard de Análise de Lançamentos</h2>
            <p class="mb-0 text-title-gray">Visualize, edite e aprove lançamentos pendentes</p>
          </div>
          <div class="col-sm-6 col-12">
            <ol class="breadcrumb">
              <li class="breadcrumb-item">
                <a href="index.html">
                  <i class="iconly-Home icli svg-color"></i>
                </a>
              </li>
              <li class="breadcrumb-item">Análise</li>
              <li class="breadcrumb-item active">Dashboard de Lançamentos</li>
            </ol>
          </div>
        </div>
      </div>
      
      <!-- Tabela de Lançamentos para Análise -->
      <div class="card">
        <div class="card-header d-flex justify-content-between align-items-center">
          <h5>Lançamentos Pendentes para Análise</h5>
          <button id="reloadTable" class="btn btn-sm btn-secondary" title="Recarregar tabela">
            <i class="iconly-Refresh icli svg-color"></i> Recarregar
          </button>
        </div>
        <div class="card-body table-responsive">
          <table id="analiseTable" class="table table-striped table-bordered">
            <thead>
              <tr>
                <th>Ações</th>
                <th>Status</th>
                <th>Anexo(s)</th>
                <th>Filial</th>
                <th>Data de Inclusão</th>
                <th>Data de Emissão</th>
                <th>Data de Vencimento</th>
                <th>Fornecedor</th>
                <th>N do documento</th>
                <th>Valor</th>
                <th>Justificativa</th>
                <th>Tipo de Documento</th>
                <th>Forma de Pagamento</th>
                <th>Centro de Custo</th>
                <th>Projeto</th>
                <th>Email</th>
                <th>Data criação</th>
                <th>id usuário criação</th>
                <th>Data alteração</th>
                <th>id usuário alteração</th>
              </tr>
            </thead>
            <tbody id="analise-tabela"></tbody>
          </table>
        </div>
      </div>
      
      <!-- Modal de Edição -->
      <div class="modal fade" id="analiseModal" tabindex="-1" aria-labelledby="analiseModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-lg">
          <div class="modal-content modal-custom">
            <div class="modal-header">
              <h5 class="modal-title" id="analiseModalLabel">Editar Lançamento</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
            </div>
            <div class="modal-body">
              <form id="analiseForm">
                <input type="hidden" id="lancamentoId">
                <!-- Exibir campos somente leitura -->
                <div class="mb-3">
                  <label for="uid" class="form-label">UUID</label>
                  <input type="text" class="form-control" id="uid" readonly>
                </div>
                <div class="mb-3">
                  <label for="app_id" class="form-label">App ID</label>
                  <input type="text" class="form-control" id="app_id" readonly>
                </div>
                <div class="mb-3">
                  <label for="email" class="form-label">Email</label>
                  <input type="email" class="form-control" id="email" readonly>
                </div>
                <!-- Campos editáveis -->
                <div class="mb-3">
                  <label for="valor" class="form-label">Valor</label>
                  <input type="number" class="form-control" id="valor">
                </div>
                <!-- Filial -->
                <div class="mb-3">
                  <label for="filialEdit" class="form-label">Filial</label>
                  <input type="text" class="form-control" id="filialEdit" list="filialOptionsEdit" placeholder="Digite ou escolha uma filial" required>
                  <datalist id="filialOptionsEdit">
                    <option value="">Selecione</option>
                  </datalist>
                </div>
                <!-- Fornecedor -->
                <div class="mb-3">
                  <label for="fornecedorEdit" class="form-label">Fornecedor</label>
                  <input type="text" class="form-control" id="fornecedorEdit" list="fornecedorOptionsEdit" placeholder="Digite ou escolha um fornecedor" required>
                  <datalist id="fornecedorOptionsEdit">
                    <option value="">Selecione</option>
                  </datalist>
                </div>
                <div class="mb-3">
                  <label for="numeroDocumento" class="form-label">N° Documento</label>
                  <input type="text" class="form-control" id="numeroDocumento">
                </div>
                <div class="mb-3">
                  <label for="tipoDocumento" class="form-label">Tipo de Documento</label>
                  <input type="text" class="form-control" id="tipoDocumento">
                </div>
                <div class="mb-3">
                  <label for="dataEmissao" class="form-label">Data de Emissão</label>
                  <input type="date" class="form-control" id="dataEmissao">
                </div>
                <div class="mb-3">
                  <label for="vencimento" class="form-label">Data de Vencimento</label>
                  <input type="date" class="form-control" id="vencimento">
                </div>
                <div class="mb-3">
                  <label for="dataInclusao" class="form-label">Data de Inclusão</label>
                  <input type="text" class="form-control" id="dataInclusao" readonly>
                </div>
                <!-- Justificativa exibida como somente leitura -->
                <div class="mb-3">
                  <label for="justificativa" class="form-label">Justificativa</label>
                  <textarea class="form-control" id="justificativa" rows="3" readonly></textarea>
                </div>
                <div class="mb-3">
                  <label for="forma_pagamento" class="form-label">Forma de Pagamento</label>
                  <input type="text" class="form-control" id="forma_pagamento">
                </div>
                <!-- Centro de Custo -->
                <div class="mb-3">
                  <label for="centroCustoEdit" class="form-label">Centro de Custo</label>
                  <input type="text" class="form-control" id="centroCustoEdit" list="centroCustoOptionsEdit" placeholder="Digite ou escolha um centro de custo" required>
                  <datalist id="centroCustoOptionsEdit">
                    <option value="">Selecione</option>
                  </datalist>
                </div>
                <!-- Projeto -->
                <div class="mb-3">
                  <label for="projetoEdit" class="form-label">Projeto</label>
                  <input type="text" class="form-control" id="projetoEdit" list="projetoOptionsEdit" placeholder="Digite ou escolha um projeto" required>
                  <datalist id="projetoOptionsEdit">
                    <option value="">Selecione</option>
                  </datalist>
                </div>
                <!-- Metadata (somente leitura) -->
                <div class="mb-3">
                  <label for="created_at" class="form-label">Data criação</label>
                  <input type="text" class="form-control" id="created_at" readonly>
                </div>
                <div class="mb-3">
                  <label for="created_by" class="form-label">id usuário criação</label>
                  <input type="text" class="form-control" id="created_by" readonly>
                </div>
                <div class="mb-3">
                  <label for="updated_at" class="form-label">Data alteração</label>
                  <input type="text" class="form-control" id="updated_at" readonly>
                </div>
                <div class="mb-3">
                  <label for="updated_by" class="form-label">id usuário alteração</label>
                  <input type="text" class="form-control" id="updated_by" readonly>
                </div>
                <!-- Anexos -->
                <div class="mb-3">
                  <label for="anexos" class="form-label">Anexos</label>
                  <div id="anexos" class="border p-2" style="min-height: 50px;"></div>
                </div>
                <!-- Comentário do Analista -->
                <div class="mb-3">
                  <label for="comentarioAnalista" class="form-label">Comentário do Analista</label>
                  <textarea class="form-control" id="comentarioAnalista" rows="2"></textarea>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button id="btnAprovarModal" type="button" class="btn btn-sm btn-aprovar" style="background-color: #d4edda; border: 1px solid #c3e6cb; color: #155724;" title="Aprovar">
                Aprovar
              </button>
              <button id="btnRejeitarModal" type="button" class="btn btn-sm btn-rejeitar" style="background-color: #f8d7da; border: 1px solid #f5c6cb; color: #721c24;" title="Rejeitar">
                Rejeitar
              </button>
              <button id="btnSalvarModal" type="button" class="btn btn-sm btn-editar" style="background-color: #fff3cd; border: 1px solid #ffeeba; color: #856404;" title="Salvar Alterações">
                Salvar
              </button>
              <button id="btnCancelarModal" type="button" class="btn btn-sm btn-secondary" style="background-color: #f8f9fa; border: 1px solid #dee2e6; color: #6c757d;" data-bs-dismiss="modal" title="Cancelar">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  function initializeDataTable() {
    if (window.jQuery && $.fn.DataTable) {
      if ($.fn.DataTable.isDataTable("#analiseTable")) {
        $("#analiseTable").DataTable().destroy();
      }
      $("#analiseTable").DataTable({
        processing: true,
        responsive: true,
        autoWidth: false,
        ordering: true,
        paging: true,
        order: [[18, 'desc']],
        colReorder: true,
        dom: 'lBfrtip',
        buttons: ['copy', 'excel'],
        language: {
          url: "https://cdn.datatables.net/plug-ins/1.13.4/i18n/pt-BR.json",
          emptyTable: "Nenhum lançamento pendente para análise."
        },
        ajax: function(_data, callback) {
          Promise.all([
            listFiliais(AuthService),
            listFornecedores(AuthService),
            listProjetos(AuthService),
            listCentrosCustos(AuthService)
          ])
          .then(([filiais, fornecedores, projetos, centros]) => {
            window.filiaisData = filiais;
            window.fornecedoresData = fornecedores;
            window.projetosData = projetos;
            window.centrosData = centros;
            return loadLancamentosNoCache();
          })
          .then(dados => {
            const pendentes = dados.filter(l => {
              if (!(l.dados && l.dados.status)) return false;
              const s = l.dados.status.toLowerCase();
              return s === 'integrado benner'
                  || s === 'enviado controladoria'
                  || s === 'enviado integração benner';
            });
            // Atualiza cards de resumo
            // document.getElementById('total-pendentes').textContent = pendentes.length;
            const totalAprovado = dados.filter(l => l.dados && l.dados.status && l.dados.status.toLowerCase() === 'aprovado')
              .reduce((acc, cur) => acc + (parseFloat(cur.dados.valor) || 0), 0);
            const totalRejeitado = dados.filter(l => l.dados && l.dados.status && l.dados.status.toLowerCase() === 'rejeitado')
              .reduce((acc, cur) => acc + (parseFloat(cur.dados.valor) || 0), 0);
            // document.getElementById('total-aprovado').textContent = 'R$ ' + totalAprovado.toFixed(2);
            // document.getElementById('total-rejeitado').textContent = 'R$ ' + totalRejeitado.toFixed(2);
            // Monta arrays de dados para cada linha
            const rows = pendentes.map(lancamento => {
              const dadosLanc = lancamento.dados || {};
              const nested = dadosLanc.dados || {};
              const parcelas = Array.isArray(nested.parcelas) ? nested.parcelas : [];
              // Resolve nomes
              const filObj = window.filiaisData.find(f => f.uuid === (dadosLanc.filial || dadosLanc.filial_uuid));
              const fornObj = window.fornecedoresData.find(f => f.uuid === (dadosLanc.fornecedor || dadosLanc.fornecedor_uuid));
              // Resolve Centro de Custo (fallback to centro_custo_id)
              const centObj = window.centrosData.find(c => 
                c.uuid === dadosLanc.centro_custo || c.uuid === dadosLanc.centro_custo_id
              );
              const projObj = window.projetosData.find(p => p.uuid === dadosLanc.projeto);
              const filialName = filObj?.nome || dadosLanc.filial_nome || '-';
              const fornecedorName = fornObj?.nome || dadosLanc.fornecedor_nome || '-';
              const centroName = centObj?.nome || '-';
              const projetoName = projObj?.nome || '-';
              // Determine action buttons based on status
              let actionsHtml;
              if (dadosLanc.status === 'Enviado Integração Benner' || dadosLanc.status === 'Integrado Benner') {
                actionsHtml = `<button class="btn btn-sm btn-visualizar" data-id="${lancamento.id}" title="Visualizar" style="background-color: #fff3cd; border: 1px solid #ffeeba; color: #856404;">
    <i class="iconly-Show icli svg-color"></i>
  </button>`;
              } else {
                actionsHtml = `<div style="display:inline-flex;gap:4px;">
      <button class="btn btn-sm btn-aprovar" data-id="${lancamento.id}" title="Aprovar" style="background-color: #d4edda; border: 1px solid #c3e6cb; color: #155724;">
        <i class="bi bi-check-lg"></i>
      </button>
      <button class="btn btn-sm btn-rejeitar" data-id="${lancamento.id}" title="Rejeitar" style="background-color: #f8d7da; border: 1px solid #f5c6cb; color: #721c24;">
        <i class="bi bi-x-lg"></i>
      </button>
      <button class="btn btn-sm btn-editar" data-id="${lancamento.id}" title="Editar" style="background-color: #fff3cd; border: 1px solid #ffeeba; color: #856404;">
        <i class="bi bi-pencil-square"></i>
      </button>
    </div>`;
              }
              return [
                actionsHtml,
                `<span class="status-clickable text-primary" data-id="${lancamento.id}" style="cursor:pointer;">${dadosLanc.status||'-'}</span>`,
                formatAnexos(lancamento.anexos),
                // Filial (index 3)
                filialName,
                // Data de Inclusão (index 4)
                (dadosLanc.data_entrada || dadosLanc.data_inclusao)
                  ? formatDate(dadosLanc.data_entrada || dadosLanc.data_inclusao)
                  : '-',
                // Data de Emissão (index 5)
                dadosLanc.data_emissao ? formatDate(dadosLanc.data_emissao) 
                  : (dadosLanc.dataEmissao ? formatDate(dadosLanc.dataEmissao) : '-'),
                // Data de Vencimento (index 6) – primeiro valor de parcelas_financeiras
                Array.isArray(dadosLanc.parcelas_financeiras) && dadosLanc.parcelas_financeiras.length
                  ? formatDate(dadosLanc.parcelas_financeiras[0].data_vencimento)
                  : (dadosLanc.data_vencimento 
                      ? formatDate(dadosLanc.data_vencimento) 
                      : '-'),
                // Fornecedor (index 7)
                fornecedorName,
                // Nº documento (index 8)
                dadosLanc.numero_documento || dadosLanc.numeroDocumento || '-',
                // Valor (index 9)
                (dadosLanc.valor_nominal !== undefined && dadosLanc.valor_nominal !== null) 
                  ? formatCurrency(dadosLanc.valor_nominal) 
                  : ((dadosLanc.valor !== undefined && dadosLanc.valor !== null) 
                      ? formatCurrency(dadosLanc.valor) 
                      : '-'),
                dadosLanc.justificativa || '-',
                dadosLanc.tipoDocumento || dadosLanc.tipo_documento || '-',
                dadosLanc.forma_pagamento || '-',
                centroName,
                dadosLanc.projeto_nome || projetoName || '-',
                // Email do usuário que incluiu (fallback to usuario_inclusao)
                dadosLanc.email || dadosLanc.usuario_inclusao || '-',
                lancamento.created_at ? formatDateTime(lancamento.created_at) : '-',
                lancamento.created_by || '-',
                lancamento.updated_at ? formatDateTime(lancamento.updated_at) : '-',
                lancamento.updated_by || '-'
              ];
            });
            callback({ data: rows });
          })
          .catch(error => {
            console.error("Erro no AJAX do DataTable:", error);
            callback({ data: [] });
          });
        },
        destroy: true,
        // Remova ou mantenha columnDefs conforme desejar
        columnDefs: [
          {
            // Estiliza e define valor padrão para Filial (coluna 3) e Fornecedor (coluna 7)
            targets: [3, 7],
            className: 'text-start',
            defaultContent: '-'
          },
          {
            // Data de Inclusão, Emissão, Vencimento, Data criação, Data alteração
            targets: [4, 5, 6, 16, 18],
            render: function(data) {
              return data ? formatDate(data) : '-';
            }
          },
          {
            // Valor column (index 9: 0-Ações,1-Anexo,2-Filial,3-DataInclusao,4-DataEmissao,5-Vencimento,6-Fornecedor,7-NumeroDocumento,8-Valor,9-Valor)
            targets: 9,
            render: function(data) {
              // Remove non-numeric characters but keep dots and commas
              let raw = String(data).replace(/[^0-9\-,\.]/g, '');
              // Remove thousand separators (dots), convert decimal comma to dot
              raw = raw.replace(/\./g, '').replace(',', '.');
              const num = parseFloat(raw);
              return isNaN(num) ? '-' : formatCurrency(num);
            },
            className: 'text-end'
          }
        ],
        // Removido botão de recarregar tabela duplicado do length (agora está apenas no header)
        initComplete: function() {
          const tableApi = this.api();
          $('#analiseTable tbody').on('click', 'button.btn-aprovar', function() {
            const btn = $(this);
            const originalHtml = btn.html();
            // Show spinner and disable button
            btn.prop('disabled', true)
               .html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>');
            const id = btn.data('id');
            loadLancamentosNoCache()
              .then(dados => {
                const lanc = dados.find(l => l.id === id);
                if (lanc) return processImmediateDecision('aprovar', lanc);
              })
              .catch(error => {
                console.error("Erro ao carregar lançamentos para aprovação:", error);
              })
              .finally(() => {
                // Restore original button state
                btn.prop('disabled', false).html(originalHtml);
              });
          });
          $('#analiseTable tbody').on('click', 'button.btn-rejeitar', function() {
            const btn = $(this);
            const originalHtml = btn.html();
            // Show spinner and disable button
            btn.prop('disabled', true)
               .html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>');
            const id = btn.data('id');
            loadLancamentosNoCache()
              .then(dados => {
                const lanc = dados.find(l => l.id === id);
                if (lanc) {
                  return processImmediateDecision('rejeitar', lanc);
                }
              })
              .catch(error => {
                console.error("Erro ao carregar lançamentos para rejeição:", error);
              })
              .finally(() => {
                // Restore original button state
                btn.prop('disabled', false).html(originalHtml);
              });
          });
          $('#analiseTable tbody').on('click', 'button.btn-editar', function() {
            const id = $(this).data('id');
            listLancamentos(AuthService).then(dados => {
              const lanc = dados.find(l => l.id === id);
              if (lanc) openModal(lanc);
            });
          });
          // Update the status cell click handler to use the new class
          $('#analiseTable tbody').on('click', 'span.status-clickable', function() {
            const id = $(this).data('id');
            loadLancamentosNoCache()
              .then(dados => {
                const lanc = dados.find(l => l.id === id);
                if (!lanc) return;
                // Combine logs from top level and nested
                const topLog = Array.isArray(lanc.log) ? lanc.log : [];
                const nestedLog = Array.isArray(lanc.dados?.log) ? lanc.dados.log : [];
                const combined = [...topLog, ...nestedLog];
                // Build list items
                const items = combined.map(entry =>
                  `<li class="list-group-item">${entry}</li>`
                ).join('');
                // Ensure modal exists or remove existing
                $('#logModal').remove();
                // Append modal HTML
                const modalHtml = `
                  <div class="modal fade" id="logModal" tabindex="-1" aria-labelledby="logModalLabel" aria-hidden="true">
                    <div class="modal-dialog modal-lg modal-dialog-scrollable">
                      <div class="modal-content">
                        <div class="modal-header">
                          <h5 class="modal-title" id="logModalLabel">Histórico de Log</h5>
                          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
                        </div>
                        <div class="modal-body">
                          <ul class="list-group">${items || '<li class="list-group-item">Sem histórico de log.</li>'}</ul>
                        </div>
                        <div class="modal-footer">
                          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
                        </div>
                      </div>
                    </div>
                  </div>`;
                $('body').append(modalHtml);
                const modal = new bootstrap.Modal($('#logModal'));
                modal.show();
              })
              .catch(err => console.error('Erro ao carregar log:', err));
          });
          // Handler for visualize-log button
          $('#analiseTable tbody').on('click', 'button.btn-visualizar-log', function() {
            const id = $(this).data('id');
            loadLancamentosNoCache()
              .then(dados => {
                const lanc = dados.find(l => l.id === id);
                if (!lanc) return;
                const payload = lanc.dados || {};
                const prettyJson = JSON.stringify(payload, null, 2);
                $('#logModal').remove();
                const modalHtml = `
                  <div class="modal fade" id="logModal" tabindex="-1" aria-labelledby="logModalLabel" aria-hidden="true">
                    <div class="modal-dialog modal-lg modal-dialog-scrollable">
                      <div class="modal-content">
                        <div class="modal-header">
                          <h5 class="modal-title" id="logModalLabel">Payload JSONB</h5>
                          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
                        </div>
                        <div class="modal-body">
                          <pre class="bg-light p-3" style="white-space: pre-wrap; word-break: break-all;">${prettyJson}</pre>
                        </div>
                        <div class="modal-footer">
                          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
                        </div>
                      </div>
                    </div>
                  </div>`;
                $('body').append(modalHtml);
                const modal = new bootstrap.Modal($('#logModal'));
                modal.show();
              })
              .catch(err => console.error('Erro ao carregar payload:', err));
          });
        },
      });
    } else {
      console.error("DataTables não está carregado.");
    }
  }

  // loadDashboardData is no longer used for table population, but may be kept for select population if needed

  function extrairDadosFormulario() {
    let errors = [];
    const filialEditValue = document.getElementById('filialEdit').value.trim();
    let filial = '';
    if (window.filiaisData && window.filiaisData.length > 0) {
      const filialSelected = window.filiaisData.find(f => f.nome.toLowerCase() === filialEditValue.toLowerCase());
      if (filialSelected) {
        filial = filialSelected.uuid;
      } else {
        errors.push('Filial inválida ou não encontrada');
      }
    } else {
      errors.push('Filiais não carregadas');
    }
    const fornecedorEditValue = document.getElementById('fornecedorEdit').value.trim();
    let fornecedor = '';
    if (window.fornecedoresData && window.fornecedoresData.length > 0) {
      const fornecedorSelected = window.fornecedoresData.find(f => 
        f.nome.toLowerCase() === fornecedorEditValue.toLowerCase() ||
        f.cnpj.replace(/[\.\-\/\s]/g, "").toLowerCase() === fornecedorEditValue.replace(/[\.\-\/\s]/g, "").toLowerCase()
      );
      if (fornecedorSelected) {
        fornecedor = fornecedorSelected.uuid;
      } else {
        errors.push('Fornecedor inválido ou não encontrado');
      }
    } else {
      errors.push('Fornecedores não carregados');
    }
    const centroCustoEditValue = document.getElementById('centroCustoEdit').value.trim();
    let centroCusto = '';
    if (window.centrosData && window.centrosData.length > 0) {
      const centroSelected = window.centrosData.find(c => c.nome.toLowerCase() === centroCustoEditValue.toLowerCase());
      if (centroSelected) {
        centroCusto = centroSelected.uuid;
      } else {
        errors.push('Centro de Custo inválido ou não encontrado');
      }
    } else {
      errors.push('Centros de Custo não carregados');
    }
    const projetoEditValue = document.getElementById('projetoEdit').value.trim();
    let projeto = '';
    if (window.projetosData && window.projetosData.length > 0) {
      const projetoSelected = window.projetosData.find(p => p.nome.toLowerCase() === projetoEditValue.toLowerCase());
      if (projetoSelected) {
        projeto = projetoSelected.uuid;
      } else {
        errors.push('Projeto inválido ou não encontrado');
      }
    } else {
      errors.push('Projetos não carregados');
    }

    const dadosAtualizados = {
      uid: document.getElementById('uid').value,
      app_id: document.getElementById('app_id').value,
      email: document.getElementById('email').value,
      valor: document.getElementById('valor').value,
      filial: filial,
      fornecedor: fornecedor,
      numeroDocumento: document.getElementById('numeroDocumento').value,
      tipoDocumento: document.getElementById('tipoDocumento').value,
      dataEmissao: document.getElementById('dataEmissao').value,
      vencimento: document.getElementById('vencimento').value,
      justificativa: document.getElementById('justificativa').value,
      forma_pagamento: document.getElementById('forma_pagamento').value,
      centro_custo: centroCusto,
      projeto: projeto,
      comentario_analista: document.getElementById('comentarioAnalista').value,
      data_analise: new Date().toISOString()
    };

    return { dadosAtualizados, errors };
  }

  async function processModalUpdate(status) {
    const lancamentoId = document.getElementById('lancamentoId').value;
    const { dadosAtualizados, errors } = extrairDadosFormulario();
    if (errors.length > 0) {
      alert("Por favor, corrija os seguintes erros: " + errors.join(", "));
      return;
    }
    dadosAtualizados.status = status;
    try {
      await updateLancamento(AuthService, lancamentoId, dadosAtualizados);
      const modal = bootstrap.Modal.getInstance(document.getElementById('analiseModal'));
      modal.hide();
      // Recarrega a tabela após atualização de modal sem chamar função inexistente
      $("#analiseTable").DataTable().ajax.reload(null, false);
    } catch (error) {
      console.error("Erro ao processar atualização no modal:", error);
      alert("Erro ao processar a atualização: " + error.message);
      hideLoading();
    }
  }

  async function processModalApprove() {
    await processModalUpdate("Enviado Integração Benner");
  }

  async function processModalReject() {
    await processModalUpdate("Devolvido Controladoria");
  }

  async function processModalSave() {
    await processModalUpdate("Pendente");
  }

  function openModal(lancamento) {
    const modal = new bootstrap.Modal(document.getElementById('analiseModal'));
    document.getElementById('lancamentoId').value = lancamento.id;
    const dados = lancamento.dados || {};
    const filialObj = window.filiaisData.find(f => f.uuid === dados.filial);
    const filialName = filialObj ? filialObj.nome : dados.filial || '';
    const fornecedorObj = window.fornecedoresData.find(f => f.uuid === dados.fornecedor);
    const fornecedorName = fornecedorObj ? fornecedorObj.nome : dados.fornecedores || '';
    const centroObj = window.centrosData.find(c => c.uuid === dados.centro_custo);
    const centroName = centroObj ? centroObj.nome : dados.centro_custo || '';
    const projetoObj = window.projetosData.find(p => p.uuid === dados.projeto);
    const projetoName = projetoObj ? projetoObj.nome : dados.projeto || '';

    document.getElementById('uid').value = dados.uid || '';
    document.getElementById('app_id').value = dados.app_id || '';
    document.getElementById('email').value = dados.email || '';
    document.getElementById('valor').value = dados.valor || '';
    document.getElementById('filialEdit').value = filialName;
    document.getElementById('fornecedorEdit').value = fornecedorName;
    document.getElementById('numeroDocumento').value = dados.numeroDocumento || '';
    document.getElementById('tipoDocumento').value = dados.tipoDocumento || '';
    document.getElementById('dataEmissao').value = dados.dataEmissao ? new Date(dados.dataEmissao).toISOString().split('T')[0] : '';
    document.getElementById('vencimento').value = dados.vencimento ? new Date(dados.vencimento).toISOString().split('T')[0] : '';
    document.getElementById('dataInclusao').value = dados.data_inclusao || '-';
    document.getElementById('justificativa').value = dados.justificativa || '';
    document.getElementById('forma_pagamento').value = dados.forma_pagamento || '';
    document.getElementById('centroCustoEdit').value = centroName;
    document.getElementById('projetoEdit').value = projetoName;
    document.getElementById('created_at').value = lancamento.created_at ? formatDate(lancamento.created_at) : '-';
    document.getElementById('created_by').value = lancamento.created_by || '-';
    document.getElementById('updated_at').value = lancamento.updated_at ? formatDate(lancamento.updated_at) : '-';
    document.getElementById('updated_by').value = lancamento.updated_by || '-';
    document.getElementById('anexos').innerHTML = formatAnexos(lancamento.anexos);
    document.getElementById('comentarioAnalista').value = dados.comentario_analista || '';
    modal.show();
  }

  async function processImmediateDecision(decision, lancamento) {
    if (!AuthService.user) {
      alert("Usuário não autenticado. Por favor, faça login novamente.");
      return;
    }
    const dadosLanc = lancamento.dados || {};
    const atualizacoes = {
      ...dadosLanc,
      status: decision === 'aprovar' ? 'Enviado Integração Benner' : 'Devolvido Controladoria',
      data_analise: new Date().toISOString()
    };
    // Preserve full existing log from top-level or nested in dados
    let existingLog = [];
    if (Array.isArray(lancamento.log)) {
      existingLog = lancamento.log;
    } else if (lancamento.dados && Array.isArray(lancamento.dados.log)) {
      existingLog = lancamento.dados.log;
    }
    const actionText = decision === 'aprovar' ? 'Aprovado' : 'Rejeitado';
    const newLogEntry = `${new Date().toLocaleString('pt-BR')} - ${actionText} pelo usuário: ${AuthService.user.email}`;
    atualizacoes.log = [...existingLog, newLogEntry];
    try {
      await updateLancamento(AuthService, lancamento.id, atualizacoes);
      // Recarrega a tabela após decisão imediata sem chamar função inexistente
      $("#analiseTable").DataTable().ajax.reload(null, false);
    } catch (error) {
      console.error("Erro ao processar a decisão imediata:", error);
      alert("Erro ao processar a decisão: " + error.message);
    }
  }


  document.getElementById('btnAprovarModal').addEventListener('click', processModalApprove);
  document.getElementById('btnRejeitarModal').addEventListener('click', processModalReject);
  $('#btnSalvarModal').on('click', function() {
    const btn = $(this);
    const originalHtml = btn.html();
    // Show spinner and disable button
    btn.prop('disabled', true)
       .html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>');
    processModalSave()
      .catch(error => console.error("Erro ao salvar modal:", error))
      .finally(() => {
        // Restore original button state
        btn.prop('disabled', false).html(originalHtml);
      });
  });
  // Botão de recarregar tabela no cabeçalho de análise
  const headerReloadBtn = document.getElementById('reloadTable');
  if (headerReloadBtn) {
    headerReloadBtn.addEventListener('click', () => {
      $("#analiseTable").DataTable().ajax.reload(null, false);
    });
  }
  // O botão Cancelar utiliza o atributo data-bs-dismiss="modal"

  AuthService.onAuthChange((user) => {
    if (user) {
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
}

registerRoute('#dashboard-analise', renderFinanceiroAnaliseDashboard);