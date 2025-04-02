// consultaGraficos.js
import { registerRoute } from "./router.js";
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

export async function renderConsultaGraficos() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="container-fluid">
      <!-- Título e Breadcrumb -->
      <div class="page-title my-3">
        <div class="row">
          <div class="col-sm-6 col-12">
            <h2>Financeiro - Gráficos</h2>
            <p class="mb-0 text-title-gray">Visualize os dados consolidados e os Top 10</p>
          </div>
          <div class="col-sm-6 col-12">
            <ol class="breadcrumb">
              <li class="breadcrumb-item">
                <a href="index.html">
                  <i class="iconly-Home icli svg-color"></i>
                </a>
              </li>
              <li class="breadcrumb-item">Financeiro</li>
              <li class="breadcrumb-item active">Gráficos</li>
            </ol>
          </div>
        </div>
      </div>
      
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
      
      <!-- Área Protegida: Gráficos -->
      <div id="protected-section" class="d-none mt-4">
        <div class="row">
          <!-- Gráfico Consolidado -->
          <div class="col-12 mb-4">
            <div class="card shadow">
              <div class="card-header text-center">
                <h5>Consolidação de Pagamentos</h5>
              </div>
              <div class="card-body">
                <div id="chart-consolidated" style="height:400px;"></div>
              </div>
            </div>
          </div>
          <!-- Top 10 Pagamentos Vencidos -->
          <div class="col-md-6 mb-4">
            <div class="card shadow">
              <div class="card-header text-center">
                <h5>Top 10 Pagamentos Vencidos (Valor)</h5>
              </div>
              <div class="card-body">
                <div id="chart-top10-pagamentos" style="height:400px;"></div>
              </div>
            </div>
          </div>
          <!-- Top 10 Fornecedores por Valor Vencido -->
          <div class="col-md-6 mb-4">
            <div class="card shadow">
              <div class="card-header text-center">
                <h5>Top 10 Fornecedores (Vencidos)</h5>
              </div>
              <div class="card-body">
                <div id="chart-top10-fornecedores" style="height:400px;"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Funções de UI
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

  // Processa os dados da API para calcular as totalizações por categoria
  function computeSummary(data) {
    let countVencidos = 0, countHoje = 0, countProximos = 0, countProgramadas = 0;
    let valorVencidos = 0, valorHoje = 0, valorProximos = 0, valorProgramadas = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const next7 = new Date(today);
    next7.setDate(today.getDate() + 7);
    data.forEach(item => {
      let vencimentoDate = new Date(item.VENCIMENTO);
      let vencimentoOnly = new Date(vencimentoDate.getTime());
      vencimentoOnly.setHours(0, 0, 0, 0);
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
    return { countVencidos, valorVencidos, countHoje, valorHoje, countProximos, valorProximos, countProgramadas, valorProgramadas };
  }

  // Calcula os Top 10 pagamentos vencidos (ordem decrescente pelo valor)
  function computeTop10Pagamentos(data) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Filtra apenas os vencidos
    let vencidos = data.filter(item => {
      let vencimentoDate = new Date(item.VENCIMENTO);
      let vencimentoOnly = new Date(vencimentoDate.getTime());
      vencimentoOnly.setHours(0, 0, 0, 0);
      return vencimentoOnly < today;
    });
    // Ordena decrescentemente por VALORNOMINAL e pega os 10 primeiros
    vencidos.sort((a, b) => parseFloat(b.VALORNOMINAL || 0) - parseFloat(a.VALORNOMINAL || 0));
    return vencidos.slice(0, 10);
  }

  // Calcula os Top 10 fornecedores com base no total de valores vencidos
  function computeTop10Fornecedores(data) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const fornecedores = {};
    data.forEach(item => {
      let vencimentoDate = new Date(item.VENCIMENTO);
      let vencimentoOnly = new Date(vencimentoDate.getTime());
      vencimentoOnly.setHours(0, 0, 0, 0);
      if (vencimentoOnly < today) {
        let fornecedor = item.FORNECEDOR || 'Indefinido';
        let valor = parseFloat(item.VALORNOMINAL) || 0;
        if (!fornecedores[fornecedor]) {
          fornecedores[fornecedor] = 0;
        }
        fornecedores[fornecedor] += valor;
      }
    });
    // Converte o objeto em array e ordena decrescentemente
    const sorted = Object.entries(fornecedores).sort((a, b) => b[1] - a[1]);
    return sorted.slice(0, 10);
  }

  // Desenha os gráficos após o carregamento do Google Charts
  function drawAllCharts(data) {
    const summary = computeSummary(data);
    drawConsolidatedChart(summary);
    const top10Pagamentos = computeTop10Pagamentos(data);
    drawTop10PagamentosChart(top10Pagamentos);
    const top10Fornecedores = computeTop10Fornecedores(data);
    drawTop10FornecedoresChart(top10Fornecedores);
  }

  // Gráfico Consolidado (Barras) – Categoria vs Quantidade e Valor
  function drawConsolidatedChart(summary) {
    const data = new google.visualization.DataTable();
    data.addColumn('string', 'Categoria');
    data.addColumn('number', 'Quantidade');
    data.addColumn('number', 'Valor');

    data.addRows([
      ['Vencidos', summary.countVencidos, summary.valorVencidos],
      ['Vence Hoje', summary.countHoje, summary.valorHoje],
      ['Próx. 7 dias', summary.countProximos, summary.valorProximos],
      ['Programadas', summary.countProgramadas, summary.valorProgramadas]
    ]);

    const options = {
      title: 'Consolidação de Pagamentos',
      height: 400,
      legend: { position: 'bottom' },
      chartArea: { width: '70%', height: '70%' },
      hAxis: {
        title: 'Categoria'
      },
      vAxis: {
        title: 'Valores'
      }
    };

    const chart = new google.visualization.ColumnChart(document.getElementById('chart-consolidated'));
    chart.draw(data, options);
  }

  // Gráfico Top 10 Pagamentos Vencidos – Cada barra representa um pagamento (usando DOC)
  function drawTop10PagamentosChart(top10) {
    const data = new google.visualization.DataTable();
    data.addColumn('string', 'Pagamento');
    data.addColumn('number', 'Valor');

    top10.forEach(item => {
      // Se não houver DOC, usa um identificador alternativo
      const label = item.DOC || `ID:${item.id || '-'}`;
      data.addRow([label, parseFloat(item.VALORNOMINAL) || 0]);
    });

    const options = {
      title: 'Top 10 Pagamentos Vencidos (Valor)',
      height: 400,
      legend: { position: 'none' },
      chartArea: { width: '70%', height: '70%' },
      hAxis: {
        title: 'Valor'
      },
      vAxis: {
        title: 'Pagamento'
      }
    };

    const chart = new google.visualization.BarChart(document.getElementById('chart-top10-pagamentos'));
    chart.draw(data, options);
  }

  // Gráfico Top 10 Fornecedores – Cada barra representa o total de valores vencidos por fornecedor
  function drawTop10FornecedoresChart(top10) {
    const data = new google.visualization.DataTable();
    data.addColumn('string', 'Fornecedor');
    data.addColumn('number', 'Valor Vencido');

    top10.forEach(([fornecedor, valor]) => {
      data.addRow([fornecedor, valor]);
    });

    const options = {
      title: 'Top 10 Fornecedores (Vencidos)',
      height: 400,
      legend: { position: 'none' },
      chartArea: { width: '70%', height: '70%' },
      hAxis: {
        title: 'Valor Vencido'
      },
      vAxis: {
        title: 'Fornecedor'
      }
    };

    const chart = new google.visualization.BarChart(document.getElementById('chart-top10-fornecedores'));
    chart.draw(data, options);
  }

  // Carrega o Google Charts e desenha os gráficos com os dados
  function loadGoogleChartsAndDraw(data) {
    if (!window.google || !window.google.charts) {
      const script = document.createElement('script');
      script.src = "https://www.gstatic.com/charts/loader.js";
      script.onload = () => {
        google.charts.load('current', { packages: ['corechart', 'bar'] });
        google.charts.setOnLoadCallback(() => drawAllCharts(data));
      };
      document.head.appendChild(script);
    } else {
      google.charts.setOnLoadCallback(() => drawAllCharts(data));
    }
  }

  // Função para buscar os dados reais da API
  async function consultaLiberacoes() {
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
      // Processa os dados e desenha os gráficos
      loadGoogleChartsAndDraw(jsonData[0].data);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
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
      // Salva sessão (opcional)
      const userDoc = doc(db, "userSessions", user.uid);
      setDoc(userDoc, {
        email: user.email,
        displayName: user.displayName || "Usuário Anônimo",
        lastLogin: serverTimestamp()
      }, { merge: true });
      showProtectedSection();
      monitorInatividade();
      // Busca os dados reais e desenha os gráficos
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
      const userDoc = doc(db, "userSessions", userCredential.user.uid);
      setDoc(userDoc, {
        email: userCredential.user.email,
        displayName: userCredential.user.displayName || "Usuário Anônimo",
        lastLogin: serverTimestamp()
      }, { merge: true });
      showProtectedSection();
      monitorInatividade();
    } catch (error) {
      console.error("Erro ao realizar login:", error);
      alert("Erro ao fazer login: " + error.message);
    }
  });

  // Evento de redefinição de senha
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

  // Evento de logout
  document.getElementById('logout-button').addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      await signOut(auth);
      showLoginSection();
    } catch (error) {
      console.error("Erro ao realizar logout:", error);
    }
  });

  // Atualiza os gráficos ao redimensionar a janela (se os dados já estiverem carregados)
  window.addEventListener('resize', consultaLiberacoes);
}

registerRoute('#consulta-graficos', renderConsultaGraficos);