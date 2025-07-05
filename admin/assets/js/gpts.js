/**
 * Módulo de administração de GPTs para a aplicação Lexidecis.
 *
 * Responsável por inicializar a página, gerenciar os eventos para criação,
 * edição, remoção e listagem dos GPTs, integrando os módulos de autenticação,
 * API e manipulação do DOM.
 *
 * @module gpts
 */
export function initGPTs(AuthService, API, DOM) {
    let gptsData = {};

    // Renderiza o conteúdo principal da aplicação
    function renderContent() {
      const content = document.getElementById('content');
      content.innerHTML = `
        <div class="container-fluid">
          <div class="page-title d-flex justify-content-between align-items-center">
            <div>
              <h2>Administração de GPTs - Lexidecis</h2>
              <p class="mb-0 text-title-gray">Lista de GPTs cadastrados</p>
            </div>
            <div>
              <button id="btnNewGpt" class="btn btn-success">
                <i class="bi bi-plus-circle"></i> Novo GPT
              </button>
            </div>
          </div>
          <ol class="breadcrumb mt-2">
            <li class="breadcrumb-item"><a href="index.html"><i class="bi bi-house-fill"></i></a></li>
            <li class="breadcrumb-item">Administração</li>
            <li class="breadcrumb-item active">GPTs Lexidecis</li>
          </ol>
          <div id="report-container" class="position-relative">
            <div class="card">
              <div class="card-body">
                <div class="table-responsive">
                  <table id="gpt-table" class="display table table-bordered table-striped">
                    <thead>
                      <tr>
                        <th>GPT</th>
                        <th>Descrição</th>
                        <th>Categoria</th>
                        <th>ID</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody></tbody>
                  </table>
                </div>
              </div>
            </div>
            <div id="report-overlay" class="d-none position-absolute top-0 start-0 w-100 h-100 bg-light bg-opacity-75 d-flex align-items-center justify-content-center" style="z-index: 1000;">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Carregando...</span>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    // Inicializa o DataTable para GPTs
    function initializeTable() {
      $("#gpt-table").DataTable({
        responsive: true,
        autoWidth: false,
        ordering: true,
        paging: true,
        dom: 'lBfrtip',
        buttons: ['copy', 'excel', 'csv', 'pdf'],
        language: { url: "https://cdn.datatables.net/plug-ins/1.13.4/i18n/pt-BR.json" }
      });
    }
  
    // Atualiza a tabela de GPTs com os dados obtidos
    async function refreshGPTs() {
      DOM.showOverlay();
      try {
        // Para a página de GPTs, assumimos que a API retorna todos os GPTs
        // Enviamos unit_id = "all" (ou ajuste conforme o endpoint)
        const gpts = await API.getGPTs(AuthService, "all");
        updateTable(gpts);
      } catch (error) {
        console.error("Erro ao buscar GPTs:", error);
      } finally {
        DOM.hideOverlay();
      }
    }
  
    function updateTable(gpts) {
      gptsData = {};
      const tableBody = $("#gpt-table tbody");
      tableBody.empty();
      gpts.forEach(gpt => {
        gptsData[gpt.id] = gpt;
        tableBody.append(`
          <tr>
            <td>${gpt.name || '-'}</td>
            <td>${gpt.description || '-'}</td>
            <td>${gpt.category || '-'}</td>
            <td>${gpt.id || '-'}</td>
            <td>
              <div class="btn-group" role="group">
                <button class="btn btn-sm btn-primary" onclick="editGpt('${gpt.id}')">
                  <i class="bi bi-pencil-square"></i> Editar
                </button>
                <button class="btn btn-sm btn-danger" onclick="removeGpt('${gpt.id}')">
                  <i class="bi bi-trash"></i> Remover
                </button>
                <button class="btn btn-sm btn-info" onclick="viewGptConfig('${gpt.id}')">
                  <i class="bi bi-gear"></i> Configurações
                </button>
              </div>
            </td>
          </tr>
        `);
      });
      if (!$.fn.DataTable.isDataTable("#gpt-table")) {
        initializeTable();
      }
    }
  
    // Função para criar o formulário de novo GPT
    function createGPTForm() {
      const createGptModalElement = document.getElementById('createGptModal');
      if (!createGptModalElement) {
        console.error('[createGPTForm] Modal #createGptModal não encontrado');
        return;
      }
      
      const modalBody = createGptModalElement.querySelector('.modal-body');
      if (!modalBody) {
        console.error('[createGPTForm] .modal-body não encontrado dentro do modal');
        return;
      }
      
      // Limpa o conteúdo anterior
      modalBody.innerHTML = '';
      
      // Cria o formulário
      const formHTML = `
        <form id="createGptForm" class="needs-validation" novalidate>
          <div class="row">
            <div class="col-md-6 mb-3">
              <label for="gpt_name" class="form-label">Nome do GPT</label>
              <input type="text" class="form-control" id="gpt_name" required>
              <div class="invalid-feedback">Por favor, insira um nome válido.</div>
            </div>
            <div class="col-md-6 mb-3">
              <label for="gpt_category" class="form-label">Categoria</label>
              <input type="text" class="form-control" id="gpt_category" required>
              <div class="invalid-feedback">Por favor, insira uma categoria válida.</div>
            </div>
            <div class="col-md-12 mb-3">
              <label for="gpt_description" class="form-label">Descrição</label>
              <textarea class="form-control" id="gpt_description" rows="3" required></textarea>
              <div class="invalid-feedback">Por favor, insira uma descrição válida.</div>
            </div>
          </div>
          <div id="createGptError" class="alert alert-danger d-none" role="alert"></div>
        </form>
      `;
      
      // Injeta o HTML no modal
      modalBody.innerHTML = formHTML;
      
      console.log('[createGPTForm] Formulário criado com sucesso');
    }

    // Manipula a criação de um novo GPT
    async function handleCreateGpt() {
      const errorDiv = document.getElementById("createGptError");
      errorDiv.classList.add("d-none");
      const payload = {
        name: document.getElementById("gpt_name").value.trim(),
        category: document.getElementById("gpt_category").value.trim(),
        description: document.getElementById("gpt_description").value.trim()
      };
      try {
        // Supondo que exista API.createGPT seguindo o padrão
        await API.createGPT(AuthService, payload);
        const createGptModalElement = document.getElementById("createGptModal");
        const modal = bootstrap.Modal.getInstance(createGptModalElement);
        modal.hide();
        refreshGPTs();
      } catch (error) {
        errorDiv.textContent = error.message;
        errorDiv.classList.remove("d-none");
      }
    }
  
    // Função para criar o formulário de edição de GPT
    function createEditGPTForm() {
      const editGptModalElement = document.getElementById('editGptModal');
      if (!editGptModalElement) {
        console.error('[createEditGPTForm] Modal #editGptModal não encontrado');
        return;
      }
      
      const modalBody = editGptModalElement.querySelector('.modal-body');
      if (!modalBody) {
        console.error('[createEditGPTForm] .modal-body não encontrado dentro do modal');
        return;
      }
      
      // Limpa o conteúdo anterior
      modalBody.innerHTML = '';
      
      // Cria o formulário
      const formHTML = `
        <form id="editGptForm" class="needs-validation" novalidate>
          <input type="hidden" id="edit_gpt_id">
          <div class="row">
            <div class="col-md-6 mb-3">
              <label for="edit_gpt_name" class="form-label">Nome do GPT</label>
              <input type="text" class="form-control" id="edit_gpt_name" required>
              <div class="invalid-feedback">Por favor, insira um nome válido.</div>
            </div>
            <div class="col-md-6 mb-3">
              <label for="edit_gpt_category" class="form-label">Categoria</label>
              <input type="text" class="form-control" id="edit_gpt_category" required>
              <div class="invalid-feedback">Por favor, insira uma categoria válida.</div>
            </div>
            <div class="col-md-12 mb-3">
              <label for="edit_gpt_description" class="form-label">Descrição</label>
              <textarea class="form-control" id="edit_gpt_description" rows="3" required></textarea>
              <div class="invalid-feedback">Por favor, insira uma descrição válida.</div>
            </div>
          </div>
          <div id="editGptError" class="alert alert-danger d-none" role="alert"></div>
        </form>
      `;
      
      // Injeta o HTML no modal
      modalBody.innerHTML = formHTML;
      
      console.log('[createEditGPTForm] Formulário criado com sucesso');
    }

    // Manipula a edição de um GPT existente
    async function handleEditGpt() {
      const errorDiv = document.getElementById("editGptError");
      errorDiv.classList.add("d-none");
      const payload = {
        id: document.getElementById("edit_gpt_id").value,
        name: document.getElementById("edit_gpt_name").value.trim(),
        category: document.getElementById("edit_gpt_category").value.trim(),
        description: document.getElementById("edit_gpt_description").value.trim()
      };
      try {
        // Supondo que exista API.updateGPT seguindo o padrão
        await API.updateGPT(AuthService, payload);
        const editGptModalElement = document.getElementById("editGptModal");
        const modal = bootstrap.Modal.getInstance(editGptModalElement);
        modal.hide();
        refreshGPTs();
      } catch (error) {
        errorDiv.textContent = error.message;
        errorDiv.classList.remove("d-none");
      }
    }
  
    // Função para exibir as configurações de um GPT
    async function viewGptConfig(gptId) {
      const configContent = document.getElementById("gptConfigContent");
      configContent.textContent = "Carregando configurações...";
      const modalElement = document.getElementById("gptConfigModal");
      const modal = new bootstrap.Modal(modalElement);
      modal.show();
      try {
        const configs = await API.getGPTConfigs(AuthService, gptId);
        configContent.textContent = JSON.stringify(configs, null, 2);
      } catch (error) {
        configContent.textContent = "Erro ao carregar configurações: " + error.message;
      }
    }
  
    // Exposição de funções globais para edição e remoção
    window.editGpt = async function(gptId) {
      const gpt = gptsData[gptId];
      if (!gpt) return;
      
      // Primeiro, cria o formulário
      createEditGPTForm();
      
      // Aguarda um pouco para garantir que o DOM foi atualizado
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Preenche os dados
      document.getElementById("edit_gpt_id").value = gpt.id || "";
      document.getElementById("edit_gpt_name").value = gpt.name || "";
      document.getElementById("edit_gpt_category").value = gpt.category || "";
      document.getElementById("edit_gpt_description").value = gpt.description || "";
      
      const editGptModalElement = document.getElementById("editGptModal");
      const modal = new bootstrap.Modal(editGptModalElement);
      modal.show();
    };
  
    window.removeGpt = async function(gptId) {
      showConfirmModal({
        title: 'Remover GPT',
        message: 'Tem certeza que deseja remover este GPT?',
        onConfirm: async () => {
          try {
            await API.deleteGPT(AuthService, gptId);
            refreshGPTs();
          } catch (error) {
            alert("Erro ao remover GPT: " + error.message);
          }
        }
      });
    };
  
    // Função utilitária para exibir modal de confirmação (reutilizável)
    function showConfirmModal({ title, message, onConfirm }) {
      let modal = document.getElementById('confirmModal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'confirmModal';
        modal.innerHTML = `
          <div class="modal fade" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered">
              <div class="modal-content">
                <div class="modal-header">
                  <h5 class="modal-title"></h5>
                  <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
                </div>
                <div class="modal-body">
                  <p></p>
                </div>
                <div class="modal-footer">
                  <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                  <button type="button" class="btn btn-danger" id="confirmBtn">Remover</button>
                </div>
              </div>
            </div>
          </div>
        `;
        document.body.appendChild(modal);
      }
      const modalEl = modal.querySelector('.modal');
      modal.querySelector('.modal-title').textContent = title;
      modal.querySelector('.modal-body p').textContent = message;
      const bsModal = new bootstrap.Modal(modalEl);
      modal.querySelector('#confirmBtn').onclick = () => {
        bsModal.hide();
        onConfirm();
      };
      bsModal.show();
    }
  
    window.viewGptConfig = viewGptConfig;
  
    // Inicializa a atualização dos GPTs e verifica autenticação
    AuthService.onAuthChange((user) => {
      if (user) {
        renderContent();
        refreshGPTs();
        
        // Configuração do botão de criação de novo GPT
        const btnNewGpt = document.getElementById("btnNewGpt");
        if (btnNewGpt) {
          btnNewGpt.addEventListener("click", async () => {
            try {
              // Primeiro, injeta/atualiza formulário dentro do modal
              createGPTForm();
              
              // Aguarda um pouco para garantir que o DOM foi atualizado
              await new Promise(resolve => setTimeout(resolve, 100));

              // Garante que o modal existe e está pronto
              const modalToShow = document.getElementById("createGptModal");
              if (!modalToShow) {
                console.error('[btnNewGpt] Modal não encontrado após criação do formulário');
                return;
              }

              // Verifica se o Bootstrap está disponível
              if (typeof bootstrap === 'undefined') {
                console.error('[btnNewGpt] Bootstrap não está carregado');
                alert('Erro: Bootstrap não está carregado');
                return;
              }

              // Abre o modal usando a API padrão do Bootstrap
              const createGptModal = new bootstrap.Modal(modalToShow);
              createGptModal.show();
              
            } catch (error) {
              console.error('[btnNewGpt] Erro ao abrir modal:', error);
              alert('Erro ao abrir formulário de criação de GPT');
            }
          });
        }
        
        // Associa eventos dos botões dos modais de criação e edição
        document.getElementById("submitCreateGpt").addEventListener("click", handleCreateGpt);
        document.getElementById("submitEditGpt").addEventListener("click", handleEditGpt);
      } else {
        window.location.href = "login.html?redirect=" + encodeURIComponent(window.location.href);
      }
    });
  }