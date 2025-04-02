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
  
    // Inicializa o DataTable para GPTs
    function initializeTable() {
      $("#gpt-table").DataTable({
        responsive: true,
        order: [[0, "asc"]]
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
      document.getElementById("edit_gpt_id").value = gpt.id || "";
      document.getElementById("edit_gpt_name").value = gpt.name || "";
      document.getElementById("edit_gpt_category").value = gpt.category || "";
      document.getElementById("edit_gpt_description").value = gpt.description || "";
      const editGptModalElement = document.getElementById("editGptModal");
      const modal = new bootstrap.Modal(editGptModalElement);
      modal.show();
    };
  
    window.removeGpt = async function(gptId) {
      if (!confirm("Tem certeza que deseja remover este GPT?")) return;
      try {
        // Supondo que exista API.deleteGPT seguindo o padrão
        await API.deleteGPT(AuthService, gptId);
        refreshGPTs();
      } catch (error) {
        alert("Erro ao remover GPT: " + error.message);
      }
    };
  
    window.viewGptConfig = viewGptConfig;
  
    // Inicializa a atualização dos GPTs e verifica autenticação
    AuthService.onAuthChange((user) => {
      if (user) {
        document.getElementById("protected-section").classList.remove("d-none");
        refreshGPTs();
      } else {
        window.location.href = "login.html?redirect=" + encodeURIComponent(window.location.href);
      }
    });
  
    // Configuração do botão de criação de novo GPT
    const btnNewGpt = document.getElementById("btnNewGpt");
    if (btnNewGpt) {
      btnNewGpt.addEventListener("click", () => {
        const createGptModalElement = document.getElementById("createGptModal");
        const modal = new bootstrap.Modal(createGptModalElement);
        modal.show();
      });
    }
  
    // Associa eventos dos botões dos modais de criação e edição
    document.getElementById("submitCreateGpt").addEventListener("click", handleCreateGpt);
    document.getElementById("submitEditGpt").addEventListener("click", handleEditGpt);
  
    // Configura o botão de alternância de tema
    const themeToggle = document.getElementById("themeToggle");
    themeToggle.addEventListener("click", function() {
      document.body.classList.toggle("dark-mode");
      themeToggle.textContent = document.body.classList.contains("dark-mode") ? "Modo Claro" : "Modo Escuro";
      localStorage.setItem("theme", document.body.classList.contains("dark-mode") ? "dark" : "light");
    });
  
    window.addEventListener("DOMContentLoaded", function() {
      const savedTheme = localStorage.getItem("theme");
      if (savedTheme === "dark") {
        document.body.classList.add("dark-mode");
        themeToggle.textContent = "Modo Claro";
      }
    });
  }