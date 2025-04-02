/**
 * @file aprovacoes-contas-a-pagar.js
 * @description Responsável por renderizar a página de "Aprovar Contas a Pagar" no módulo financeiro,
 * realizando a consulta dos dados via API, atualizando a tabela e gerenciando a exibição do relatório.
 */

import { registerRoute } from "./router.js";
import AuthService, { auth, db, analytics } from "./auth.js";  // Importa AuthService e reexportações do Firebase
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

/**
 * Renderiza a tela de "Aprovar Contas a Pagar".
 * Define a estrutura HTML da página, configura a consulta dos dados e inicializa o monitoramento da autenticação.
 */
export async function renderAprovacoesContasAPagar() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="container-fluid">
      <!-- Título e Breadcrumb -->
      <div class="page-title">
        <div class="row">
          <div class="col-sm-6 col-12">
            <h2>Financeiro - Aprovar Contas a Pagar</h2>
            <p class="mb-0 text-title-gray">"Relatório com as aprovações de contas a pagar"</p>
          </div>
          <div class="col-sm-6 col-12">
            <ol class="breadcrumb">
              <li class="breadcrumb-item">
                <a href="index.html">
                  <i class="iconly-Home icli svg-color"></i>
                </a>
              </li>
              <li class="breadcrumb-item">Financeiro</li>
              <li class="breadcrumb-item active">Aprovar Contas a Pagar</li>
            </ol>
          </div>
        </div>
      </div>
      
      <!-- Área Protegida -->
      <div id="protected-section" class="mt-4 d-none">
        <div id="report-container" class="position-relative">
          
          <!-- Card principal sem cabeçalho -->
          <div class="card">
            <div class="card-body">
              
              <!-- Área do Relatório (Tabela) -->
              <div class="table-responsive">
                <table id="data-table" class="display table table-bordered table-striped">
                  <thead>
                    <tr>
                      <th>Liberação</th>
                      <th>Status</th>
                      <th>Vencimento</th>
                      <th>AP</th>
                      <th>Valor</th>
                      <th>Fornecedor</th>
                      <th>Filial</th>
                      <th>Documento</th>
                      <th>Contas Pagas</th>
                    </tr>
                  </thead>
                  <tbody></tbody>
                </table>
              </div>
              
            </div> <!-- card-body -->
          </div> <!-- card -->
          
          <!-- Overlay de Loading para o Report -->
          <div id="report-overlay" class="d-none position-absolute top-0 start-0 w-100 h-100 bg-light bg-opacity-75 d-flex align-items-center justify-content-center" style="z-index: 1000;">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Carregando...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // ------------------------------------
  // Funções auxiliares
  // ------------------------------------

  /**
   * Converte um valor de data em timestamp.
   * @param {Date|Object|string} dateInput - Data ou objeto com a propriedade seconds.
   * @returns {number} Timestamp em milissegundos.
   */
  function getTimestamp(dateInput) {
    if (!dateInput) return 0;
    if (typeof dateInput === 'object' && dateInput.seconds) {
      return dateInput.seconds * 1000;
    }
    return new Date(dateInput).getTime();
  }

  /**
   * Formata uma data para o padrão 'pt-BR' utilizando UTC.
   * @param {Date|Object|string} dateInput - Data ou objeto com a propriedade seconds.
   * @returns {string} Data formatada.
   */
  function formatDate(dateInput) {
    if (!dateInput) return '';
    let date;
    if (typeof dateInput === 'object' && dateInput.seconds) {
      date = new Date(dateInput.seconds * 1000);
    } else {
      date = new Date(dateInput);
    }
    return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  }

  /**
   * Formata um valor numérico para o formato de moeda BRL.
   * @param {number|string} value - Valor a ser formatado.
   * @returns {string} Valor formatado como moeda.
   */
  function formatCurrency(value) {
    return value ? parseFloat(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00';
  }

  /**
   * Retorna o ícone correspondente ao status.
   * @param {string} status - Status (VERDE, AMARELO, VERMELHO).
   * @returns {string} Ícone HTML correspondente.
   */
  function getStatusIcon(status) {
    switch (status) {
      case "VERDE": return "<span class='fs-4'>🟢</span>";
      case "AMARELO": return "<span class='fs-4'>🟡</span>";
      case "VERMELHO": return "<span class='fs-4'>🔴</span>";
      default: return "-";
    }
  }

  /**
   * Exibe um modal contendo os dados de pagamentos liquidados.
   * Inicializa o DataTable para a tabela do modal com botões de exportação.
   * @param {Array} data - Dados dos pagamentos.
   */
  function showPaymentsModal(data) {
    let fornecedorNome = data[0]?.fornecedor || 'Fornecedor';
    let modalHtml = `
      <div class="modal fade" id="paymentsModal" tabindex="-1" aria-labelledby="paymentsModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-lg">
          <div class="modal-content">
            <div class="modal-header bg-primary text-white">
              <h5 class="modal-title" id="paymentsModalLabel">
                Contas a Pagar Aprovadas - ${fornecedorNome}
              </h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Fechar"></button>
            </div>
            <div class="modal-body">
              <div class="table-responsive">
                <table id="modal-data-table" class="display table table-bordered table-striped" style="font-weight: normal;">
                  <thead class="table-light">
                    <tr>
                      <th>Documento</th>
                      <th>Data Liquidação</th>
                      <th>Documento Digitado</th>
                      <th>AP</th>
                      <th>Valor Baixado</th>
                    </tr>
                  </thead>
                  <tbody>`;
    data.forEach(item => {
      modalHtml += `
                    <tr>
                      <td>${item.handle_documento || '-'}</td>
                      <td>${formatDate(item.dt_liquidacao)}</td>
                      <td>${item.documento_digitado || '-'}</td>
                      <td>${item.ap || '-'}</td>
                      <td>${formatCurrency(item.valor_baixado)}</td>
                    </tr>`;
    });
    modalHtml += `
                  </tbody>
                </table>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
            </div>
          </div>
        </div>
      </div>`;
    
    let modalContainer = document.getElementById('modalContainer');
    if (!modalContainer) {
      modalContainer = document.createElement('div');
      modalContainer.id = 'modalContainer';
      document.body.appendChild(modalContainer);
    }
    modalContainer.innerHTML = modalHtml;
    
    let paymentsModal = new bootstrap.Modal(document.getElementById('paymentsModal'));
    paymentsModal.show();
    
    $('#modal-data-table').DataTable({
      responsive: true,
      autoWidth: false,
      paging: true,
      ordering: true,
      dom: 'lBfrtip',
      buttons: [
        'copy', 'excel', 'csv', 'pdf'
      ],
      language: {
        url: "https://cdn.datatables.net/plug-ins/1.13.4/i18n/pt-BR.json"
      }
    });
  }

  /**
   * Exibe um modal para liberação com data, observações e informações adicionais (vencimento, fornecedor e valor).
   * Ao confirmar, envia uma requisição POST para a API de confirmação.
   * @param {string} handle - Identificador do item.
   * @param {number} acao - Código da ação (1 para aprovado, 2 para rejeitado).
   * @param {string|Date|Object} vencimento - Data de vencimento da conta.
   * @param {string} fornecedor - Nome do fornecedor.
   * @param {number|string} valor - Valor da conta.
   */
  function showLiberacaoModal(handle, acao, vencimento, fornecedor, valor) {
    const acaoText = acao === 1 ? "Aprovar" : "Rejeitar";
    // Preenche o campo data com a data atual (formato YYYY-MM-DD)
    const hoje = new Date().toISOString().split("T")[0];
    let modalHtml = `
      <div class="modal fade" id="liberacaoModal" tabindex="-1" aria-labelledby="liberacaoModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header bg-primary text-white">
              <h5 class="modal-title" id="liberacaoModalLabel">${acaoText} Conta a Pagar</h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Fechar"></button>
            </div>
            <div class="modal-body">
              <!-- Informações adicionais -->
              <div class="mb-3">
                <strong>Data de Vencimento:</strong> ${formatDate(vencimento)}
              </div>
              <div class="mb-3">
                <strong>Fornecedor:</strong> ${fornecedor}
              </div>
              <div class="mb-3">
                <strong>Valor:</strong> ${formatCurrency(valor)}
              </div>
              <hr>
              <form id="liberacaoForm">
                <div class="mb-3">
                  <label for="dataLiberacao" class="form-label">Data da Liberação</label>
                  <input type="date" class="form-control" id="dataLiberacao" value="${hoje}" required>
                </div>
                <div class="mb-3">
                  <label for="observacoes" class="form-label">Observações</label>
                  <textarea class="form-control" id="observacoes" rows="3" required></textarea>
                </div>
              </form>
              <div id="liberacaoError" class="text-danger d-none"></div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
              <button type="button" class="btn btn-primary" id="confirmLiberacao">Confirmar</button>
            </div>
          </div>
        </div>
      </div>`;
    
    let modalContainer = document.getElementById('liberacaoModalContainer');
    if (!modalContainer) {
      modalContainer = document.createElement('div');
      modalContainer.id = 'liberacaoModalContainer';
      document.body.appendChild(modalContainer);
    }
    modalContainer.innerHTML = modalHtml;
    
    let liberacaoModal = new bootstrap.Modal(document.getElementById('liberacaoModal'));
    liberacaoModal.show();
    
    document.getElementById('confirmLiberacao').addEventListener('click', async function() {
      const dataLiberacao = document.getElementById('dataLiberacao').value;
      const observacoes = document.getElementById('observacoes').value.trim();
      const errorDiv = document.getElementById('liberacaoError');
      if (!observacoes) {
        errorDiv.textContent = "Observações não podem ser vazias.";
        errorDiv.classList.remove('d-none');
        return;
      }
      try {
        const user = AuthService.user;
        if (!user) throw new Error("Usuário não autenticado");
        const token = await user.getIdToken();
        const response = await fetch('https://webhook.power.tec.br/webhook/voetur/Benner/LiberacaoAp/ConfirmarAcaoParcelas', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            HANDLE: handle,
            acao: acao,
            observacoes: observacoes,
            dataLiberacao: dataLiberacao
          })
        });
        if (!response.ok) {
          throw new Error("Erro ao confirmar a ação.");
        }
        liberacaoModal.hide();
      } catch (error) {
        errorDiv.textContent = error.message;
        errorDiv.classList.remove('d-none');
      }
    });
  }

  /**
   * Envia uma requisição POST para buscar os dados de pagamentos liquidados.
   * @param {string} cnpj - CNPJ do fornecedor.
   * @param {string} fornecedor - Nome do fornecedor.
   */
  async function sendPostRequest(cnpj, fornecedor) {
    try {
      const user = AuthService.user;
      if (!user) throw new Error("Usuário não autenticado");
      const token = await user.getIdToken();
      const response = await fetch(`https://n8n.power.tec.br/webhook/financeiro/pagamentos/liquidados`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ cnpj, fornecedor })
      });
      const data = await response.json();
      showPaymentsModal(data);
    } catch (error) {
      console.error("Erro ao enviar solicitação:", error);
    }
  }

  // ------------------------------------
  // Lógica de atualização da tabela principal
  // ------------------------------------

  /**
   * Atualiza a tabela principal com os dados recebidos.
   * @param {Array} data - Dados recebidos da API.
   */
  function updateTable(data) {
    if ($.fn.DataTable.isDataTable("#data-table")) {
      const dt = $("#data-table").DataTable();
      dt.clear();
      data.forEach(item => {
        dt.row.add([
          // Coluna Ações (primeira) com ícones modernos e dados adicionais para o modal
          `<button class="btn btn-sm btn-link text-success aprovar" 
                    data-handle="${item.HANDLE || ''}" 
                    data-vencimento="${item.VENCIMENTO || ''}"
                    data-fornecedor="${item.FORNECEDOR || ''}"
                    data-valor="${item.VALORNOMINAL || 0}"
                    title="Aprovar">
              <i class="bi bi-check-circle-fill"></i>
           </button>
           <button class="btn btn-sm btn-link text-danger rejeitar" 
                    data-handle="${item.HANDLE || ''}"
                    data-vencimento="${item.VENCIMENTO || ''}"
                    data-fornecedor="${item.FORNECEDOR || ''}"
                    data-valor="${item.VALORNOMINAL || 0}"
                    title="Rejeitar">
              <i class="bi bi-x-circle-fill"></i>
           </button>`,
          getStatusIcon(item.SEMAFORO),
          `<span data-order="${getTimestamp(item.VENCIMENTO)}">${formatDate(item.VENCIMENTO)}</span>`,
          item.HANDLE || '-',
          `<span data-order="${item.VALORNOMINAL || 0}">${formatCurrency(item.VALORNOMINAL)}</span>`,
          item.FORNECEDOR || '-',
          item.FILIAL || '-',
          item.DOC || '-',
          `<button class="btn btn-sm btn-primary consultar-pagamentos" 
                   data-cnpj="${item.CNPJ || ''}" 
                   data-fornecedor="${item.FORNECEDOR || '-'}">
             Consultar
           </button>`
        ]);
      });
      dt.draw();
    } else {
      const tableBody = $("#data-table tbody");
      tableBody.empty();
      data.forEach(item => {
        tableBody.append(`
          <tr>
            <td class="text-center">
              <button class="btn btn-sm btn-link text-success aprovar" 
                      data-handle="${item.HANDLE || ''}"
                      data-vencimento="${item.VENCIMENTO || ''}"
                      data-fornecedor="${item.FORNECEDOR || ''}"
                      data-valor="${item.VALORNOMINAL || 0}"
                      title="Aprovar">
                <i class="bi bi-check-circle-fill"></i>
              </button>
              <button class="btn btn-sm btn-link text-danger rejeitar" 
                      data-handle="${item.HANDLE || ''}"
                      data-vencimento="${item.VENCIMENTO || ''}"
                      data-fornecedor="${item.FORNECEDOR || ''}"
                      data-valor="${item.VALORNOMINAL || 0}"
                      title="Rejeitar">
                <i class="bi bi-x-circle-fill"></i>
              </button>
            </td>
            <td class="text-center">${getStatusIcon(item.SEMAFORO)}</td>
            <td data-order="${getTimestamp(item.VENCIMENTO)}">${formatDate(item.VENCIMENTO)}</td>
            <td>${item.HANDLE || '-'}</td>
            <td data-order="${item.VALORNOMINAL || 0}">${formatCurrency(item.VALORNOMINAL)}</td>
            <td>${item.FORNECEDOR || '-'}</td>
            <td>${item.FILIAL || '-'}</td>
            <td>${item.DOC || '-'}</td>
            <td class="text-center">
              <button class="btn btn-sm btn-primary consultar-pagamentos" 
                      data-cnpj="${item.CNPJ || ''}" 
                      data-fornecedor="${item.FORNECEDOR || '-'}">
                Consultar
              </button>
            </td>
          </tr>
        `);
      });
      initializeDataTable();
    }

    // Atualiza os eventos dos botões de consulta, aprovar e rejeitar
    $("#data-table").off("click", ".consultar-pagamentos").on("click", ".consultar-pagamentos", function() {
      const cnpj = $(this).data("cnpj");
      const fornecedor = $(this).data("fornecedor");
      sendPostRequest(cnpj, fornecedor);
    });

    $("#data-table").off("click", ".aprovar").on("click", ".aprovar", function() {
      const handle = $(this).data("handle");
      const vencimento = $(this).data("vencimento");
      const fornecedor = $(this).data("fornecedor");
      const valor = $(this).data("valor");
      showLiberacaoModal(handle, 1, vencimento, fornecedor, valor);
    });
    $("#data-table").off("click", ".rejeitar").on("click", ".rejeitar", function() {
      const handle = $(this).data("handle");
      const vencimento = $(this).data("vencimento");
      const fornecedor = $(this).data("fornecedor");
      const valor = $(this).data("valor");
      showLiberacaoModal(handle, 2, vencimento, fornecedor, valor);
    });
  }

  /**
   * Inicializa o plugin DataTables na tabela principal.
   */
  function initializeDataTable() {
    if (window.jQuery && jQuery.fn.DataTable) {
      if ($.fn.DataTable.isDataTable("#data-table")) {
        return;
      }
      $("#data-table").DataTable({
        responsive: true,
        autoWidth: false,
        ordering: true,
        paging: true,
        dom: 'lBfrtip',
        buttons: [
          'copy', 'excel', 'csv', 'pdf'
        ],
        language: {
          url: "https://cdn.datatables.net/plug-ins/1.13.4/i18n/pt-BR.json"
        },
        columnDefs: [
          { type: 'num', targets: 3 }
        ]
      });
    } else {
      console.error("DataTables não está carregado.");
    }
  }

  /**
   * Consulta os dados de aprovações através da API e atualiza a visualização da tabela.
   */
  async function consultaAprovacoes() {
    const reportOverlay = document.getElementById('report-overlay');
    reportOverlay.classList.remove('d-none');
    try {
      const user = AuthService.user;
      if (!user) {
        throw new Error("Usuário não autenticado");
      }
      const token = await user.getIdToken();
      const response = await fetch('https://n8n.power.tec.br/webhook/voetur/aprovacoes/contas-a-pagar', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({})
      });
      const jsonData = await response.json();
      if (!Array.isArray(jsonData) || !jsonData[0]?.data) {
        console.error("A resposta da API não contém os dados esperados.", jsonData);
        return;
      }
      updateTable(jsonData[0].data);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
    } finally {
      reportOverlay.classList.add('d-none');
    }
  }

  /**
   * Monitora a alteração do status de autenticação e inicia a consulta dos dados se o usuário estiver autenticado.
   */
  AuthService.onAuthChange((user) => {
    if (user) {
      console.log("Usuário autenticado:", user);
      const protectedSection = document.getElementById('protected-section');
      protectedSection.classList.remove('d-none');
      setTimeout(() => {
        consultaAprovacoes();
      }, 1000);
    } else {
      console.log("Usuário não autenticado.");
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

// Registra a rota para a página de "Aprovar Contas a Pagar"
registerRoute('#aprovacoes-contas-a-pagar', renderAprovacoesContasAPagar);