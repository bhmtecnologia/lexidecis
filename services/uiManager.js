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
            console.log('Criando um novo chat...');
            
            // Gera um novo ID de sessão usando o GPTManager
            const newSessionId = this.gptManager.generateSessionId();
            this.stateManager.setSessionId(newSessionId);

            // Define o nome padrão do novo chat
            const defaultChatName = this.stateManager.selectedGPT
                ? this.stateManager.selectedGPT.name
                : 'Novo Chat';
            
            // Cria o objeto de novo chat, associando ao GPT selecionado
            const newChat = {
                id: newSessionId,
                name: defaultChatName,
                date: new Date().toISOString(),
                fk_gpt_id: this.stateManager.selectedGPT ? this.stateManager.selectedGPT.id : null // Associar GPT ao chat
            };

            // Adiciona o novo chat ao StateManager
            this.stateManager.addChat(newChat);

            // Atualiza a lista de chats na interface
            this.chatManager.populateChatMenu(this.stateManager.chats);

            // Inicializa o chatbot com o novo chat
            await this.initializeChatbot();

            console.log('Novo chat criado com sucesso.');
        } catch (error) {
            console.error('Erro ao criar um novo chat:', error);
            this.showError('Erro ao criar um novo chat. Consulte o console para mais detalhes.');
        }
    }

    /* --- Funções de Inicialização do Chatbot --- */
    async initializeChatbot() {
        try {
            if (!this.stateManager.currentSessionId) {
                const newSessionId = this.gptManager.generateSessionId(); // Usando GPTManager
                this.stateManager.setSessionId(newSessionId);

                const defaultChatName = this.stateManager.selectedGPT ? this.stateManager.selectedGPT.name : 'Novo chat';
                const defaultChat = {
                    id: newSessionId,
                    name: defaultChatName,
                    date: new Date().toISOString(),
                    fk_gpt_id: this.stateManager.selectedGPT ? this.stateManager.selectedGPT.id : null // Associar GPT ao chat
                };
                this.stateManager.addChat(defaultChat);
                this.chatManager.populateChatMenu(this.stateManager.chats);
            }

            // Limpar histórico injetado
// Limpar histórico injetado com as configurações específicas do Flowise do GPT selecionado
const selectedFlowiseConfig = this.stateManager.selectedGPT.flowiseConfig.flowise;
localStorage.removeItem(`${selectedFlowiseConfig.chatflowId}_historyInjected`);
localStorage.removeItem(`${selectedFlowiseConfig.chatflowId}_EXTERNAL`);

            // Injetar histórico
// Injetar histórico com as configurações específicas do Flowise do GPT selecionado
await HistoryManager.injectChatHistory(this.stateManager.currentSessionId, this.stateManager.selectedGPT.flowiseConfig);

            // Remover o chatbot anterior e inserir um novo
            const chatbotContainer = document.getElementById('chatbot-container');
            if (chatbotContainer) {
                chatbotContainer.innerHTML = '<flowise-fullchatbot></flowise-fullchatbot>';
            } else {
                console.error('Elemento chatbot-container não encontrado.');
                return;
            }

            // Verificar se o GPT selecionado possui flowiseConfig
            if (!this.stateManager.selectedGPT || !this.stateManager.selectedGPT.flowiseConfig || !this.stateManager.selectedGPT.flowiseConfig.flowise) {
                console.error('flowiseConfig está indefinido ou incompleto para o GPT selecionado.');
                this.showError('Configuração do GPT está incompleta. Por favor, selecione outro GPT.');
                return;
            }

            // Configurar o objeto de chatflowConfig com flowiseConfig completo
            const chatflowConfig = {
                sessionId: this.stateManager.currentSessionId,
                ...this.stateManager.selectedGPT.flowiseConfig // Inclui flowiseConfig diretamente
            };

            console.log('Chatflow Config:', chatflowConfig);

            // Inicializar o chatbot flowise-embed-html com as configurações atualizadas
            Chatbot.initFull({
                chatflowid: this.stateManager.selectedGPT.flowiseConfig.flowise.chatflowId,
                apiHost: this.stateManager.selectedGPT.flowiseConfig.flowise.apiHost,
                chatflowConfig: chatflowConfig,
                theme: {
                    chatWindow: {
                        button: {
                            backgroundColor: "black"
                        },
                        showTitle: true,
                        title: this.stateManager.selectedGPT ? this.stateManager.selectedGPT.name : 'Escolha um GPT',
                        welcomeMessage: this.stateManager.selectedGPT ? this.stateManager.selectedGPT.description : 'Bem-vindo ao assistente',
                        backgroundColor: '#ffffff',
                        fontSize: 15,
                        starterPrompts: (() => {
                            const prompts = this.stateManager.selectedGPT?.starterPrompts;
                        
                            if (!prompts) return ['TEXTO DE PROMPT (ENTRADA) DO GPT'];
                        
                            // Verificar se já é um array
                            if (Array.isArray(prompts)) return prompts;
                        
                            // Dividir a string em um array, assumindo que as perguntas estão separadas por vírgula
                            return prompts.includes(',') 
                                ? prompts.split(',').map(p => p.trim()) 
                                : [prompts];
                        })(),
                        clearChatOnReload: false,
                        botMessage: {
                            backgroundColor: "#ffffff",
                            textColor: "#000000",
                            showAvatar: false
                        },
                        userMessage: {
                            backgroundColor: "#282828",
                            textColor: "#ffffff",
                            showAvatar: false
                        },                
                        textInput: {
                            placeholder: 'Digite sua mensagem...',
                            backgroundColor: '#282828',                    
                            textColor: '#ffffff',
                            sendButtonColor: '#ffffff',
                            maxChars: 5000,
                            maxCharsWarningMessage: 'Você excedeu o limite de caracteres. Por favor, insira menos de 5000 caracteres.',
                            autoFocus: true,
                            sendMessageSound: true,
                            receiveMessageSound: true,
                        },
                        footer: {
                            textColor: '#303235',
                            text: 'Powered by',
                            company: 'LexiDecis',
                            companyLink: 'https://lexidecis.com.br',
                        }
                    },
                },
                observersConfig: {
                    observeUserInput: (userInput) => this.logUserInput(userInput),
                    observeMessages: (messages) => this.logMessages(messages),
                    observeLoading: (loading) => this.handleLoadingState(loading)
                }
            });

            // Rolagem suave até o contêiner do chatbot
            setTimeout(() => {
                const chatbotElement = document.getElementById('chatbot-container');
                if (chatbotElement) {
                    chatbotElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 500);
        } catch (error) { // Bloco catch adicionado
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
        console.log({ userInput });
    }

    logMessages(messages) {
        console.log({ messages });
    }

    async handleLoadingState(loading) {
        console.log({ loading });

        if (loading) {
            console.log('O chatbot está carregando...');
            try {
                const params = {
                    gpt_id: this.stateManager.selectedGPT.id,
                    user_name: this.config.userName,
                    user_id: this.config.userId,
                    sessionid: this.stateManager.currentSessionId
                };
                const response = await this.apiService.request('updateChat', params, 'POST', null, { includeParamsInQuery: true });
                console.log('Resposta da API:', response);

                if (response.status === "success") {
                    console.log('Resposta da API bem-sucedida:', response.message);
                    await this.chatManager.loadChatList(this.chatManager.populateChatMenu.bind(this.chatManager));
                } else {
                    throw new Error(response.message || 'Erro desconhecido.');
                }
            } catch (error) {
                console.error('Erro ao fazer a requisição POST:', error);
                this.showError('Erro ao atualizar o chat. Verifique o console para mais detalhes.');
            }
        } else {
            console.log('O chatbot terminou de carregar.');
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