import AuthService from "../js/auth.js";
import { listLancamentos } from "../js/api.js";
import { registerRoute } from "../js/router.js";

export async function renderDashboard() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="container-fluid">
      <div class="row text-center mb-4">
        <div class="col-12 col-md-4 mb-3">
          <div class="card h-100">
            <div class="card-body">
              <h6 class="card-subtitle mb-2 text-muted">Total Lançamentos</h6>
              <h3 id="total-lancamentos">0</h3>
            </div>
          </div>
        </div>
        <div class="col-12 col-md-4 mb-3">
          <div class="card h-100">
            <div class="card-body">
              <h6 class="card-subtitle mb-2 text-muted">Total Pago</h6>
              <h3 id="total-pago">R$ 0.00</h3>
            </div>
          </div>
        </div>
        <div class="col-12 col-md-4 mb-3">
          <div class="card h-100">
            <div class="card-body">
              <h6 class="card-subtitle mb-2 text-muted">Total Aberto</h6>
              <h3 id="total-aberto">R$ 0.00</h3>
            </div>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-body text-center">
          <h5 class="card-title">Bem-vindo!</h5>
          <p class="card-text">
            O portal está em fase de testes. Caso encontre erros ou deseje enviar sugestões, entre em contato pelo e-mail:
            <a href="mailto:suporte@bhm.tec.br">suporte@bhm.tec.br</a>.
          </p>
          <div class="d-grid gap-2 d-md-flex justify-content-md-center">
            <a href="#financeiro-lancamento-create-v3" class="btn btn-primary me-md-2">Lançar Pagamento</a>
            <a href="#chat" class="btn btn-secondary">LexiDecis</a>
          </div>
        </div>
      </div>
      <div class="card mt-4">
        <div class="card-body p-3">
          <h5 class="card-title">Últimos Lançamentos</h5>
          <div class="table-responsive">
            <table class="table table-striped mb-0" id="lancamentos-tabela">
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Data</th>
                  <th>Valor</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody></tbody>
            </table>
          </div>
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

    const tbody = document.querySelector('#lancamentos-tabela tbody');
    tbody.innerHTML = '';
    dados.slice(0, 10).forEach(l => {
      tbody.innerHTML += `
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
    const tbody = document.querySelector('#lancamentos-tabela tbody');
    tbody.innerHTML = '<tr><td colspan="4" class="text-center">Erro ao carregar os dados.</td></tr>';
  }
}

// Registra a rota "#dashboard" para o Dashboard
registerRoute('#dashboard', renderDashboard);