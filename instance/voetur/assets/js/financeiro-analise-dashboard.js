/**
 * @file financeiro-analise-dashboard.js
 * @description Responsável por renderizar a página do Dashboard de Análise de Lançamentos, 
 * onde os analistas podem visualizar, editar e aprovar lançamentos pendentes.
 */

import { registerRoute } from "./router.js";
import AuthService, { auth, db, analytics } from "./auth.js";
import { listLancamentos, updateLancamento } from "./api.js"; // updateLancamento deve tratar a atualização do lançamento no backend

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
      
      <!-- Cards Resumo -->
      <div class="row mb-4">
        <div class="col-md-4 col-sm-6">
          <div class="card">
            <div class="card-body">
              <h5 class="card-title">Total de Lançamentos Pendentes</h5>
              <h3 id="total-pendentes">--</h3>
            </div>
          </div>
        </div>
        <div class="col-md-4 col-sm-6">
          <div class="card">
            <div class="card-body">
              <h5 class="card-title">Total Aprovado</h5>
              <h3 id="total-aprovado">--</h3>
            </div>
          </div>
        </div>
        <div class="col-md-4 col-sm-6">
          <div class="card">
            <div class="card-body">
              <h5 class="card-title">Total Rejeitado</h5>
              <h3 id="total-rejeitado">--</h3>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Tabela de Lançamentos para Análise -->
      <div class="card">
        <div class="card-header">
          <h5>Lançamentos Pendentes para Análise</h5>
        </div>
        <div class="card-body table-responsive">
          <table id="analiseTable" class="table table-striped table-bordered">
            <thead>
              <tr>
                <th>Ações</th>
                <th>ID</th>
                <th>UID</th>
                <th>Filial</th>
                <th>Fornecedor</th>
                <th>N° Documento</th>
                <th>Tipo de Documento</th>
                <th>Data de Emissão</th>
                <th>Valor</th>
                <th>Status</th>
                <th>Anexos</th>
              </tr>
            </thead>
            <tbody id="analise-tabela">
            </tbody>
          </table>
        </div>
      </div>
      
      <!-- Modal de Edição (para aprovação com alterações) -->
      <div class="modal fade" id="analiseModal" tabindex="-1" aria-labelledby="analiseModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-lg">
          <!-- A classe "modal-custom" deve existir no CSS da aplicação -->
          <div class="modal-content modal-custom">
            <div class="modal-header">
              <h5 class="modal-title" id="analiseModalLabel">Editar Lançamento</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
            </div>
            <div class="modal-body">
              <form id="analiseForm">
                <input type="hidden" id="lancamentoId">
                <!-- Campos do JSONB "dados" -->
                <div class="mb-3">
                  <label for="uid" class="form-label">UID</label>
                  <input type="text" class="form-control" id="uid">
                </div>
                <div class="mb-3">
                  <label for="app_id" class="form-label">App ID</label>
                  <input type="text" class="form-control" id="app_id">
                </div>
                <div class="mb-3">
                  <label for="valor" class="form-label">Valor</label>
                  <input type="number" class="form-control" id="valor">
                </div>
                <div class="mb-3">
                  <label for="filial" class="form-label">Filial</label>
                  <input type="text" class="form-control" id="filial">
                </div>
                <div class="mb-3">
                  <label for="fornecedor" class="form-label">Fornecedor</label>
                  <input type="text" class="form-control" id="fornecedor">
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
                  <label for="vencimento" class="form-label">Vencimento</label>
                  <input type="date" class="form-control" id="vencimento">
                </div>
                <div class="mb-3">
                  <label for="centro_custo" class="form-label">Centro de Custo</label>
                  <input type="text" class="form-control" id="centro_custo">
                </div>
                <div class="mb-3">
                  <label for="projeto" class="form-label">Projeto</label>
                  <input type="text" class="form-control" id="projeto">
                </div>
                <div class="mb-3">
                  <label for="status" class="form-label">Status</label>
                  <input type="text" class="form-control" id="status">
                </div>
                <div class="mb-3">
                  <label for="observacao" class="form-label">Observação</label>
                  <textarea class="form-control" id="observacao" rows="3"></textarea>
                </div>
                <!-- Campo para comentário do analista -->
                <div class="mb-3">
                  <label for="comentarioAnalista" class="form-label">Comentário do Analista</label>
                  <textarea class="form-control" id="comentarioAnalista" rows="2"></textarea>
                </div>
                <!-- Campo para exibição dos anexos -->
                <div class="mb-3">
                  <label for="anexos" class="form-label">Anexos</label>
                  <div id="anexos" class="border p-2" style="min-height: 50px;"></div>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button id="btnAprovarAlteracoes" type="button" class="btn btn-success" title="Aprovar com Alterações" style="background-color: #d4edda; border: 1px solid #c3e6cb; color: #155724;">
                <i class="bi bi-check-lg"></i>
              </button>
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" title="Cancelar" style="background-color: #f8f9fa; border: 1px solid #dee2e6; color: #6c757d;">
                <i class="bi bi-x-lg"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Função para formatar datas
  function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  }

  // Função para formatar valores numéricos
  function formatCurrency(value) {
    if (isNaN(value)) return '-';
    return parseFloat(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  // Função para gerar links dos anexos
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
    return lista.map(anexo => `<a href="${anexo.url}" target="_blank">${anexos.categoria || 'Anexo'}</a>`).join('<br>');
  }

  // Carrega os dados e atualiza o dashboard
  async function loadDashboardData() {
    try {
      const dados = await listLancamentos(AuthService);
      const pendentes = dados.filter(l => l.dados.status && l.dados.status.toLowerCase() === 'pendente');
      const aprovados = dados.filter(l => l.dados.status && l.dados.status.toLowerCase() === 'aprovado');
      const rejeitados = dados.filter(l => l.dados.status && l.dados.status.toLowerCase() === 'rejeitado');

      document.getElementById('total-pendentes').textContent = pendentes.length;
      document.getElementById('total-aprovado').textContent = 'R$ ' + aprovados.reduce((acc, cur) => acc + (parseFloat(cur.dados.valor) || 0), 0).toFixed(2);
      document.getElementById('total-rejeitado').textContent = 'R$ ' + rejeitados.reduce((acc, cur) => acc + (parseFloat(cur.dados.valor) || 0), 0).toFixed(2);

      const tbody = document.getElementById('analise-tabela');
      tbody.innerHTML = '';

      if (pendentes.length > 0) {
        pendentes.forEach(lanc => {
          const dadosLanc = lanc.dados || {};
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>
              <div style="display: inline-flex; gap: 4px;">
                <button class="btn btn-sm btn-aprovar" data-id="${lanc.id}" title="Aprovar" style="background-color: #d4edda; border: 1px solid #c3e6cb; color: #155724;">
                  <i class="bi bi-check-lg"></i>
                </button>
                <button class="btn btn-sm btn-rejeitar" data-id="${lanc.id}" title="Rejeitar" style="background-color: #f8d7da; border: 1px solid #f5c6cb; color: #721c24;">
                  <i class="bi bi-x-lg"></i>
                </button>
                <button class="btn btn-sm btn-editar" data-id="${lanc.id}" title="Editar" style="background-color: #fff3cd; border: 1px solid #ffeeba; color: #856404;">
                  <i class="bi bi-pencil-square"></i>
                </button>
              </div>
            </td>
            <td>${lanc.id || '-'}</td>
            <td>${dadosLanc.uid || '-'}</td>
            <td>${dadosLanc.filial || '-'}</td>
            <td>${dadosLanc.fornecedor || '-'}</td>
            <td>${dadosLanc.numeroDocumento || '-'}</td>
            <td>${dadosLanc.tipoDocumento || '-'}</td>
            <td>${dadosLanc.dataEmissao ? formatDate(dadosLanc.dataEmissao) : '-'}</td>
            <td>${dadosLanc.valor ? formatCurrency(dadosLanc.valor) : '-'}</td>
            <td>${dadosLanc.status || '-'}</td>
            <td>${formatAnexos(lanc.anexos)}</td>
          `;
          tbody.appendChild(tr);
        });
      }
      initializeDataTable();
    } catch (error) {
      console.error("Erro ao carregar dados para análise:", error);
      const tbody = document.getElementById('analise-tabela');
      tbody.innerHTML = '<tr><td colspan="11">Erro ao carregar os dados.</td></tr>';
    }
  }

  // Inicializa o DataTables
  function initializeDataTable() {
    if (window.jQuery && $.fn.DataTable) {
      if ($.fn.DataTable.isDataTable("#analiseTable")) {
        $("#analiseTable").DataTable().destroy();
      }
      $("#analiseTable").DataTable({
        responsive: true,
        autoWidth: false,
        ordering: true,
        paging: true,
        dom: 'lBfrtip',
        buttons: [
          'copy', 'excel', 'csv', 'pdf'
        ],
        language: {
          url: "https://cdn.datatables.net/plug-ins/1.13.4/i18n/pt-BR.json",
          emptyTable: "Nenhum lançamento pendente para análise."
        }
      });
    } else {
      console.error("DataTables não está carregado.");
    }
  }

  // Processa decisão imediata (sem edição)
  async function processImmediateDecision(decision, lancamento) {
    if (!AuthService.user) {
      alert("Usuário não autenticado. Por favor, faça login novamente.");
      return;
    }
    const dadosLanc = lancamento.dados || {};
    const atualizacoes = {
      ...dadosLanc,
      status: decision === 'aprovar' ? 'Aprovado' : 'Rejeitado',
      data_analise: new Date().toISOString()
    };
    try {
      await updateLancamento(AuthService, lancamento.id, atualizacoes);
      loadDashboardData();
    } catch (error) {
      console.error("Erro ao processar a decisão imediata:", error);
      alert("Erro ao processar a decisão: " + error.message);
    }
  }

  // Abre o modal de edição para aprovação com alterações
  function openModal(lancamento) {
    const modal = new bootstrap.Modal(document.getElementById('analiseModal'));
    document.getElementById('lancamentoId').value = lancamento.id;
    const dados = lancamento.dados || {};

    document.getElementById('uid').value = dados.uid || '';
    document.getElementById('app_id').value = dados.app_id || '';
    document.getElementById('valor').value = dados.valor || '';
    document.getElementById('filial').value = dados.filial || '';
    document.getElementById('fornecedor').value = dados.fornecedor || '';
    document.getElementById('numeroDocumento').value = dados.numeroDocumento || '';
    document.getElementById('tipoDocumento').value = dados.tipoDocumento || '';
    document.getElementById('dataEmissao').value = dados.dataEmissao ? new Date(dados.dataEmissao).toISOString().split('T')[0] : '';
    document.getElementById('vencimento').value = dados.vencimento ? new Date(dados.vencimento).toISOString().split('T')[0] : '';
    document.getElementById('centro_custo').value = dados.centro_custo || '';
    document.getElementById('projeto').value = dados.projeto || '';
    document.getElementById('status').value = dados.status || '';
    document.getElementById('observacao').value = dados.observacao || '';
    document.getElementById('anexos').innerHTML = formatAnexos(lancamento.anexos);
    document.getElementById('comentarioAnalista').value = '';
    modal.show();
  }

  // Processa a decisão a partir do modal (aprovar com alterações)
  async function processModalDecision() {
    if (!AuthService.user) {
      alert("Usuário não autenticado. Por favor, faça login novamente.");
      return;
    }
    const lancamentoId = document.getElementById('lancamentoId').value;
    const atualizacoes = {
      uid: document.getElementById('uid').value,
      app_id: document.getElementById('app_id').value,
      valor: document.getElementById('valor').value,
      filial: document.getElementById('filial').value,
      fornecedor: document.getElementById('fornecedor').value,
      numeroDocumento: document.getElementById('numeroDocumento').value,
      tipoDocumento: document.getElementById('tipoDocumento').value,
      dataEmissao: document.getElementById('dataEmissao').value,
      vencimento: document.getElementById('vencimento').value,
      centro_custo: document.getElementById('centro_custo').value,
      projeto: document.getElementById('projeto').value,
      status: 'Aprovado',
      observacao: document.getElementById('observacao').value,
      comentario_analista: document.getElementById('comentarioAnalista').value,
      data_analise: new Date().toISOString()
    };

    try {
      await updateLancamento(AuthService, lancamentoId, atualizacoes);
      const modal = bootstrap.Modal.getInstance(document.getElementById('analiseModal'));
      modal.hide();
      loadDashboardData();
    } catch (error) {
      console.error("Erro ao processar a decisão no modal:", error);
      alert("Erro ao processar a decisão: " + error.message);
    }
  }

  // Delegação de eventos para os botões na tabela usando closest para capturar o botão
  document.getElementById('analise-tabela').addEventListener('click', (e) => {
    const button = e.target.closest('button');
    if (!button) return;
    const lancamentoId = button.getAttribute('data-id');
    listLancamentos(AuthService).then(dados => {
      const lancamento = dados.find(l => l.id === lancamentoId);
      if (!lancamento) return;
      if (button.classList.contains('btn-aprovar')) {
        processImmediateDecision('aprovar', lancamento);
      } else if (button.classList.contains('btn-rejeitar')) {
        processImmediateDecision('rejeitar', lancamento);
      } else if (button.classList.contains('btn-editar')) {
        openModal(lancamento);
      }
    });
  });

  // Evento do modal para aprovação com alterações
  document.getElementById('btnAprovarAlteracoes').addEventListener('click', processModalDecision);

  // Monitorar autenticação
  AuthService.onAuthChange((user) => {
    if (user) {
      loadDashboardData();
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

// Registra a rota para a página de Dashboard de Análise
registerRoute('#dashboard-analise', renderFinanceiroAnaliseDashboard);