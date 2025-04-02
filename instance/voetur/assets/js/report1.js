// consultaLiberacoes.js
import { registerRoute } from "./router.js";
import AuthService, { auth, db, analytics } from "./auth.js";  // Importa AuthService e reexportações do Firebase
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

export async function renderConsultaLiberacoes() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="container-fluid">
      <!-- Título e Breadcrumb -->
      <div class="page-title">
        <div class="row">
          <div class="col-sm-6 col-12">
            <h2>Financeiro - Liberar Pagamentos</h2>
            <p class="mb-0 text-title-gray">"Relatório com os pagamentos a serem liberados"</p>
          </div>
          <div class="col-sm-6 col-12">
            <ol class="breadcrumb">
              <li class="breadcrumb-item">
                <a href="index.html">
                  <i class="iconly-Home icli svg-color"></i>
                </a>
              </li>
              <li class="breadcrumb-item">Financeiro</li>
              <li class="breadcrumb-item active">Liberar Pagamentos</li>
            </ol>
          </div>
        </div>
      </div>
      
      <!-- Área Protegida -->
      <div id="protected-section" class="mt-4">
        <!-- Container do Report (Resumo + Tabela) -->
        <div id="report-container" class="position-relative">
          <!-- Resumo -->
          <div id="summary" class="mb-3">
            <table class="table table-sm table-borderless text-center w-auto mx-auto">
              <thead>
                <tr>
                  <th>Vencidos</th>
                  <th>Vence Hoje</th>
                  <th>Próx. 7 dias</th>
                  <th>Programadas</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><span id="count-vencidos">0</span> / <span id="valor-vencidos">R$ 0,00</span></td>
                  <td><span id="count-hoje">0</span> / <span id="valor-hoje">R$ 0,00</span></td>
                  <td><span id="count-proximos">0</span> / <span id="valor-proximos">R$ 0,00</span></td>
                  <td><span id="count-programadas">0</span> / <span id="valor-programadas">R$ 0,00</span></td>
                </tr>
              </tbody>
            </table>
          </div>
          <!-- Área do Relatório (Tabela) com overlay -->
          <div id="report-content">
            <div class="table-responsive">
              <table id="data-table" class="table table-striped table-bordered" style="width:100%">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Vencimento</th>
                    <th>Valor</th>
                    <th>Fornecedor</th>
                    <th>Filial</th>
                    <th>Documento</th>
                    <th>Tipo</th>
                    <th>Data Prevista</th>
                    <th>Data Inclusão</th>
                    <th>CNPJ</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody></tbody>
              </table>
            </div>
          </div>
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

  // Funções auxiliares

  // Função para converter o valor de data (se for um objeto Timestamp, converte; senão, utiliza new Date)
  function getTimestamp(dateInput) {
    if (!dateInput) return 0;
    if (typeof dateInput === 'object' && dateInput.seconds) {
      return dateInput.seconds * 1000;
    }
    return new Date(dateInput).getTime();
  }

  // Formata a data para exibição
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

  function formatCurrency(value) {
    return value ? parseFloat(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00';
  }

  function getStatusIcon(status) {
    switch (status) {
      case "VERDE": return "<span class='fs-4'>🟢</span>";
      case "AMARELO": return "<span class='fs-4'>🟡</span>";
      case "VERMELHO": return "<span class='fs-4'>🔴</span>";
      default: return "-";
    }
  }

  // Cria e exibe o modal com todos os campos retornados pela API
  function showPaymentsModal(data) {
    let fornecedorNome = data[0]?.fornecedor || 'Fornecedor';
    let modalHtml = `
      <div class="modal fade" id="paymentsModal" tabindex="-1" aria-labelledby="paymentsModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-lg">
          <div class="modal-content">
            <div class="modal-header bg-primary text-white">
              <h5 class="modal-title" id="paymentsModalLabel">
                Pagamentos Realizados - ${fornecedorNome}
              </h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Fechar"></button>
            </div>
            <div class="modal-body">
              <div class="table-responsive">
                <table class="table table-bordered">
                  <thead class="table-light">
                    <tr>
                      <th>Documento</th>
                     <!--  <th>Data Inclusão</th> -->
                      <th>Data Liquidação</th>
                      <th>Documento Digitado</th> 
                     <!--  <th>CNPJ</th> -->
                     <!--  <th>Tipo Documento</th> -->
                     <!--  <th>Tipo Registro</th> -->
                     <!--  <th>Fornecedor</th> -->
                      <th>AP</th>
                     <!--  <th>Valor Parcela</th> -->
                      <th>Valor Baixado</th>
                     <!--  <th>Saldo</th> -->
                     <!--  <th>Status</th> -->
                     <!--  <th>Empresa</th> -->
                     <!--  <th>Usuário Incluiu</th> -->
                     <!--  <th>Grupo Usuário</th> -->
                     <!--  <th>Operação</th> -->
                     <!--  <th>Sigla</th> -->
                      <!-- <th>Lote Importação</th> -->
                    </tr>
                  </thead>
                  <tbody>`;
    data.forEach(item => {
      modalHtml += `
                    <tr>
                      <td>${item.handle_documento || '-'}</td>
                     <!-- <td>${formatDate(item.dt_inclusao)}</td> -->
                      <td>${formatDate(item.dt_liquidacao)}</td>
                      <td>${item.documento_digitado || '-'}</td>
                      <!-- <td>${item.cnpj || '-'}</td> -->
                      <!-- <td>${item.tipo_documento || '-'}</td> -->
                      <!--<td>${item.tipo_registro || '-'}</td> -->
                     <!-- <td>${item.fornecedor || '-'}</td> -->
                      <td>${item.ap || '-'}</td>
                     <!-- <td>${formatCurrency(item.valor_parcela)}</td> -->
                      <td>${formatCurrency(item.valor_baixado)}</td>
                     <!-- <td>${formatCurrency(item.saldo)}</td> -->
                     <!-- <td>${item.status || '-'}</td> -->
                     <!-- <td>${item.empresa || '-'}</td> -->
                     <!--  <td>${item.usuario_incluiu || '-'}</td> -->
                      <!-- <td>${item.grupo_usuario || '-'}</td> -->
                     <!-- <td>${item.operacao || '-'}</td> -->
                     <!-- <td>${item.sigla || '-'}</td> -->
                      <!-- <td>${item.lote_importacao || '-'}</td> --> 
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
    
    // Insere o modal no body (caso ainda não exista)
    let modalContainer = document.getElementById('modalContainer');
    if (!modalContainer) {
      modalContainer = document.createElement('div');
      modalContainer.id = 'modalContainer';
      document.body.appendChild(modalContainer);
    }
    modalContainer.innerHTML = modalHtml;
    
    // Inicializa e exibe o modal (utilizando Bootstrap 5)
    let paymentsModal = new bootstrap.Modal(document.getElementById('paymentsModal'));
    paymentsModal.show();
  }

  // Envia CNPJ e Fornecedor à API e exibe a resposta no modal
  async function sendPostRequest(cnpj, fornecedor) {
    try {
      const user = AuthService.user;
      if (!user) throw new Error("Usuário não autenticado");
      const token = await user.getIdToken();
      const response = await fetch(`https://n8n.prod.bhm.tec.br/webhook/financeiro/pagamentos/liquidados`, {
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

  // Atualiza o relatório e insere o botão para consultar pagamentos
  function updateTable(data) {
    updateSummary(data);
    // Se o DataTable já foi inicializado, atualiza via API; caso contrário, insere as linhas e inicializa
    if ($.fn.DataTable.isDataTable("#data-table")) {
      const dt = $("#data-table").DataTable();
      dt.clear();
      data.forEach(item => {
        dt.row.add([
          getStatusIcon(item.SEMAFORO),
          `<span data-order="${getTimestamp(item.VENCIMENTO)}">${formatDate(item.VENCIMENTO)}</span>`,
          `<span data-order="${item.VALORNOMINAL || 0}">${formatCurrency(item.VALORNOMINAL)}</span>`,
          item.FORNECEDOR || '-',
          item.FILIAL || '-',
          item.DOC || '-',
          item.TIPO || '-',
          `<span data-order="${getTimestamp(item.DATAPREVISTA)}">${formatDate(item.DATAPREVISTA)}</span>`,
          `<span data-order="${getTimestamp(item.DATAINCLUSAO)}">${formatDate(item.DATAINCLUSAO)}</span>`,
          `<button class="btn btn-sm btn-primary consultar-pagamentos" data-cnpj="${item.CNPJ || ''}" data-fornecedor="${item.FORNECEDOR || '-'}">Consultar Pagamentos</button>`
        ]);
      });
      dt.draw();
    } else {
      const tableBody = $("#data-table tbody");
      tableBody.empty();
      data.forEach(item => {
        tableBody.append(`
          <tr>
            <td class="text-center">${getStatusIcon(item.SEMAFORO)}</td>
            <td data-order="${getTimestamp(item.VENCIMENTO)}">${formatDate(item.VENCIMENTO)}</td>
            <td data-order="${item.VALORNOMINAL || 0}">${formatCurrency(item.VALORNOMINAL)}</td>
            <td>${item.FORNECEDOR || '-'}</td>
            <td>${item.FILIAL || '-'}</td>
            <td>${item.DOC || '-'}</td>
            <td>${item.TIPO || '-'}</td>
            <td data-order="${getTimestamp(item.DATAPREVISTA)}">${formatDate(item.DATAPREVISTA)}</td>
            <td data-order="${getTimestamp(item.DATAINCLUSAO)}">${formatDate(item.DATAINCLUSAO)}</td>
            <td>${item.CNPJ || '-'}</td>
            <td class="text-center">
              <button class="btn btn-sm btn-primary consultar-pagamentos" 
                      data-cnpj="${item.CNPJ || ''}" 
                      data-fornecedor="${item.FORNECEDOR || '-'}">
                Consultar Pagamentos
              </button>
            </td>
          </tr>
        `);
      });
      initializeDataTable();
    }
    // Garante que o evento de clique não seja duplicado
    $("#data-table").off("click", ".consultar-pagamentos").on("click", ".consultar-pagamentos", function() {
      const cnpj = $(this).data("cnpj");
      const fornecedor = $(this).data("fornecedor");
      sendPostRequest(cnpj, fornecedor);
    });
  }

  function updateSummary(data) {
    let countVencidos = 0, countHoje = 0, countProximos = 0, countProgramadas = 0;
    let valorVencidos = 0, valorHoje = 0, valorProximos = 0, valorProgramadas = 0;
    const today = new Date(); today.setHours(0,0,0,0);
    const next7 = new Date(today); next7.setDate(today.getDate() + 7);
    data.forEach(item => {
      let vencimentoDate = new Date(getTimestamp(item.VENCIMENTO));
      let vencimentoOnly = new Date(vencimentoDate.getTime());
      vencimentoOnly.setHours(0,0,0,0);
      let valor = parseFloat(item.VALORNOMINAL) || 0;
      if (vencimentoOnly < today) {
        countVencidos++;
        valorVencidos += valor;
      } else if (vencimentoOnly.getTime() === today.getTime()) {
        countHoje++;
        valorHoje += valor;
      } else if (vencimentoOnly > today && vencimentoOnly <= next7) {
        countProximos++;
        valorProximos += valor;
      } else {
        countProgramadas++;
        valorProgramadas += valor;
      }
    });
    document.getElementById("count-vencidos").innerText = countVencidos;
    document.getElementById("count-hoje").innerText = countHoje;
    document.getElementById("count-proximos").innerText = countProximos;
    document.getElementById("count-programadas").innerText = countProgramadas;
    document.getElementById("valor-vencidos").innerText = formatCurrency(valorVencidos);
    document.getElementById("valor-hoje").innerText = formatCurrency(valorHoje);
    document.getElementById("valor-proximos").innerText = formatCurrency(valorProximos);
    document.getElementById("valor-programadas").innerText = formatCurrency(valorProgramadas);
  }

  function initializeDataTable() {
    if (window.jQuery && jQuery.fn.DataTable) {
      if ($.fn.DataTable.isDataTable("#data-table")) {
        // Já inicializado, não faz nada
        return;
      }
      $("#data-table").DataTable({
        responsive: true,
        autoWidth: true,
        ordering: true,
        paging: true,
        select: true,
        dom: '<"row mb-3"<"col-sm-6"l><"col-sm-6 text-end"f>>rt<"row mt-3"<"col-sm-6"i><"col-sm-6"p>>',
        language: {
          url: "https://cdn.datatables.net/plug-ins/1.13.4/i18n/pt-BR.json"
        },
        columnDefs: [
          { type: 'num', targets: 2 }
        ],
        createdRow: function (row, data, dataIndex) {
          let $cell = $('td', row).eq(1);
          let vencimentoTimestamp = $cell.data('order');
          if (vencimentoTimestamp) {
            let vencimentoDate = new Date(vencimentoTimestamp);
            let today = new Date();
            today.setHours(0,0,0,0);
            let vencimentoDateOnly = new Date(vencimentoDate.getTime());
            vencimentoDateOnly.setHours(0,0,0,0);
            if (vencimentoDateOnly < today) {
              $(row).addClass("table-danger");
            } else if (vencimentoDateOnly.getTime() === today.getTime()) {
              $(row).addClass("table-warning");
            }
          }
        }
      });
    } else {
      console.error("DataTables não está carregado.");
    }
  }

  async function consultaLiberacoes() {
    const reportOverlay = document.getElementById('report-overlay');
    reportOverlay.classList.remove('d-none');
    try {
      const user = AuthService.user;
      if (!user) {
        throw new Error("Usuário não autenticado");
      }
      const token = await user.getIdToken();
      const response = await fetch('https://n8n.prod.bhm.tec.br/webhook/liberacao/listar', {
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

  // Monitoramento de autenticação via AuthService
  AuthService.onAuthChange((user) => {
    if (user) {
      console.log("Usuário autenticado:", user);
      const protectedSection = document.getElementById('protected-section');
      protectedSection.classList.remove('d-none');
      // Aguarda um breve momento para garantir que todos os scripts estejam prontos
      setTimeout(() => {
        consultaLiberacoes();
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

registerRoute('#consulta-liberacoes', renderConsultaLiberacoes);