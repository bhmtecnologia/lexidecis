const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
const DEBUG_MODE = isLocalhost; // Define DEBUG_MODE com base no hostname

import GPTManager from './gptManager.js';
// Removemos a importação do HistoryManager, pois suas funções foram migradas para o ChatManager
import ProfileManager from './profileManager.js';
import { logout } from './auth.js';
import { getJwt } from './auth.js';
import { showAlert } from './alertManager.js';
import { firebaseConfig } from '../config/firebase.config.js';
import { flowiseConfig } from '../config/flowise.config.js';
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

            // ✅ IMPORTANTE: SEMPRE criar nova sessão para novo chat
            this.debugLog('🔄 Criando nova sessão para novo chat...');
            const newSessionId = this.gptManager.generateSessionId();
            this.stateManager.setSessionId(newSessionId);
            this.debugLog('✅ Nova sessão criada:', newSessionId);

            // ✅ LIMPAR histórico anterior para garantir chat limpo
            const selectedFlowiseConfig = this.stateManager.selectedGPT.flowiseConfig.flowise;
            const chatflowId = selectedFlowiseConfig.chatflowId;
            
            // Limpar chaves relacionadas ao chatflowId
            const keysToRemove = [
                `${chatflowId}_historyInjected`,
                `${chatflowId}_EXTERNAL`
            ];
            
            keysToRemove.forEach(key => {
                if (localStorage.getItem(key)) {
                    localStorage.removeItem(key);
                    this.debugLog('🗑️ Removido do localStorage:', key);
                }
            });

            // Agora, em vez de usar HistoryManager, delegamos a injeção do histórico ao ChatManager
            await this.chatManager.injectChatHistory(this.stateManager.currentSessionId, this.stateManager.selectedGPT.flowiseConfig);

            // ✅ Inicializa o chatbot (sem criar chat fantasma)
            await this.initializeChatbot();

            // ✅ NÃO adiciona chat à lista - será criado pela API quando necessário
            this.debugLog('✅ Chatbot inicializado - chat será criado pela API quando necessário');
            
            // ✅ NÃO atualiza URL - não há chat real ainda
            // ✅ NÃO recarrega lista - não há chat para mostrar
            // ✅ NÃO seleciona chat - não há chat para selecionar

            this.debugLog('Sessão criada e chatbot inicializado com sucesso.');
        } catch (error) {
            console.error('Erro ao criar nova sessão de chat:', error);
            this.showError('Erro ao criar nova sessão de chat. Consulte o console para mais detalhes.');
        }
    }

    /**
     * 🔧 Tenta capturar input de sugestão ativa
     */
    getSuggestionInput() {
        try {
            // Procurar por elementos que podem conter sugestões ativas
            const suggestionSelectors = [
                '[data-suggestion-active]',
                '.suggestion-active',
                '[data-selected-suggestion]',
                '.selected-suggestion',
                '[aria-selected="true"]'
            ];

            for (const selector of suggestionSelectors) {
                const element = document.querySelector(selector);
                if (element && element.textContent && element.textContent.trim()) {
                    this.debugLog('🎯 Sugestão ativa encontrada:', selector);
                    return element.textContent.trim();
                }
            }

            return null;
        } catch (error) {
            this.debugLog('❌ Erro ao buscar sugestão ativa:', error);
            return null;
        }
    }

    /**
     * 🔧 Registra chat na API (versão simplificada)
     */
    async registerChatInApi(messageContent) {
        try {
            if (!messageContent || !messageContent.trim()) {
                this.debugLog('❌ registerChatInApi: messageContent vazio');
                return;
            }

            this.debugLog('🚀 Registrando chat na API:', messageContent);

            // Verificar se temos as configurações necessárias
            if (!this.config.apiCredentials?.updateChat) {
                this.debugLog('❌ Configuração updateChat não encontrada');
                return;
            }

            const { getJwt } = await import('./auth.js');
            const token = await getJwt();

            const chatParams = {
                gpt_id: this.stateManager.selectedGPT?.id,
                user_name: this.config.userName,
                user_id: this.config.userId,
                sessionid: this.stateManager.currentSessionId,
                message_content: messageContent.trim()
            };

            this.debugLog('📡 Fazendo chamada para updateChat:', chatParams);

            const chatResult = await this.apiService.request('updateChat', chatParams, 'POST', null, { includeParamsInQuery: true });
            this.debugLog('✅ Chat registrado com sucesso:', chatResult);

            return chatResult;
        } catch (error) {
            this.debugLog('❌ Erro ao registrar chat na API:', error);
            return null;
        }
    }

    /**
     * 🔧 Configurar captura de mensagens de sugestão (follow-up) do Flowise
     */
    setupSuggestionCapture() {
        try {
            this.debugLog('🎯 Configurando captura de mensagens de sugestão...');

            // Remover listeners anteriores
            if (this.suggestionListener) {
                document.removeEventListener('click', this.suggestionListener);
            }

            // Criar novo listener para mensagens de sugestão
            this.suggestionListener = (event) => {
                const target = event.target;

                // ✅ MELHORIA: Log detalhado para debug
                this.debugLog('🎯 CLIQUE DETECTADO:', {
                    tagName: target.tagName,
                    className: target.className,
                    id: target.id,
                    textContent: target.textContent?.substring(0, 50),
                    innerText: target.innerText?.substring(0, 50),
                    role: target.getAttribute('role'),
                    'data-testid': target.getAttribute('data-testid'),
                    onclick: !!target.onclick,
                    'aria-label': target.getAttribute('aria-label')
                });

                // Verificar se é uma mensagem de sugestão do Flowise (MUITO MAIS AMPLO)
                const isSuggestion = target.closest('[data-testid*="suggestion"]') ||
                                   target.closest('.suggestion-button') ||
                                   target.closest('.follow-up-button') ||
                                   target.closest('button[aria-label*="suggestion"]') ||
                                   target.closest('div[role="button"]') ||
                                   target.closest('.message-suggestion') ||
                                   target.closest('[class*="suggestion"]') ||
                                   target.closest('[class*="followup"]') ||
                                   target.closest('[class*="follow-up"]') ||
                                   target.closest('button:not([type="submit"]):not([data-bs-toggle])') ||
                                   target.closest('div[onclick]') ||
                                   target.closest('span[onclick]') ||
                                   // ✅ NOVOS: Capturar qualquer botão que pareça sugestão
                                   target.closest('button:not([type="submit"]):not([data-bs-toggle]):not([aria-label*="close"]):not([aria-label*="fechar"])') ||
                                   target.closest('div[class*="button"]') ||
                                   target.closest('div[class*="option"]') ||
                                   target.closest('div[class*="choice"]') ||
                                   target.closest('div[class*="select"]') ||
                                   target.closest('span[class*="button"]') ||
                                   target.closest('span[class*="option"]') ||
                                   target.closest('span[class*="choice"]') ||
                                   target.closest('a[class*="button"]') ||
                                   target.closest('a[class*="option"]') ||
                                   target.closest('a[class*="choice"]') ||
                                   // ✅ CAPTURAR QUALQUER ELEMENTO CLICÁVEL COM TEXTO
                                   (target.matches('button, div, span, a') && 
                                    target.textContent && 
                                    target.textContent.trim().length > 0 &&
                                    !target.closest('form') &&
                                    !target.closest('[data-bs-toggle]') &&
                                    !target.closest('[aria-label*="close"]') &&
                                    !target.closest('[aria-label*="fechar"]') &&
                                    !target.closest('.modal') &&
                                    !target.closest('.dropdown'));

                if (isSuggestion) {
                    this.debugLog('🎯 Mensagem de sugestão detectada:', target.textContent || target.innerText);

                    // Capturar o texto da sugestão
                    const suggestionText = target.textContent || target.innerText || '';
                    if (suggestionText.trim()) {
                        this.debugLog('📝 Texto da sugestão capturado:', suggestionText);

                        // Definir como lastUserInput
                        this.lastUserInput = suggestionText.trim();

                        // ✅ MELHORIA: Forçar registro na API IMEDIATAMENTE
                        this.debugLog('🚀 Forçando registro da sugestão na API...');
                        this.registerChatInApi(suggestionText.trim());

                        // Simular observeUserInput para compatibilidade
                        if (typeof this.observers?.observeUserInput === 'function') {
                            this.observers.observeUserInput(suggestionText.trim());
                        }
                    }
                } else {
                    // ✅ DEBUG: Log quando não detecta como sugestão
                    this.debugLog('❌ Clique NÃO detectado como sugestão:', {
                        tagName: target.tagName,
                        className: target.className,
                        textContent: target.textContent?.substring(0, 30)
                    });
                }
            };

            // Adicionar listener ao documento
            document.addEventListener('click', this.suggestionListener, true);
            this.debugLog('✅ Listener de sugestões configurado com sucesso');

        } catch (error) {
            this.debugLog('❌ Erro ao configurar captura de sugestões:', error);
        }
    }

    /**
     * 🔧 Configura captura alternativa de entrada do usuário
     * Método alternativo caso o observeUserInput do Flowise não funcione
     */
    setupAlternativeInputCapture() {
        this.debugLog('🔧 Configurando captura alternativa de entrada do usuário...');

        // Usar setTimeout para garantir que o DOM do chatbot seja carregado
        setTimeout(() => {
            try {
                // Procurar pelo campo de input do chatbot
                const inputSelectors = [
                    'textarea[data-testid="chatbot-input"]',
                    'input[placeholder*="Digite" i]',
                    'input[placeholder*="mensagem" i]',
                    'textarea[placeholder*="Digite" i]',
                    'textarea[placeholder*="mensagem" i]',
                    '.chat-input textarea',
                    '.chat-input input',
                    'flowise-fullchatbot textarea',
                    'flowise-fullchatbot input'
                ];

                let inputElement = null;
                for (const selector of inputSelectors) {
                    inputElement = document.querySelector(selector);
                    if (inputElement) {
                        this.debugLog('✅ Campo de input encontrado com seletor:', selector);
                        break;
                    }
                }

                if (inputElement) {
                    this.debugLog('🎯 Configurando listener no campo de input encontrado');

                    // Remover listener anterior se existir
                    if (this.inputListener) {
                        inputElement.removeEventListener('input', this.inputListener);
                        inputElement.removeEventListener('change', this.inputListener);
                    }

                    // Criar novo listener
                    this.inputListener = (event) => {
                        const value = event.target.value;
                        if (value && value.trim() && value !== this.lastUserInput) {
                            this.debugLog('🎯 [ALTERNATIVO] Input capturado:', value);
                            this.lastUserInput = value;
                        }
                    };

                    // Adicionar listeners
                    inputElement.addEventListener('input', this.inputListener);
                    inputElement.addEventListener('change', this.inputListener);

                    this.debugLog('✅ Listener alternativo configurado com sucesso');
                } else {
                    this.debugLog('⚠️ Campo de input não encontrado, tentando novamente em 2 segundos...');

                    // Tentar novamente em 2 segundos
                    setTimeout(() => {
                        this.setupAlternativeInputCapture();
                    }, 2000);
                }
            } catch (error) {
                this.debugLog('❌ Erro ao configurar captura alternativa:', error);
            }
        }, 1000);
    }

    /**
     * 🔧 Gera um seletor CSS para um elemento
     */
    getSelectorForElement(element) {
        if (element.id) {
            return `#${element.id}`;
        }
        if (element.className) {
            return `${element.tagName.toLowerCase()}.${element.className.split(' ').join('.')}`;
        }
        if (element.name) {
            return `${element.tagName.toLowerCase()}[name="${element.name}"]`;
        }
        return `${element.tagName.toLowerCase()}`;
    }

    /**
     * 🔧 Tenta capturar input alternativo do DOM
     */
    getAlternativeInput() {
        try {
            const inputSelectors = [
                'textarea[data-testid="chatbot-input"]',
                'input[placeholder*="Digite" i]',
                'input[placeholder*="mensagem" i]',
                'textarea[placeholder*="Digite" i]',
                'textarea[placeholder*="mensagem" i]',
                '.chat-input textarea',
                '.chat-input input',
                'flowise-fullchatbot textarea',
                'flowise-fullchatbot input'
            ];

            for (const selector of inputSelectors) {
                const element = document.querySelector(selector);
                if (element && element.value && element.value.trim()) {
                    this.debugLog('🎯 Input alternativo encontrado via seletor:', selector);
                    return element.value.trim();
                }
            }

            // Tentar encontrar qualquer textarea ou input dentro do chatbot
            const chatbotElement = document.querySelector('flowise-fullchatbot');
            if (chatbotElement) {
                const inputs = chatbotElement.querySelectorAll('textarea, input');
                for (const input of inputs) {
                    if (input.value && input.value.trim()) {
                        this.debugLog('🎯 Input alternativo encontrado dentro do chatbot');
                        return input.value.trim();
                    }
                }
            }

            return null;
        } catch (error) {
            this.debugLog('❌ Erro ao buscar input alternativo:', error);
            return null;
        }
    }

    /**
     * 🔧 Handler separado para registro de chat (pode ser chamado recursivamente)
     */
    async handleChatRegistration() {
        if (!this.lastUserInput) {
            this.debugLog('❌ handleChatRegistration chamado sem lastUserInput');
            return;
        }

        try {
            this.debugLog('🚀 Iniciando registro de chat alternativo...');
            this.debugLog('📋 Dados para registro alternativo:', {
                gpt_id: this.stateManager.selectedGPT?.id,
                user_name: this.config.userName,
                user_id: this.config.userId,
                sessionid: this.stateManager.currentSessionId,
                message_content: this.lastUserInput,
                message_length: this.lastUserInput?.length
            });

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

            this.debugLog('Registrando chat alternativo na API:', chatParams);
            this.debugLog('apiCredentials disponíveis:', Object.keys(this.config.apiCredentials));

            // ✅ CORREÇÃO: Volta para updateChat (API correta)
            if (this.config.apiCredentials.updateChat) {
                this.debugLog('✅ Usando ApiService para updateChat (alternativo)');
                this.debugLog('📡 Fazendo chamada alternativa para:', this.config.apiCredentials.updateChat);

                try {
                    const chatResult = await this.apiService.request('updateChat', chatParams, 'POST', null, { includeParamsInQuery: true });
                    this.debugLog('✅ Chat registrado com sucesso via updateChat (alternativo):', chatResult);
                } catch (error) {
                    console.error('❌ Erro no updateChat alternativo via ApiService:', error);
                    console.error('❌ Detalhes do erro alternativo:', error.message);
                    console.error('❌ Stack trace alternativo:', error.stack);
                }
            } else {
                console.error('❌ Configuração updateChat não encontrada nos endpoints (alternativo)');
                console.error('❌ Endpoints disponíveis alternativo:', Object.keys(this.config.apiCredentials));
            }

            // Limpa o input capturado após registrar
            this.lastUserInput = null;

        } catch (error) {
            console.error('🔗 Erro ao registrar chat alternativo na API:', error);
        }
    }

    /* --- Funções de Inicialização do Chatbot --- */
    async initializeChatbot() {
        try {
            // ✅ Permitir reinicialização do chatbot quando necessário
            this.debugLog('Iniciando inicialização do chatbot...');

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

            // 🔧 ADICIONAL: Configurar listener alternativo para capturar entrada do usuário
            this.setupAlternativeInputCapture();

            // 🔧 ADICIONAL: Configurar captura de mensagens de sugestão
            this.setupSuggestionCapture();

            this.chatbot.initFull({
                chatflowid: selectedFlowiseConfig.chatflowId,
                apiHost: selectedFlowiseConfig.apiHost,
                chatflowConfig: chatflowConfig,
                                observersConfig: {
                    observeUserInput: (userInput) => {
                        this.debugLog('🔍 observeUserInput chamado com:', userInput);

                        // ✅ SIMPLIFICAÇÃO: Apenas armazenar o input, a API será chamada pelo observeLoading
                        if (userInput && userInput.trim()) {
                            this.lastUserInput = userInput.trim();
                            this.debugLog('📝 Input armazenado para processamento posterior:', this.lastUserInput);
                        } else {
                            this.debugLog('📝 Input vazio recebido');
                        }
                    },
                    observeMessages: (messages) => {
                        this.debugLog('📨 observeMessages chamado:', messages?.length || 0, 'mensagens');
                        this.logMessages(messages);
                    },
                    observeLoading: async (loading) => {
                        this.debugLog('🔄 observeLoading chamado com loading:', loading);

                        if (loading) {
                            this.debugLog('🚀 LOADING ATIVADO - Iniciando captura de input e registro na API');

                            // ✅ SIMPLIFICAÇÃO: Sempre tentar capturar input quando loading=true
                            let capturedInput = this.lastUserInput;

                            // Se não temos lastUserInput, tentar capturar
                            if (!capturedInput) {
                                this.debugLog('🔍 Não há lastUserInput, tentando capturar...');
                                capturedInput = this.getAlternativeInput();

                                if (!capturedInput) {
                                    this.debugLog('🔍 Tentando captura de sugestão...');
                                    capturedInput = this.getSuggestionInput();
                                }
                            }

                            if (capturedInput) {
                                this.debugLog('✅ Input capturado:', capturedInput);
                                await this.registerChatInApi(capturedInput);
                            } else {
                                this.debugLog('❌ Nenhum input capturado quando loading=true');
                                this.debugLog('🔍 Estado atual:', {
                                    lastUserInput: this.lastUserInput,
                                    hasAlternativeInput: !!this.getAlternativeInput(),
                                    hasSuggestionInput: !!this.getSuggestionInput()
                                });
                            }

                            return;
                        }

                        // Loading desativado
                        if (!loading) {
                            this.debugLog('⏸️ Loading desativado, limpando lastUserInput');
                            this.lastUserInput = null;
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

// 🔧 DEBUG: Função global para testar JWT
window.testJWT = async () => {
    try {
        console.log('🔐 TESTANDO JWT...');

        // Importar função getJwt
        const { getJwt, auth } = await import('./auth.js');

        // Verificar se usuário está logado
        const user = auth.currentUser;
        console.log('👤 Usuário atual:', user ? {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName
        } : 'NÃO LOGADO');

        if (!user) {
            console.error('❌ ERRO: Usuário não está logado!');
            console.log('💡 Faça login primeiro antes de testar a API');
            return;
        }

        // Obter JWT
        console.log('🔑 Obtendo JWT...');
        const jwt = await getJwt();
        console.log('✅ JWT obtido:', jwt.substring(0, 50) + '...');
        console.log('📏 Tamanho do JWT:', jwt.length);

        // Testar se JWT funciona na API
        const testUrl = 'https://webhook.power.tec.br/webhook/lexidecis/chats';
        const testData = {
            gpt_id: 'test-jwt',
            user_name: user.email,
            user_id: user.uid,
            sessionid: 'test-session-jwt',
            message_content: 'Teste de JWT válido',
            timestamp: new Date().toISOString()
        };

        console.log('📡 Testando API com JWT válido...');
        const response = await fetch(testUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${jwt}`
            },
            body: JSON.stringify(testData)
        });

        console.log('📡 Status da resposta:', response.status);
        if (response.ok) {
            console.log('✅ JWT FUNCIONANDO! API respondeu com sucesso');
        } else {
            const errorText = await response.text();
            console.log('❌ JWT pode estar expirado ou inválido:', errorText);
        }

    } catch (error) {
        console.error('❌ Erro ao testar JWT:', error);
    }
};

// 🔧 DEBUG: Função global para testar API diretamente
window.testDirectAPI = async () => {
    const testUrl = 'https://webhook.power.tec.br/webhook/lexidecis/chats';
    console.log('✅ API CONFIRMADA FUNCIONANDO!');
    console.log('📡 URL correta: https://webhook.power.tec.br/webhook/lexidecis/chats');
    console.log('🔧 Status: 200 OK - Webhook está ativo e registrado');
    const testData = {
        gpt_id: 'test-gpt-123',
        user_name: 'Test User',
        user_id: 'test-user-123',
        sessionid: 'test-session-123',
        message_content: 'Mensagem de teste direto via fetch',
        timestamp: new Date().toISOString()
    };

    console.log('🧪 TESTANDO API DIRETA...');
    console.log('📡 URL:', testUrl);
    console.log('📋 Dados:', testData);

    try {
        const response = await fetch(testUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer test-token'
            },
            body: JSON.stringify(testData)
        });

        console.log('📡 Status da resposta:', response.status);
        console.log('📡 Headers da resposta:', Object.fromEntries(response.headers.entries()));

        const responseText = await response.text();
        console.log('📋 Corpo da resposta:', responseText);

        if (response.ok) {
            console.log('✅ API respondeu com sucesso!');
        } else {
            console.log('❌ API retornou erro:', response.status);
        }

    } catch (error) {
        console.error('❌ Erro na requisição:', error);
        console.error('❌ Detalhes do erro:', error.message);
    }
};

// 🔧 DEBUG: Função global para testar múltiplas URLs
window.testMultipleURLs = async () => {
    const urlsToTest = [
        'https://webhook.power.tec.br/webhook/lexidecis/chats', // ✅ CONFIRMADO FUNCIONANDO
        'https://webhook.power.tec.br/webhook/lexidecis/v2/chats',
        'https://n8n.power.tec.br/webhook-test/lexidecis/chats', // ❌ 404
        'https://n8n.power.tec.br/webhook/lexidecis/chats'
    ];

    const testData = {
        gpt_id: 'test-multi-url',
        user_name: 'Test User',
        user_id: 'test-user-multi',
        sessionid: 'test-session-multi',
        message_content: 'Teste múltiplas URLs - ' + new Date().toLocaleString(),
        timestamp: new Date().toISOString()
    };

    console.log('🔄 TESTANDO MÚLTIPLAS URLs POSSÍVEIS...');

    for (const url of urlsToTest) {
        try {
            console.log(`\n📡 Testando: ${url}`);
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer test-token'
                },
                body: JSON.stringify(testData)
            });

            console.log(`✅ Status: ${response.status}`);
            if (response.ok) {
                const responseText = await response.text();
                console.log(`📋 Resposta: ${responseText}`);
                console.log(`🎉 URL FUNCIONANDO: ${url}`);
                return url; // Retorna a primeira URL que funciona
            } else {
                console.log(`❌ Erro: ${response.status}`);
            }
        } catch (error) {
            console.log(`❌ Erro de conexão: ${error.message}`);
        }
    }

    console.log('\n❌ Nenhuma URL funcionou. Verifique:');
    console.log('1. Se o workflow N8N está ativo');
    console.log('2. Se o webhook está corretamente configurado');
    console.log('3. Se o domínio está correto');
};

// 🔧 DEBUG: Função para analisar performance do Flowise
window.analyzeFlowisePerformance = () => {
    console.log('🔍 ANALISANDO PERFORMANCE DO FLOWISE...');

    // Verificar configuração atual
    const uiManager = window.uiManagerInstance;
    const currentConfig = uiManager?.stateManager?.gptConfig;

    console.log('📊 Configuração atual do GPT:');
    console.log('- Temperature:', currentConfig?.temperature);
    console.log('- Max Tokens:', currentConfig?.maxTokens);
    console.log('- Top P:', currentConfig?.topP);
    console.log('- Model:', currentConfig?.name);

    console.log('\n⚙️ Configuração do Flowise:');
    console.log('- API Host:', uiManager?.stateManager?.selectedGPT?.flowiseConfig?.flowise?.apiHost);
    console.log('- Chatflow ID:', uiManager?.stateManager?.selectedGPT?.flowiseConfig?.flowise?.chatflowId);

    // Medir tempo de resposta
    console.log('\n⏱️ Para medir tempo de resposta:');
    console.log('1. Execute: window.startPerformanceTimer()');
    console.log('2. Faça uma pergunta no chat');
    console.log('3. Quando receber resposta, execute: window.stopPerformanceTimer()');
};

// 🔧 DEBUG: Timer de performance
window.startPerformanceTimer = () => {
    window.performanceStart = Date.now();
    console.log('⏱️ Timer de performance iniciado...');
};

window.stopPerformanceTimer = () => {
    if (!window.performanceStart) {
        console.log('❌ Timer não foi iniciado. Execute window.startPerformanceTimer() primeiro.');
        return;
    }

    const elapsed = Date.now() - window.performanceStart;
    console.log(`⏱️ Tempo total: ${elapsed}ms (${(elapsed/1000).toFixed(2)}s)`);

    if (elapsed < 2000) {
        console.log('✅ Performance EXCELENTE (< 2s)');
    } else if (elapsed < 5000) {
        console.log('⚠️ Performance RAZOÁVEL (2-5s)');
    } else {
        console.log('❌ Performance LENTA (> 5s)');
        console.log('💡 Possíveis causas:');
        console.log('   - Modelo muito complexo');
        console.log('   - Temperature muito baixa');
        console.log('   - Max tokens muito alto');
        console.log('   - Problemas de rede');
        console.log('   - Workflow do Flowise mal otimizado');
    }

    window.performanceStart = null;
};

// 🔧 DEBUG: Verificar latência de rede
window.testNetworkLatency = async () => {
    console.log('🌐 TESTANDO LATÊNCIA DE REDE...');

    const urls = [
        'https://flowise.power.tec.br/ping',
        'https://webhook.power.tec.br/webhook/lexidecis/endpoints',
        'https://firestore.googleapis.com'
    ];

    for (const url of urls) {
        try {
            const start = Date.now();
            const response = await fetch(url, { method: 'GET' });
            const latency = Date.now() - start;

            console.log(`📡 ${url}: ${latency}ms - ${response.status}`);

            if (latency > 1000) {
                console.log(`⚠️ ALTA LATÊNCIA para ${url}`);
            }
        } catch (error) {
            console.log(`❌ ERRO em ${url}: ${error.message}`);
        }
    }
};

// 🔧 DEBUG: Otimizar configurações
window.optimizeFlowiseConfig = () => {
    console.log('⚡ OTIMIZANDO CONFIGURAÇÕES DO FLOWISE...');

    const uiManager = window.uiManagerInstance;
    if (!uiManager?.stateManager?.gptConfig) {
        console.log('❌ GPT não configurado');
        return;
    }

    const config = uiManager.stateManager.gptConfig;

    console.log('📊 Configuração ATUAL:');
    console.log(`   Temperature: ${config.temperature}`);
    console.log(`   Max Tokens: ${config.maxTokens}`);
    console.log(`   Top P: ${config.topP}`);

    // Sugestões de otimização
    console.log('\n🎯 SUGESTÕES DE OTIMIZAÇÃO:');

    if (config.temperature > 0.7) {
        console.log('⚠️ Temperature alta pode tornar respostas mais lentas');
        console.log('💡 Recomendado: 0.3-0.7 para melhor performance');
    }

    if (config.maxTokens > 1000) {
        console.log('⚠️ Max Tokens alto pode tornar respostas mais lentas');
        console.log('💡 Recomendado: 500-800 tokens para melhor performance');
    }

    if (!config.topP || config.topP > 0.9) {
        console.log('⚠️ Top P alto pode tornar respostas mais lentas');
        console.log('💡 Recomendado: 0.7-0.9 para melhor performance');
    }

    console.log('\n🚀 CONFIGURAÇÃO OTIMIZADA SUGERIDA:');
    console.log('   Temperature: 0.5');
    console.log('   Max Tokens: 600');
    console.log('   Top P: 0.8');
    console.log('   Frequency Penalty: 0.1');
    console.log('   Presence Penalty: 0.1');

    console.log('\n📝 Para aplicar: Configure essas opções no painel admin do GPT');
};

// 🔧 DEBUG: Testar Flowise diretamente
window.testFlowiseDirectly = async () => {
    console.log('🔬 TESTANDO FLOWISE DIRETAMENTE...');

    try {
        const uiManager = window.uiManagerInstance;
        const flowiseConfig = uiManager?.stateManager?.selectedGPT?.flowiseConfig?.flowise;

        if (!flowiseConfig) {
            console.log('❌ Configuração do Flowise não encontrada');
            return;
        }

        const apiHost = flowiseConfig.apiHost;
        const chatflowId = flowiseConfig.chatflowId;

        console.log(`📡 API Host: ${apiHost}`);
        console.log(`🆔 Chatflow ID: ${chatflowId}`);

        // 1. Testar ping
        console.log('\n🏓 Testando PING do Flowise...');
        const pingUrl = `${apiHost}/ping`;
        const pingStart = Date.now();
        const pingResponse = await fetch(pingUrl);
        const pingTime = Date.now() - pingStart;

        console.log(`✅ Ping: ${pingTime}ms - Status: ${pingResponse.status}`);

        if (pingResponse.status !== 200) {
            console.log('❌ Flowise não está respondendo ao ping');
            return;
        }

        // 2. Testar configuração do chatflow
        console.log('\n🔧 Testando configuração do Chatflow...');
        const configUrl = `${apiHost}/api/v1/public-chatbotConfig/${chatflowId}`;
        const configStart = Date.now();
        const configResponse = await fetch(configUrl);
        const configTime = Date.now() - configStart;

        console.log(`✅ Config: ${configTime}ms - Status: ${configResponse.status}`);

        if (configResponse.status === 200) {
            const configData = await configResponse.json();
            console.log('📊 Configuração recebida:', {
                name: configData.name,
                type: configData.type,
                hasApiConfig: !!configData.apiConfig
            });
        }

        // 3. Testar chat streaming (simulação)
        console.log('\n💬 Testando chat streaming...');
        const chatUrl = `${apiHost}/api/v1/chatflows-streaming/${chatflowId}`;

        const testMessage = {
            question: "Olá, teste de performance",
            history: [],
            overrideConfig: {
                sessionId: "test-session-" + Date.now()
            }
        };

        const chatStart = Date.now();
        const chatResponse = await fetch(chatUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${flowiseConfig.token || 'test-token'}`
            },
            body: JSON.stringify(testMessage)
        });
        const chatTime = Date.now() - chatStart;

        console.log(`✅ Chat: ${chatTime}ms - Status: ${chatResponse.status}`);

        if (chatResponse.status === 200) {
            console.log('🎉 Flowise está funcionando perfeitamente!');
            console.log(`⚡ Performance geral: ${pingTime + configTime + chatTime}ms`);
        } else {
            const errorText = await chatResponse.text();
            console.log('❌ Erro no chat:', errorText);
        }

        // 4. Verificar se há problemas de cache
        console.log('\n💾 Verificando cache do navegador...');
        const cacheKeys = Object.keys(localStorage).filter(key =>
            key.includes(chatflowId) || key.includes('flowise')
        );

        console.log(`📦 Chaves relacionadas no localStorage: ${cacheKeys.length}`);
        cacheKeys.forEach(key => {
            const value = localStorage.getItem(key);
            console.log(`   - ${key}: ${value?.length || 0} chars`);
        });

    } catch (error) {
        console.log('❌ Erro ao testar Flowise:', error.message);
        console.log('💡 Possíveis causas:');
        console.log('   - Flowise não está rodando');
        console.log('   - Problemas de CORS');
        console.log('   - Token inválido');
        console.log('   - Rede bloqueada');
    }
};

// 🔧 DEBUG: Verificar saúde geral do sistema
window.checkSystemHealth = async () => {
    console.log('🏥 VERIFICAÇÃO DE SAÚDE DO SISTEMA');
    console.log('==================================');

    const checks = [
        { name: 'Flowise Ping', url: `${flowiseConfig.apiHost}/ping`, critical: true },
        { name: 'Webhook API', url: 'https://webhook.power.tec.br/webhook/lexidecis/endpoints', critical: true },
        { name: 'Firebase Auth', url: `https://www.googleapis.com/identitytoolkit/v3/relyingparty/getProjectConfig?key=${firebaseConfig.apiKey}`, critical: false },
        { name: 'Firestore', url: 'https://firestore.googleapis.com/google.firestore.v1.Firestore/Write/channel', critical: false }
    ];

    let allHealthy = true;

    for (const check of checks) {
        try {
            const start = Date.now();
            const response = await fetch(check.url, {
                method: 'GET',
                mode: check.critical ? 'cors' : 'no-cors'
            });
            const time = Date.now() - start;

            const status = check.critical ?
                (response.ok ? '✅' : '❌') :
                (response.type === 'opaque' ? '✅' : '⚠️');

            console.log(`${status} ${check.name}: ${time}ms`);

            if (check.critical && !response.ok && response.type !== 'opaque') {
                allHealthy = false;
            }

        } catch (error) {
            console.log(`❌ ${check.name}: ${error.message}`);
            if (check.critical) allHealthy = false;
        }
    }

    console.log('\n📊 RESULTADO GERAL:');
    if (allHealthy) {
        console.log('✅ SISTEMA SAUDÁVEL - Todos os serviços críticos funcionando');
    } else {
        console.log('❌ PROBLEMAS DETECTADOS - Verificar serviços críticos');
        console.log('💡 Execute: window.testFlowiseDirectly() para diagnóstico detalhado');
    }

    return allHealthy;
};

// 🔧 DEBUG: Diagnóstico de erro 403 do Flowise
window.diagnoseFlowise403Error = async () => {
    console.log('🚫 DIAGNÓSTICO DE ERRO 403 - FLOWISE');
    console.log('====================================');

    try {
        const uiManager = window.uiManagerInstance;
        const selectedGPT = uiManager?.stateManager?.selectedGPT;

        console.log('🔍 GPT SELECIONADO:');
        console.log(`   ID: ${selectedGPT?.id}`);
        console.log(`   Nome: ${selectedGPT?.name}`);
        console.log(`   Chatflow ID: ${selectedGPT?.flowiseConfig?.flowise?.chatflowId}`);
        console.log(`   API Host: ${selectedGPT?.flowiseConfig?.flowise?.apiHost}`);
        console.log(`   Token: ${selectedGPT?.flowiseConfig?.flowise?.token ? 'Presente' : 'AUSENTE'}`);

        // Testar endpoints críticos
        console.log('\n🔧 TESTANDO ENDPOINTS:');

        const endpoints = [
            {
                name: 'Prediction API',
                url: `${selectedGPT?.flowiseConfig?.flowise?.apiHost}/api/v1/prediction/${selectedGPT?.flowiseConfig?.flowise?.chatflowId}`,
                method: 'POST'
            },
            {
                name: 'Chatflow Config',
                url: `${selectedGPT?.flowiseConfig?.flowise?.apiHost}/api/v1/public-chatbotConfig/${selectedGPT?.flowiseConfig?.flowise?.chatflowId}`,
                method: 'GET'
            },
            {
                name: 'Chat Streaming',
                url: `${selectedGPT?.flowiseConfig?.flowise?.apiHost}/api/v1/chatflows-streaming/${selectedGPT?.flowiseConfig?.flowise?.chatflowId}`,
                method: 'GET'
            }
        ];

        for (const endpoint of endpoints) {
            try {
                console.log(`\n📡 Testando ${endpoint.name}...`);
                const response = await fetch(endpoint.url, {
                    method: endpoint.method,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${selectedGPT?.flowiseConfig?.flowise?.token || 'test-token'}`
                    }
                });

                console.log(`   Status: ${response.status} ${response.statusText}`);
                console.log(`   Headers:`, Object.fromEntries(response.headers.entries()));

                if (response.status === 403) {
                    console.log('   ❌ ERRO 403: Forbidden - Problema de autorização!');
                    console.log('   💡 POSSÍVEIS CAUSAS:');
                    console.log('      - Token inválido ou expirado');
                    console.log('      - Chatflow não autorizado para este usuário');
                    console.log('      - Permissões insuficientes no Flowise');
                    console.log('      - CORS ou política de segurança');
                }

            } catch (error) {
                console.log(`   ❌ ERRO: ${error.message}`);
            }
        }

        // Verificar configuração do GPT
        console.log('\n⚙️ CONFIGURAÇÃO DO GPT:');
        const gptConfig = uiManager?.stateManager?.gptConfig;
        console.log(`   Temperature: ${gptConfig?.temperature}`);
        console.log(`   Max Tokens: ${gptConfig?.maxTokens}`);
        console.log(`   Model: ${gptConfig?.name}`);

        // Verificar localStorage
        console.log('\n💾 LOCALSTORAGE:');
        const keys = Object.keys(localStorage).filter(key =>
            key.includes('flowise') || key.includes('gpt') || key.includes('session')
        );
        console.log(`   Chaves relacionadas: ${keys.length}`);
        keys.forEach(key => {
            const value = localStorage.getItem(key);
            console.log(`   - ${key}: ${value?.length || 0} chars`);
        });

        // Recomendações
        console.log('\n🎯 RECOMENDAÇÕES PARA CORREÇÃO:');
        console.log('   1. ✅ Verificar se o token do Flowise está válido');
        console.log('   2. ✅ Confirmar se o chatflow está público no Flowise');
        console.log('   3. ✅ Verificar permissões do usuário no Flowise');
        console.log('   4. ✅ Testar com outro chatflow ID');
        console.log('   5. ✅ Limpar cache e tentar novamente');
        console.log('   6. ✅ Verificar se o Flowise está rodando corretamente');

        console.log('\n🛠️ SOLUÇÕES IMEDIATAS:');
        console.log('   - Execute: window.testFlowiseDirectly()');
        console.log('   - Execute: window.checkSystemHealth()');
        console.log('   - Limpe localStorage: localStorage.clear()');

    } catch (error) {
        console.log('❌ Erro no diagnóstico:', error.message);
    }
};

// 🔧 DEBUG: Limpar cache e reinicializar
window.forceFlowiseReset = () => {
    console.log('🔄 FORÇANDO RESET COMPLETO DO FLOWISE...');

    try {
        // 1. Limpar localStorage relacionado ao Flowise
        const keysToRemove = Object.keys(localStorage).filter(key =>
            key.includes('flowise') ||
            key.includes('gpt') ||
            key.includes('session') ||
            key.includes('chat')
        );

        console.log(`🗑️ Removendo ${keysToRemove.length} chaves do localStorage...`);
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
            console.log(`   - Removido: ${key}`);
        });

        // 2. Limpar sessionStorage
        console.log('🗑️ Limpando sessionStorage...');
        sessionStorage.clear();

        // 3. Limpar cache do Service Worker
        if ('caches' in window) {
            console.log('🗑️ Limpando cache do Service Worker...');
            caches.keys().then(names => {
                names.forEach(name => {
                    caches.delete(name);
                    console.log(`   - Cache removido: ${name}`);
                });
            });
        }

        // 4. Resetar estado da aplicação
        if (window.uiManagerInstance) {
            console.log('🔄 Resetando estado da aplicação...');
            window.uiManagerInstance.stateManager.reset();
        }

        console.log('✅ Reset completo realizado!');
        console.log('🔄 Recarregue a página para aplicar as mudanças.');

    } catch (error) {
        console.log('❌ Erro durante o reset:', error.message);
    }
};

// 🔧 DEBUG: Testar token do Flowise
window.testFlowiseToken = async () => {
    console.log('🔐 TESTANDO TOKEN DO FLOWISE...');

    try {
        const uiManager = window.uiManagerInstance;
        const token = uiManager?.stateManager?.selectedGPT?.flowiseConfig?.flowise?.token;
        const apiHost = uiManager?.stateManager?.selectedGPT?.flowiseConfig?.flowise?.apiHost;
        const chatflowId = uiManager?.stateManager?.selectedGPT?.flowiseConfig?.flowise?.chatflowId;

        if (!token) {
            console.log('❌ Token não encontrado!');
            console.log('💡 SOLUÇÃO: Selecione um GPT primeiro ou verifique configuração no painel admin');
            return;
        }

        console.log(`📡 API Host: ${apiHost}`);
        console.log(`🆔 Chatflow ID: ${chatflowId}`);
        console.log(`🔑 Token presente: ${token ? 'Sim' : 'Não'}`);
        console.log(`🔑 Tamanho do token: ${token?.length || 0} caracteres`);

        // Testar endpoints com o token
        const testUrl = `${apiHost}/api/v1/public-chatbotConfig/${chatflowId}`;

        console.log(`\n🔧 Testando endpoint: ${testUrl}`);

        const response = await fetch(testUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`📊 Resposta: ${response.status} ${response.statusText}`);

        if (response.ok) {
            const data = await response.json();
            console.log('✅ Token válido! Configuração recebida.');
            console.log('📋 Dados:', data);
        } else {
            console.log('❌ Token inválido ou problema de autorização!');
            console.log('📋 Headers de resposta:', Object.fromEntries(response.headers.entries()));

            if (response.status === 403) {
                console.log('\n💡 SOLUÇÕES PARA ERRO 403:');
                console.log('   1. Verificar se o token está correto no painel admin');
                console.log('   2. Confirmar se o chatflow está público');
                console.log('   3. Verificar permissões do usuário no Flowise');
                console.log('   4. Regenerar token no Flowise se necessário');
            }
        }

    } catch (error) {
        console.log('❌ Erro ao testar token:', error.message);
    }
};

// 🔧 DEBUG: Solução rápida para erro 403
window.fixFlowise403Error = async () => {
    console.log('🚀 SOLUÇÃO RÁPIDA PARA ERRO 403 DO FLOWISE');
    console.log('=========================================');

    try {
        // 1. Limpar cache relacionado ao Flowise
        console.log('1️⃣ 🧹 Limpando cache do Flowise...');
        const keysToRemove = Object.keys(localStorage).filter(key =>
            key.includes('flowise') ||
            key.includes('gpt') ||
            key.includes('session') ||
            key.includes('chat')
        );

        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
            console.log(`   ✅ Removido: ${key}`);
        });

        // 2. Resetar estado da aplicação
        console.log('\n2️⃣ 🔄 Resetando estado da aplicação...');
        if (window.uiManagerInstance?.stateManager) {
            window.uiManagerInstance.stateManager.reset();
        }

        // 3. Verificar se há GPT selecionado
        console.log('\n3️⃣ 🔍 Verificando GPT selecionado...');
        const uiManager = window.uiManagerInstance;
        const selectedGPT = uiManager?.stateManager?.selectedGPT;

        if (!selectedGPT) {
            console.log('❌ Nenhum GPT selecionado!');
            console.log('💡 SOLUÇÃO: Selecione um GPT na interface antes de usar o chat');
            return;
        }

        console.log(`✅ GPT selecionado: ${selectedGPT.name}`);
        console.log(`🆔 ID: ${selectedGPT.id}`);

        // 4. Verificar configuração do Flowise
        console.log('\n4️⃣ ⚙️ Verificando configuração do Flowise...');
        const flowiseConfig = selectedGPT.flowiseConfig?.flowise;

        if (!flowiseConfig) {
            console.log('❌ Configuração do Flowise não encontrada!');
            console.log('💡 SOLUÇÃO: Verifique se o GPT tem configuração válida no painel admin');
            return;
        }

        console.log(`📡 API Host: ${flowiseConfig.apiHost}`);
        console.log(`🆔 Chatflow ID: ${flowiseConfig.chatflowId}`);
        console.log(`🔑 Token: ${flowiseConfig.token ? 'Presente' : 'AUSENTE'}`);

        // 5. Testar conexão direta com Flowise
        console.log('\n5️⃣ 🔬 Testando conexão direta com Flowise...');

        const testUrl = `${flowiseConfig.apiHost}/api/v1/public-chatbotConfig/${flowiseConfig.chatflowId}`;
        const response = await fetch(testUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${flowiseConfig.token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`📊 Status da resposta: ${response.status} ${response.statusText}`);

        if (response.ok) {
            console.log('✅ Flowise está funcionando!');
            const data = await response.json();
            console.log('📋 Configuração recebida com sucesso');
        } else if (response.status === 403) {
            console.log('❌ ERRO 403: Problema de autorização');
            console.log('\n🛠️ SOLUÇÕES ESPECÍFICAS PARA 403:');
            console.log('   1. ✅ Verificar token no painel admin do Flowise');
            console.log('   2. ✅ Confirmar que o chatflow está público');
            console.log('   3. ✅ Verificar permissões do usuário');
            console.log('   4. ✅ Regenerar API key se necessário');
            console.log('   5. ✅ Testar com outro chatflow');
        } else {
            console.log(`❌ Erro inesperado: ${response.status}`);
        }

        // 6. Recomendações finais
        console.log('\n6️⃣ 🎯 PRÓXIMOS PASSOS:');
        console.log('   ✅ Recarregue a página (F5)');
        console.log('   ✅ Selecione o GPT novamente');
        console.log('   ✅ Teste o chat');
        console.log('   ✅ Se ainda der erro, execute: window.diagnoseFlowise403Error()');

    } catch (error) {
        console.log('❌ Erro na solução rápida:', error.message);
    }
};

// 🔧 DEBUG: Diagnóstico de captura de input
window.diagnoseInputCapture = () => {
    console.log('🔍 DIAGNÓSTICO DE CAPTURA DE INPUT');
    console.log('==================================');

    // 1. Verificar elementos do DOM
    console.log('\n1️⃣ ELEMENTOS DO DOM:');
    const inputSelectors = [
        'input[placeholder*="Digite" i]',
        'input[placeholder*="digite" i]',
        'textarea[placeholder*="Digite" i]',
        'textarea[placeholder*="digite" i]',
        '.chat-input input',
        '.chat-input textarea',
        '#flowise-fullchatbot input',
        '#flowise-fullchatbot textarea',
        '[contenteditable="true"]',
        '[role="textbox"]'
    ];

    inputSelectors.forEach((selector, index) => {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
            console.log(`   ✅ ${index + 1}. ${selector}: ${elements.length} encontrado(s)`);
            elements.forEach((el, i) => {
                console.log(`      ${i + 1}. Tag: ${el.tagName}, Type: ${el.type || 'N/A'}, Placeholder: "${el.placeholder || el.textContent?.substring(0, 50) || 'N/A'}"`);
                console.log(`         Value: "${el.value || el.textContent || ''}"`);
            });
        }
    });

    // 2. Verificar estado do UIManager
    console.log('\n2️⃣ ESTADO DO UIMANAGER:');
    const uiManager = window.uiManagerInstance;
    if (uiManager) {
        console.log('   ✅ UIManager encontrado');
        console.log('   📝 lastUserInput:', uiManager.lastUserInput || 'VAZIO');
        console.log('   🎯 isChatbotInitialized:', uiManager.isChatbotInitialized);
    } else {
        console.log('   ❌ UIManager não encontrado');
    }

    // 3. Verificar Flowise
    console.log('\n3️⃣ FLOWISE STATUS:');
    const flowiseElement = document.querySelector('#flowise-fullchatbot');
    if (flowiseElement) {
        console.log('   ✅ Elemento Flowise encontrado');
        const inputs = flowiseElement.querySelectorAll('input, textarea, [contenteditable]');
        console.log(`   📝 Inputs dentro do Flowise: ${inputs.length}`);
        inputs.forEach((input, i) => {
            console.log(`      ${i + 1}. ${input.tagName}: "${input.value || input.textContent || ''}"`);
        });
    } else {
        console.log('   ❌ Elemento Flowise não encontrado');
    }

    // 4. Verificar listeners
    console.log('\n4️⃣ LISTENERS CONFIGURADOS:');
    const allInputs = document.querySelectorAll('input, textarea, [contenteditable]');
    console.log(`   📊 Total de inputs na página: ${allInputs.length}`);

    console.log('\n💡 DICAS PARA DEPURAÇÃO:');
    console.log('   - Execute: diagnoseInputCapture()');
    console.log('   - Digite algo no chat e veja os logs');
    console.log('   - Procure por "observeUserInput" nos logs');
};

// 🔧 DEBUG: Diagnóstico completo de Flowise
window.diagnoseFlowiseIssue = () => {
    console.log('🔬 DIAGNÓSTICO COMPLETO DO FLOWISE');
    console.log('==================================');

    // 1. Verificar se o script do Flowise foi carregado
    console.log('\n1️⃣ VERIFICAÇÃO DE SCRIPTS:');
    const scripts = document.querySelectorAll('script');
    const flowiseScripts = Array.from(scripts).filter(script =>
        script.src && script.src.includes('flowise')
    );
    console.log(`   📜 Scripts relacionados ao Flowise: ${flowiseScripts.length}`);
    flowiseScripts.forEach((script, i) => {
        console.log(`      ${i + 1}. ${script.src}`);
        console.log(`         Loaded: ${script.complete}, Error: ${script.error || 'N/A'}`);
    });

    // 2. Verificar elementos customizados
    console.log('\n2️⃣ ELEMENTOS CUSTOMIZADOS:');
    const customElements = document.querySelectorAll('*');
    const flowiseElements = Array.from(customElements).filter(el =>
        el.tagName && el.tagName.toLowerCase().includes('flowise')
    );
    console.log(`   🎯 Elementos Flowise encontrados: ${flowiseElements.length}`);
    flowiseElements.forEach((el, i) => {
        console.log(`      ${i + 1}. Tag: ${el.tagName}, ID: ${el.id || 'N/A'}`);
        console.log(`         Visible: ${el.offsetWidth > 0 && el.offsetHeight > 0}`);
        console.log(`         Position: ${el.offsetTop || 0}px, ${el.offsetLeft || 0}px`);
    });

    // 3. Verificar se o componente foi definido
    console.log('\n3️⃣ COMPONENTE DEFINIDO:');
    const isDefined = customElements.get('flowise-fullchatbot');
    console.log(`   🏷️  Componente 'flowise-fullchatbot' definido: ${!!isDefined}`);
    if (isDefined) {
        console.log('   ✅ Componente está registrado no navegador');
    } else {
        console.log('   ❌ Componente NÃO está registrado!');
    }

    // 4. Verificar configuração atual
    console.log('\n4️⃣ CONFIGURAÇÃO ATUAL:');
    const uiManager = window.uiManagerInstance;
    if (uiManager?.stateManager?.selectedGPT) {
        const gpt = uiManager.stateManager.selectedGPT;
        console.log('   🤖 GPT selecionado:', gpt.name);
        console.log('   🆔 GPT ID:', gpt.id);

        if (gpt.flowiseConfig?.flowise) {
            const flowise = gpt.flowiseConfig.flowise;
            console.log('   🌐 API Host:', flowise.apiHost);
            console.log('   🆔 Chatflow ID:', flowise.chatflowId);
            console.log('   🔑 Token presente:', !!flowise.token);
        } else {
            console.log('   ❌ Configuração Flowise ausente!');
        }
    } else {
        console.log('   ❌ Nenhum GPT selecionado');
    }

    // 5. Verificar erros no console
    console.log('\n5️⃣ VERIFICAÇÃO DE ERROS:');
    console.log('   🔍 Procure por erros relacionados a Flowise nos logs acima');
    console.log('   📡 Verifique se há problemas de CORS ou rede');

    // 6. Verificar se o script está sendo carregado
    console.log('\n6️⃣ VERIFICAÇÃO DE CARREGAMENTO DO SCRIPT:');
    const flowiseScript = document.querySelector('script[src*="flowise"]');
    if (flowiseScript) {
        console.log('   ✅ Script do Flowise encontrado');
        console.log(`   📄 Status: ${flowiseScript.readyState}`);
        console.log(`   🔗 URL: ${flowiseScript.src}`);

        // Verificar se o script definiu funções globais
        console.log(`   🌐 Função global definida: ${typeof window.FlowiseChatbot !== 'undefined'}`);
        console.log(`   🔧 Componente registrado: ${customElements.get('flowise-fullchatbot') !== undefined}`);
    } else {
        console.log('   ❌ Script do Flowise NÃO encontrado!');
        console.log('   💡 Isso pode indicar problema no carregamento');
    }

    // 7. Verificar configuração do GPT
    console.log('\n7️⃣ CONFIGURAÇÃO DO GPT ATUAL:');
    const uiManagerInstance = window.uiManagerInstance;
    if (uiManagerInstance?.stateManager?.selectedGPT) {
        const gpt = uiManagerInstance.stateManager.selectedGPT;
        console.log(`   🤖 GPT: ${gpt.name}`);
        console.log(`   🆔 ID: ${gpt.id}`);
        console.log(`   🔧 Habilitado: ${gpt.enabled}`);
        console.log(`   🎯 Categoria: ${gpt.category}`);

        if (gpt.flowiseConfig) {
            console.log('   ✅ Configuração Flowise presente');
            console.log(`   🌐 API Host: ${gpt.flowiseConfig.flowise?.apiHost}`);
            console.log(`   🆔 Chatflow ID: ${gpt.flowiseConfig.flowise?.chatflowId}`);
            console.log(`   🔑 Token presente: ${!!gpt.flowiseConfig.flowise?.token}`);
        } else {
            console.log('   ❌ Configuração Flowise AUSENTE!');
        }
    }

    // 8. Verificar se o script pode ser carregado manualmente
    console.log('\n8️⃣ TESTE DE CARREGAMENTO MANUAL:');
    console.log('   ✅ Execute: window.loadFlowiseScriptManually()');
    console.log('   ✅ Execute: window.testFlowiseComponentCreation()');

    // 9. Sugestões de correção
    console.log('\n9️⃣ SUGESTÕES DE CORREÇÃO:');
    console.log('   ✅ Execute: window.forceFlowiseReload()');
    console.log('   ✅ Execute: window.checkFlowiseNetwork()');
    console.log('   ✅ Verifique se o domínio flowise.power.tec.br está acessível');
    console.log('   ✅ Teste o ping do Flowise: window.testFlowisePing()');
};

// 🔧 DEBUG: Forçar recarregamento do Flowise
window.forceFlowiseReload = () => {
    console.log('🔄 FORÇANDO RECARREGAMENTO DO FLOWISE...');

    // Remover elementos existentes
    const existingElements = document.querySelectorAll('flowise-fullchatbot, [id*="flowise"]');
    existingElements.forEach(el => {
        console.log(`🗑️ Removendo elemento: ${el.tagName}#${el.id}`);
        el.remove();
    });

    // Limpar scripts relacionados
    const scripts = document.querySelectorAll('script');
    scripts.forEach(script => {
        if (script.src && script.src.includes('flowise')) {
            console.log(`🗑️ Removendo script: ${script.src}`);
            script.remove();
        }
    });

    // Forçar recarregamento da página em 2 segundos
    setTimeout(() => {
        console.log('🔄 Recarregando página...');
        window.location.reload();
    }, 2000);
};

// 🔧 DEBUG: Teste de conectividade com Flowise
window.checkFlowiseNetwork = async () => {
    console.log('🌐 TESTANDO CONECTIVIDADE COM FLOWISE...');

    const tests = [
        { name: 'Ping do Flowise', url: 'https://flowise.power.tec.br/ping' },
        { name: 'Configuração do Chatflow', url: 'https://flowise.power.tec.br/api/v1/public-chatbotConfig/efe59701-afe2-4f4c-8448-bb8e3a32161a' },
        { name: 'Predição (sem token)', url: 'https://flowise.power.tec.br/api/v1/prediction/efe59701-afe2-4f4c-8448-bb8e3a32161a' }
    ];

    for (const test of tests) {
        try {
            console.log(`\n📡 Testando: ${test.name}`);
            console.log(`   🔗 URL: ${test.url}`);

            const startTime = Date.now();
            const response = await fetch(test.url);
            const endTime = Date.now();

            console.log(`   📊 Status: ${response.status}`);
            console.log(`   ⏱️  Tempo: ${endTime - startTime}ms`);

            if (response.ok) {
                console.log(`   ✅ ${test.name}: FUNCIONANDO`);
            } else {
                console.log(`   ❌ ${test.name}: ERRO ${response.status}`);
                const text = await response.text();
                console.log(`   📄 Resposta: ${text.substring(0, 100)}...`);
            }
        } catch (error) {
            console.log(`   💥 ${test.name}: FALHA - ${error.message}`);
        }
    }
};

// 🔧 DEBUG: Forçar captura manual de input
window.forceCaptureInput = () => {
    console.log('🎯 FORÇANDO CAPTURA MANUAL DE INPUT...');

    const uiManager = window.uiManagerInstance;
    if (!uiManager) {
        console.log('❌ UIManager não encontrado');
        return;
    }

    // Buscar todos os inputs possíveis
    const allInputs = document.querySelectorAll('input, textarea, [contenteditable]');
    console.log(`📊 Total de inputs encontrados: ${allInputs.length}`);

    let capturedInput = null;
    let capturedSelector = null;

    allInputs.forEach((input, index) => {
        const value = input.value || input.textContent || '';
        const selector = uiManager.getSelectorForElement(input);

        if (value.trim()) {
            console.log(`   ✅ Input ${index + 1} (${selector}): "${value.substring(0, 50)}${value.length > 50 ? '...' : ''}"`);
            if (!capturedInput) {
                capturedInput = value.trim();
                capturedSelector = selector;
            }
        } else {
            console.log(`   📝 Input ${index + 1} (${selector}): [VAZIO]`);
        }
    });

    if (capturedInput) {
        console.log('🎉 INPUT CAPTURADO MANUALMENTE!');
        console.log(`   📝 Valor: "${capturedInput}"`);
        console.log(`   🎯 Seletor: ${capturedSelector}`);

        // Forçar o registro do chat
        uiManager.lastUserInput = capturedInput;
        console.log('🚀 Chamando registro de chat...');
        uiManager.handleChatRegistration();

        return capturedInput;
    } else {
        console.log('❌ NENHUM INPUT COM CONTEÚDO ENCONTRADO');
        return null;
    }
};

// 🔧 DEBUG: Testar captura de sugestões
window.testSuggestionCapture = () => {
    console.log('🎯 TESTANDO CAPTURA DE SUGESTÕES...');



    const uiManager = window.uiManagerInstance;
    if (!uiManager) {
        console.log('❌ UIManager não encontrado');
        return;
    }

    // Verificar se o listener está configurado
    if (uiManager.suggestionListener) {
        console.log('✅ Listener de sugestões está configurado');
    } else {
        console.log('❌ Listener de sugestões NÃO está configurado');
        console.log('🔧 Chamando setupSuggestionCapture()...');
        uiManager.setupSuggestionCapture();
    }

    // Procurar por elementos que podem ser sugestões (MUITO MAIS AMPLO)
    const possibleSuggestions = document.querySelectorAll(`
        button:not([type="submit"]):not([data-bs-toggle]):not([aria-label*="close"]):not([aria-label*="fechar"]),
        div[role="button"],
        div[class*="button"],
        div[class*="option"],
        div[class*="choice"],
        div[class*="select"],
        span[class*="button"],
        span[class*="option"],
        span[class*="choice"],
        a[class*="button"],
        a[class*="option"],
        a[class*="choice"],
        [data-testid*="suggestion"],
        [class*="suggestion"],
        [class*="followup"],
        [class*="follow-up"],
        [onclick]
    `);

    console.log(`📊 Encontrados ${possibleSuggestions.length} elementos que podem ser sugestões`);

    possibleSuggestions.forEach((element, index) => {
        const text = element.textContent || element.innerText || '';
        if (text.trim()) {
            console.log(`   ${index + 1}. "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
            console.log(`      👆 ${element.tagName}.${element.className || 'sem-classe'} (${element.id || 'sem-id'})`);
            console.log(`      🎯 Role: ${element.getAttribute('role') || 'não definido'}`);
            console.log(`      📝 Data-testid: ${element.getAttribute('data-testid') || 'não definido'}`);
        }
    });

    console.log('\n💡 Para testar: clique em uma sugestão e veja se aparece nos logs');
    console.log('🔍 Procure por: "🎯 Mensagem de sugestão detectada"');
    console.log('❌ Se não aparecer, procure por: "❌ Clique NÃO detectado como sugestão"');
};

// 🔧 DEBUG: Simular clique em sugestão
window.simulateSuggestionClick = () => {
    console.log('🖱️ SIMULANDO CLIQUE EM SUGESTÃO...');

    // Criar um elemento de teste
    const testSuggestion = document.createElement('button');
    testSuggestion.textContent = 'Sugestão de teste - Que horas são?';
    testSuggestion.className = 'suggestion-button';
    testSuggestion.style.cssText = 'position: fixed; top: 100px; right: 100px; z-index: 9999; background: green; color: white; padding: 10px; border-radius: 5px;';

    // Adicionar ao DOM
    document.body.appendChild(testSuggestion);

    // Simular clique após 2 segundos
    setTimeout(() => {
        console.log('🎯 Simulando clique na sugestão...');
        testSuggestion.click();

        // Remover após 3 segundos
        setTimeout(() => {
            if (testSuggestion.parentNode) {
                testSuggestion.parentNode.removeChild(testSuggestion);
                console.log('🗑️ Elemento de teste removido');
            }
        }, 3000);
    }, 2000);

    console.log('✅ Elemento de teste criado no canto superior direito');
    console.log('⏳ Aguardando 2 segundos para simular clique...');
};

// 🔧 DEBUG: Testar o fluxo simplificado
window.testSimplifiedFlow = () => {
    console.log('🚀 TESTANDO FLUXO SIMPLIFICADO...');

    const uiManager = window.uiManagerInstance;
    if (!uiManager) {
        console.log('❌ UIManager não encontrado');
        return;
    }

    console.log('📊 Estado atual:');
    console.log('   - lastUserInput:', uiManager.lastUserInput);
    console.log('   - config.apiCredentials:', Object.keys(uiManager.config.apiCredentials || {}));
    console.log('   - updateChat URL:', uiManager.config.apiCredentials?.updateChat);

    // Simular observeLoading(true)
    console.log('\n🎯 Simulando observeLoading(true)...');
    uiManager.observers?.observeLoading?.(true).then(() => {
        console.log('✅ Simulação concluída');
    }).catch(error => {
        console.log('❌ Erro na simulação:', error);
    });
};

// 🔧 DEBUG: Monitorar inputs em tempo real
window.monitorInputs = () => {
    console.log('👁️ MONITORANDO INPUTS EM TEMPO REAL...');

    const checkInputs = () => {
        const allInputs = document.querySelectorAll('input, textarea, [contenteditable]');
        let hasContent = false;

        allInputs.forEach((input, index) => {
            const value = input.value || input.textContent || '';
            if (value.trim()) {
                console.log(`📝 Input ${index + 1}: "${value.substring(0, 30)}${value.length > 30 ? '...' : ''}"`);
                hasContent = true;
            }
        });

        if (!hasContent) {
            console.log('😴 Nenhum input com conteúdo...');
        }
    };

    // Verificar a cada 2 segundos
    const interval = setInterval(checkInputs, 2000);

    console.log('✅ Monitoramento iniciado (a cada 2s)');
    console.log('🛑 Para parar: clearInterval(interval); mas o ID do intervalo foi perdido');

    // Retornar função para parar o monitoramento
    return () => {
        clearInterval(interval);
        console.log('🛑 Monitoramento parado');
    };
};

// 🔧 DEBUG: Teste direto da API updateChat
window.testUpdateChatDirectly = async () => {
    console.log('🚀 TESTANDO API UPDATECHAT DIRETAMENTE...');

    const uiManager = window.uiManagerInstance;
    const testMessage = 'Teste direto da API updateChat - ' + new Date().toLocaleString();

    const testData = {
        gpt_id: uiManager?.stateManager?.selectedGPT?.id || 'gpt-nao-selecionado',
        user_name: uiManager?.config?.userName || 'usuario-nao-logado',
        user_id: uiManager?.config?.userId || 'user-nao-logado',
        sessionid: uiManager?.stateManager?.currentSessionId || 'session-nao-criada',
        message_content: testMessage,
        timestamp: new Date().toISOString()
    };

    console.log('📋 Dados do teste:', testData);

    try {
        const jwt = await getJwt();
        console.log('🔑 JWT obtido com sucesso');

        const response = await fetch('https://webhook.power.tec.br/webhook/lexidecis/chats', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${jwt}`
            },
            body: JSON.stringify(testData)
        });

        console.log('📡 Status da resposta:', response.status);
        console.log('📡 Headers:', Object.fromEntries(response.headers.entries()));

        const responseText = await response.text();
        console.log('📄 Corpo da resposta:', responseText);

        if (response.ok) {
            console.log('✅ API updateChat FUNCIONANDO!');
        } else {
            console.log('❌ API updateChat com erro:', response.status, responseText);
        }
    } catch (error) {
        console.error('💥 Erro no teste:', error);
    }
};

// 🔧 DEBUG: Carregar script do Flowise manualmente
window.loadFlowiseScriptManually = async () => {
    console.log('📜 CARREGANDO SCRIPT DO FLOWISE MANUALMENTE...');

    // Verificar se já existe
    const existingScript = document.querySelector('script[src*="flowise"]');
    if (existingScript) {
        console.log('⚠️ Script já existe, removendo primeiro...');
        existingScript.remove();
    }

    try {
        // URL do script do Flowise (baseado no que vimos nos logs)
        const scriptUrl = 'https://flowise.power.tec.br/js/init.js';

        console.log(`🔗 Carregando: ${scriptUrl}`);

        // Criar novo script
        const script = document.createElement('script');
        script.src = scriptUrl;
        script.async = true;
        script.defer = true;

        // Promise para aguardar carregamento
        const loadPromise = new Promise((resolve, reject) => {
            script.onload = () => {
                console.log('✅ Script carregado com sucesso!');
                resolve();
            };
            script.onerror = (error) => {
                console.error('❌ Erro ao carregar script:', error);
                reject(error);
            };
        });

        // Adicionar ao DOM
        document.head.appendChild(script);

        // Aguardar carregamento
        await loadPromise;

        // Verificar se o componente foi definido
        setTimeout(() => {
            const componentDefined = customElements.get('flowise-fullchatbot');
            console.log(`🔧 Componente definido após carregamento: ${!!componentDefined}`);

            if (componentDefined) {
                console.log('✅ Componente Flowise está pronto para uso!');
                console.log('💡 Agora você pode executar: window.testFlowiseComponentCreation()');
            } else {
                console.log('⚠️ Script carregado mas componente não definido');
                console.log('🔍 Verifique se há erros no console');
            }
        }, 1000);

    } catch (error) {
        console.error('💥 Falha no carregamento manual:', error);
        console.log('💡 Possíveis causas:');
        console.log('   - URL incorreta do script');
        console.log('   - Problemas de CORS');
        console.log('   - Servidor Flowise indisponível');
    }
};

// 🔧 DEBUG: Testar criação do componente Flowise
window.testFlowiseComponentCreation = () => {
    console.log('🧪 TESTANDO CRIAÇÃO DO COMPONENTE FLOWISE...');

    try {
        // Verificar se o componente está definido
        const componentDefined = customElements.get('flowise-fullchatbot');
        console.log(`🔧 Componente definido: ${!!componentDefined}`);

        if (!componentDefined) {
            console.log('❌ Componente não definido - execute primeiro: window.loadFlowiseScriptManually()');
            return;
        }

        // Obter configuração atual
        const uiManager = window.uiManagerInstance;
        if (!uiManager?.stateManager?.selectedGPT) {
            console.log('❌ Nenhum GPT selecionado');
            return;
        }

        const gpt = uiManager.stateManager.selectedGPT;
        console.log(`🤖 GPT selecionado: ${gpt.name}`);

        if (!gpt.flowiseConfig?.flowise) {
            console.log('❌ Configuração Flowise ausente');
            return;
        }

        const flowise = gpt.flowiseConfig.flowise;
        console.log('🔧 Criando componente com configuração:');
        console.log(`   🌐 API Host: ${flowise.apiHost}`);
        console.log(`   🆔 Chatflow ID: ${flowise.chatflowId}`);
        console.log(`   🔑 Token: ${flowise.token ? 'Presente' : 'Ausente'}`);
        console.log(`   📝 Session ID: ${uiManager.stateManager.currentSessionId}`);

        // Criar elemento
        const flowiseElement = document.createElement('flowise-fullchatbot');
        flowiseElement.id = 'flowise-fullchatbot-test';

        // Definir atributos
        flowiseElement.setAttribute('api-host', flowise.apiHost);
        flowiseElement.setAttribute('chatflowid', flowise.chatflowId);

        if (flowise.token) {
            flowiseElement.setAttribute('token', flowise.token);
        }

        // Definir propriedades via JavaScript
        flowiseElement.apiHost = flowise.apiHost;
        flowiseElement.chatflowid = flowise.chatflowId;
        flowiseElement.token = flowise.token;
        flowiseElement.sessionId = uiManager.stateManager.currentSessionId;

        console.log('📝 Elemento criado:', flowiseElement);

        // Adicionar ao DOM (temporariamente)
        const testContainer = document.createElement('div');
        testContainer.id = 'flowise-test-container';
        testContainer.style.cssText = 'position: fixed; top: 50px; right: 50px; width: 300px; height: 400px; border: 2px solid red; z-index: 9999; background: white;';

        testContainer.appendChild(flowiseElement);
        document.body.appendChild(testContainer);

        console.log('✅ Componente adicionado ao DOM para teste');
        console.log('🔍 Verifique se o chat aparece no canto superior direito');
        console.log('🗑️ Para remover: document.getElementById("flowise-test-container").remove()');

        // Observar mudanças no elemento
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                console.log('🔄 Mudança detectada no componente:', mutation.type);
            });
        });
        observer.observe(flowiseElement, { attributes: true, childList: true, subtree: true });

        // Testar depois de alguns segundos
        setTimeout(() => {
            console.log('⏰ Teste após 3 segundos:');
            console.log(`   👁️ Visível: ${flowiseElement.offsetWidth > 0 && flowiseElement.offsetHeight > 0}`);
            console.log(`   📏 Dimensões: ${flowiseElement.offsetWidth}x${flowiseElement.offsetHeight}`);
            console.log(`   👶 Filhos: ${flowiseElement.children.length}`);
        }, 3000);

    } catch (error) {
        console.error('💥 Erro na criação do componente:', error);
    }
};

// 🔧 DEBUG: Função global para testar com dados reais
window.testWithRealData = async () => {
    // Pegar dados reais da aplicação
    const uiManager = window.uiManagerInstance;
    const testData = {
        gpt_id: uiManager?.stateManager?.selectedGPT?.id || 'gpt-nao-selecionado',
        user_name: uiManager?.config?.userName || 'usuario-nao-logado',
        user_id: uiManager?.config?.userId || 'user-nao-logado',
        sessionid: uiManager?.stateManager?.currentSessionId || 'session-nao-criada',
        message_content: 'Teste com dados reais da aplicação - ' + new Date().toLocaleString(),
        timestamp: new Date().toISOString()
    };

    const testUrl = 'https://webhook.power.tec.br/webhook/lexidecis/chats';

    console.log('🎯 TESTANDO COM DADOS REAIS DA APLICAÇÃO...');
    console.log('📡 URL:', testUrl);
    console.log('📋 Dados reais:', testData);

    try {
        const response = await fetch(testUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer test-token'
            },
            body: JSON.stringify(testData)
        });

        console.log('📡 Status:', response.status);
        const responseText = await response.text();
        console.log('📋 Resposta:', responseText);

        if (response.ok) {
            console.log('✅ API respondeu com dados reais!');
        } else {
            console.log('❌ Erro com dados reais:', response.status);
        }

    } catch (error) {
        console.error('❌ Erro na requisição com dados reais:', error);
    }
};

// 🔧 DEBUG: Função global para testar updateChat (API correta para registrar chats)
window.testUpdateChat = async () => {
    try {
        console.log('🧪 Testando updateChat API...');
        console.log('Verificando se UIManager está disponível...');

        // Tenta encontrar a instância do UIManager
        const uiManagerInstances = [];
        for (let key in window) {
            if (window[key] && window[key].constructor && window[key].constructor.name === 'UIManager') {
                uiManagerInstances.push(window[key]);
            }
        }

        if (uiManagerInstances.length === 0) {
            console.log('Nenhuma instância UIManager encontrada, criando teste básico...');

            // Teste básico sem instância
            const testParams = {
                gpt_id: 'test-gpt-id',
                user_name: 'test-user',
                user_id: 'test-user-id',
                sessionid: 'test-session',
                message_content: 'Test message from console'
            };

            console.log('Test params:', testParams);
            console.log('Para testar a API, use:');
            console.log(`
fetch('https://webhook.power.tec.br/webhook/lexidecis/chats?gpt_id=test-gpt-id&user_name=test-user&user_id=test-user-id&sessionid=test-session&message_content=Test+message+from+console', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
})
.then(r => r.json())
.then(console.log)
            `);
            return testParams;
        }

        const uiManager = uiManagerInstances[0];
        console.log('UIManager encontrado:', uiManager);
        console.log('Config atual:', uiManager.config);
        console.log('apiCredentials:', uiManager.config?.apiCredentials);

        if (!uiManager.config?.apiCredentials?.updateChat) {
            console.error('❌ updateChat não configurado');
            return;
        }

        const testParams = {
            gpt_id: 'test-gpt-id',
            user_name: 'test-user',
            user_id: 'test-user-id',
            sessionid: 'test-session',
            message_content: 'Test message from console'
        };

        console.log('📡 Fazendo chamada de teste para updateChat...');
        const result = await uiManager.apiService.request('updateChat', testParams, 'POST', null, { includeParamsInQuery: true });
        console.log('✅ Teste bem-sucedido:', result);
        return result;
    } catch (error) {
        console.error('❌ Erro no teste:', error);
        return error;
    }
};

export default UIManager;