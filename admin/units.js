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
  
    // Função para atualizar a tabela de units
    async function refreshUnits() {
      DOM.showOverlay();
      try {
        // Busca as units utilizando a função já existente na API
        const units = await API.getUnits(AuthService);
        updateTable(units);
      } catch (error) {
        console.error("Erro ao buscar units:", error);
      } finally {
        DOM.hideOverlay();
      }
    }
  
    // Atualiza a tabela de unidades com os dados obtidos
    function updateTable(units) {
      unitsData = {};
      if ($.fn.DataTable.isDataTable("#data-table")) {
        const dt = $("#data-table").DataTable();
        dt.clear();
        const rows = units.map(unit => {
          unitsData[unit.id] = unit;
          // Considera que unit possui 'id', 'name' e 'company_name'
          const actions = `
            <div class="btn-group" role="group">
              <button class="btn btn-sm btn-primary" onclick="editUnit('${unit.id}')">
                <i class="bi bi-pencil-square"></i> Editar
              </button>
              <button class="btn btn-sm btn-danger" onclick="removeUnit('${unit.id}')">
                <i class="bi bi-trash"></i> Remover
              </button>
            </div>
          `;
          return [
            unit.name || '-',
            unit.company_name || '-',
            unit.id || '-',
            actions
          ];
        });
        dt.rows.add(rows).draw();
      } else {
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
        DOM.initializeDataTable();
      }
    }
  
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
  
    // Configura os eventos dos botões dos modais
    document.getElementById('submitCreateUnit').addEventListener('click', handleCreateUnit);
    document.getElementById('submitEditUnit').addEventListener('click', handleEditUnit);
  
    // Configura o evento do botão para abrir o modal de criação de nova unit
    const btnNewUnit = document.getElementById('btnNewUnit');
    if (btnNewUnit) {
      btnNewUnit.addEventListener('click', async () => {
        const createUnitModalElement = document.getElementById('createUnitModal');
        const createUnitModal = new bootstrap.Modal(createUnitModalElement);
        createUnitModal.show();
        try {
          const companies = await API.getCompanies(AuthService);
          DOM.populateCompaniesSelect('company_id', companies);
        } catch (e) {
          document.getElementById('company_id').innerHTML = `<option value="">Erro ao carregar companies</option>`;
        }
      });
    }
  
    // Função global para abrir o modal de edição e preencher os dados da unit
    window.editUnit = async function(unitId) {
      const unit = unitsData[unitId];
      if (!unit) return;
      document.getElementById('edit_unit_id').value = unit.id || '';
      document.getElementById('edit_unit_name').value = unit.name || '';
  
      // Preenche o select de companies com o valor atual
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
      if (!confirm("Tem certeza que deseja remover esta unidade?")) return;
      try {
        await API.deleteUnit(AuthService, unitId);
        refreshUnits();
      } catch (error) {
        alert("Erro ao remover unidade: " + error.message);
      }
    };
  
    // Escuta mudanças de autenticação e atualiza a interface
    AuthService.onAuthChange((user) => {
      if (user) {
        document.getElementById('protected-section').classList.remove('d-none');
        refreshUnits();
      } else {
        window.location.href = "login.html?redirect=" + encodeURIComponent(window.location.href);
      }
    });
  
    // Configura o botão de alternância de tema
    const themeToggle = document.getElementById('themeToggle');
    themeToggle.addEventListener('click', function() {
      document.body.classList.toggle('dark-mode');
      themeToggle.textContent = document.body.classList.contains('dark-mode') ? 'Modo Claro' : 'Modo Escuro';
      localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
    });
  
    // Aplica o tema salvo ao carregar a página
    window.addEventListener('DOMContentLoaded', function() {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggle.textContent = 'Modo Claro';
      }
    });
  }