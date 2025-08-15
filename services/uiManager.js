const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
const DEBUG_MODE = isLocalhost; // Define DEBUG_MODE com base no hostname

import GPTManager from './gptManager.js';
// Removemos a importação do HistoryManager, pois suas funções foram migradas para o ChatManager
import ProfileManager from './profileManager.js';
import { logout } from './auth.js';
import { getJwt } from './auth.js';
import { showAlert } from './alertManager.js';
import { createMessageLoading, replaceWithMessageLoading, withMessageLoading, setMessageLoadingEnabled, isMessageLoadingEnabled, toggleMessageLoading } from './messageLoading.js';

class UIManager {
    constructor(apiService, stateManager, chatManager, config, auth, chatbot) {
        this.apiService = apiService;
        this.stateManager = stateManager;
        this.chatManager = chatManager; // Referência ao ChatManager (agora com funcionalidades de histórico integradas)
        this.config = config; // Armazena o CONFIG na instância
        this.auth = auth; // Instância do Firebase Auth
        this.chatbot = chatbot; // Instância do Chatbot para inicialização

        // Flag para evitar dupla inicialização do chatbot
        this.isChatbotInitialized = false;

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
        
        // Utilitário para controlar visibilidade de ações de chat
        this.setChatActionsVisible = (visible) => {
            const newChatButton = document.getElementById('new-chat-button');
            const selectGPTButton = document.getElementById('select-gpt-button');
            const startNewChatBtn = document.getElementById('start-new-chat-button');

            const displayValue = visible ? 'inline-flex' : 'none';
            if (newChatButton) newChatButton.style.setProperty('display', displayValue, 'important');
            if (selectGPTButton) selectGPTButton.style.setProperty('display', displayValue, 'important');
            if (startNewChatBtn) startNewChatBtn.style.setProperty('display', visible ? 'block' : 'none', 'important');
        };

        // Utilitário para controlar visibilidade de itens do user menu
        this.setUserMenuActionsVisible = (visible) => {
            const profileButton = document.getElementById('profile-button');
            const configButton = document.getElementById('config-button');
            const manualButton = document.getElementById('manual-button');
            const displayFlex = visible ? 'flex' : 'none';
            if (profileButton) profileButton.style.setProperty('display', displayFlex, 'important');
            if (configButton) configButton.style.setProperty('display', displayFlex, 'important');
            if (manualButton) manualButton.style.setProperty('display', displayFlex, 'important');
        };

        // Flag simples para evitar múltiplas atualizações concorrentes do perfil
        this._isUpdatingUserInfo = false;

        // Bind ação do botão "Iniciar nova conversa" (welcome screen)
        const startNewChatBtn = document.getElementById('start-new-chat-button');
        if (startNewChatBtn) {
            startNewChatBtn.addEventListener('click', async () => {
                try {
                    if (this.stateManager.selectedGPT) {
                        await this.createNewChat();
                    } else if (this.gptManager) {
                        await this.gptManager.openModal();
                    }
                } catch (e) {
                    this.showError('Não foi possível iniciar uma nova conversa.');
                }
            });
        }

        // Atualizar informações do usuário após o primeiro paint (melhor perceived perf)
        requestAnimationFrame(() => this.updateUserInfo().catch(error => {
            if (DEBUG_MODE) {
                console.error('[UIManager] Erro ao atualizar informações do usuário:', error);
            } else {
                console.warn('[UIManager] Erro ao atualizar informações do usuário');
            }
        }));

        // Adicionar listener global para capturar erros do Flowise
        this.setupFlowiseErrorListener();
    }

    /* Método auxiliar para logs */
    debugLog(...args) {
        if (DEBUG_MODE) {
            console.log(...args);
        }
    }

    setupFlowiseErrorListener() {
        // Listener para erros de rede do Flowise
        window.addEventListener('error', (event) => {
            if (event.target && event.target.src && event.target.src.includes('flowise')) {
                this.debugLog('Erro de carregamento do Flowise detectado:', event);
                this.handleFlowiseError({
                    message: 'Erro ao carregar recursos do Flowise',
                    type: 'resource_error'
                });
            }
        });

        // Listener para erros de fetch/XMLHttpRequest
        window.addEventListener('unhandledrejection', (event) => {
            if (event.reason && (
                event.reason.message?.includes('403') ||
                event.reason.message?.includes('Forbidden') ||
                event.reason.message?.includes('Não autorizado') ||
                event.reason.status === 403
            )) {
                this.debugLog('Erro de autorização não tratado detectado:', event.reason);
                this.handleFlowiseError(event.reason);
                event.preventDefault(); // Previne o erro de aparecer no console
            }
        });

        // Listener para erros específicos do console
        const originalConsoleError = console.error;
        console.error = (...args) => {
            // Chama o console.error original
            originalConsoleError.apply(console, args);
            
            // Verifica se é erro do Flowise
            const errorMessage = args.join(' ');
            if (errorMessage.includes('flowise') || 
                errorMessage.includes('403') || 
                errorMessage.includes('Forbidden') ||
                errorMessage.includes('Não autorizado') ||
                errorMessage.includes('EventSource Error')) {
                
                this.debugLog('Erro do Flowise detectado no console:', errorMessage);
                
                // Extrair informações do erro
                const error = {
                    message: errorMessage,
                    source: 'console_error',
                    timestamp: new Date().toISOString()
                };
                
                // Processar o erro
                this.handleFlowiseError(error);
            }
        };

        // Listener específico para erros do EventSource
        this.setupEventSourceErrorListener();

        this.debugLog('Listener de erros do Flowise configurado');
    }

    setupEventSourceErrorListener() {
        // Interceptar EventSource para capturar erros de conexão
        const originalEventSource = window.EventSource;
        window.EventSource = function(url, options) {
            const eventSource = new originalEventSource(url, options);
            
            eventSource.addEventListener('error', (event) => {
                this.debugLog('EventSource error detectado:', event);
                
                if (url.includes('flowise')) {
                    const error = {
                        message: 'Erro de conexão com o servidor de chat',
                        source: 'eventsource_error',
                        url: url,
                        timestamp: new Date().toISOString()
                    };
                    
                    this.handleFlowiseError(error);
                }
            });
            
            return eventSource;
        }.bind(this);
        
        this.debugLog('Listener de EventSource configurado');
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
        const manualButton = document.getElementById('manual-button');
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

        if (manualButton) {
            manualButton.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                this.closeUserMenu();
                this.openManualModal();
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

            // Verifica se é o mesmo GPT do chat anterior para evitar dupla inicialização desnecessária
            const currentSessionId = this.stateManager.currentSessionId;
            const previousChat = this.stateManager.chats.find(chat => chat.id === currentSessionId);
            
            if (previousChat && previousChat.fk_gpt_id === selectedGPT.id) {
                // Mesmo GPT, apenas reseta a flag para permitir nova inicialização
                this.debugLog('Mesmo GPT selecionado, resetando flag de inicialização...');
                this.resetChatbotInitialization();
            } else {
                // GPT diferente, reseta a flag para permitir nova inicialização
                this.debugLog('GPT diferente selecionado, resetando flag de inicialização...');
                this.resetChatbotInitialization();
            }

            // ✅ IMPORTANTE: Verificar se já existe uma sessão válida
            if (this.stateManager.currentSessionId && this.stateManager.currentSessionId !== '') {
                this.debugLog('✅ Sessão existente encontrada, mantendo:', this.stateManager.currentSessionId);
                // Não criar nova sessão se já existe uma válida
            } else {
                // Criar nova sessão apenas se não existir
                this.debugLog('Criando nova sessão...');
                const newSessionId = this.gptManager.generateSessionId();
                this.stateManager.setSessionId(newSessionId);
                this.debugLog('Nova sessão criada:', newSessionId);
            }

            // Limpar histórico injetado
            const selectedFlowiseConfig = this.stateManager.selectedGPT.flowiseConfig.flowise;
            localStorage.removeItem(`${selectedFlowiseConfig.chatflowId}_historyInjected`);
            localStorage.removeItem(`${selectedFlowiseConfig.chatflowId}_EXTERNAL`);

            // Agora, em vez de usar HistoryManager, delegamos a injeção do histórico ao ChatManager
            await this.chatManager.injectChatHistory(this.stateManager.currentSessionId, this.stateManager.selectedGPT.flowiseConfig);

            // Inicializa o chatbot, mas não adiciona o chat ainda
            await this.initializeChatbot();

            // Adiciona o chat à lista e atualiza a URL
            this.debugLog('createNewChat: adicionando chat à lista e atualizando URL:', this.stateManager.currentSessionId);
            
            // Adiciona o chat ao StateManager
            const newChat = {
                id: this.stateManager.currentSessionId,
                name: selectedGPT.name || 'Novo Chat',
                date: new Date().toISOString(),
                fk_gpt_id: selectedGPT.id
            };
            this.stateManager.addChat(newChat);
            
            // Atualiza a URL com o ID do novo chat criado e gptId
            if (this.chatManager && typeof this.chatManager.updateUrlWithChatId === 'function') {
                this.chatManager.updateUrlWithChatId(this.stateManager.currentSessionId, selectedGPT.id);
            }

            // Recarrega a lista de chats para incluir o novo chat
            if (this.chatManager && typeof this.chatManager.loadChatList === 'function') {
                await this.chatManager.loadChatList(this.chatManager.populateChatMenu.bind(this.chatManager));
            }

            // Seleciona o chat recém-criado na interface
            if (this.chatManager && typeof this.chatManager.selectChatItem === 'function') {
                this.chatManager.selectChatItem(this.stateManager.currentSessionId);
            }

            this.debugLog('Sessão criada e chatbot inicializado com sucesso.');
        } catch (error) {
            console.error('Erro ao criar nova sessão de chat:', error);
            this.showError('Erro ao criar nova sessão de chat. Consulte o console para mais detalhes.');
        }
    }

    /* --- Funções de Inicialização do Chatbot --- */
    async initializeChatbot() {
        try {
            // Verifica se o chatbot já foi inicializado para evitar dupla inicialização
            if (this.isChatbotInitialized) {
                this.debugLog('Chatbot já foi inicializado, pulando inicialização...');
                return;
            }

            // Adicione logs para depuração
            this.debugLog('Iniciando a inicialização do chatbot...');
            this.debugLog('selectedGPT:', this.stateManager.selectedGPT);

            if (!this.stateManager.selectedGPT) {
                throw new Error('Nenhum GPT selecionado.');
            }

            if (!this.stateManager.selectedGPT.flowiseConfig || !this.stateManager.selectedGPT.flowiseConfig.flowise) {
                throw new Error('flowiseConfig está indefinido ou incompleto para o GPT selecionado.');
            }

            // ✅ IMPORTANTE: NÃO criar nova sessão se já existe uma válida
            if (!this.stateManager.currentSessionId || this.stateManager.currentSessionId === '') {
                this.debugLog('Criando nova sessão...');
                const newSessionId = this.gptManager.generateSessionId();
                this.stateManager.setSessionId(newSessionId);
                this.debugLog('Nova sessão criada:', newSessionId);
            } else {
                this.debugLog('✅ Sessão existente encontrada, mantendo:', this.stateManager.currentSessionId);
            }

            // ✅ IMPORTANTE: NÃO limpar histórico se já existe uma sessão válida
            // O histórico será injetado pelo ChatManager se necessário
            if (!this.stateManager.currentSessionId || this.stateManager.currentSessionId === '') {
                const selectedFlowiseConfig = this.stateManager.selectedGPT.flowiseConfig.flowise;
                localStorage.removeItem(`${selectedFlowiseConfig.chatflowId}_historyInjected`);
                localStorage.removeItem(`${selectedFlowiseConfig.chatflowId}_EXTERNAL`);
                this.debugLog('Histórico limpo para nova sessão');
            } else {
                this.debugLog('✅ Mantendo histórico existente para sessão:', this.stateManager.currentSessionId);
            }

            // ✅ IMPORTANTE: Só injetar histórico se não existe uma sessão válida
            // Se já existe uma sessão, o histórico já foi carregado pelo ChatManager
            if (!this.stateManager.currentSessionId || this.stateManager.currentSessionId === '') {
                await this.chatManager.injectChatHistory(this.stateManager.currentSessionId, this.stateManager.selectedGPT.flowiseConfig);
            } else {
                this.debugLog('✅ Mantendo histórico existente para sessão:', this.stateManager.currentSessionId);
            }

            // Aplicar override da configuração antes de inicializar o chatbot
            await this.applyConfigOverride();

            // Verificar se a configuração foi aplicada corretamente
            const currentConfig = this.stateManager.gptConfig;
            this.debugLog('Configuração atual após override:', currentConfig);

            // Manipular visibilidade dos elementos
            const welcomeMessage = document.getElementById('welcome-message');
            const chatbotContainer = document.getElementById('chatbot-container');
            
            if (welcomeMessage) {
                welcomeMessage.classList.add('d-none');
            }
            
            // ✅ IMPORTANTE: Verificar histórico ANTES de criar o elemento do chatbot
            const selectedFlowiseConfigEarly = this.stateManager.selectedGPT.flowiseConfig.flowise;
            const historyKeyEarly = `${selectedFlowiseConfigEarly.chatflowId}_EXTERNAL`;
            const existingHistoryEarly = localStorage.getItem(historyKeyEarly);
            this.debugLog('🔍 Verificando histórico ANTES de criar elemento:', {
                key: historyKeyEarly,
                exists: !!existingHistoryEarly,
                size: existingHistoryEarly ? existingHistoryEarly.length : 0,
                preview: existingHistoryEarly ? JSON.parse(existingHistoryEarly).chatHistory?.length : 0
            });

            if (chatbotContainer) {
                chatbotContainer.classList.remove('d-none');
                // ✅ IMPORTANTE: Criar elemento DEPOIS de verificar histórico
                chatbotContainer.innerHTML = '<flowise-fullchatbot></flowise-fullchatbot>';
                this.debugLog('🔧 Elemento flowise-fullchatbot criado, histórico deve estar disponível');
            } else {
                console.error('Elemento chatbot-container não encontrado.');
                return;
            }

            const chatflowConfig = {
                sessionId: this.stateManager.currentSessionId,
                ...this.stateManager.selectedGPT.flowiseConfig,
                ...this.stateManager.gptConfig, // Usar configuração atualizada após override
                // Priorizar configurações do override se disponíveis
                ...(currentConfig.systemMessage && { systemMessage: currentConfig.systemMessage }),
                ...(currentConfig.temperature && { temperature: currentConfig.temperature }),
                ...(currentConfig.maxTokens && { maxTokens: currentConfig.maxTokens }),
                ...(currentConfig.topP && { topP: currentConfig.topP }),
                ...(currentConfig.frequencyPenalty && { frequencyPenalty: currentConfig.frequencyPenalty }),
                ...(currentConfig.presencePenalty && { presencePenalty: currentConfig.presencePenalty }),
            };

            this.debugLog('Chatflow Config (após override):', chatflowConfig);
            this.debugLog('Configuração completa do GPT:', this.stateManager.gptConfig);
            this.debugLog('Configuração flowise do GPT:', this.stateManager.selectedGPT.flowiseConfig);
            this.debugLog('Configurações específicas aplicadas:', {
                systemMessage: currentConfig.systemMessage,
                temperature: currentConfig.temperature,
                maxTokens: currentConfig.maxTokens,
                topP: currentConfig.topP,
                frequencyPenalty: currentConfig.frequencyPenalty,
                presencePenalty: currentConfig.presencePenalty
            });

            // ✅ IMPORTANTE: Definir selectedFlowiseConfig antes de usar
            const selectedFlowiseConfig = this.stateManager.selectedGPT.flowiseConfig.flowise;
            this.debugLog('selectedFlowiseConfig para inicialização:', selectedFlowiseConfig);

            // ✅ INICIALIZAÇÃO SIMPLES (como na página de teste que funciona)
            this.debugLog('🚀 Inicializando chatbot...');
            
            this.chatbot.initFull({
                chatflowid: selectedFlowiseConfig.chatflowId,
                apiHost: selectedFlowiseConfig.apiHost,
                chatflowConfig: chatflowConfig,
                                observersConfig: {
                    observeUserInput: (userInput) => {
                        this.debugLog('observeUserInput chamado com:', userInput);
                        // Captura o input para uso posterior
                        this.lastUserInput = userInput;
                    },
                    observeMessages: (messages) => this.logMessages(messages),
                    observeLoading: async (loading) => {
                        this.debugLog('observeLoading chamado com loading:', loading);
                        
                        if (loading && this.lastUserInput) {
                            try {
                                this.debugLog('Loading ativo, registrando chat na API após resposta do Flowise');
                                
                                // A mensagem já foi enviada para o Flowise automaticamente
                                // Agora registramos o chat na nossa API
                                const { getJwt } = await import('./auth.js');
                                const token = await getJwt();

                                // Registra o chat na nossa API
                                const chatParams = {
                                    gpt_id: this.stateManager.selectedGPT?.id,
                                    user_name: this.config.userName,
                                    user_id: this.config.userId,
                                    sessionid: this.stateManager.currentSessionId,
                                    message_content: this.lastUserInput
                                };
                                
                                this.debugLog('Registrando chat na API:', chatParams);
                                this.debugLog('apiCredentials disponíveis:', Object.keys(this.config.apiCredentials));
                                
                                // Usa endpoint dinâmico updateChat
                                if (this.config.apiCredentials.updateChat) {
                                    this.debugLog('Usando ApiService para updateChat');
                                    try {
                                        const chatResult = await this.apiService.request('updateChat', chatParams, 'POST', null, { includeParamsInQuery: true });
                                        this.debugLog('Chat registrado com sucesso via ApiService:', chatResult);
                                    } catch (error) {
                                        console.error('🔗 Erro no updateChat via ApiService:', error);
                                    }
                                } else {
                                    console.error('🔗 Configuração updateChat não encontrada nos endpoints');
                                    console.error('🔗 Endpoints disponíveis:', Object.keys(this.config.apiCredentials));
                                }
                                
                                // Limpa o input capturado após registrar
                                this.lastUserInput = null;
                                
                            } catch (error) {
                                console.error('🔗 Erro ao registrar chat na API:', error);
                            }
                        } else if (loading) {
                            this.debugLog('Loading ativo mas sem input capturado');
                        } else {
                            this.debugLog('Loading inativo, não fazendo nada');
                        }
                    },
                    // Adicionar observador de erros do Flowise
                    observeError: (error) => {
                        this.debugLog('Erro do Flowise detectado:', error);
                        this.handleFlowiseError(error);
                    }
                },
                theme: {
                    button: {
                        backgroundColor: '#212529',
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
                        buttonColor: '#212529',
                        buttonText: 'Concordo, quero iniciar o LexiDecis',
                        buttonTextColor: 'white',
                        blurredBackgroundColor: 'rgba(0, 0, 0, 0.4)',
                        backgroundColor: 'white',
                    },
                    customCSS: `
                        /* Estilo para elementos de anexo */
                        .inline-flex.items-center.h-12.max-w-max.p-2.flex-none.transition-opacity.duration-300.opacity-100.bg-\\[transparent\\].border.border-gray-300.rounded-md {
                            background-color: #212529 !important;
                            border-color: #495057 !important;
                            color: #ffffff !important;
                        }
                        
                        /* Estilo para o texto do anexo */
                        .inline-flex.items-center.h-12.max-w-max.p-2.flex-none.transition-opacity.duration-300.opacity-100.bg-\\[transparent\\].border.border-gray-300.rounded-md span {
                            color: #ffffff !important;
                        }
                        
                        /* Estilo para o ícone do anexo */
                        .inline-flex.items-center.h-12.max-w-max.p-2.flex-none.transition-opacity.duration-300.opacity-100.bg-\\[transparent\\].border.border-gray-300.rounded-md svg {
                            stroke: #ffffff !important;
                        }
                        
                        /* Estilo para sugestões de pergunta (starter prompts) */
                        .chatbot-host-bubble {
                            background-color: #212529 !important;
                            color: #ffffff !important;
                            border: none !important;
                        }
                        
                        .chatbot-host-bubble:hover {
                            background-color: #343a40 !important;
                        }
                        
                        /* Estilo para botões de copiar e feedback */
                        .chatbot-button {
                            background-color: transparent !important;
                            border: none !important;
                            color: #ffffff !important;
                        }
                        
                        .chatbot-button:hover {
                            background-color: rgba(255, 255, 255, 0.1) !important;
                        }
                        
                        .chatbot-button svg {
                            stroke: #ffffff !important;
                        }
                        
                        /* Estilo para o título "Perguntas sugeridas" */
                        .text-sm.text-gray-700 {
                            color: #ffffff !important;
                            font-weight: 500 !important;
                            font-size: 11px !important;
                        }
                        
                        /* ===== ESTILOS PARA TABELAS ===== */
                        /* Estilo para todas as tabelas dentro do chatbot */
                        table {
                            color: #ffffff !important;
                            border-color: #495057 !important;
                        }
                        
                        /* Estilo para cabeçalhos de tabela (th) */
                        table th,
                        table thead th,
                        table thead td {
                            background-color: #343a40 !important;
                            color: #ffffff !important;
                            border-color: #495057 !important;
                            font-weight: bold !important;
                        }
                        
                        /* Estilo para células de dados (td) */
                        table td,
                        table tbody td {
                            background-color: #212529 !important;
                            color: #ffffff !important;
                            border-color: #495057 !important;
                        }
                        
                        /* Estilo para linhas alternadas (striped) */
                        table tbody tr:nth-child(even) td {
                            background-color: #2d2d2d !important;
                        }
                        
                        /* Estilo para hover nas linhas da tabela */
                        table tbody tr:hover td {
                            background-color: #404040 !important;
                        }
                        
                        /* Estilo para bordas da tabela */
                        table,
                        table th,
                        table td {
                            border: 1px solid #495057 !important;
                        }
                        
                        /* Estilo para tabelas com classes Bootstrap */
                        .table {
                            color: #ffffff !important;
                        }
                        
                        .table th,
                        .table thead th {
                            background-color: #343a40 !important;
                            color: #ffffff !important;
                            border-color: #495057 !important;
                        }
                        
                        .table td,
                        .table tbody td {
                            background-color: #212529 !important;
                            color: #ffffff !important;
                            border-color: #495057 !important;
                        }
                        
                        .table-striped tbody tr:nth-child(even) td {
                            background-color: #2d2d2d !important;
                        }
                        
                        .table-bordered {
                            border-color: #495057 !important;
                        }
                        
                        .table-bordered th,
                        .table-bordered td {
                            border-color: #495057 !important;
                        }
                    `,
                    chatWindow: {
                        showTitle: true,
                        showAgentMessages: true,
                        title: this.stateManager.selectedGPT ? this.stateManager.selectedGPT.name : 'Escolha um GPT',
                        titleBackgroundColor: '#212529',
                        titleAvatarSrc: 'https://www.bhm.tec.br/images/152x152/10788698/favicon.png',
                        welcomeMessage: this.stateManager.selectedGPT ? this.stateManager.selectedGPT.description : 'Bem-vindo ao assistente',
                        errorMessage: 'Ops, reduza sua pergunta e tente novamente.',
                        backgroundColor: '#212529',
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
                          backgroundColor: '#212529',
                          textColor: '#ffffff',
                          showAvatar: false,
                        },
                        userMessage: {
                          backgroundColor: '#343a40',
                          textColor: '#ffffff',
                          showAvatar: false,
                          //avatarSrc: 'https://raw.githubusercontent.com/zahidkhawaja/langchain-chat-nextjs/main/public/usericon.png',
                        },
                        textInput: {
                          placeholder: 'Mensagem...',
                          backgroundColor: '#212529',
                          textColor: '#ffffff',
                          sendButtonColor: '#ffffff',
                          maxChars: 100000,
                          maxCharsWarningMessage: 'Você excedeu o limite de caracteres. Insira menos de 100000 caracteres.',
                          autoFocus: true,
                          sendMessageSound: true,
                          receiveMessageSound: true,
                        },
                        feedback: {
                          color: '#212529',
                        },
                        dateTimeToggle: {
                          date: true,
                          time: true,
                        },
                        footer: {
                            textColor: '#ffffff',
                            text: 'Sempre verifique as respostas - ',
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

            // Marca o chatbot como inicializado para evitar dupla inicialização
            this.isChatbotInitialized = true;
            this.debugLog('Chatbot inicializado com sucesso. Flag isChatbotInitialized definida como true.');
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

    /**
     * Envia mensagem com loading simples (padrão ChatGPT)
     * @param {string} message - Mensagem a ser enviada
     * @param {HTMLElement} targetElement - Elemento onde inserir o loading
     */
    async sendMessageWithSimpleLoading(message, targetElement) {
        if (!targetElement) return;
        
        // Substituir elemento por loading
        const loading = replaceWithMessageLoading(targetElement, {
            text: 'Enviando...',
            size: 'medium',
            showText: true
        });
        
        try {
            // Simular envio de mensagem
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            this.debugLog('Mensagem enviada com sucesso:', message);
            return true;
        } catch (error) {
            this.debugLog('Erro ao enviar mensagem:', error);
            throw error;
        } finally {
            // Restaurar elemento original
            loading.restore();
        }
    }

    /**
     * Função utilitária para enviar mensagem com loading automático
     * @param {HTMLElement} button - Botão de envio
     * @param {Function} sendAction - Função que envia a mensagem
     * @param {Object} options - Opções do loading
     */
    async sendMessageWithAutoLoading(button, sendAction, options = {}) {
        const defaultOptions = {
            text: 'Enviando...',
            size: 'medium',
            showText: true,
            ...options
        };
        
        await withMessageLoading(button, sendAction, defaultOptions);
    }

    /**
     * Função para lidar com loading de mensagem (não de chat)
     * @param {boolean} loading - Se está carregando
     * @param {HTMLElement} targetElement - Elemento onde mostrar loading
     */
    handleMessageLoading(loading, targetElement = null) {
        if (!loading) return;
        
        // Usar loading simples de mensagem, não loading de chat
        if (targetElement) {
            this.sendMessageWithSimpleLoading('Enviando mensagem...', targetElement);
        }
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
            this.debugLog('Usuário desconectado.');
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
    async updateUserInfo() {
        this.debugLog('[UIManager] updateUserInfo() chamada');
        if (this._isUpdatingUserInfo) {
            this.debugLog('[UIManager] updateUserInfo já em execução; ignorando chamada duplicada');
            return;
        }
        this._isUpdatingUserInfo = true;
        const user = this.auth.currentUser;
        
        if (user) {
            const userAvatar = document.getElementById('user-avatar');
            const userDisplayName = document.getElementById('user-display-name');
            const userEmail = document.getElementById('user-email');
            const adminButton = document.getElementById('admin-button');
            
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

            // Verificar permissões de admin e mostrar/ocultar botão
            if (adminButton) {
                this.debugLog('[UIManager] Botão admin encontrado, estado inicial:', adminButton.style.display);
                this.debugLog('[UIManager] Computed style do botão admin:', window.getComputedStyle(adminButton).display);
                try {
                    this.debugLog('[UIManager] Verificando permissões de admin...');
                    
                    // Obter o perfil do usuário da API
                    const profileResponse = await this.getUserProfile();
                    this.debugLog('[UIManager] Perfil obtido:', profileResponse);
                    
                    // A API retorna um array, então pegamos o primeiro elemento
                    const profile = Array.isArray(profileResponse) ? profileResponse[0] : profileResponse;
                    this.debugLog('[UIManager] Perfil processado:', profile);
                    this.debugLog('[UIManager] Tipo do profile:', typeof profile);
                    this.debugLog('[UIManager] Profile é array?', Array.isArray(profile));
                    this.debugLog('[UIManager] Chaves do profile:', profile ? Object.keys(profile) : 'null');
                    
                    // Verificar se o usuário tem permissão de admin
                    const hasAdminPermission = profile && profile.routes && profile.routes.includes('#admin');
                    // Permite chat para qualquer usuário provisionado (profile válido),
                    // mesmo que não tenha '#admin' ou '#chat' nas rotas.
                    const hasChatPermission = !!profile; 
                    this.debugLog('[UIManager] Routes:', profile?.routes);
                    this.debugLog('[UIManager] Has admin permission:', hasAdminPermission);
                    
                    // Teste: verificar se conseguimos manipular outros elementos
                    const profileButton = document.getElementById('profile-button');
                    const configButton = document.getElementById('config-button');
                    if (profileButton) {
                        this.debugLog('[UIManager] Teste: profile-button encontrado, estado:', profileButton.style.display);
                    }
                    if (configButton) {
                        this.debugLog('[UIManager] Teste: config-button encontrado, estado:', configButton.style.display);
                        // Teste: tentar ocultar e mostrar o botão de config para ver se funciona
                        configButton.style.setProperty('display', 'none', 'important');
                        setTimeout(() => {
                            configButton.style.setProperty('display', 'flex', 'important');
                            this.debugLog('[UIManager] Teste: config-button manipulado com sucesso');
                        }, 500);
                    }
                    
                    // Mostrar ou ocultar o botão de admin
                    if (hasAdminPermission) {
                        adminButton.style.setProperty('display', 'flex', 'important');
                        this.debugLog('[UIManager] Usuário tem permissão de admin - botão visível');
                        this.debugLog('[UIManager] Estado final do botão:', adminButton.style.display);
                        this.debugLog('[UIManager] Computed style após mudança:', window.getComputedStyle(adminButton).display);
                        
                        // Verificar se o botão ainda está visível após 1 segundo
                        setTimeout(() => {
                            this.debugLog('[UIManager] Estado do botão após 1s:', adminButton.style.display);
                            this.debugLog('[UIManager] Computed style após 1s:', window.getComputedStyle(adminButton).display);
                            if (adminButton.style.display === 'none' || window.getComputedStyle(adminButton).display === 'none') {
                                this.debugLog('[UIManager] Botão foi ocultado por outro código!');
                                // Tentar mostrar novamente
                                adminButton.style.setProperty('display', 'flex', 'important');
                            }
                        }, 1000);
                    } else {
                        adminButton.style.setProperty('display', 'none', 'important');
                        this.debugLog('[UIManager] Usuário não tem permissão de admin - botão oculto');
                    }

                    // Aplicar visibilidade das ações de chat e itens de menu conforme permissão
                    this.setChatActionsVisible(!!hasChatPermission);
                    this.setUserMenuActionsVisible(!!hasChatPermission);
                    
                    // Controle do contador de usuários ativos - só mostrar para admins
                    const activeUsersCounter = document.getElementById('active-users-counter');
                    if (activeUsersCounter) {
                        if (hasAdminPermission) {
                            activeUsersCounter.style.setProperty('display', 'flex', 'important');
                            this.debugLog('[UIManager] Usuário tem permissão de admin - contador de usuários ativos visível');
                        } else {
                            activeUsersCounter.style.setProperty('display', 'none', 'important');
                            this.debugLog('[UIManager] Usuário não tem permissão de admin - contador de usuários ativos oculto');
                        }
                    } else {
                        this.debugLog('[UIManager] Elemento active-users-counter não encontrado no DOM');
                    }
                } catch (error) {
                    // Em produção, não expor detalhes do erro para evitar brechas de segurança
                    if (DEBUG_MODE) {
                        console.error('[UIManager] Erro ao verificar permissões de admin:', error);
                    } else {
                        console.warn('[UIManager] Verificação de permissões não disponível');
                    }
                    // Em caso de erro, ocultar o botão por segurança
                    adminButton.style.setProperty('display', 'none', 'important');
                    
                    // Em caso de erro, ocultar também o contador de usuários ativos
                    const activeUsersCounter = document.getElementById('active-users-counter');
                    if (activeUsersCounter) {
                        activeUsersCounter.style.setProperty('display', 'none', 'important');
                    }

                    // Em caso de erro, ocultar ações de chat e itens do menu por segurança
                    this.setChatActionsVisible(false);
                    this.setUserMenuActionsVisible(false);
                }
            } else {
                this.debugLog('[UIManager] Botão admin-button não encontrado no DOM');
            }
        } else {
            // Usuário não autenticado - mostrar valores padrão
            const userAvatar = document.getElementById('user-avatar');
            const userDisplayName = document.getElementById('user-display-name');
            const userEmail = document.getElementById('user-email');
            const adminButton = document.getElementById('admin-button');
            
            if (userAvatar) userAvatar.textContent = 'U';
            if (userDisplayName) userDisplayName.textContent = 'Usuário';
            if (userEmail) userEmail.textContent = 'usuario@exemplo.com';
            
            // Ocultar botão de admin quando não há usuário autenticado
            if (adminButton) {
                adminButton.style.setProperty('display', 'none', 'important');
            }
            
            // Ocultar contador de usuários ativos quando não há usuário autenticado
            const activeUsersCounter = document.getElementById('active-users-counter');
            if (activeUsersCounter) {
                activeUsersCounter.style.setProperty('display', 'none', 'important');
            }

            // Sem usuário autenticado: ocultar ações de chat e itens do menu
            this.setChatActionsVisible(false);
            this.setUserMenuActionsVisible(false);
        }
    }

    /* --- Método para obter perfil do usuário da API --- */
    async getUserProfile() {
        const user = this.auth.currentUser;
        if (!user) throw new Error("Usuário não autenticado");
        
        const token = await user.getIdToken();
        
        this.debugLog('[UIManager] Fazendo requisição para obter perfil do usuário...');
        
        // Primeiro, vamos tentar obter a lista de usuários para encontrar o usuário atual
        const usersResponse = await fetch('https://webhook.power.tec.br/webhook/v1/users', {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });

        if (!usersResponse.ok) {
            const errorText = await usersResponse.text();
            throw new Error("Erro ao obter lista de usuários: " + errorText);
        }

        // Tenta parsear JSON com fallback para corpo vazio
        const usersText = await usersResponse.text();
        let usersData = [];
        if (usersText && usersText.trim().length > 0) {
            try {
                usersData = JSON.parse(usersText);
            } catch (e) {
                this.debugLog('[UIManager] users: resposta não-JSON; usando lista vazia');
                usersData = [];
            }
        }
        this.debugLog('[UIManager] Lista de usuários obtida:', usersData);
        
        // Encontrar o usuário atual na lista
        const currentUser = usersData.find(u => u.email === user.email);
        this.debugLog('[UIManager] Usuário atual encontrado:', currentUser);
        
        if (currentUser) {
            // Se encontrou o usuário, retornar com as propriedades necessárias
            return {
                id: currentUser.id,
                username: currentUser.username,
                email: currentUser.email,
                is_admin: currentUser.is_admin,
                routes: currentUser.is_admin ? ['#admin'] : [] // Se é admin, adicionar rota admin
            };
        }
        
        // Se não encontrou, tentar o endpoint original
        this.debugLog('[UIManager] Usuário não encontrado na lista, tentando endpoint original...');
        
        const response = await fetch('https://webhook.power.tec.br/webhook/lexidecis/v1/profile', {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error("Erro ao obter perfil do usuário: " + errorText);
        }

        const profileText = await response.text();
        if (!profileText || profileText.trim().length === 0) {
            this.debugLog('[UIManager] Perfil vazio retornado pela API');
            return null;
        }
        let data;
        try {
            data = JSON.parse(profileText);
        } catch (e) {
            this.debugLog('[UIManager] Perfil: resposta não-JSON');
            return null;
        }
        this.debugLog('[UIManager] Resposta bruta da API original:', data);
        this.debugLog('[UIManager] Tipo da resposta:', typeof data);
        this.debugLog('[UIManager] É array?', Array.isArray(data));
        
        return data;
    }

    /* --- Configurar listener para mudanças de autenticação --- */
    setupAuthListener() {
        this.auth.onAuthStateChanged(async (user) => {
            if (user) {
                await this.updateUserInfo();
            } else {
                await this.updateUserInfo(); // Atualiza para mostrar "U" quando o usuário faz logout
            }
        });
    }

    /* --- Abrir Modal do Manual do Usuário --- */
    openManualModal() {
        this.debugLog('[UIManager] Abrindo modal do manual do usuário...');
        
        const manualModal = document.getElementById('manualModal');
        if (manualModal) {
            const modal = new bootstrap.Modal(manualModal);
            modal.show();
            
            // Recarregar o iframe quando o modal for aberto
            manualModal.addEventListener('shown.bs.modal', () => {
                const iframe = document.getElementById('manualIframe');
                if (iframe) {
                    iframe.src = iframe.src; // Recarrega o iframe
                }
            }, { once: true }); // Executar apenas uma vez
        } else {
            this.debugLog('[UIManager] Modal do manual não encontrado no DOM');
            showAlert('Erro ao abrir o manual do usuário.', 'error');
        }
        this._isUpdatingUserInfo = false;
    }

    /* --- Método para resetar a flag de inicialização do chatbot --- */
    resetChatbotInitialization() {
        this.isChatbotInitialized = false;
        this.debugLog('Flag isChatbotInitialized resetada para false.');
    }

    /* --- Método para aplicar override da configuração --- */
    async applyConfigOverride() {
        try {
            this.debugLog('Aplicando override da configuração...');
            
            if (!this.stateManager.selectedGPT || !this.stateManager.selectedGPT.id) {
                this.debugLog('Nenhum GPT selecionado para aplicar override');
                return;
            }

            // Buscar configurações personalizadas do GPT
            const params = {
                gpt_id: this.stateManager.selectedGPT.id,
                company_name: this.config.companyName,
                user_name: this.config.userName,
                user_id: this.config.userId,
            };

            this.debugLog('Buscando configurações personalizadas com params:', params);

            const configData = await this.apiService.request('overrideConfig', params, 'GET');
            this.debugLog('Configurações personalizadas recebidas:', configData);

            if (configData && Array.isArray(configData) && configData.length > 0) {
                // Agregar todas as configurações
                const aggregatedConfig = configData.reduce((acc, current) => {
                    if (current && current.value) {
                        return {
                            ...acc,
                            ...current.value,
                            flowise: {
                                ...acc.flowise,
                                ...current.value.flowise
                            }
                        };
                    }
                    return acc;
                }, {});

                this.debugLog('Configuração agregada para override:', aggregatedConfig);

                // Aplicar a configuração no stateManager
                this.stateManager.setGPTConfig(aggregatedConfig);

                // Verificar se a configuração foi aplicada
                const flowiseConfig = this.stateManager.getFlowiseConfig();
                this.debugLog('Configuração flowise após override:', flowiseConfig);

                if (flowiseConfig && flowiseConfig.chatflowId && flowiseConfig.apiHost) {
                    this.debugLog('Override da configuração aplicado com sucesso');
                } else {
                    this.debugLog('ATENÇÃO: Configuração flowise incompleta após override');
                }
            } else {
                this.debugLog('Nenhuma configuração personalizada encontrada para override');
            }
        } catch (error) {
            this.debugLog('Erro ao aplicar override da configuração:', error);
            // Não falha a inicialização se o override falhar
        }
    }

    /* --- Outros Métodos Auxiliares --- */

    handleFlowiseError(error) {
        this.debugLog('Tratando erro do Flowise:', error);
        
        // Verificar se é erro de autenticação/autorização
        if (error && (
            error.status === 403 || 
            error.statusText === 'Forbidden' ||
            error.message === 'Não autorizado' ||
            error.message?.includes('Não autorizado') ||
            error.message?.includes('Forbidden') ||
            error.message?.includes('403') ||
            error.message?.includes('flowise') && error.message?.includes('403')
        )) {
            this.debugLog('Erro de autenticação/autorização do Flowise detectado');
            showAlert('❌ **Acesso Negado**\n\nVocê não tem permissão para usar este GPT ou sua sessão expirou.\n\n**Possíveis causas:**\n• GPT não autorizado para seu usuário\n• Sessão expirada\n• Permissões insuficientes\n\n**Solução:**\n• Faça login novamente\n• Entre em contato com o suporte', 'error');
            
            // Resetar estado e mostrar tela de seleção de GPT
            this.resetChatbotInitialization();
            this.showGPTSelectionScreen();
            
        } else if (error && (
            error.status === 500 ||
            error.status === 502 ||
            error.status === 503 ||
            error.status === 504
        )) {
            this.debugLog('Erro de servidor do Flowise detectado');
            showAlert('🔧 **Erro do Servidor**\n\nO serviço de chat está temporariamente indisponível.\n\n**Tente novamente em alguns minutos.**', 'warning');
            
        } else if (error && (
            error.message?.includes('Network') ||
            error.message?.includes('fetch') ||
            error.message?.includes('timeout')
        )) {
            this.debugLog('Erro de rede detectado');
            showAlert('🌐 **Erro de Conexão**\n\nVerifique sua conexão com a internet e tente novamente.', 'warning');
            
        } else if (error && error.source === 'console_error') {
            // Erro capturado do console
            this.debugLog('Erro do console relacionado ao Flowise:', error);
            
            if (error.message.includes('403') || error.message.includes('Forbidden')) {
                showAlert('❌ **Acesso Negado**\n\nErro de autorização detectado.\n\n**Solução:**\n• Recarregue a página\n• Faça login novamente\n• Entre em contato com o suporte', 'error');
                this.resetChatbotInitialization();
                this.showGPTSelectionScreen();
            } else {
                showAlert('⚠️ **Aviso**\n\nProblema detectado com o chat.\n\n**Detalhes:**\n' + error.message + '\n\n**Solução:**\n• Recarregue a página\n• Entre em contato com o suporte', 'warning');
            }
            
        } else if (error && error.source === 'eventsource_error') {
            // Erro específico do EventSource
            this.debugLog('Erro do EventSource do Flowise:', error);
            
            if (error.message.includes('Não autorizado') || error.message.includes('403')) {
                showAlert('❌ **Conexão Interrompida**\n\nSua conexão com o chat foi interrompida por falta de autorização.\n\n**Solução:**\n• Recarregue a página\n• Faça login novamente\n• Entre em contato com o suporte', 'error');
                this.resetChatbotInitialization();
                this.showGPTSelectionScreen();
            } else {
                showAlert('🔌 **Conexão Perdida**\n\nA conexão com o servidor de chat foi perdida.\n\n**Solução:**\n• Verifique sua internet\n• Recarregue a página\n• Entre em contato com o suporte', 'warning');
            }
            
        } else {
            this.debugLog('Erro inesperado do Flowise:', error);
            showAlert('❓ **Erro Inesperado**\n\nOcorreu um problema inesperado com o chat.\n\n**Detalhes técnicos:**\n' + (error?.message || 'Erro desconhecido') + '\n\n**Solução:**\n• Recarregue a página\n• Entre em contato com o suporte', 'error');
        }
    }

    showGPTSelectionScreen() {
        // Esconder chatbot e mostrar tela de seleção
        const chatbotContainer = document.getElementById('chatbot-container');
        const welcomeMessage = document.getElementById('welcome-message');
        
        if (chatbotContainer) {
            chatbotContainer.classList.add('d-none');
        }
        
        if (welcomeMessage) {
            welcomeMessage.classList.remove('d-none');
        }
        
        // Limpar estado selecionado
        this.stateManager.setSelectedGPT(null);
        this.stateManager.setSessionId(null);
        
        this.debugLog('Tela de seleção de GPT exibida após erro');
    }

    /**
     * Recarrega o chatbot para exibir o histórico carregado.
     * @param {string} sessionId - ID da sessão que tem histórico.
     * @returns {Promise<void>}
     */
    async reloadChatbot(sessionId = null) {
        try {
            this.debugLog('Recarregando chatbot para exibir histórico...');
            
            // ✅ IMPORTANTE: Usar a sessão que tem histórico
            if (sessionId) {
                this.debugLog('✅ Usando sessão existente com histórico:', sessionId);
                this.stateManager.setSessionId(sessionId);
            }
            
            // Verificar se o chatbot está inicializado
            if (!this.isChatbotInitialized) {
                this.debugLog('Chatbot não inicializado, inicializando...');
                await this.initializeChatbot();
                return;
            }
            
            // Tentar usar método reload se disponível
            if (this.chatbot && typeof this.chatbot.reload === 'function') {
                this.debugLog('Chamando reload() do chatbot...');
                this.chatbot.reload();
            } else {
                this.debugLog('Método reload() não disponível, destruindo e reinicializando...');
                
                // Destruir chatbot atual
                if (this.chatbot && typeof this.chatbot.destroy === 'function') {
                    this.debugLog('Destruindo chatbot atual...');
                    this.chatbot.destroy();
                }
                
                // Resetar flag
                this.isChatbotInitialized = false;
                
                // Reinicializar com a sessão que tem histórico
                this.debugLog('Reinicializando chatbot com sessão existente...');
                await this.initializeChatbot();
            }
            
            this.debugLog('Chatbot recarregado com sucesso');
            
        } catch (error) {
            this.debugLog('❌ Erro ao recarregar chatbot:', error);
            throw error;
        }
    }
}

export default UIManager;