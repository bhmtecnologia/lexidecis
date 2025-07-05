/**
 * Módulo principal da aplicação Lexidecis.
 *
 * Este módulo inicializa a aplicação, define os eventos necessários e integra
 * os módulos de autenticação (AuthService), API (API) e manipulação do DOM (DOM).
 *
 * @module main
 */
import { createFirebaseUser, waitForReAuthentication, createUserWithRollback } from './firebase-utils.js';

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
              <label for="id" class="form-label">ID <small class="text-muted">(gerado automaticamente)</small></label>
              <input type="text" class="form-control" id="id" readonly placeholder="Será gerado automaticamente">
              <div class="invalid-feedback">ID gerado automaticamente.</div>
            </div>
            <div class="col-md-6 mb-3">
              <label for="username" class="form-label">Username</label>
              <input type="text" class="form-control" id="username" required>
              <div class="invalid-feedback">Por favor, insira um username válido.</div>
            </div>
            <div class="col-md-6 mb-3">
              <label for="email" class="form-label">Email</label>
              <input type="email" class="form-control" id="email" required>
              <div class="invalid-feedback">Por favor, insira um email válido.</div>
            </div>
            <div class="col-md-6 mb-3">
              <label for="password" class="form-label">Senha</label>
              <input type="password" class="form-control" id="password" required minlength="6">
              <div class="invalid-feedback">Por favor, insira uma senha com pelo menos 6 caracteres.</div>
            </div>
            <div class="col-md-6 mb-3">
              <label for="is_admin" class="form-label">É Admin</label>
              <select class="form-control" id="is_admin" required>
                <option value="false">Não</option>
                <option value="true">Sim</option>
              </select>
            </div>
            <div class="col-md-6 mb-3">
              <label for="create_company_id" class="form-label">Company</label>
              <select class="form-control" id="create_company_id" required>
                <option value="">Carregando...</option>
              </select>
            </div>
            <div class="col-md-6 mb-3">
              <label for="create_unit_id" class="form-label">Unit</label>
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
          <div id="createUserError" class="alert alert-danger d-none" role="alert"></div>
        </form>
      `;
      
      // Injeta o HTML no modal
      modalBody.innerHTML = formHTML;
      
      // Adiciona listener para gerar ID automaticamente baseado no email
      const emailInput = document.getElementById('email');
      const idInput = document.getElementById('id');
      
      emailInput.addEventListener('input', function() {
        const email = emailInput.value.trim();
        if (email) {
          // Gera ID baseado no email + timestamp
          const emailPrefix = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
          const timestamp = Date.now().toString().slice(-6); // Últimos 6 dígitos do timestamp
          const generatedId = `${emailPrefix}_${timestamp}`;
          idInput.value = generatedId;
        } else {
          idInput.value = '';
        }
      });
      
      console.log('[createUserForm] Formulário criado com sucesso');
    }

    /**
     * Manipula a criação de um novo usuário.
     */
    async function handleCreateUser() {
      const errorDiv = document.getElementById('createUserError');
      errorDiv.classList.add('d-none');
      
      // Coleta os dados do formulário
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      let userId = document.getElementById('id').value.trim();
      
      // Gera ID automaticamente se estiver vazio
      if (!userId && email) {
        const emailPrefix = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
        const timestamp = Date.now().toString().slice(-6);
        userId = `${emailPrefix}_${timestamp}`;
        document.getElementById('id').value = userId;
      }
      
      const payload = {
        id: userId,
        username: document.getElementById('username').value.trim(),
        email: email,
        is_admin: document.getElementById('is_admin').value === "true",
        company_id: document.getElementById('create_company_id').value,
        unit_id: document.getElementById('create_unit_id').value,
        remote_jid: document.getElementById('remote_jid').value.trim() || null,
        whatsapp: document.getElementById('whatsapp').value === "true"
      };
      
      // Validações básicas
      if (!email || !password) {
        errorDiv.textContent = 'Email e senha são obrigatórios.';
        errorDiv.classList.remove('d-none');
        return;
      }
      
      if (!userId) {
        errorDiv.textContent = 'Erro ao gerar ID do usuário. Verifique se o email está preenchido.';
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
        errorDiv.textContent = 'Criando usuário...';
        errorDiv.className = 'alert alert-info';
        
        // PRIMEIRO: Tenta criar no banco SEM Firebase, para testar se a API funciona
        console.log('[handleCreateUser] Testando criação no banco primeiro...');
        console.log('[handleCreateUser] Payload:', payload);
        
        try {
          // Testa se a API básica funciona
          await API.createUser(AuthService, payload);
          console.log('[handleCreateUser] ✅ API PostgreSQL funcionando!');
          
          // Se chegou aqui, a API funciona. Agora vamos tentar com Firebase
          console.log('[handleCreateUser] Agora criando no Firebase...');
          
          // Cria usuário no Firebase
          const firebaseUser = await createFirebaseUser(email, password);
          console.log('[handleCreateUser] ✅ Usuário criado no Firebase!');
          console.log('[handleCreateUser] 🔥 UID REAL do Firebase:', firebaseUser.uid);
          console.log('[handleCreateUser] 📧 Email Firebase:', firebaseUser.email);
          
          // Aguarda re-autenticação
          await waitForReAuthentication(5000);
          console.log('[handleCreateUser] ✅ Re-autenticação concluída');
          
          // Agora atualiza o usuário no banco com o firebase_uid REAL
          const updatePayload = {
            id: payload.id,
            firebase_uid: firebaseUser.uid // <-- Este é o UID REAL do usuário criado no Firebase
          };
          
          console.log('[handleCreateUser] 🔗 Vinculando UID REAL do Firebase ao PostgreSQL...');
          console.log('[handleCreateUser] 📦 Payload de atualização:', updatePayload);
          console.log('[handleCreateUser] 🆔 UID que será salvo:', firebaseUser.uid);
           
           try {
             await API.updateUser(AuthService, updatePayload);
             console.log('[handleCreateUser] ✅ SUCESSO: UID real do Firebase salvo no PostgreSQL!');
             console.log('[handleCreateUser] 🎉 Usuário ID:', payload.id);
             console.log('[handleCreateUser] 🔥 Firebase UID salvo:', firebaseUser.uid);
             console.log('[handleCreateUser] ✅ Processo completo finalizado!');
           } catch (updateError) {
             console.warn('[handleCreateUser] ⚠️ Erro ao adicionar firebase_uid, mas usuário foi criado em ambos sistemas:', updateError);
             console.warn('[handleCreateUser] 🔥 UID que deveria ser salvo:', firebaseUser.uid);
             // Não falha completamente, pois o usuário já foi criado em ambos sistemas
           }
          
        } catch (apiError) {
          console.error('[handleCreateUser] ❌ Erro na API PostgreSQL:', apiError);
          
          // Se houver erro na API, mostra mensagem específica
          if (apiError.message.includes('firebase_uid')) {
            throw new Error('A API PostgreSQL não aceita o campo firebase_uid. Verifique a configuração do backend.');
          } else if (apiError.message.includes('401') || apiError.message.includes('auth')) {
            throw new Error('Erro de autenticação. Faça login novamente.');
          } else if (apiError.message.includes('400')) {
            throw new Error('Dados inválidos enviados para a API. Verifique os campos obrigatórios.');
          } else {
            throw new Error(`Erro na API PostgreSQL: ${apiError.message}`);
          }
        }
        
        // Sucesso - fecha o modal e atualiza a lista
        console.log('[handleCreateUser] ✅ SUCESSO: Usuário criado em ambos os sistemas!');
        const modal = bootstrap.Modal.getInstance(createUserModalElement);
        modal.hide();
        refreshUsers();
        
      } catch (error) {
        console.error('[handleCreateUser] Erro ao criar usuário:', error);
        
        // Tenta identificar em qual etapa o erro ocorreu
        let errorMessage = 'Erro desconhecido ao criar usuário.';
        
        if (error.message.includes('Firebase') || error.message.includes('auth/')) {
          errorMessage = `Erro no Firebase: ${error.message}`;
        } else if (error.message.includes('webhook') || error.message.includes('API')) {
          errorMessage = `Erro na API: ${error.message}`;
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