// Defina esta variável no topo do arquivo
const DEBUG_MODE = false; // altere para true se quiser habilitar os logs

import GPTManager from './gptManager.js';
import HistoryManager from './historyManager.js'; // Importação do HistoryManager
import ProfileManager from './profileManager.js'; // Importação do ProfileManager

class UIManager {
    constructor(apiService, stateManager, chatManager, config, auth) {
        this.apiService = apiService;
        this.stateManager = stateManager;
        this.chatManager = chatManager;
        this.config = config; // Armazena o CONFIG na instância
        this.auth = auth; // Instância do Firebase Auth

        // Inicializar o GPTManager com o CONFIG correto
        this.gptManager = new GPTManager(this.apiService, this.stateManager, this, this.config);

        // Inicializar o ProfileManager
        this.profileManager = new ProfileManager(this.auth, this);

        const gptModalElement = document.getElementById('gpt-modal');
        if (gptModalElement) {
            this.modal = new bootstrap.Modal(gptModalElement);
        }

        this.setupUIEvents();
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

        if (searchInput) {
            searchInput.addEventListener('input', () => this.filterChatList());
        }

        if (clearSearchButton) {
            clearSearchButton.addEventListener('click', () => this.clearSearch());
        }

        // Botões da barra lateral
        const newChatButton = document.getElementById('new-chat-button');
        const selectGPTButton = document.getElementById('select-gpt-button');

        if (newChatButton) {
            newChatButton.addEventListener('click', () => this.createNewChat());
        }

        if (selectGPTButton) {
            selectGPTButton.addEventListener('click', () => this.gptManager.openModal());
        }

        // Botão para abrir o modal de perfil
        const profileIcon = document.getElementById('profile-icon');
        if (profileIcon) {
            profileIcon.addEventListener('click', () => this.profileManager.openModal());
        }

        // Eventos do menu suspenso de configurações (exemplo de logout)
        const logoutItem = document.querySelector('.dropdown-item[href="#logout"]');
        if (logoutItem) {
            logoutItem.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }

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
    }

    /* --- Função para Criar Novo Chat --- */
    async createNewChat() {
        try {
            this.debugLog('Criando um novo chat...');
            
            // Gera um novo ID de sessão usando o GPTManager
            const newSessionId = this.gptManager.generateSessionId();
            this.stateManager.setSessionId(newSessionId);

            // Define o nome padrão do novo chat
            const defaultChatName = this.stateManager.selectedGPT ? this.stateManager.selectedGPT.name : 'Novo Chat';
            
            const newChat = {
                id: newSessionId,
                name: defaultChatName,
                date: new Date().toISOString(),
                fk_gpt_id: this.stateManager.selectedGPT ? this.stateManager.selectedGPT.id : null
            };

            // Não cria chat fantasma
            // this.stateManager.addChat(newChat);

            this.chatManager.populateChatMenu(this.stateManager.chats);

            await this.initializeChatbot();

            this.debugLog('Novo chat criado com sucesso.');
        } catch (error) {
            console.error('Erro ao criar um novo chat:', error);
            this.showError('Erro ao criar um novo chat. Consulte o console para mais detalhes.');
        }
    }

    /* --- Funções de Inicialização do Chatbot --- */
    async initializeChatbot() {
        try {
            if (!this.stateManager.currentSessionId) {
                const newSessionId = this.gptManager.generateSessionId();
                this.stateManager.setSessionId(newSessionId);

                const defaultChatName = this.stateManager.selectedGPT ? this.stateManager.selectedGPT.name : 'Novo chat';
                const defaultChat = {
                    id: newSessionId,
                    name: defaultChatName,
                    date: new Date().toISOString(),
                    fk_gpt_id: this.stateManager.selectedGPT ? this.stateManager.selectedGPT.id : null
                };
                this.stateManager.addChat(defaultChat);
                this.chatManager.populateChatMenu(this.stateManager.chats);
            }

            // Limpar histórico injetado
            const selectedFlowiseConfig = this.stateManager.selectedGPT.flowiseConfig.flowise;
            localStorage.removeItem(`${selectedFlowiseConfig.chatflowId}_historyInjected`);
            localStorage.removeItem(`${selectedFlowiseConfig.chatflowId}_EXTERNAL`);

            // Injetar histórico
            await HistoryManager.injectChatHistory(this.stateManager.currentSessionId, this.stateManager.selectedGPT.flowiseConfig);

            const chatbotContainer = document.getElementById('chatbot-container');
            if (chatbotContainer) {
                chatbotContainer.innerHTML = '<flowise-fullchatbot></flowise-fullchatbot>';
            } else {
                console.error('Elemento chatbot-container não encontrado.');
                return;
            }

            if (!this.stateManager.selectedGPT || !this.stateManager.selectedGPT.flowiseConfig || !this.stateManager.selectedGPT.flowiseConfig.flowise) {
                console.error('flowiseConfig está indefinido ou incompleto para o GPT selecionado.');
                this.showError('Configuração do GPT está incompleta. Por favor, selecione outro GPT.');
                return;
            }

            const chatflowConfig = {
                sessionId: this.stateManager.currentSessionId,
                ...this.stateManager.selectedGPT.flowiseConfig,
                ...this.stateManager.gptConfig,
            };

            this.debugLog('Chatflow Config:', chatflowConfig);

            Chatbot.initFull({
                chatflowid: this.stateManager.selectedGPT.flowiseConfig.flowise.chatflowId,
                apiHost: this.stateManager.selectedGPT.flowiseConfig.flowise.apiHost,
                chatflowConfig: chatflowConfig,
                observersConfig: {
                    observeUserInput: (userInput) => this.logUserInput(userInput),
                    observeMessages: (messages) => this.logMessages(messages),
                    observeLoading: (loading) => this.handleLoadingState(loading)
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
                        message: 'Ao utilizar esse serviço, está concordando com os termos de uso <a target="_blank" href="https://v1.lexidecis.com.br/terms.html">Termos & Condiçoes</a>',
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
                        errorMessage: 'Ops, algo deu errado...',
                        backgroundColor: '#f1f1f1',
                        fontSize: 14,
                        starterPrompts: (() => {
                            const prompts = this.stateManager.selectedGPT?.starterPrompts;
                            if (!prompts) return ['Quem é voce?'];
                            if (Array.isArray(prompts)) return prompts;
                            return prompts.includes(',') 
                                ? prompts.split(',').map(p => p.trim()) 
                                : [prompts];
                        })(),
                        starterPromptFontSize: 14,
                        clearChatOnReload: false,
                        sourceDocsTitle: 'Sources:',
                        renderHTML: true,
                        botMessage: {
                          backgroundColor: '#f1f1f1',
                          textColor: '#000000',
                          showAvatar: true,
                        },
                        userMessage: {
                          backgroundColor: '#282828',
                          textColor: '#ffffff',
                          showAvatar: true,
                          avatarSrc: 'https://raw.githubusercontent.com/zahidkhawaja/langchain-chat-nextjs/main/public/usericon.png',
                        },
                        textInput: {
                          placeholder: 'Mensagem...',
                          backgroundColor: '#282828',
                          textColor: '#f1f1f1',
                          sendButtonColor: '#f1f1f1',
                          maxChars: 50000,
                          maxCharsWarningMessage: 'Você excedeu o limite de caracteres. Insira menos de 50000 caracteres.',
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
                            text: 'Powered by',
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
            console.error(message); // Fallback para exibir no console
        }
    }

    logUserInput(userInput) {
        this.debugLog({ userInput });
    }

    logMessages(messages) {
        this.debugLog({ messages });
    }

    async handleLoadingState(loading) {
        this.debugLog({ loading });

        if (loading) {
            this.debugLog('O chatbot está carregando...');
            try {
                const params = {
                    gpt_id: this.stateManager.selectedGPT.id,
                    user_name: this.config.userName,
                    user_id: this.config.userId,
                    sessionid: this.stateManager.currentSessionId
                };
                const response = await this.apiService.request('updateChat', params, 'POST', null, { includeParamsInQuery: true });
                this.debugLog('Resposta da API:', response);

                if (response.status === "success") {
                    this.debugLog('Resposta da API bem-sucedida:', response.message);
                    await this.chatManager.loadChatList(this.chatManager.populateChatMenu.bind(this.chatManager));
                } else {
                    throw new Error(response.message || 'Erro desconhecido.');
                }
            } catch (error) {
                console.error('Erro ao fazer a requisição POST:', error);
                this.showError('Erro ao atualizar o chat. Verifique o console para mais detalhes.');
            }
        } else {
            this.debugLog('O chatbot terminou de carregar.');
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

    logout() {
        console.log('Usuário desconectado.');
        sessionStorage.clear();
        localStorage.clear();
        window.location.href = '/login';
    }
}

export default UIManager;