const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
const DEBUG_MODE = isLocalhost; // Define DEBUG_MODE com base no hostname

import GPTManager from './gptManager.js';
// Removemos a importação do HistoryManager, pois suas funções foram migradas para o ChatManager
import ProfileManager from './profileManager.js';
import { logout } from './auth.js';

class UIManager {
    constructor(apiService, stateManager, chatManager, config, auth) {
        this.apiService = apiService;
        this.stateManager = stateManager;
        this.chatManager = chatManager; // Referência ao ChatManager (agora com funcionalidades de histórico integradas)
        this.config = config; // Armazena o CONFIG na instância
        this.auth = auth; // Instância do Firebase Auth

        // Inicializar o GPTManager com o CONFIG correto
        this.gptManager = new GPTManager(this.apiService, this.stateManager, this, this.config);

        // Inicializar o ProfileManager
        // Ajuste conforme a assinatura necessária do ProfileManager:
        // Se a assinatura mudou para aceitar apenas UIManager, use `new ProfileManager(this)`.
        // Caso contrário, mantenha conforme necessário.
        this.profileManager = new ProfileManager(this.auth, this);

        const gptModalElement = document.getElementById('gpt-modal');
        if (gptModalElement) {
            this.modal = new bootstrap.Modal(gptModalElement);
        }

        this.setupUIEvents();
        
        // Configurar listener para mudanças de autenticação
        this.setupAuthListener();
        
        // Atualizar informações do usuário imediatamente se já estiver logado
        this.updateUserInfo();
    }

    /* Método auxiliar para logs */
    debugLog(...args) {
        if (DEBUG_MODE) {
            console.log(...args);
        }
    }

    /* --- Configuração de Eventos da UI --- */
    setupUIEvents() {
        // Botões do cabeçalho (ocultar e mostrar cabeçalho)
        const hideHeaderButton = document.getElementById('hide-header-button');
        const showHeaderButton = document.getElementById('show-header-button');

        if (hideHeaderButton) {
            hideHeaderButton.addEventListener('click', () => this.hideHeader());
        }

        if (showHeaderButton) {
            showHeaderButton.addEventListener('click', () => this.showHeader());
        }

        // Campo de pesquisa e botão de limpar na lista de chats
        const searchInput = document.getElementById('search-input');
        const clearSearchButton = document.getElementById('clear-search-button');

        if (searchInput && this.chatManager && typeof this.chatManager.filterChatList === 'function') {
            searchInput.addEventListener('input', () => this.chatManager.filterChatList());
        } else if (searchInput) {
            console.warn('ChatManager ou método filterChatList não está disponível.');
        }

        if (clearSearchButton && this.chatManager && typeof this.chatManager.clearSearch === 'function') {
            clearSearchButton.addEventListener('click', () => this.chatManager.clearSearch());
        } else if (clearSearchButton) {
            console.warn('ChatManager ou método clearSearch não está disponível.');
        }

        // Botões da barra lateral
        const newChatButton = document.getElementById('new-chat-button');
        const selectGPTButton = document.getElementById('select-gpt-button');
        const profileButton = document.getElementById('profile-button');
        const configButton = document.getElementById('config-button');
        const adminButton = document.getElementById('admin-button');
        const logoutButton = document.getElementById('logout-button');

        if (newChatButton) {
            newChatButton.addEventListener('click', () => this.createNewChat());
        }

        if (selectGPTButton) {
            selectGPTButton.addEventListener('click', () => this.gptManager.openModal());
        }

        if (profileButton) {
            profileButton.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                this.closeUserMenu();
                this.profileManager.openModal();
            });
        }

        if (configButton) {
            configButton.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                this.closeUserMenu();
                this.openConfigModal();
            });
        }

        if (adminButton) {
            adminButton.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                this.closeUserMenu();
                this.openAdminModal();
            });
        }

        if (logoutButton) {
            logoutButton.addEventListener('click', async (event) => {
                event.preventDefault();
                event.stopPropagation();
                try {
                    await this.logout();
                } catch (error) {
                    console.error("Erro ao realizar logout:", error);
                }
            });
        }

        // Funcionalidade do menu dropdown do usuário
        this.setupUserMenu();

        // Lógica do botão de toggle da sidebar em telas menores
        this.setupSidebarToggle();

        // Evento de fechamento do modal via Bootstrap
        const gptModal = document.getElementById('gpt-modal');
        if (gptModal) {
            gptModal.addEventListener('hidden.bs.modal', () => {
                const selectGPTButton = document.getElementById('select-gpt-button');
                if (selectGPTButton) {
                    selectGPTButton.focus();
                }
            });
        }

        // Evento para recarregar o iframe quando o modal admin for aberto
        const adminModal = document.getElementById('adminModal');
        if (adminModal) {
            adminModal.addEventListener('shown.bs.modal', () => {
                const iframe = document.getElementById('adminIframe');
                if (iframe) {
                    iframe.src = iframe.src; // Recarrega o iframe
                }
            });
        }
    }

    /* --- Configuração do Menu do Usuário --- */
    setupUserMenu() {
        const userMenuTrigger = document.getElementById('user-menu-trigger');
        const userMenuDropdown = document.getElementById('user-menu-dropdown');
        
        if (userMenuTrigger && userMenuDropdown) {
            // Toggle do menu ao clicar no trigger
            userMenuTrigger.addEventListener('click', (e) => {
                e.stopPropagation();
                userMenuDropdown.classList.toggle('show');
            });
            
            // Fechar menu ao clicar fora
            document.addEventListener('click', (e) => {
                if (!userMenuTrigger.contains(e.target) && !userMenuDropdown.contains(e.target)) {
                    this.closeUserMenu();
                }
            });
            
            // Fechar menu ao pressionar ESC
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.closeUserMenu();
                }
            });
        }
    }

    /* --- Configuração do Toggle da Sidebar --- */
    setupSidebarToggle() {
        const sidebar = document.getElementById('sidebarMenu');
        const toggleBtn = document.getElementById('toggle-sidebar-btn');
        const overlay = document.getElementById('sidebarOverlay');

        if (toggleBtn && sidebar && overlay) {
            toggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.debugLog('Toggle button clicked');
                sidebar.classList.toggle('active');
                overlay.classList.toggle('active');
                this.debugLog('Sidebar active:', sidebar.classList.contains('active'));
            });

            overlay.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.debugLog('Overlay clicked');
                sidebar.classList.remove('active');
                overlay.classList.remove('active');
            });

            // Fechar sidebar ao pressionar ESC
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && sidebar.classList.contains('active')) {
                    sidebar.classList.remove('active');
                    overlay.classList.remove('active');
                }
            });
        } else {
            console.error('Elementos do sidebar não encontrados:', {
                sidebar: !!sidebar,
                toggleBtn: !!toggleBtn,
                overlay: !!overlay
            });
        }
    }

    /* --- Método para fechar o menu do usuário --- */
    closeUserMenu() {
        const userMenuDropdown = document.getElementById('user-menu-dropdown');
        if (userMenuDropdown) {
            userMenuDropdown.classList.remove('show');
        }
    }

    /* --- Método para abrir o Modal de Configurações --- */
    openConfigModal() {
        // Verifica se o modal já existe
        let configModal = document.getElementById('config-modal');
        if (!configModal) {
            const modalHTML = `
            <div class="modal fade" id="config-modal" tabindex="-1" aria-labelledby="config-modal-title" aria-hidden="true">
                <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="config-modal-title">Configurações</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
                        </div>
                        <div class="modal-body" style="height:80vh;">
                            <iframe src="config.html" style="width:100%; height:100%; border:none;"></iframe>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
                        </div>
                    </div>
                </div>
            </div>`;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            configModal = document.getElementById('config-modal');
            this.configModalInstance = new bootstrap.Modal(configModal);
        }
        // Se já existir, utilize a instância existente
        if (!this.configModalInstance) {
            this.configModalInstance = new bootstrap.Modal(configModal);
        }
        this.configModalInstance.show();
    }

    /* --- Função para Criar Novo Chat --- */
    async createNewChat() {
        try {
            this.debugLog('Iniciando nova sessão de chat...');

            // Verifica se um GPT está selecionado
            const selectedGPT = this.stateManager.selectedGPT;
            if (!selectedGPT) {
                throw new Error('Nenhum GPT selecionado. Por favor, selecione um GPT antes de iniciar.');
            }

            // Gera um novo ID de sessão e salva no StateManager
            const newSessionId = this.gptManager.generateSessionId();
            this.stateManager.setSessionId(newSessionId);

            // Inicializa o chatbot, mas não adiciona o chat ainda
            await this.initializeChatbot();

            this.debugLog('Sessão criada e chatbot inicializado com sucesso.');
        } catch (error) {
            console.error('Erro ao criar nova sessão de chat:', error);
            this.showError('Erro ao criar nova sessão de chat. Consulte o console para mais detalhes.');
        }
    }

    /* --- Funções de Inicialização do Chatbot --- */
    async initializeChatbot() {
        try {
            // Adicione logs para depuração
            this.debugLog('Iniciando a inicialização do chatbot...');
            this.debugLog('selectedGPT:', this.stateManager.selectedGPT);

            if (!this.stateManager.selectedGPT) {
                throw new Error('Nenhum GPT selecionado.');
            }

            if (!this.stateManager.selectedGPT.flowiseConfig || !this.stateManager.selectedGPT.flowiseConfig.flowise) {
                throw new Error('flowiseConfig está indefinido ou incompleto para o GPT selecionado.');
            }

            if (!this.stateManager.currentSessionId) {
                const newSessionId = this.gptManager.generateSessionId();
                this.stateManager.setSessionId(newSessionId);
                // Removido: adição automática do chat à lista
                // O chat só será adicionado após o envio da primeira mensagem
            }

            // Limpar histórico injetado
            const selectedFlowiseConfig = this.stateManager.selectedGPT.flowiseConfig.flowise;
            localStorage.removeItem(`${selectedFlowiseConfig.chatflowId}_historyInjected`);
            localStorage.removeItem(`${selectedFlowiseConfig.chatflowId}_EXTERNAL`);

            // Agora, em vez de usar HistoryManager, delegamos a injeção do histórico ao ChatManager
            await this.chatManager.injectChatHistory(this.stateManager.currentSessionId, this.stateManager.selectedGPT.flowiseConfig);

            // Manipular visibilidade dos elementos
            const welcomeMessage = document.getElementById('welcome-message');
            const chatbotContainer = document.getElementById('chatbot-container');
            
            if (welcomeMessage) {
                welcomeMessage.classList.add('d-none');
            }
            
            if (chatbotContainer) {
                chatbotContainer.classList.remove('d-none');
                chatbotContainer.innerHTML = '<flowise-fullchatbot></flowise-fullchatbot>';
            } else {
                console.error('Elemento chatbot-container não encontrado.');
                return;
            }

            const chatflowConfig = {
                sessionId: this.stateManager.currentSessionId,
                ...this.stateManager.selectedGPT.flowiseConfig,
                ...this.stateManager.gptConfig,
            };

            this.debugLog('Chatflow Config:', chatflowConfig);

            Chatbot.initFull({
                chatflowid: selectedFlowiseConfig.chatflowId,
                apiHost: selectedFlowiseConfig.apiHost,
                chatflowConfig: chatflowConfig,
                observersConfig: {
                    observeUserInput: (userInput) => this.logUserInput(userInput),
                    observeMessages: (messages) => this.logMessages(messages),
                    // Delegamos a função de loading para o ChatManager
                    observeLoading: (loading) => this.chatManager.handleLoadingState(loading)
                },
                theme: {
                    button: {
                        backgroundColor: '#282828',
                        right: 20,
                        bottom: 20,
                        size: 48,
                        dragAndDrop: true,
                        iconColor: 'white',
                        customIconSrc: 'https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/svg/google-messages.svg',
                    },
                    disclaimer: {
                        title: 'Aviso',
                        message: 'Ao utilizar esse serviço, está concordando com os termos de uso <a target="_blank" href="https://v1.lexidecis.com.br/terms.html">Termos & Condições</a>',
                        textColor: 'black',
                        buttonColor: '#282828',
                        buttonText: 'Concordo, quero iniciar o LexiDecis',
                        buttonTextColor: 'white',
                        blurredBackgroundColor: 'rgba(0, 0, 0, 0.4)',
                        backgroundColor: 'white',
                    },
                    customCSS: ``,
                    chatWindow: {
                        showTitle: true,
                        showAgentMessages: true,
                        title: this.stateManager.selectedGPT ? this.stateManager.selectedGPT.name : 'Escolha um GPT',
                        titleAvatarSrc: 'https://www.bhm.tec.br/images/152x152/10788698/favicon.png',
                        welcomeMessage: this.stateManager.selectedGPT ? this.stateManager.selectedGPT.description : 'Bem-vindo ao assistente',
                        errorMessage: 'Ops, reduza sua pergunta e tente novamente.',
                        backgroundColor: '#f1f1f1',
                        fontSize: 13,
                        starterPrompts: (() => {
                            const prompts = this.stateManager.selectedGPT?.starterPrompts;
                            if (!prompts) return ['Quem é você?'];
                            if (Array.isArray(prompts)) return prompts;
                            return prompts.includes(',') 
                                ? prompts.split(',').map(p => p.trim()) 
                                : [prompts];
                        })(),
                        starterPromptFontSize: 12,
                        clearChatOnReload: false,
                        sourceDocsTitle: 'Sources:',
                        renderHTML: true,
                        botMessage: {
                          backgroundColor: '#f1f1f1',
                          textColor: '#000000',
                          showAvatar: false,
                        },
                        userMessage: {
                          backgroundColor: '#282828',
                          textColor: '#ffffff',
                          showAvatar: false,
                          //avatarSrc: 'https://raw.githubusercontent.com/zahidkhawaja/langchain-chat-nextjs/main/public/usericon.png',
                        },
                        textInput: {
                          placeholder: 'Mensagem...',
                          backgroundColor: '#282828',
                          textColor: '#f1f1f1',
                          sendButtonColor: '#f1f1f1',
                          maxChars: 100000,
                          maxCharsWarningMessage: 'Você excedeu o limite de caracteres. Insira menos de 100000 caracteres.',
                          autoFocus: true,
                          sendMessageSound: true,
                          receiveMessageSound: true,
                        },
                        feedback: {
                          color: '#282828',
                        },
                        dateTimeToggle: {
                          date: true,
                          time: true,
                        },
                        footer: {
                            textColor: '#282828',
                            text: 'O LexiDecis pode cometer erros. Sempre verifique as respostas - ',
                            company: 'LexiDecis',
                            companyLink: 'https://lexidecis.com.br',
                        },
                    }
                }
            });

            setTimeout(() => {
                const chatbotElement = document.getElementById('chatbot-container');
                if (chatbotElement) {
                    chatbotElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 500);
        } catch (error) {
            console.error('Erro ao inicializar o chatbot:', error);
            this.showError('Erro ao inicializar o chatbot. Consulte o console para mais detalhes.');
        }
    }

    /* --- Outros Métodos Auxiliares --- */

    showError(message) {
        const errorContainer = document.getElementById('error-container');
        if (errorContainer) {
            errorContainer.textContent = message;
            errorContainer.classList.remove('d-none', 'alert-success');
            errorContainer.classList.add('d-block', 'alert-danger');
            setTimeout(() => {
                errorContainer.classList.remove('d-block', 'alert-danger');
                errorContainer.classList.add('d-none');
            }, 5000);
        } else {
            alert(message); 
        }
    }

    logUserInput(userInput) {
        this.debugLog({ userInput });
        // Adiciona o chat à lista apenas no primeiro envio de mensagem
        const sessionId = this.stateManager.currentSessionId;
        const chats = this.stateManager.getChats();
        const chatJaExiste = chats.some(chat => chat.id === sessionId);
        if (!chatJaExiste && this.stateManager.selectedGPT) {
            const novoChat = {
                id: sessionId,
                name: this.stateManager.selectedGPT.name || 'Novo chat',
                date: new Date().toISOString(),
                fk_gpt_id: this.stateManager.selectedGPT.id || null
            };
            this.stateManager.addChat(novoChat);
            this.chatManager.populateChatMenu(this.stateManager.chats);
        }
    }

    logMessages(messages) {
        this.debugLog({ messages });
    }

    hideHeader() {
        const header = document.getElementById('header');
        if (header) {
            header.classList.add('d-none');
        }
    }

    showHeader() {
        const header = document.getElementById('header');
        if (header) {
            header.classList.remove('d-none');
        }
    }

    async logout() {
        try {
            await logout();
            console.log('Usuário desconectado.');
            sessionStorage.clear();
            localStorage.clear();
            window.location.href = '../index.html';
        } catch (error) {
            console.error('Erro ao realizar logout:', error);
            // Mesmo com erro, limpar dados locais e redirecionar
            sessionStorage.clear();
            localStorage.clear();
            window.location.href = '../index.html';
        }
    }

    /* --- Método para abrir o Modal do Admin --- */
    openAdminModal() {
        const adminModal = document.getElementById('adminModal');
        if (adminModal) {
            const modal = new bootstrap.Modal(adminModal);
            modal.show();
        }
    }

    /* --- Método para atualizar informações do usuário --- */
    updateUserInfo() {
        const user = this.auth.currentUser;
        
        if (user) {
            const userAvatar = document.getElementById('user-avatar');
            const userDisplayName = document.getElementById('user-display-name');
            const userEmail = document.getElementById('user-email');
            
            // Obter a primeira letra do displayName ou email
            let displayName = user.displayName || user.email || 'U';
            let firstLetter = displayName.charAt(0).toUpperCase();
            
            // Atualizar o avatar com a primeira letra
            if (userAvatar) {
                userAvatar.textContent = firstLetter;
            }
            
            // Atualizar o nome de exibição
            if (userDisplayName) {
                // Se tem displayName, usa ele, senão usa o email
                if (user.displayName) {
                    userDisplayName.textContent = user.displayName;
                } else {
                    // Extrai o username do email (parte antes do @)
                    const emailUsername = user.email.split('@')[0];
                    userDisplayName.textContent = emailUsername;
                }
            }
            
            // Atualizar o email no menu
            if (userEmail) {
                userEmail.textContent = user.email;
            }
        } else {
            // Usuário não autenticado - mostrar valores padrão
            const userAvatar = document.getElementById('user-avatar');
            const userDisplayName = document.getElementById('user-display-name');
            const userEmail = document.getElementById('user-email');
            
            if (userAvatar) userAvatar.textContent = 'U';
            if (userDisplayName) userDisplayName.textContent = 'Usuário';
            if (userEmail) userEmail.textContent = 'usuario@exemplo.com';
        }
    }

    /* --- Configurar listener para mudanças de autenticação --- */
    setupAuthListener() {
        this.auth.onAuthStateChanged((user) => {
            if (user) {
                this.updateUserInfo();
            } else {
                this.updateUserInfo(); // Atualiza para mostrar "U" quando o usuário faz logout
            }
        });
    }
}

export default UIManager;