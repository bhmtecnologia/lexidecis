import AuthService from "../js/auth.js";
import { listLancamentos } from "../js/api.js";
import { registerRoute } from "../js/router.js";

export async function renderDashboard() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="container-fluid">
      <!-- Título e Breadcrumb -->
      <div class="page-title">
        <div class="row">
          <div class="col-sm-6 col-12">
            <h2>Bem-vindo ao Portal</h2>
            <p class="mb-0 text-title-gray">Este portal está em fase de testes.</p>
          </div>
          <div class="col-sm-6 col-12">
            <ol class="breadcrumb">
              <li class="breadcrumb-item">
                <a href="index.html">
                  <i class="iconly-Home icli svg-color"></i>
                </a>
              </li>
              <li class="breadcrumb-item active">Boas-vindas</li>
            </ol>
          </div>
        </div>
      </div>

      <!-- Mensagem de Boas-Vindas -->
      <div class="card">
        <div class="card-body">
          <h5 class="card-title">Bem-vindo!</h5>
          <p class="card-text">
            O portal está em fase de testes. Caso encontre erros ou deseje enviar sugestões, entre em contato pelo e-mail:
            <a href="mailto:suporte@bhm.tec.br">suporte@bhm.tec.br</a>.
          </p>
        </div>
      </div>
    </div>
  `;

  // Aguarda o carregamento do usuário
  await new Promise(resolve => {
    const interval = setInterval(() => {
      if (AuthService.user) {
        clearInterval(interval);
        resolve();
      }
    }, 100);
  });

  // Busca dados da API fictícia de lançamentos
  try {
    const dados = await listLancamentos(AuthService);

    const totalLancamentos = dados.length;
    const totalPago = dados
      .filter(l => l.dados.status === 'Pago')
      .reduce((acc, cur) => acc + (parseFloat(cur.dados.valor) || 0), 0);
    const totalAberto = dados
      .filter(l => l.dados.status !== 'Pago')
      .reduce((acc, cur) => acc + (parseFloat(cur.dados.valor) || 0), 0);

    document.getElementById('total-lancamentos').textContent = totalLancamentos;
    document.getElementById('total-pago').textContent = 'R$ ' + totalPago.toFixed(2);
    document.getElementById('total-aberto').textContent = 'R$ ' + totalAberto.toFixed(2);

    const tabela = document.getElementById('lancamentos-tabela');
    tabela.innerHTML = '';
    dados.slice(0, 10).forEach(l => {
      tabela.innerHTML += `
        <tr>
          <td>${l.dados.descricao}</td>
          <td>${new Date(l.dados.data_lancamento).toLocaleDateString()}</td>
          <td>R$ ${(parseFloat(l.dados.valor) || 0).toFixed(2)}</td>
          <td>${l.dados.status}</td>
        </tr>
      `;
    });

  } catch (error) {
    console.error('Erro ao carregar lançamentos:', error);
    const tabela = document.getElementById('lancamentos-tabela');
    tabela.innerHTML = '<tr><td colspan="4">Erro ao carregar os dados.</td></tr>';
  }
}

// Registra a rota "#dashboard" para o Dashboard
registerRoute('#dashboard', renderDashboard);