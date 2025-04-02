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

  // Inicializa o DataTable e associa o evento de expansão
  function initializeTable() {
    const dt = $("#data-table").DataTable({
      responsive: true,
      order: [[1, "asc"]]
    });

    // Evento de clique na célula de expansão
    $("#data-table tbody").on("click", "td.details-control", async function () {
      const tr = $(this).closest("tr");
      const row = $("#data-table").DataTable().row(tr);
      const unitId = $(this).data("unitId");

      // Se já está expandido, fecha
      if (row.child.isShown()) {
        row.child.hide();
        $(this).html('<i class="bi bi-plus-square"></i>');
      } else {
        // Exibe conteúdo de carregamento enquanto busca os GPTs da unit
        $(this).html('<i class="bi bi-arrow-repeat"></i>');
        try {
          // Chama a API passando o unitId
          const gpts = await API.getGPTs(AuthService, unitId);
          // Gera o HTML dos GPTs em formato de linhas de tabela (sem imagem)
          let html = `<table class="table table-sm mb-0">
                        <thead>
                          <tr>
                            <th>Nome</th>
                            <th>Descrição</th>
                            <th>Categoria</th>
                          </tr>
                        </thead>
                        <tbody>`;
          gpts.forEach(gpt => {
            html += `
              <tr class="gpt-row" data-gpt-id="${gpt.id}" style="cursor: pointer;">
                <td>${gpt.name}</td>
                <td>${gpt.description}</td>
                <td>${gpt.category}</td>
              </tr>
            `;
          });
          html += `</tbody></table>`;
          row.child(html).show();
          $(this).html('<i class="bi bi-dash-square"></i>');

          // Associa o clique nas linhas dos GPTs para abrir configurações
          row.child().find(".gpt-row").on("click", async function() {
            const gptId = $(this).data("gptId");
            viewGPTConfig(gptId);
          });
        } catch (error) {
          row.child(`<div class="text-danger">Erro ao carregar GPTs: ${error.message}</div>`).show();
          $(this).html('<i class="bi bi-plus-square"></i>');
        }
      }
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
          <td class="details-control" data-unit-id="${unit.id}"><i class="bi bi-plus-square"></i></td>
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
    if (!$.fn.DataTable.isDataTable("#data-table")) {
      initializeTable();
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
      const units = await API.getUnits(AuthService);
      updateTable(units);
    } catch (error) {
      console.error("Erro ao buscar units:", error);
    } finally {
      DOM.hideOverlay();
    }
  }

  AuthService.onAuthChange((user) => {
    if (user) {
      document.getElementById('protected-section').classList.remove('d-none');
      refreshUnits();
    } else {
      window.location.href = "login.html?redirect=" + encodeURIComponent(window.location.href);
    }
  });

  const themeToggle = document.getElementById('themeToggle');
  themeToggle.addEventListener('click', function() {
    document.body.classList.toggle('dark-mode');
    themeToggle.textContent = document.body.classList.contains('dark-mode') ? 'Modo Claro' : 'Modo Escuro';
    localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
  });

  window.addEventListener('DOMContentLoaded', function() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.body.classList.add('dark-mode');
      themeToggle.textContent = 'Modo Claro';
    }
  });
}