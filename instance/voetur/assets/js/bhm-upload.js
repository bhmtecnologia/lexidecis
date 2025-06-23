import AuthService from "../js/auth.js";
import { listLancamentos, listDocumentStore } from "../js/api.js";
import { registerRoute } from "../js/router.js";

export async function renderUpload() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="container mt-4">
      <h5>📤 Upload de Arquivos</h5>
      <input type="file" id="uploadInput" class="form-control" multiple />
      <button id="uploadBtn" class="btn btn-primary mt-2">Enviar</button>
      <div id="uploadStatus" class="mt-3"></div>
      <div id="storeList" class="mt-4">
        <h6>Document Stores Disponíveis:</h6>
        <div id="storeListContent">Carregando...</div>
      </div>
    </div>
  `;
  document.getElementById('uploadBtn').addEventListener('click', async () => {
    const files = document.getElementById('uploadInput').files;
    const status = document.getElementById('uploadStatus');
    if (!files.length) {
      status.innerText = '⚠️ Selecione ao menos um arquivo.';
      return;
    }
    const formData = new FormData();
    for (let file of files) formData.append('files', file);
    status.innerText = '🔄 Enviando...';
    try {
      const response = await fetch('/bhm-upload', {
        method: 'POST',
        body: formData,
      });
      if (response.ok) {
        status.innerText = '✅ Upload concluído com sucesso!';
      } else {
        status.innerText = '❌ Falha no upload.';
      }
    } catch (error) {
      console.error(error);
      status.innerText = '❌ Erro na comunicação.';
    }
  });

  // Busca e exibe os document stores disponíveis
  try {
    const stores = await listDocumentStore(AuthService);
    const container = document.getElementById('storeListContent');
    if (Array.isArray(stores)) {
      container.innerHTML = stores.map(store => `
        <div class="card mb-2 store-item" data-id="${store.id}" style="cursor: pointer;">
          <div class="card-body">
            <h6>${store.name} (${store.id})</h6>
            <p>Status: ${store.status}</p>
          </div>
        </div>
      `).join('');
    } else {
      container.innerHTML = `
        <div class="card store-item" data-id="${stores.id}" style="cursor: pointer;">
          <div class="card-body">
            <h6>${stores.name} (${stores.id})</h6>
            <p>Status: ${stores.status}</p>
          </div>
        </div>
      `;
    }
    // Adiciona listener para clique em cada document store
    document.querySelectorAll('.store-item').forEach(el => {
      el.addEventListener('click', async () => {
        const id = el.getAttribute('data-id');
        const detailContainer = document.getElementById('storeListContent');
        detailContainer.innerHTML = '🔄 Carregando detalhes...';
        try {
          const detail = await listDocumentStore(AuthService, id);
          const detailData = Array.isArray(detail) ? detail[0] : detail;
          detailContainer.innerHTML = `
            <h5>${detailData.name} (${detailData.id})</h5>
            <p><strong>Status:</strong> ${detailData.status}</p>
            <p><strong>Criado em:</strong> ${new Date(detailData.createdDate).toLocaleString()}</p>
            <p><strong>Atualizado em:</strong> ${new Date(detailData.updatedDate).toLocaleString()}</p>
            ${detailData.description ? `<p><strong>Descrição:</strong> ${detailData.description}</p>` : ''}
            <h6>Loaders:</h6>
            ${Array.isArray(detailData.loaders) && detailData.loaders.length
              ? detailData.loaders.map(loader => `
                  <div class="card mb-2">
                    <div class="card-body">
                      <h6>${loader.loaderName} (${loader.loaderId})</h6>
                      <p><strong>Status:</strong> ${loader.status}</p>
                      <p><strong>Chunks:</strong> ${loader.totalChunks} / <strong>Chars:</strong> ${loader.totalChars}</p>
                      <h6>Arquivos:</h6>
                      ${loader.files && loader.files.map(file => `
                        <div class="border rounded p-2 mb-1">
                          <p><strong>Nome:</strong> ${file.name}</p>
                          <p><strong>Tamanho:</strong> ${file.size} bytes</p>
                          <p><strong>Enviado:</strong> ${new Date(file.uploaded).toLocaleString()}</p>
                        </div>
                      `).join('')}
                    </div>
                  </div>
                `).join('')
              : '<p>Nenhum loader disponível.</p>'}
          `;
        } catch (err) {
          console.error('Erro ao carregar detalhes:', err);
          detailContainer.innerText = '❌ Falha ao carregar detalhes.';
        }
      });
    });
  } catch (error) {
    console.error("Erro ao listar document stores:", error);
    document.getElementById('storeListContent').innerText = 'Erro ao carregar document stores.';
  }
}

export async function renderDashboard() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="container-fluid">
      <div class="card">
        <div class="card-body text-center">
          <h5 class="card-title">Bem-vindo!</h5>
          <p class="card-text">
            O portal está em fase de testes. Caso encontre erros ou deseje enviar sugestões, entre em contato pelo e-mail:
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
              <a role="button" href="#bhm-upload" class="br-button br-button--secondary" style="flex: 0 0 auto; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.25rem;">
                <div style="width: 80px; height: 80px; background-color: #f2f2f2; border: 1px solid #ccc; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                  <i class="bi bi-cloud-upload" style="font-size: 2.5rem;"></i>
                </div>
                <span style="font-size: 0.75rem; margin-top: 0.25rem;">Upload</span>
              </a>
              <a role="button" onclick="window.open('https://voetur.bennercloud.com.br/CORPORATIVO/Pages/Prestacaodecontas.aspx?i=K_PRESTACAODECONTAS&m=MAIN', '_blank')" class="br-button br-button--secondary" style="flex: 0 0 auto; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.25rem;">
                <div style="width: 80px; height: 80px; background-color: #f2f2f2; border: 1px solid #ccc; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                  <i class="bi bi-receipt" style="font-size: 2.5rem;"></i>
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
registerRoute('#bhm-upload', renderUpload);