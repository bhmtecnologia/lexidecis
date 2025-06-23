import AuthService from "../js/auth.js";
import { listLancamentos } from "../js/api.js";
import { registerRoute } from "../js/router.js";

export async function renderDashboard() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="container-fluid">
      <div class="card">
        <div class="card-body text-center">
          <h5 class="card-title">Bem-vindo!</h5>
          <p class="card-text">
            Oteste portal está aaaem fase de testes. Caso encontre erros ou deseje enviar sugestões, entre em contato pelo e-mail:
            <a href="mailto:suporte@bhm.tec.br">suporte@bhm.tec.br</a>.
          </p>
          <div class="br-container" style="padding: 1rem;">
            <div class="d-flex flex-wrap justify-content-center" style="gap: 1rem;">
              <a role="button" href="#vtc-financeiro-lancamento-create-v6" class="br-button br-button--primary" style="flex: 0 0 auto; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.25rem;">
                <div style="width: 80px; height: 80px; background-color: #f2f2f2; border: 1px solid #ccc; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                  <i class="bi bi-currency-dollar" style="font-size: 2.5rem;"></i>
                </div>
                <span style="font-size: 0.75rem; margin-top: 0.25rem;">Lançar</span>
              </a>
              <!-- <a role="button" href="#chat" class="br-button br-button--secondary" style="flex: 0 0 auto; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.25rem;">
                <div style="width: 80px; height: 80px; background-color: #f2f2f2; border: 1px solid #ccc; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                  <i class="bi bi-chat-dots" style="font-size: 2.5rem;"></i>
                </div>
                <span style="font-size: 0.75rem; margin-top: 0.25rem;">LexiDecis</span>
              </a> -->
              <!-- <a role="button" href="#vtc-indicador-pmr" class="br-button br-button--tertiary" style="flex: 0 0 auto; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.25rem;">
                <div style="width: 80px; height: 80px; background-color: #f2f2f2; border: 1px solid #ccc; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                  <i class="bi bi-bar-chart" style="font-size: 2.5rem;"></i>
                </div>
                <span style="font-size: 0.75rem; margin-top: 0.25rem;">KPIs</span>
              </a> -->
              <a role="button" href="#vtc-financeiro-gestor" class="br-button br-button--tertiary" style="flex: 0 0 auto; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.25rem;">
                <div style="width: 80px; height: 80px; background-color: #f2f2f2; border: 1px solid #ccc; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                  <i class="bi bi-wallet2" style="font-size: 2.5rem;"></i>
                </div>
                <span style="font-size: 0.75rem; margin-top: 0.25rem;">Financeiro</span>
              </a>
              <a role="button" href="#prestacao-de-contas" class="br-button br-button--secondary" style="flex: 0 0 auto; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.25rem;">
                <div style="width: 80px; height: 80px; background-color: #f2f2f2; border: 1px solid #ccc; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                  <i class="bi bi-file-earmark-text" style="font-size: 2.5rem;"></i>
                </div>
                <span style="font-size: 0.75rem; margin-top: 0.25rem;">Prestação de Contas</span>
              </a>
            </div>
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

  } catch (error) {
    console.error('Erro ao carregar lançamentos:', error);
    const tbody = document.querySelector('#lancamentos-tabela tbody');
    tbody.innerHTML = '<tr><td colspan="4" class="text-center">Erro ao carregar os dados.</td></tr>';
  }
}

// Registra a rota "#dashboard" para o Dashboard
registerRoute('#dashboard', renderDashboard);