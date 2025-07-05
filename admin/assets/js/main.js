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
    // Elementos globais usados em vários pontos
    const createUserModalElement = document.getElementById('createUserModal');
    const editUserModalElement = document.getElementById('editUserModal');

    // 1. Verificação de autenticação
    if (!AuthService || !AuthService.user) {
      alert('Usuário não autenticado. Redirecionando para o login.');
      window.location.href = 'login.html';
      return;
    }

    // Renderiza o conteúdo principal da aplicação
    DOM.renderContent();

    // Inicializa DataTable após renderização do conteúdo
    if (window.jQuery && jQuery.fn.DataTable) {
      DOM.initializeDataTable && DOM.initializeDataTable();
    }

    // Carrega os usuários imediatamente após renderizar o conteúdo
    refreshUsers();

    // Após renderizar, configurar todos os event listeners necessários
    waitForElementsAndSetupListeners();

    function waitForElementsAndSetupListeners() {
      const btnNewUser = document.getElementById('btnNewUser');
      const btnSubmitCreate = document.getElementById('submitCreateUser');
      const btnSubmitEdit = document.getElementById('submitEditUser');
      const createUserModalElement = document.getElementById('createUserModal');
      const editUserModalElement = document.getElementById('editUserModal');
      if (btnNewUser && btnSubmitCreate && btnSubmitEdit && createUserModalElement && editUserModalElement) {
        setupEventListeners();
      } else {
        setTimeout(waitForElementsAndSetupListeners, 50);
      }
    }

    // Função para configurar listeners de botões e elementos dinâmicos
    function setupEventListeners() {
      // Botão Novo Usuário
      const btnNewUser = document.getElementById('btnNewUser');
      if (btnNewUser && createUserModalElement) {
        btnNewUser.addEventListener('click', async () => {
          const createUserModal = new bootstrap.Modal(createUserModalElement);
          createUserModal.show();
          // Preenche os selects de units e companies no modal de criação
          try {
            const units = await API.getUnits(AuthService);
            DOM.populateUnitsSelect('create_unit_id', units);
          } catch (e) {
            const select = document.getElementById('create_unit_id');
            if (select) select.innerHTML = `<option value="">Erro ao carregar units</option>`;
          }
          try {
            const companies = await API.getCompanies(AuthService);
            DOM.populateCompaniesSelect('create_company_id', companies);
          } catch (e) {
            const select = document.getElementById('create_company_id');
            if (select) select.innerHTML = `<option value="">Erro ao carregar companies</option>`;
          }
        });
      } else {
        if (!btnNewUser) console.warn('[setupEventListeners] Botão #btnNewUser não encontrado no DOM.');
        if (!createUserModalElement) console.warn('[setupEventListeners] Modal #createUserModal não encontrado no DOM.');
      }
      // Botão submitCreateUser
      const btnSubmitCreate = document.getElementById('submitCreateUser');
      if (btnSubmitCreate) {
        btnSubmitCreate.addEventListener('click', handleCreateUser);
      } else {
        console.warn('[setupEventListeners] Botão #submitCreateUser não encontrado no DOM.');
      }
      // Botão submitEditUser
      const btnSubmitEdit = document.getElementById('submitEditUser');
      if (btnSubmitEdit) {
        btnSubmitEdit.addEventListener('click', handleEditUser);
      } else {
        console.warn('[setupEventListeners] Botão #submitEditUser não encontrado no DOM.');
      }
      // Modal de criação
      if (createUserModalElement) {
        try {
          createUserModalElement.addEventListener('shown.bs.modal', function() {
            const closeBtn = this.querySelector('.btn-close');
            if (closeBtn) {
              closeBtn.focus();
            } else {
              console.warn('[setupEventListeners] Botão de fechar do modal de criação não encontrado.');
            }
          });
        } catch (e) {
          console.warn('[setupEventListeners] Erro ao adicionar listener ao modal de criação:', e);
        }
      } else {
        console.warn('[setupEventListeners] Modal #createUserModal não encontrado no DOM para adicionar evento de focus.');
      }
      // Modal de edição
      if (editUserModalElement) {
        try {
          editUserModalElement.addEventListener('shown.bs.modal', function() {
            const closeBtn = this.querySelector('.btn-close');
            if (closeBtn) {
              closeBtn.focus();
            } else {
              console.warn('[setupEventListeners] Botão de fechar do modal de edição não encontrado.');
            }
          });
        } catch (e) {
          console.warn('[setupEventListeners] Erro ao adicionar listener ao modal de edição:', e);
        }
      } else {
        console.warn('[setupEventListeners] Modal #editUserModal não encontrado no DOM para adicionar evento de focus.');
      }
      // Botão de alternância de tema (themeToggle)
      const themeToggle = document.getElementById('themeToggle');
      if (themeToggle) {
        themeToggle.addEventListener('click', function() {
          document.body.classList.toggle('dark-mode');
        });
      }
    }
  
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
  
    // Remover listeners diretos duplicados (linhas 221 e 222)
    // document.getElementById('submitCreateUser').addEventListener('click', handleCreateUser);
    // document.getElementById('submitEditUser').addEventListener('click', handleEditUser);
  
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
  
    // Função global para remover um usuário após confirmação
    window.removeUser = async function(userId) {
      showConfirmModal({
        title: 'Remover Usuário',
        message: 'Tem certeza que deseja remover este usuário?',
        onConfirm: async () => {
          try {
            await API.deleteUser(AuthService, userId);
            refreshUsers();
          } catch (error) {
            alert("Erro ao remover usuário: " + error.message);
          }
        }
      });
    };

    // Função utilitária para exibir modal de confirmação
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
    // themeToggle.addEventListener('click', function() {
    //   document.body.classList.toggle('dark-mode');
    //   themeToggle.textContent = document.body.classList.contains('dark-mode') ? 'Modo Claro' : 'Modo Escuro';
    //   localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
    // });
  
    // Aplica o tema salvo ao carregar a página
    window.addEventListener('DOMContentLoaded', function() {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        // themeToggle.textContent = 'Modo Claro'; // This line was removed as per the edit hint
      }
    });
  }