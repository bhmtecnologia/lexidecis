/**
 * Módulo principal da aplicação Lexidecis.
 *
 * Este módulo inicializa a aplicação, define os eventos necessários e integra
 * os módulos de autenticação (AuthService), API (API) e manipulação do DOM (DOM).
 *
 * @module main
 */
export function initMain(AuthService, API, DOM) {
    let usersData = {};
  
    // Renderiza o conteúdo principal da aplicação
    DOM.renderContent();
  
    // Configura um listener para transferir o foco para o botão de fechar
    // quando o modal de criação for exibido
    const createUserModalElement = document.getElementById('createUserModal');
    createUserModalElement.addEventListener('shown.bs.modal', function() {
      const closeBtn = this.querySelector('.btn-close');
      if (closeBtn) {
        closeBtn.focus();
      }
    });
  
    // Configura um listener similar para o modal de edição
    const editUserModalElement = document.getElementById('editUserModal');
    editUserModalElement.addEventListener('shown.bs.modal', function() {
      const closeBtn = this.querySelector('.btn-close');
      if (closeBtn) {
        closeBtn.focus();
      }
    });
  
    // Evento para abrir o modal de criação de novo usuário
    const btnNewUser = document.getElementById('btnNewUser');
    btnNewUser.addEventListener('click', async () => {
      const createUserModal = new bootstrap.Modal(createUserModalElement);
      createUserModal.show();
      // Preenche os selects de units e companies no modal de criação
      try {
        const units = await API.getUnits(AuthService);
        DOM.populateUnitsSelect('create_unit_id', units);
      } catch (e) {
        document.getElementById('create_unit_id').innerHTML = `<option value="">Erro ao carregar units</option>`;
      }
      try {
        const companies = await API.getCompanies(AuthService);
        DOM.populateCompaniesSelect('create_company_id', companies);
      } catch (e) {
        document.getElementById('create_company_id').innerHTML = `<option value="">Erro ao carregar companies</option>`;
      }
    });
  
    /**
     * Busca os usuários na API, atualiza o mapeamento de units e atualiza a tabela.
     */
    async function refreshUsers() {
      DOM.showOverlay();
      try {
        const data = await API.fetchUsers(AuthService);
        // Caso os registros venham apenas com unit_id, usamos a API de units para criar um mapeamento
        const units = await API.getUnits(AuthService);
        const unitMap = {};
        if (Array.isArray(units)) {
          units.forEach(unit => {
            unitMap[unit.id] = unit.name;
          });
        } else {
          unitMap[units.id] = units.name;
        }
        // Atualiza cada usuário: se não houver unit_name, usa o mapeamento
        data.forEach(user => {
          if (user.unit_id && !user.unit_name) {
            user.unit_name = unitMap[user.unit_id] || "Unidade Desconhecida";
          }
        });
        updateTable(data);
      } catch (error) {
        console.error("Erro ao buscar dados:", error);
      } finally {
        DOM.hideOverlay();
      }
    }
  
    /**
     * Atualiza a tabela de usuários utilizando os dados obtidos.
     *
     * @param {Array} users - Array de objetos de usuário.
     */
    function updateTable(users) {
      usersData = {};
      DOM.updateUserTable(users, usersData);
    }
  
    /**
     * Manipula a criação de um novo usuário.
     */
    async function handleCreateUser() {
      const errorDiv = document.getElementById('createUserError');
      errorDiv.classList.add('d-none');
      const payload = {
        id: document.getElementById('id').value.trim(),
        username: document.getElementById('username').value.trim(),
        email: document.getElementById('email').value.trim(),
        is_admin: document.getElementById('is_admin').value === "true",
        company_id: document.getElementById('create_company_id').value,
        unit_id: document.getElementById('create_unit_id').value,
        remote_jid: document.getElementById('remote_jid').value.trim() || null,
        whatsapp: document.getElementById('whatsapp').value === "true"
      };
      try {
        await API.createUser(AuthService, payload);
        const modal = bootstrap.Modal.getInstance(createUserModalElement);
        modal.hide();
        refreshUsers();
      } catch (error) {
        errorDiv.textContent = error.message;
        errorDiv.classList.remove('d-none');
      }
    }
  
    /**
     * Manipula a edição de um usuário existente.
     */
    async function handleEditUser() {
      const errorDiv = document.getElementById('editUserError');
      errorDiv.classList.add('d-none');
      const payload = {
        id: document.getElementById('edit_user_id').value,
        username: document.getElementById('edit_username').value.trim(),
        email: document.getElementById('edit_email').value.trim(),
        is_admin: document.getElementById('edit_is_admin').value === "true",
        company_id: document.getElementById('edit_company_id').value,
        unit_id: document.getElementById('edit_unit_id').value,
        remote_jid: document.getElementById('edit_remote_jid').value.trim() || null,
        whatsapp: document.getElementById('edit_whatsapp').value === "true"
      };
      try {
        await API.updateUser(AuthService, payload);
        const modal = bootstrap.Modal.getInstance(editUserModalElement);
        modal.hide();
        refreshUsers();
      } catch (error) {
        errorDiv.textContent = error.message;
        errorDiv.classList.remove('d-none');
      }
    }
  
    document.getElementById('submitCreateUser').addEventListener('click', handleCreateUser);
    document.getElementById('submitEditUser').addEventListener('click', handleEditUser);
  
    // Funções globais para uso nos botões de ação da tabela
  
    /**
     * Abre o modal de edição e preenche os campos com os dados do usuário.
     *
     * @param {string|number} userId - ID do usuário a ser editado.
     */
    window.editUser = async function(userId) {
      const user = usersData[userId];
      if (!user) return;
      document.getElementById('edit_user_id').value = user.id || '';
      document.getElementById('edit_username').value = user.username || '';
      document.getElementById('edit_email').value = user.email || '';
      document.getElementById('edit_is_admin').value = (typeof user.is_admin === 'boolean' && user.is_admin) ? "true" : "false";
      
      // Preenche o select de companies com o valor atual
      const currentCompanyId = user.company_id || "";
      const companySelect = document.getElementById('edit_company_id');
      companySelect.innerHTML = `<option value="${currentCompanyId}" selected>${user.company_name || "Selecione uma company"}</option>`;
      companySelect.addEventListener('focus', async function() {
        try {
          const companies = await API.getCompanies(AuthService);
          DOM.populateCompaniesSelect('edit_company_id', companies, currentCompanyId);
        } catch(e) {
          document.getElementById('edit_company_id').innerHTML = `<option value="">Erro ao carregar companies</option>`;
        }
      }, { once: true });
      
      // Preenche o select de units com o valor atual
      const currentUnitId = user.unit_id || "";
      const unitSelect = document.getElementById('edit_unit_id');
      unitSelect.innerHTML = `<option value="${currentUnitId}" selected>${user.unit_name || "Selecione uma unit"}</option>`;
      unitSelect.addEventListener('focus', async function() {
        try {
          const units = await API.getUnits(AuthService);
          DOM.populateUnitsSelect('edit_unit_id', units, currentUnitId);
        } catch(e) {
          document.getElementById('edit_unit_id').innerHTML = `<option value="">Erro ao carregar units</option>`;
        }
      }, { once: true });
      
      document.getElementById('edit_remote_jid').value = user.remote_jid || '';
      document.getElementById('edit_whatsapp').value = (typeof user.whatsapp === 'boolean' && user.whatsapp) ? "true" : "false";
      
      const editUserModal = new bootstrap.Modal(editUserModalElement);
      editUserModal.show();
    };
  
    /**
     * Remove um usuário após confirmação.
     *
     * @param {string|number} userId - ID do usuário a ser removido.
     */
    window.removeUser = async function(userId) {
      if (!confirm("Tem certeza que deseja remover este usuário?")) return;
      try {
        await API.deleteUser(AuthService, userId);
        refreshUsers();
      } catch (error) {
        alert("Erro ao remover usuário: " + error.message);
      }
    };
  
    // Escuta mudanças de autenticação e atualiza a interface
    AuthService.onAuthChange((user) => {
      if (user) {
        document.getElementById('protected-section').classList.remove('d-none');
        refreshUsers();
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