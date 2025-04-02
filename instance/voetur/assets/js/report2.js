// consultaGraficosLinhas.js
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

export async function renderConsultaGraficosLinhas() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="container-fluid">
      <!-- Título e Breadcrumb -->
      <div class="page-title my-3">
        <div class="row">
          <div class="col-sm-6 col-12">
            <h2>Financeiro - Gráficos de Linha</h2>
            <p class="mb-0 text-title-gray">Valor e Quantidade de Pagamentos por Dia de Vencimento</p>
          </div>
          <div class="col-sm-6 col-12">
            <ol class="breadcrumb">
              <li class="breadcrumb-item">
                <a href="index.html">
                  <i class="iconly-Home icli svg-color"></i>
                </a>
              </li>
              <li class="breadcrumb-item">Financeiro</li>
              <li class="breadcrumb-item active">Gráficos de Linha</li>
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

      <!-- Área Protegida: Gráficos de Linha -->
      <div id="protected-section" class="d-none mt-4">
        <div class="row">
          <!-- Gráfico de Valor Total por Dia -->
          <div class="col-12 mb-4">
            <div class="card shadow">
              <div class="card-header text-center">
                <h5>Valor Total por Dia de Vencimento</h5>
              </div>
              <div class="card-body">
                <div id="chart-line-valor" style="height:400px;"></div>
              </div>
            </div>
          </div>
          <!-- Gráfico de Quantidade de Pagamentos por Dia -->
          <div class="col-12 mb-4">
            <div class="card shadow">
              <div class="card-header text-center">
                <h5>Quantidade de Pagamentos por Dia de Vencimento</h5>
              </div>
              <div class="card-body">
                <div id="chart-line-quantidade" style="height:400px;"></div>
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

  // Agrupa os dados por data de vencimento – agora a data é um objeto Date
  function groupDataByDate(data) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const next7 = new Date(today);
    next7.setDate(today.getDate() + 7);
    const groupedValor = {};
    const groupedCount = {};
    data.forEach(item => {
      let d = new Date(item.VENCIMENTO);
      d.setHours(0,0,0,0);
      const dateKey = d.getTime(); // chave numérica
      if (!groupedValor[dateKey]) {
        groupedValor[dateKey] = { date: new Date(d), vencido: 0, aVencer: 0, programado: 0 };
        groupedCount[dateKey] = { date: new Date(d), vencido: 0, aVencer: 0, programado: 0 };
      }
      const valor = parseFloat(item.VALORNOMINAL) || 0;
      if (d < today) {
        groupedValor[dateKey].vencido += valor;
        groupedCount[dateKey].vencido += 1;
      } else if (d <= next7) {
        groupedValor[dateKey].aVencer += valor;
        groupedCount[dateKey].aVencer += 1;
      } else {
        groupedValor[dateKey].programado += valor;
        groupedCount[dateKey].programado += 1;
      }
    });
    // Converte para arrays ordenadas pela data
    const valorRows = Object.values(groupedValor).sort((a,b) => a.date - b.date);
    const countRows = Object.values(groupedCount).sort((a,b) => a.date - b.date);
    return { valorRows, countRows };
  }

  // Desenha o gráfico de linha para o total de valores por dia
  function drawLineChartValor(rows) {
    const data = new google.visualization.DataTable();
    // Usamos a coluna de data como 'date'
    data.addColumn('date', 'Data');
    // Para a primeira série (vencido), adicionamos uma coluna de anotação para sinalizar "Hoje"
    data.addColumn('number', 'Vencido');
    data.addColumn({type: 'string', role: 'annotation'});
    data.addColumn('number', 'A Vencer');
    data.addColumn('number', 'Programado');
    
    const today = new Date();
    today.setHours(0,0,0,0);

    const rowsData = rows.map(r => {
      const annotation = (r.date.getTime() === today.getTime()) ? 'Hoje' : null;
      return [r.date, r.vencido, annotation, r.aVencer, r.programado];
    });
    data.addRows(rowsData);

    const options = {
      title: 'Valor Total por Dia de Vencimento',
      height: 400,
      legend: { position: 'bottom' },
      curveType: 'function',
      chartArea: { width: '80%', height: '70%' },
      hAxis: { title: 'Data', format: 'MMM dd' },
      vAxis: { title: 'Valor (R$)' },
      // Define cores e linhas mais grossas
      series: {
        0: { lineWidth: 4, color: 'red' },       // Vencido
        1: { lineWidth: 4, color: 'yellow' },    // A Vencer (hoje e próximos 7 dias)
        2: { lineWidth: 4, color: 'green' }      // Programado
      },
      // Configura as anotações (exibindo a caixa "Hoje")
      annotations: {
        textStyle: {
          fontSize: 12,
          color: '#000',
          auraColor: 'none',
          bold: true
        }
      }
    };

    const chart = new google.visualization.LineChart(document.getElementById('chart-line-valor'));
    chart.draw(data, options);
  }

  // Desenha o gráfico de linha para a quantidade de pagamentos por dia
  function drawLineChartQuantidade(rows) {
    const data = new google.visualization.DataTable();
    data.addColumn('date', 'Data');
    data.addColumn('number', 'Vencido');
    data.addColumn({type: 'string', role: 'annotation'});
    data.addColumn('number', 'A Vencer');
    data.addColumn('number', 'Programado');

    const today = new Date();
    today.setHours(0,0,0,0);

    const rowsData = rows.map(r => {
      const annotation = (r.date.getTime() === today.getTime()) ? 'Hoje' : null;
      return [r.date, r.vencido, annotation, r.aVencer, r.programado];
    });
    data.addRows(rowsData);

    const options = {
      title: 'Quantidade de Pagamentos por Dia de Vencimento',
      height: 400,
      legend: { position: 'bottom' },
      curveType: 'function',
      chartArea: { width: '80%', height: '70%' },
      hAxis: { title: 'Data', format: 'MMM dd' },
      vAxis: { title: 'Quantidade' },
      series: {
        0: { lineWidth: 4, color: 'red' },
        1: { lineWidth: 4, color: 'yellow' },
        2: { lineWidth: 4, color: 'green' }
      },
      annotations: {
        textStyle: {
          fontSize: 12,
          color: '#000',
          auraColor: 'none',
          bold: true
        }
      }
    };

    const chart = new google.visualization.LineChart(document.getElementById('chart-line-quantidade'));
    chart.draw(data, options);
  }

  // Carrega o Google Charts e desenha os gráficos de linha com os dados processados
  function loadGoogleChartsAndDrawLineCharts(data) {
    const { valorRows, countRows } = groupDataByDate(data);
    if (!window.google || !window.google.charts) {
      const script = document.createElement('script');
      script.src = "https://www.gstatic.com/charts/loader.js";
      script.onload = () => {
        google.charts.load('current', { packages: ['corechart'] });
        google.charts.setOnLoadCallback(() => {
          drawLineChartValor(valorRows);
          drawLineChartQuantidade(countRows);
        });
      };
      document.head.appendChild(script);
    } else {
      google.charts.setOnLoadCallback(() => {
        drawLineChartValor(valorRows);
        drawLineChartQuantidade(countRows);
      });
    }
  }

  // Função para buscar os dados reais da API e desenhar os gráficos de linha
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
      loadGoogleChartsAndDrawLineCharts(jsonData[0].data);
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
      // Busca os dados reais e desenha os gráficos de linha
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

  // Atualiza os gráficos de linha ao redimensionar a janela
  window.addEventListener('resize', consultaLiberacoes);
}

registerRoute('#consulta-graficos-linha', renderConsultaGraficosLinhas);