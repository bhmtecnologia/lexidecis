/**
 * Módulo principal da aplicação Lexidecis.
 *
 * Este módulo inicializa a aplicação, define os eventos necessários e integra
 * os módulos de autenticação (AuthService), API (API) e manipulação do DOM (DOM).
 *
 * @module main
 */
import { createFirebaseUserV2, processPendingFirebaseUids } from './firebase-utils-v2.js';

export function initMain(AuthService, API, DOM) {
    let usersData = {};
    let presenceUnsubscribe = null;
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

    // Verifica se há UIDs pendentes do Firebase
    const pendingUid = processPendingFirebaseUids();
    if (pendingUid) {
      console.log('[initMain] 🔍 UID pendente encontrado:', pendingUid);
      alert(`✅ Login realizado!\n\n🔄 Processando usuário criado anteriormente:\n📧 ${pendingUid.email}\n🆔 UID: ${pendingUid.uid}`);
    }

    // Mostra a seção protegida imediatamente
    const protectedSection = document.getElementById('protected-section');
    if (protectedSection) {
      protectedSection.classList.remove('d-none');
    }

    // Inicializa DataTable após renderização do conteúdo
    if (window.jQuery && jQuery.fn.DataTable) {
      DOM.initializeDataTable && DOM.initializeDataTable();
    }

    // Carrega os usuários imediatamente após renderizar o conteúdo
    refreshUsers();

    // Após renderizar, configurar todos os event listeners necessários
    waitForElementsAndSetupListeners();

    function waitForElementsAndSetupListeners() {
      // Procurar por ambos os IDs possíveis do botão "Novo Usuário"
      const btnNewUser = document.getElementById('btnNewUser') || document.getElementById('createUserBtn');
      const btnSubmitCreate = document.getElementById('submitCreateUser');
      const btnSubmitEdit = document.getElementById('submitEditUser');
      const createUserModalElement = document.getElementById('createUserModal');
      const editUserModalElement = document.getElementById('editUserModal');
      
      console.log('[waitForElementsAndSetupListeners] Verificando elementos:', {
        btnNewUser: !!btnNewUser,
        btnNewUserId: btnNewUser ? btnNewUser.id : 'não encontrado',
        btnSubmitCreate: !!btnSubmitCreate,
        btnSubmitEdit: !!btnSubmitEdit,
        createUserModalElement: !!createUserModalElement,
        editUserModalElement: !!editUserModalElement
      });
      
      if (btnNewUser && btnSubmitCreate && btnSubmitEdit && createUserModalElement && editUserModalElement) {
        setupEventListeners();
      } else {
        setTimeout(waitForElementsAndSetupListeners, 50);
      }
    }

    // Função para configurar listeners de botões e elementos dinâmicos
    function setupEventListeners() {
      // Botão Novo Usuário (procurar por ambos os IDs possíveis)
      const btnNewUser = document.getElementById('btnNewUser') || document.getElementById('createUserBtn');
      if (btnNewUser) {
        btnNewUser.addEventListener('click', async (e) => {
          e.preventDefault();
          console.log('[btnNewUser] Clique detectado');
          
          try {
            // Primeiro, injeta/atualiza formulário dentro do modal
            createUserForm();
            
            // Aguarda um pouco para garantir que o DOM foi atualizado
            await new Promise(resolve => setTimeout(resolve, 100));

            // popula selects (espera dados antes de abrir modal)
            try {
              const units = await API.getUnits(AuthService);
              DOM.populateUnitsSelect('create_unit_id', units);
            } catch (e) {
              console.error('[btnNewUser] Erro ao carregar units:', e);
              const sel = document.getElementById('create_unit_id');
              if (sel) sel.innerHTML = '<option value="">Erro ao carregar units</option>';
            }
            
            try {
              const companies = await API.getCompanies(AuthService);
              DOM.populateCompaniesSelect('create_company_id', companies);
            } catch (e) {
              console.error('[btnNewUser] Erro ao carregar companies:', e);
              const sel = document.getElementById('create_company_id');
              if (sel) sel.innerHTML = '<option value="">Erro ao carregar companies</option>';
            }

            // Garante que o modal existe e está pronto
            const modalToShow = document.getElementById('createUserModal');
            if (!modalToShow) {
              console.error('[btnNewUser] Modal não encontrado após criação do formulário');
              return;
            }

            // Verifica se o Bootstrap está disponível
            if (typeof bootstrap === 'undefined') {
              console.error('[btnNewUser] Bootstrap não está carregado');
              alert('Erro: Bootstrap não está carregado');
              return;
            }

            // Abre o modal usando a API padrão do Bootstrap
            console.log('[btnNewUser] Abrindo modal...');
            const modalInstance = new bootstrap.Modal(modalToShow);
            modalInstance.show();
            
          } catch (error) {
            console.error('[btnNewUser] Erro ao abrir modal:', error);
            alert('Erro ao abrir formulário de criação de usuário');
          }
        });
      } else {
        console.warn('[setupEventListeners] Botão Novo Usuário (#btnNewUser ou #createUserBtn) não encontrado no DOM.');
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
      console.log('[refreshUsers] 🔄 Buscando usuários...');
      
      try {
        const users = await API.fetchUsers(AuthService);
        console.log('[refreshUsers] 📥 Usuários recebidos da API:', users);
        console.log('[refreshUsers] 📊 Quantidade:', users.length);
        
        // Não precisa mais contar firebase_uid pois agora o ID é o Firebase UID
        console.log('[refreshUsers] 🔥 Sistema simplificado: ID = Firebase UID');
        
        // Atualiza o mapeamento de dados dos usuários
        usersData = {};
        users.forEach(user => {
          usersData[user.id] = user;
        });
        
        // Atualiza a tabela
        DOM.updateUserTable(users, usersData);
        
        // Inicia o tracking de presença dos usuários
        startPresenceTracking(users);
        
      } catch (error) {
        console.error('[refreshUsers] ❌ Erro ao buscar usuários:', error);
        alert('Erro ao carregar usuários. Verifique sua conexão.');
      }
    }

    /**
     * Inicia o tracking de presença dos usuários
     * @param {Array} users - Lista de usuários
     */
    async function startPresenceTracking(users) {
      try {
        // Para o tracking anterior se existir
        if (presenceUnsubscribe) {
          presenceUnsubscribe();
          presenceUnsubscribe = null;
        }

        // Filtra apenas usuários com Firebase UID válido
        const validUserIds = users
          .filter(user => /^[a-zA-Z0-9]{28}$/.test(user.id))
          .map(user => user.id);

        if (validUserIds.length > 0) {
          console.log('[startPresenceTracking] 🔍 Iniciando tracking de presença para', validUserIds.length, 'usuários');
          
          // Inicia o tracking de presença
          presenceUnsubscribe = await AuthService.getUsersPresence(validUserIds);
          
          // Configura listener para mudanças de presença
          document.addEventListener('presenceChanged', (event) => {
            const { uid, presence } = event.detail;
            DOM.updateUserPresence(uid, presence);
          });
        }
      } catch (error) {
        console.error('[startPresenceTracking] ❌ Erro ao iniciar tracking de presença:', error);
      }
    }
  

  
    /**
     * Cria o formulário de criação de usuário no modal.
     */
    function createUserForm() {
      console.log('[createUserForm] Iniciando criação do formulário');
      
      // Sempre injeta o formulário no modal correto
      const createUserModalElement = document.getElementById('createUserModal');
      if (!createUserModalElement) {
        console.error('[createUserForm] Modal #createUserModal não encontrado');
        return;
      }
      
      const modalBody = createUserModalElement.querySelector('.modal-body');
      if (!modalBody) {
        console.error('[createUserForm] .modal-body não encontrado dentro do modal');
        return;
      }
      
      // Limpa o conteúdo anterior
      modalBody.innerHTML = '';
      
      // Cria o formulário
      const formHTML = `
        <form id="createUserForm" class="needs-validation" novalidate>
          <div class="row">
            <div class="col-md-6 mb-3">
              <label for="email" class="form-label">Email *</label>
              <input type="email" class="form-control" id="email" required>
              <small class="form-text text-muted">O Firebase UID será usado como ID automaticamente</small>
            </div>
            <div class="col-md-6 mb-3">
              <label for="password" class="form-label">Senha *</label>
              <input type="password" class="form-control" id="password" required minlength="6">
              <small class="form-text text-muted">Mínimo 6 caracteres</small>
            </div>
            <div class="col-md-6 mb-3">
              <label for="username" class="form-label">Username *</label>
              <input type="text" class="form-control" id="username" required>
            </div>
            <div class="col-md-6 mb-3">
              <label for="is_admin" class="form-label">É Admin</label>
              <select class="form-control" id="is_admin" required>
                <option value="false">Não</option>
                <option value="true">Sim</option>
              </select>
            </div>
            <div class="col-md-6 mb-3">
              <label for="create_company_id" class="form-label">Company *</label>
              <select class="form-control" id="create_company_id" required>
                <option value="">Carregando...</option>
              </select>
            </div>
            <div class="col-md-6 mb-3">
              <label for="create_unit_id" class="form-label">Unit *</label>
              <select class="form-control" id="create_unit_id" required>
                <option value="">Carregando...</option>
              </select>
            </div>
            <div class="col-md-6 mb-3">
              <label for="remote_jid" class="form-label">Remote JID</label>
              <input type="text" class="form-control" id="remote_jid">
            </div>
            <div class="col-md-6 mb-3">
              <label for="whatsapp" class="form-label">WhatsApp</label>
              <select class="form-control" id="whatsapp" required>
                <option value="false">Não</option>
                <option value="true">Sim</option>
              </select>
            </div>
          </div>
          <div id="createUserError" class="text-danger d-none"></div>
        </form>
      `;
      
      // Injeta o HTML no modal
      modalBody.innerHTML = formHTML;
      
      console.log('[createUserForm] Formulário criado com sucesso');
    }


    
    /**
     * Manipula a criação de um novo usuário.
     * Agora usa Firebase UID como ID principal - sistema simplificado!
     */
    async function handleCreateUser() {
      const errorDiv = document.getElementById('createUserError');
      errorDiv.classList.add('d-none');

      // Coleta os dados do formulário
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const username = document.getElementById('username').value.trim();

      // Validações básicas
      if (!email || !password || !username) {
        errorDiv.textContent = 'Email, senha e username são obrigatórios.';
        errorDiv.classList.remove('d-none');
        return;
      }

      if (password.length < 6) {
        errorDiv.textContent = 'A senha deve ter pelo menos 6 caracteres.';
        errorDiv.classList.remove('d-none');
        return;
      }

      try {
        // Exibe mensagem de carregamento
        errorDiv.textContent = 'Criando usuário no Firebase...';
        errorDiv.className = 'alert alert-info';

        // PRIMEIRO: Cria usuário no Firebase e obtém o UID
        console.log('[handleCreateUser] 🚀 Criando usuário no Firebase...');
        const firebaseUser = await createFirebaseUserV2(email, password);
        
        console.log('[handleCreateUser] ✅ Firebase UID obtido:', firebaseUser.uid);

        // Verifica se o admin foi deslogado
        if (firebaseUser.adminLoggedOut || firebaseUser.needsRelogin) {
          console.log('[handleCreateUser] 🚨 Admin foi deslogado - redirecionando');
          
          errorDiv.innerHTML = `
            <strong>⚠️ Admin foi deslogado durante a criação!</strong><br>
            <br>
            ✅ <strong>Usuário criado no Firebase com sucesso</strong><br>
            🆔 <strong>Firebase UID:</strong> <code>${firebaseUser.uid}</code><br>
            📧 <strong>Email:</strong> <code>${firebaseUser.email}</code><br>
            <br>
            🔄 <strong>Faça login novamente para completar o processo.</strong><br>
            <br>
            <button onclick="window.location.href='login.html'" class="btn btn-primary">
              🔐 Fazer Login Novamente
            </button>
          `;
          errorDiv.className = 'alert alert-warning';
          return;
        }

        // SEGUNDO: Cria usuário no PostgreSQL usando Firebase UID como ID
        errorDiv.textContent = 'Salvando usuário no banco de dados...';
        
        const payload = {
          id: firebaseUser.uid, // 🔥 Firebase UID como ID principal!
          username: username,
          email: email,
          is_admin: document.getElementById('is_admin').value === "true",
          company_id: document.getElementById('create_company_id').value,
          unit_id: document.getElementById('create_unit_id').value,
          remote_jid: document.getElementById('remote_jid').value.trim() || null,
          whatsapp: document.getElementById('whatsapp').value === "true"
        };

        console.log('[handleCreateUser] 📦 Payload para PostgreSQL:', payload);
        console.log('[handleCreateUser] 🎯 ID será:', firebaseUser.uid);

        await API.createUser(AuthService, payload);

        // Sucesso total!
        console.log('[handleCreateUser] ✅ SUCESSO TOTAL!');
        
        errorDiv.innerHTML = `
          <strong>✅ Usuário criado com sucesso!</strong><br>
          <br>
          🆔 <strong>ID:</strong> <code>${firebaseUser.uid}</code><br>
          📧 <strong>Email:</strong> <code>${firebaseUser.email}</code><br>
          👤 <strong>Username:</strong> <code>${username}</code><br>
        `;
        errorDiv.className = 'alert alert-success';

        // Fecha o modal após 2 segundos e atualiza a lista
        setTimeout(() => {
          const modal = bootstrap.Modal.getInstance(createUserModalElement);
          modal.hide();
          refreshUsers();
        }, 2000);

      } catch (error) {
        console.error('[handleCreateUser] ❌ Erro:', error);
        
        let errorMessage = 'Erro desconhecido ao criar usuário.';
        
        if (error.message.includes('EMAIL_EXISTS') || error.message.includes('email-already-in-use')) {
          errorMessage = 'Este email já está em uso.';
        } else if (error.message.includes('WEAK_PASSWORD')) {
          errorMessage = 'Senha muito fraca. Use pelo menos 6 caracteres.';
        } else if (error.message.includes('INVALID_EMAIL')) {
          errorMessage = 'Email inválido.';
        } else if (error.message.includes('auth')) {
          errorMessage = 'Erro de autenticação. Faça login novamente.';
        } else {
          errorMessage = error.message;
        }
        
        errorDiv.textContent = errorMessage;
        errorDiv.className = 'alert alert-danger';
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
     * Cria o formulário de edição de usuário no modal.
     */
    function createEditUserForm() {
      const modalBody = editUserModalElement.querySelector('.modal-body');
      modalBody.innerHTML = `
        <form id="editUserForm">
          <input type="hidden" id="edit_user_id">
          <div class="row">
            <div class="col-md-6 mb-3">
              <label for="edit_username" class="form-label">Username</label>
              <input type="text" class="form-control" id="edit_username" required>
            </div>
            <div class="col-md-6 mb-3">
              <label for="edit_email" class="form-label">Email</label>
              <input type="email" class="form-control" id="edit_email" required>
            </div>
            <div class="col-md-6 mb-3">
              <label for="edit_is_admin" class="form-label">É Admin</label>
              <select class="form-control" id="edit_is_admin" required>
                <option value="false">Não</option>
                <option value="true">Sim</option>
              </select>
            </div>
            <div class="col-md-6 mb-3">
              <label for="edit_company_id" class="form-label">Company</label>
              <select class="form-control" id="edit_company_id" required>
                <option value="">Carregando...</option>
              </select>
            </div>
            <div class="col-md-6 mb-3">
              <label for="edit_unit_id" class="form-label">Unit</label>
              <select class="form-control" id="edit_unit_id" required>
                <option value="">Carregando...</option>
              </select>
            </div>
            <div class="col-md-6 mb-3">
              <label for="edit_remote_jid" class="form-label">Remote JID</label>
              <input type="text" class="form-control" id="edit_remote_jid">
            </div>
            <div class="col-md-6 mb-3">
              <label for="edit_whatsapp" class="form-label">WhatsApp</label>
              <select class="form-control" id="edit_whatsapp" required>
                <option value="false">Não</option>
                <option value="true">Sim</option>
              </select>
            </div>
          </div>
          <div id="editUserError" class="text-danger d-none"></div>
        </form>
      `;
    }

    /**
     * Abre o modal de edição e preenche os campos com os dados do usuário.
     *
     * @param {string|number} userId - ID do usuário a ser editado.
     */
    window.editUser = async function(userId) {
      const user = usersData[userId];
      if (!user) return;
      
      // Cria o formulário no modal
      createEditUserForm();
      
      // Aguarda um momento para garantir que o DOM foi atualizado
      setTimeout(() => {
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
        
        const editUserModal = new bootstrap.Modal(editUserModalElement, {
          backdrop: 'static',
          keyboard: false
        });
        editUserModal.show();
      }, 100);
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
        // Limpa o tracking de presença ao fazer logout
        if (presenceUnsubscribe) {
          presenceUnsubscribe();
          presenceUnsubscribe = null;
        }
        window.location.href = "login.html?redirect=" + encodeURIComponent(window.location.href);
      }
    });

    // Limpa o tracking de presença quando a página é fechada
    window.addEventListener('beforeunload', () => {
      if (presenceUnsubscribe) {
        presenceUnsubscribe();
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