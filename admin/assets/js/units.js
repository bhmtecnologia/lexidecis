/**
 * Módulo de administração de Unidades para a aplicação Lexidecis.
 *
 * Responsável por inicializar a página, gerenciar os eventos para criação,
 * edição, remoção e listagem das units, integrando os módulos de autenticação,
 * API e manipulação do DOM.
 *
 * @module units
 */
export function initUnits(AuthService, API, DOM) {
  let unitsData = {};

  // Renderiza o conteúdo principal da página de unidades
  function renderContent() {
    const content = document.getElementById('content');
    content.innerHTML = `
      <div class="container-fluid">
        <div class="page-title d-flex justify-content-between align-items-center">
          <div>
            <h2>Administração de Unidades - Lexidecis</h2>
            <p class="mb-0 text-title-gray">Lista de unidades cadastradas</p>
          </div>
          <div>
            <button id="btnNewUnit" class="btn btn-success">
              <i class="bi bi-plus-circle"></i> Nova Unidade
            </button>
          </div>
        </div>
        <ol class="breadcrumb mt-2">
          <li class="breadcrumb-item"><a href="index.html"><i class="bi bi-house-fill"></i></a></li>
          <li class="breadcrumb-item">Administração</li>
          <li class="breadcrumb-item active">Unidades Lexidecis</li>
        </ol>
        <div id="report-container" class="position-relative">
          <div class="card">
            <div class="card-body">
              <div class="table-responsive">
                <table id="data-table" class="display table table-bordered table-striped">
                  <thead>
                    <tr>
                      <th>Unidade</th>
                      <th>Company</th>
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

  // Chama renderContent no início
  renderContent();

  // Inicializa o DataTable e associa o evento de expansão
  function initializeTable() {
    const dt = $("#data-table").DataTable({
      responsive: true,
      autoWidth: false,
      ordering: true,
      paging: true,
      dom: 'lBfrtip',
      buttons: ['copy', 'excel', 'csv', 'pdf'],
      language: { url: "https://cdn.datatables.net/plug-ins/1.13.4/i18n/pt-BR.json" }
    });
  }

  // Atualiza a tabela de unidades com os dados obtidos
  function updateTable(units) {
    unitsData = {};
    const tableBody = $("#data-table tbody");
    tableBody.empty();
    units.forEach(unit => {
      unitsData[unit.id] = unit;
      tableBody.append(`
        <tr>
          <td>${unit.name || '-'}</td>
          <td>${unit.company_name || '-'}</td>
          <td>${unit.id || '-'}</td>
          <td>
            <div class="btn-group" role="group">
              <button class="btn btn-sm btn-secondary gpts-btn" data-unit-id="${unit.id}">
                <i class="bi bi-list"></i> GPTs
              </button>
              <button class="btn btn-sm btn-primary" onclick="editUnit('${unit.id}')">
                <i class="bi bi-pencil-square"></i> Editar
              </button>
              <button class="btn btn-sm btn-danger" onclick="removeUnit('${unit.id}')">
                <i class="bi bi-trash"></i> Remover
              </button>
            </div>
          </td>
        </tr>
      `);
    });
    if (!$.fn.DataTable.isDataTable("#data-table")) {
      initializeTable();
    }
  }

  // Handle GPT listing on button click (dual-multiselect assignment)
  $("#data-table tbody").on("click", ".gpts-btn", async function () {
    const tr = $(this).closest("tr");
    const row = $("#data-table").DataTable().row(tr);
    if (row.child.isShown()) {
      row.child.hide();
    } else {
      $(this).prop("disabled", true).html('<i class="bi bi-arrow-repeat"></i> GPTs');
      try {
        const unitId = $(this).data("unitId");
        const assigned = await API.getGPTs(AuthService, unitId);
        const all = await API.getGPTs(AuthService, 'all');
        const available = all.filter(a => !assigned.some(u => u.id === a.id));
        let html = `
          <div class="gpts-flex-row">
            <div class="gpts-flex-col">
              <label>Selecionados:</label>
              <select id="assignedGPTs" class="form-select flex-grow-1" multiple size="6">
                ${assigned.map(g => `<option value="${g.id}">${g.name}</option>`).join('')}
              </select>
            </div>
            <div class="gpts-flex-center">
              <button id="btnAdd" class="btn btn-sm btn-primary mb-2">&gt;&gt;</button><br>
              <button id="btnRemove" class="btn btn-sm btn-secondary">&lt;&lt;</button>
            </div>
            <div class="gpts-flex-col">
              <label>Disponíveis:</label>
              <select id="availableGPTs" class="form-select flex-grow-1" multiple size="6">
                ${available.map(g => `<option value="${g.id}">${g.name}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="mt-3 text-end">
            <button id="btnSaveGPTs" class="btn btn-sm btn-success">Salvar</button>
          </div>
        `;
        row.child(`<td colspan="4">${html}</td>`).show();
        // Move items from available to assigned
        $("#btnRemove").on("click", () => {
          $("#availableGPTs option:selected").appendTo("#assignedGPTs");
        });
        // Move items from assigned back to available
        $("#btnAdd").on("click", () => {
          $("#assignedGPTs option:selected").appendTo("#availableGPTs");
        });
        // Save assignment
        $("#btnSaveGPTs").on("click", async () => {
          const selectedIds = $("#assignedGPTs option").map((i, o) => o.value).get();
          try {
            await API.setUnitGPTs(AuthService, unitId, selectedIds);
            alert("Vínculos salvos com sucesso");
            row.child.hide();
          } catch (err) {
            alert("Erro ao salvar vínculos: " + err.message);
          }
        });
      } catch (error) {
        row.child(`<div class="text-danger">Erro ao carregar GPTs: ${error.message}</div>`).show();
      } finally {
        $(this).prop("disabled", false).html('<i class="bi bi-list"></i> GPTs');
      }
    }
  });

  // Manipula a criação de uma nova unit
  async function handleCreateUnit() {
    const errorDiv = document.getElementById('createUnitError');
    errorDiv.classList.add('d-none');
    const payload = {
      name: document.getElementById('unit_name').value.trim(),
      company_id: document.getElementById('company_id').value
    };
    try {
      await API.createUnit(AuthService, payload);
      const createUnitModalElement = document.getElementById('createUnitModal');
      const modal = bootstrap.Modal.getInstance(createUnitModalElement);
      modal.hide();
      refreshUnits();
    } catch (error) {
      errorDiv.textContent = error.message;
      errorDiv.classList.remove('d-none');
    }
  }

  // Manipula a edição de uma unit existente
  async function handleEditUnit() {
    const errorDiv = document.getElementById('editUnitError');
    errorDiv.classList.add('d-none');
    const payload = {
      id: document.getElementById('edit_unit_id').value,
      name: document.getElementById('edit_unit_name').value.trim(),
      company_id: document.getElementById('edit_company_id').value
    };
    try {
      await API.updateUnit(AuthService, payload);
      const editUnitModalElement = document.getElementById('editUnitModal');
      const modal = bootstrap.Modal.getInstance(editUnitModalElement);
      modal.hide();
      refreshUnits();
    } catch (error) {
      errorDiv.textContent = error.message;
      errorDiv.classList.remove('d-none');
    }
  }

  // Função para criar o formulário de nova unidade
  function createUnitForm() {
    const createUnitModalElement = document.getElementById('createUnitModal');
    if (!createUnitModalElement) {
      console.error('[createUnitForm] Modal #createUnitModal não encontrado');
      return;
    }
    
    const modalBody = createUnitModalElement.querySelector('.modal-body');
    if (!modalBody) {
      console.error('[createUnitForm] .modal-body não encontrado dentro do modal');
      return;
    }
    
    // Limpa o conteúdo anterior
    modalBody.innerHTML = '';
    
    // Cria o formulário
    const formHTML = `
      <form id="createUnitForm" class="needs-validation" novalidate>
        <div class="row">
          <div class="col-md-6 mb-3">
            <label for="unit_name" class="form-label">Nome da Unidade</label>
            <input type="text" class="form-control" id="unit_name" required>
            <div class="invalid-feedback">Por favor, insira um nome válido.</div>
          </div>
          <div class="col-md-6 mb-3">
            <label for="company_id" class="form-label">Company</label>
            <select class="form-control" id="company_id" required>
              <option value="">Carregando...</option>
            </select>
            <div class="invalid-feedback">Por favor, selecione uma company.</div>
          </div>
        </div>
        <div id="createUnitError" class="alert alert-danger d-none" role="alert"></div>
      </form>
    `;
    
    // Injeta o HTML no modal
    modalBody.innerHTML = formHTML;
    
    console.log('[createUnitForm] Formulário criado com sucesso');
  }

  // Configura os eventos dos botões dos modais
  document.getElementById('submitCreateUnit').addEventListener('click', handleCreateUnit);
  document.getElementById('submitEditUnit').addEventListener('click', handleEditUnit);

  // Configura o evento do botão para abrir o modal de criação de nova unit
  const btnNewUnit = document.getElementById('btnNewUnit');
  if (btnNewUnit) {
    btnNewUnit.addEventListener('click', async () => {
      try {
        // Primeiro, injeta/atualiza formulário dentro do modal
        createUnitForm();
        
        // Aguarda um pouco para garantir que o DOM foi atualizado
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Carrega companies
        try {
          const companies = await API.getCompanies(AuthService);
          DOM.populateCompaniesSelect('company_id', companies);
        } catch (e) {
          console.error('[btnNewUnit] Erro ao carregar companies:', e);
          const sel = document.getElementById('company_id');
          if (sel) sel.innerHTML = '<option value="">Erro ao carregar companies</option>';
        }

        // Garante que o modal existe e está pronto
        const modalToShow = document.getElementById('createUnitModal');
        if (!modalToShow) {
          console.error('[btnNewUnit] Modal não encontrado após criação do formulário');
          return;
        }

        // Verifica se o Bootstrap está disponível
        if (typeof bootstrap === 'undefined') {
          console.error('[btnNewUnit] Bootstrap não está carregado');
          alert('Erro: Bootstrap não está carregado');
          return;
        }

        // Abre o modal usando a API padrão do Bootstrap
        const createUnitModal = new bootstrap.Modal(modalToShow);
        createUnitModal.show();
        
      } catch (error) {
        console.error('[btnNewUnit] Erro ao abrir modal:', error);
        alert('Erro ao abrir formulário de criação de unidade');
      }
    });
  }

  // Função para criar o formulário de edição de unidade
  function createEditUnitForm() {
    const editUnitModalElement = document.getElementById('editUnitModal');
    if (!editUnitModalElement) {
      console.error('[createEditUnitForm] Modal #editUnitModal não encontrado');
      return;
    }
    
    const modalBody = editUnitModalElement.querySelector('.modal-body');
    if (!modalBody) {
      console.error('[createEditUnitForm] .modal-body não encontrado dentro do modal');
      return;
    }
    
    // Limpa o conteúdo anterior
    modalBody.innerHTML = '';
    
    // Cria o formulário
    const formHTML = `
      <form id="editUnitForm" class="needs-validation" novalidate>
        <input type="hidden" id="edit_unit_id">
        <div class="row">
          <div class="col-md-6 mb-3">
            <label for="edit_unit_name" class="form-label">Nome da Unidade</label>
            <input type="text" class="form-control" id="edit_unit_name" required>
            <div class="invalid-feedback">Por favor, insira um nome válido.</div>
          </div>
          <div class="col-md-6 mb-3">
            <label for="edit_company_id" class="form-label">Company</label>
            <select class="form-control" id="edit_company_id" required>
              <option value="">Carregando...</option>
            </select>
            <div class="invalid-feedback">Por favor, selecione uma company.</div>
          </div>
        </div>
        <div id="editUnitError" class="alert alert-danger d-none" role="alert"></div>
      </form>
    `;
    
    // Injeta o HTML no modal
    modalBody.innerHTML = formHTML;
    
    console.log('[createEditUnitForm] Formulário criado com sucesso');
  }

  // Função global para abrir o modal de edição e preencher os dados da unit
  window.editUnit = async function(unitId) {
    const unit = unitsData[unitId];
    if (!unit) return;
    
    // Primeiro, cria o formulário
    createEditUnitForm();
    
    // Aguarda um pouco para garantir que o DOM foi atualizado
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Preenche os dados
    document.getElementById('edit_unit_id').value = unit.id || '';
    document.getElementById('edit_unit_name').value = unit.name || '';

    const currentCompanyId = unit.company_id || "";
    const companySelect = document.getElementById('edit_company_id');
    companySelect.innerHTML = `<option value="${currentCompanyId}" selected>${unit.company_name || "Selecione uma company"}</option>`;
    companySelect.addEventListener('focus', async function() {
      try {
        const companies = await API.getCompanies(AuthService);
        DOM.populateCompaniesSelect('edit_company_id', companies, currentCompanyId);
      } catch (e) {
        document.getElementById('edit_company_id').innerHTML = `<option value="">Erro ao carregar companies</option>`;
      }
    }, { once: true });

    const editUnitModalElement = document.getElementById('editUnitModal');
    const modal = new bootstrap.Modal(editUnitModalElement);
    modal.show();
  };

  // Função global para remover uma unit após confirmação
  window.removeUnit = async function(unitId) {
    showConfirmModal({
      title: 'Remover Unidade',
      message: 'Tem certeza que deseja remover esta unidade?',
      onConfirm: async () => {
        try {
          await API.deleteUnit(AuthService, unitId);
          refreshUnits();
        } catch (error) {
          alert("Erro ao remover unidade: " + error.message);
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

  // Função para buscar e exibir as configurações de um GPT
  async function viewGPTConfig(gptId) {
    const configContent = document.getElementById('gptConfigContent');
    configContent.textContent = "Carregando configurações...";
    const modalElement = document.getElementById('gptConfigModal');
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
    try {
      const configs = await API.getGPTConfigs(AuthService, gptId);
      configContent.textContent = JSON.stringify(configs, null, 2);
    } catch (error) {
      configContent.textContent = "Erro ao carregar configurações: " + error.message;
    }
  }

  // Atualiza as units na interface
  async function refreshUnits() {
    DOM.showOverlay();
    try {
      // Fetch both units and companies, then map company names into units
      const [units, companies] = await Promise.all([
        API.getUnits(AuthService),
        API.getCompanies(AuthService)
      ]);
      // Build a lookup of company names by ID
      const companyMap = {};
      companies.forEach(c => { companyMap[c.id] = c.name; });
      // Attach company_name to each unit for display
      units.forEach(u => { u.company_name = companyMap[u.company_id] || '-'; });
      updateTable(units);
    } catch (error) {
      console.error("Erro ao buscar units:", error);
    } finally {
      DOM.hideOverlay();
    }
  }

  AuthService.onAuthChange((user) => {
    if (user) {
      const section = document.getElementById('protected-section');
      if (section) section.classList.remove('d-none');
      refreshUnits();
    } else {
      window.location.href = "login.html?redirect=" + encodeURIComponent(window.location.href);
    }
  });

  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', function() {
      document.body.classList.toggle('dark-mode');
      themeToggle.textContent = document.body.classList.contains('dark-mode') ? 'Modo Claro' : 'Modo Escuro';
      localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
    });
  }

  window.addEventListener('DOMContentLoaded', function() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.body.classList.add('dark-mode');
      if (themeToggle) themeToggle.textContent = 'Modo Claro';
    }
  });

  // Ajuste no CSS:
  const style = document.createElement('style');
  style.textContent = `
.gpts-flex-row {
  display: flex;
  flex-wrap: nowrap;
  align-items: stretch;
  gap: 1.2rem;
  min-width: 600px;
  width: 100%;
  box-sizing: border-box;
}
.gpts-flex-row select {
  min-width: 180px;
  width: 100%;
  min-height: 120px;
  box-sizing: border-box;
}
.gpts-flex-center {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
  height: 100%;
}
`;
  document.head.appendChild(style);
}