// consultaLiberacoes.js
import { registerRoute } from "../js/router.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-analytics.js";
import { getFirestore, doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyD7Gh-UfV-LyueKtlUcY9nny_o-UWmlmJM",
  authDomain: "lexidecis.firebaseapp.com",
  projectId: "lexidecis",
  storageBucket: "lexidecis.firebasestorage.app",
  messagingSenderId: "267899611161",
  appId: "1:267899611161:web:6d1160f5ade72515ee6288",
  measurementId: "G-0QSNF8MKR1"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const analytics = getAnalytics(app);
const db = getFirestore(app);

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
    <div class="container-fluid">
      <!-- Tela de Login -->
      <div id="login-section" class="card mx-auto my-5" style="max-width:320px; display:none;">
        <div class="card-body">
          <h2 class="card-title text-center mb-4">LexiDecis</h2>
          <form id="login-form">
            <div class="mb-3">
              <label for="email" class="form-label">Email:</label>
              <input type="email" id="email" class="form-control" placeholder="Digite seu email" required>
            </div>
            <div class="mb-3">
              <label for="password" class="form-label">Senha:</label>
              <input type="password" id="password" class="form-control" placeholder="Digite sua senha" required>
            </div>
            <button type="submit" class="btn btn-primary w-100">Entrar</button>
          </form>
          <button id="reset-password-button" class="btn btn-secondary w-100 mt-2">Esqueci minha senha</button>
        </div>
      </div>
      
      <!-- Botão de Logout -->
      <button id="logout-button" class="btn btn-danger position-fixed top-0 end-0 m-3 d-none">Sair</button>
      
      <!-- Área Protegida -->
      <div id="protected-section" class="d-none mt-4">
       <!--  <h1 class="text-center mb-4">Liberações de Pagamentos</h1> -->
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
                    <th>Ação</th>
                    <th>Handle</th>
                    <th>Vencimento</th>
                    <th>Valor</th>
                    <th>Fornecedor</th>
                    <th>Filial</th>
                    <th>Documento</th>
                    <th>Tipo</th>
                    <th>Data Prevista</th>
                    <th>Data Inclusão</th>
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

  // Funções de UI usando Bootstrap
  function showLoginSection() {
    document.getElementById('login-section').classList.remove('d-none');
    document.getElementById('protected-section').classList.add('d-none');
    document.getElementById('logout-button').classList.add('d-none');
  }
  function showProtectedSection() {
    document.getElementById('login-section').classList.add('d-none');
    document.getElementById('protected-section').classList.remove('d-none');
    document.getElementById('logout-button').classList.remove('d-none');
  }
  function clearTableData() {
    if (window.jQuery && jQuery.fn.DataTable && jQuery.fn.DataTable.isDataTable("#data-table")) {
      $("#data-table").DataTable().clear().destroy();
    }
    $("#data-table tbody").empty();
  }
  function saveUserSession(user) {
    const userDoc = doc(db, "userSessions", user.uid);
    setDoc(userDoc, {
      email: user.email,
      displayName: user.displayName || "Usuário Anônimo",
      lastLogin: serverTimestamp()
    }, { merge: true });
  }
  function updateSummary(data) {
    let countVencidos = 0, countHoje = 0, countProximos = 0, countProgramadas = 0;
    let valorVencidos = 0, valorHoje = 0, valorProximos = 0, valorProgramadas = 0;
    const today = new Date(); today.setHours(0,0,0,0);
    const next7 = new Date(today); next7.setDate(today.getDate() + 7);
    data.forEach(item => {
      let vencimentoDate = new Date(item.VENCIMENTO);
      let vencimentoOnly = new Date(vencimentoDate.getTime());
      vencimentoOnly.setHours(0,0,0,0);
      let valor = parseFloat(item.VALORNOMINAL) || 0;
      if (vencimentoOnly < today) {
        countVencidos++; valorVencidos += valor;
      } else if (vencimentoOnly.getTime() === today.getTime()) {
        countHoje++; valorHoje += valor;
      } else if (vencimentoOnly > today && vencimentoOnly <= next7) {
        countProximos++; valorProximos += valor;
      } else {
        countProgramadas++; valorProgramadas += valor;
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
  function formatCurrency(value) {
    return value ? parseFloat(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00';
  }
  function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  }
  function getStatusIcon(status) {
    switch (status) {
      case "VERDE": return "<span class='fs-4'>🟢</span>";
      case "AMARELO": return "<span class='fs-4'>🟡</span>";
      case "VERMELHO": return "<span class='fs-4'>🔴</span>";
      default: return "-";
    }
  }
  function sendPostRequest(id) {
    fetch(`https://n8n.prod.bhm.tec.br/webhook/LiberacaoAp/ConfirmarAcaoParcelas?id=${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
    .then(response => response.json())
    .then(data => alert("Ação realizada com sucesso!"))
    .catch(error => console.error("Erro ao enviar solicitação:", error));
  }
  function updateTable(data) {
    updateSummary(data);
    const tableBody = $("#data-table tbody");
    tableBody.empty();
    data.forEach(item => {
      tableBody.append(`
        <tr>
          <td class="text-center">${getStatusIcon(item.SEMAFORO)}</td>
          <td>
            <button class="btn btn-sm btn-success me-1" onclick="sendPostRequest('${item.HANDLE}')">✅ Liberar</button>
            <button class="btn btn-sm btn-danger" onclick="sendPostRequest('${item.HANDLE}')">🚫 Rejeitar</button>
          </td>
          <td>${item.HANDLE || '-'}</td>
          <td data-order="${new Date(item.VENCIMENTO).getTime()}">${formatDate(item.VENCIMENTO)}</td>
          <td data-order="${item.VALORNOMINAL || 0}">${formatCurrency(item.VALORNOMINAL)}</td>
          <td>${item.FORNECEDOR || '-'}</td>
          <td>${item.FILIAL || '-'}</td>
          <td>${item.DOC || '-'}</td>
          <td>${item.TIPO || '-'}</td>
          <td>${formatDate(item.DATAPREVISTA)}</td>
          <td>${formatDate(item.DATAINCLUSAO)}</td>
        </tr>
      `);
    });
    initializeDataTable();
    setTimeout(() => {
      if (window.jQuery && jQuery.fn.DataTable) {
        $("#data-table").DataTable().columns.adjust().draw();
      }
    }, 200);
  }
  function initializeDataTable() {
    if (window.jQuery && jQuery.fn.DataTable) {
      if (jQuery.fn.DataTable.isDataTable("#data-table")) {
        $("#data-table").DataTable().clear().destroy();
      }
      $("#data-table").DataTable({
        responsive: true,
        autoWidth: true,
        ordering: true,
        paging: true,
        select: true,
        // Layout com os controles de exibição, filtro, informação e paginação organizados
        dom: '<"row mb-3"<"col-sm-6"l><"col-sm-6 text-end"f>>rt<"row mt-3"<"col-sm-6"i><"col-sm-6"p>>',
        language: {
          url: "https://cdn.datatables.net/plug-ins/1.13.4/i18n/pt-BR.json"
        },
        columnDefs: [
          { type: 'num', targets: 3 }
        ],
        createdRow: function (row, data, dataIndex) {
          let vencimentoTimestamp = $('td', row).eq(3).data('order');
          if (vencimentoTimestamp) {
            let vencimentoDate = new Date(vencimentoTimestamp);
            let today = new Date(); today.setHours(0,0,0,0);
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

  // Função para buscar os dados da API (consultaLiberacoes)
  async function consultaLiberacoes() {
    // Exibe o overlay para cobrir todo o conteúdo do relatório (resumo + tabela)
    document.getElementById('report-overlay').classList.remove('d-none');
    try {
      const token = await auth.currentUser.getIdToken();
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
      // Oculta o overlay
      document.getElementById('report-overlay').classList.add('d-none');
    }
  }

  // Monitoramento de inatividade (4 horas)
  let inactivityTimeout;
  const INACTIVITY_LIMIT = 4 * 60 * 60 * 1000;
  function resetInatividadeTimer() {
    clearTimeout(inactivityTimeout);
    inactivityTimeout = setTimeout(() => {
      signOut(auth).then(() => {
        alert("Sessão expirada por inatividade.");
        clearTableData();
        showLoginSection();
      });
    }, INACTIVITY_LIMIT);
  }
  function monitorInatividade() {
    window.addEventListener("mousemove", resetInatividadeTimer);
    window.addEventListener("keydown", resetInatividadeTimer);
    window.addEventListener("scroll", resetInatividadeTimer);
    window.addEventListener("click", resetInatividadeTimer);
    window.addEventListener("touchstart", resetInatividadeTimer);
    resetInatividadeTimer();
  }

  // Monitoramento de autenticação via Firebase
  onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log("Usuário autenticado:", user);
      saveUserSession(user);
      showProtectedSection();
      monitorInatividade();
      setTimeout(() => {
        consultaLiberacoes();
      }, 1000);
    } else {
      console.log("Usuário não autenticado.");
      showLoginSection();
    }
  });

  // Eventos do formulário de login
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    if (!email || !password) {
      alert("Por favor, preencha todos os campos.");
      return;
    }
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("Login bem-sucedido:", userCredential.user);
      saveUserSession(userCredential.user);
      showProtectedSection();
      monitorInatividade();
    } catch (error) {
      console.error("Erro ao realizar login:", error);
      alert("Erro ao fazer login: " + error.message);
    }
  });

  // Redefinição de senha
  document.getElementById('reset-password-button').addEventListener('click', async () => {
    const email = document.getElementById('email').value.trim();
    if (!email) {
      alert("Por favor, forneça um e-mail válido.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      alert("E-mail de redefinição enviado. Verifique sua caixa de entrada.");
    } catch (error) {
      console.error("Erro ao redefinir senha:", error);
      alert("Erro ao redefinir senha: " + error.message);
    }
  });

  // Logout
  document.getElementById('logout-button').addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      await signOut(auth);
      clearTableData();
      showLoginSection();
    } catch (error) {
      console.error("Erro ao realizar logout:", error);
    }
  });
}

registerRoute('#consulta-liberacoes', renderConsultaLiberacoes);