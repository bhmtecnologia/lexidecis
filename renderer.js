import Chatbot from "https://cdn.jsdelivr.net/npm/flowise-embed/dist/web.js";

/* ================================
   1. Configurações e Constantes
   ================================ */
const CONFIG = {
    userId: 4,
    companyName: 'bhm',
    userName: 'bruno',
    flowiseChatflowId: 'fd33f1f1-5543-4cf6-b22f-485bf1bedeb5',
    flowiseApiHost: 'https://flowise.prod.bhm.tec.br',
    flowiseToken: 'auQmNz8lRPkUqRrU1X86Kkfx_DICm92uCA8Pr8Vz8wc',
    apiCredentials: {
        readChat: {
            URL: 'https://n8n.prod.bhm.tec.br/webhook/baa3de89-ecc9-448c-bd1b-8b45554da20f',
            AUTH: 'MinhaSenhaDaApi2024@'
        },
        updateChat: {
            URL: 'https://n8n.prod.bhm.tec.br/webhook/8b3c7d4b-660b-413d-a0a0-87ce039cba41',
            AUTH: 'MinhaSenhaDaApi2024@'
        },
        readGPT: {
            URL: 'https://n8n.prod.bhm.tec.br/webhook/15108d38-cdf9-4bfa-87be-f14469aa7969',
            AUTH: 'MinhaSenhaDaApi2024@'
        },
        overrideConfig: {
            URL: 'https://n8n.prod.bhm.tec.br/webhook/d8bc8d4c-93f8-4496-8960-c496aea5b959',
            AUTH: 'MinhaSenhaDaApi2024@'
        },
        deleteChat: {
            URL: 'https://n8n.prod.bhm.tec.br/webhook/7d15a017-c3de-4163-abff-39346d5dbbbd',
            AUTH: 'MinhaSenhaDaApi2024@'
        }
    }
};

/* ==========================
   2. Serviços de API
   ========================== */
class ApiService {
    constructor(config) {
        this.config = config;
    }

    async request(apiKey, params = {}, method = 'GET', body = null) {
        const apiConfig = this.config.apiCredentials[apiKey];
        if (!apiConfig) throw new Error(`Configuração da API '${apiKey}' não encontrada.`);
        
        // Construir a URL com parâmetros para métodos GET e DELETE
        let url = apiConfig.URL;
        if (method === 'GET' || method === 'DELETE') {
            const queryString = new URLSearchParams(params).toString();
            if (queryString) {
                url += `?${queryString}`;
            }
        }

        const options = {
            method,
            headers: {
                'Authorization': apiConfig.AUTH,
                'Content-Type': 'application/json'
            }
        };
        if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) options.body = JSON.stringify(body);
        
        try {
            const response = await fetch(url, options);
            if (!response.ok) throw new Error(`Erro na requisição ${apiKey}: ${response.status} ${response.statusText}`);
            return response.json();
        } catch (error) {
            throw new Error(`Falha ao realizar a requisição ${apiKey}: ${error.message}`);
        }
    }
}

/* ==========================
   3. Gerenciamento de Estado
   ========================== */
class StateManager {
    constructor() {
        this.currentSessionId = "";
        this.chats = [];
        this.selectedGPT = null;
        this.selectedGPTId = null;
        this.gptConfig = {};

        // Configurações do GPT
        this.openAIApiKey = "";
        this.modelName = "";
        this.temperature = "";
        this.systemMessage = "";
        this.maxIterations = "";
        this.retrieverTools = [];
        this.pineconeApiKey = "";
        this.pineconeIndex = "";
        this.pineconeNamespace = "";
    }

    setSessionId(sessionId) {
        this.currentSessionId = sessionId;
    }

    addChat(chat) {
        this.chats.push(chat);
    }

    removeChat(chatId) {
        this.chats = this.chats.filter(chat => chat.id !== chatId);
    }

    setSelectedGPT(gpt) {
        this.selectedGPT = gpt;
        this.selectedGPTId = gpt.id || null;
    }

    setGPTConfig(config) {
        this.gptConfig = config;
    }
}

/* ==========================
   4. UI e Manipulação de Eventos
   ========================== */
class UIManager {
    constructor(apiService, stateManager) {
        this.apiService = apiService;
        this.stateManager = stateManager;
        const gptModalElement = document.getElementById('gpt-modal');
        if (gptModalElement) {
            this.modal = new bootstrap.Modal(gptModalElement);
        }
        this.setupUIEvents();
    }

    /* --- Configuração de Eventos da UI --- */
    setupUIEvents() {
        // Botões do cabeçalho (hide-header-button e show-header-button)
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

        // Botões da Sidebar
        const newChatButton = document.getElementById('new-chat-button');
        const selectGPTButton = document.getElementById('select-gpt-button');

        if (newChatButton) {
            newChatButton.addEventListener('click', () => this.createNewChat());
        }

        if (selectGPTButton) {
            selectGPTButton.addEventListener('click', () => this.openModal());
        }

        // Eventos do Dropdown de Configurações (exemplo de logout)
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

    /* --- Funções de Carregamento e População de Menus --- */
    async loadChatList() {
        const params = {
            company_name: CONFIG.companyName,
            user_name: CONFIG.userName,
            user_id: CONFIG.userId
        };
        try {
            const chatData = await this.apiService.request('readChat', params, 'GET');
            console.log('Lista de chats recebida da API:', chatData);

            if (chatData.status === 'success' && chatData.data) {
                let dataArray;

                if (typeof chatData.data === 'string') {
                    dataArray = JSON.parse(chatData.data);
                    if (!Array.isArray(dataArray)) throw new Error('Dados da API não são um array.');
                } else if (Array.isArray(chatData.data)) {
                    dataArray = chatData.data;
                } else if (typeof chatData.data === 'object') {
                    if (Array.isArray(chatData.data.chats)) {
                        dataArray = chatData.data.chats;
                    } else {
                        throw new Error('Estrutura inesperada para a propriedade "data".');
                    }
                } else {
                    throw new Error('Tipo desconhecido para a propriedade "data".');
                }

                // Verifique se dataArray é um array
                if (!Array.isArray(dataArray)) {
                    console.error('dataArray não é um array:', dataArray);
                    this.showError('Erro ao processar os dados da lista de chats.');
                    return;
                }

                // Atualizar estado
                this.stateManager.chats = dataArray.map(chat => ({
                    ...chat,
                    date: chat.last_modified || new Date().toISOString()
                })).filter(chat => chat.date !== null);

                // Popular o menu de chats
                this.populateChatMenu(this.stateManager.chats);
            } else {
                throw new Error(chatData.message || 'Formato inesperado de resposta.');
            }
        } catch (error) {
            console.error('Erro ao carregar lista de chats:', error);
            this.showError('Erro ao carregar a lista de chats. Verifique o console para mais detalhes.');
        }
    }

    populateChatMenu(chatsToDisplay) {
        const chatList = document.getElementById('chat-list');
        if (!chatList) {
            console.error('Elemento chat-list não encontrado.');
            return;
        }
        chatList.innerHTML = '';

        if (!chatsToDisplay || chatsToDisplay.length === 0) {
            const emptyMessage = document.createElement('li');
            emptyMessage.textContent = 'Nenhum chat encontrado.';
            emptyMessage.classList.add('list-group-item', 'text-center');
            chatList.appendChild(emptyMessage);
            return;
        }

        const fragment = document.createDocumentFragment();

        // Agrupar chats por data
        const groupedChats = {};
        chatsToDisplay.forEach(chat => {
            const group = this.getDateGroup(chat.date);
            if (!groupedChats[group]) groupedChats[group] = [];
            groupedChats[group].push(chat);
        });

        // Ordem dos grupos
        const groupOrder = ["Hoje", "Ontem", "Anteontem", "Esta semana", "Semana passada", "Mês passado"];
        groupOrder.forEach(group => {
            if (groupedChats[group]) {
                // Cabeçalho do grupo
                const groupHeader = document.createElement('li');
                groupHeader.classList.add('list-group-item', 'fw-bold', 'bg-light', 'text-muted');
                groupHeader.textContent = group;
                fragment.appendChild(groupHeader);

                // Itens do grupo
                groupedChats[group].forEach(chat => {
                    const chatItem = document.createElement('li');
                    chatItem.classList.add('list-group-item', 'chat-item', 'd-flex', 'justify-content-between', 'align-items-center');
                    chatItem.innerHTML = `
                        <span class="chat-name">${this.highlightSearch(chat.name || 'Chat sem nome')}</span>
                        <button class="btn btn-sm btn-danger delete-chat-button" title="Excluir Chat">
                            <i class="bi bi-trash"></i>
                        </button>
                    `;
                    chatItem.dataset.chatId = chat.id;
                    chatItem.dataset.chatDate = chat.date;

                    // Eventos
                    chatItem.querySelector('.delete-chat-button').addEventListener('click', (event) => {
                        event.stopPropagation(); // Evita o evento de clique no chat
                        this.handleDeleteChat(chat.id, chat.name);
                    });

                    chatItem.addEventListener('click', () => this.handleChatClick(chat));
                    fragment.appendChild(chatItem);
                });
            }
        });

        chatList.appendChild(fragment);
    }

    /* --- Funções de Manipulação de Chats --- */
    handleChatClick(chat) {
        this.stateManager.setSessionId(chat.id);
        this.initializeChatbot();
        this.selectChatItem(chat.id);
    }

    async handleDeleteChat(chatId, chatName) {
        const confirmDelete = confirm(`Tem certeza que deseja excluir o chat "${chatName}"?`);
        if (!confirmDelete) return;

        try {
            const params = {
                company_name: CONFIG.companyName,
                user_name: CONFIG.userName,
                user_id: CONFIG.userId,
                session_id: chatId
            };
            const deleteResponse = await this.apiService.request('deleteChat', params, 'DELETE');
            console.log('Resposta da API de exclusão:', deleteResponse);

            if (deleteResponse.status === "success") {
                this.showAlert('Chat excluído com sucesso.', 'success');
                this.stateManager.removeChat(chatId);
                this.populateChatMenu(this.stateManager.chats);

                if (this.stateManager.currentSessionId === chatId) {
                    this.stateManager.setSessionId("");
                    await this.initializeChatbot();
                }

                // Remover do localStorage se estava selecionado
                const selectedChatId = localStorage.getItem('selectedChatId');
                if (selectedChatId === chatId) {
                    localStorage.removeItem('selectedChatId');
                }
            } else {
                throw new Error(deleteResponse.message || 'Erro desconhecido.');
            }
        } catch (error) {
            console.error('Erro ao excluir o chat:', error);
            this.showError('Erro ao excluir o chat. Verifique o console para mais detalhes.');
        }
    }

    /* --- Funções de Seleção de Chats --- */
    selectChatItem(chatId) {
        const chatItems = document.querySelectorAll('#chat-list .chat-item');
        chatItems.forEach(item => {
            if (item.dataset.chatId === chatId) {
                item.classList.add('active');
                localStorage.setItem('selectedChatId', chatId);
            } else {
                item.classList.remove('active');
            }
        });
    }

    /* --- Funções de Filtragem de Chats --- */
    filterChatList() {
        const searchInput = document.getElementById('search-input').value.toLowerCase();
        const clearButton = document.getElementById('clear-search-button');

        // Mostrar ou esconder o botão "X"
        if (searchInput.length > 0) {
            clearButton.classList.add('d-block');
        } else {
            clearButton.classList.remove('d-block');
        }

        const filteredChats = this.stateManager.chats.filter(chat => {
            const chatName = chat.name || 'Chat sem nome';
            return chatName.toLowerCase().includes(searchInput);
        });
        this.populateChatMenu(filteredChats);
    }

    clearSearch() {
        const searchInput = document.getElementById('search-input');
        searchInput.value = '';
        document.getElementById('clear-search-button').classList.remove('d-block');
        this.populateChatMenu(this.stateManager.chats);
        searchInput.focus();
    }

    highlightSearch(text) {
        const searchQuery = document.getElementById('search-input').value.toLowerCase();
        if (!searchQuery) return text;
        const regex = new RegExp(`(${this.escapeRegExp(searchQuery)})`, 'gi');
        return text.replace(regex, '<span class="highlight">$1</span>');
    }

    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /* --- Funções de Inicialização do Chatbot --- */
    async initializeChatbot() {
        try {
            if (!this.stateManager.currentSessionId) {
                this.stateManager.setSessionId(this.generateSessionId());
                const defaultChatName = this.stateManager.selectedGPT ? this.stateManager.selectedGPT.name : 'Novo chat';
                const defaultChat = {
                    id: this.stateManager.currentSessionId,
                    name: defaultChatName,
                    date: new Date().toISOString()
                };
                this.stateManager.addChat(defaultChat);
                this.populateChatMenu(this.stateManager.chats);
            }

            // Limpar histórico injetado
            localStorage.removeItem(`${CONFIG.flowiseChatflowId}_historyInjected`);
            localStorage.removeItem(`${CONFIG.flowiseChatflowId}_EXTERNAL`);

            // Injetar histórico
            await this.injectChatHistory();

            // Remover o chatbot anterior e inserir um novo
            const chatbotContainer = document.getElementById('chatbot-container');
            if (chatbotContainer) {
                chatbotContainer.innerHTML = '<flowise-fullchatbot></flowise-fullchatbot>';
            } else {
                console.error('Elemento chatbot-container não encontrado.');
                return;
            }

            // Definir o systemMessage fixo a partir das configurações do GPT
            const fixedSystemMessage = { 
                toolAgent_0: this.stateManager.systemMessage
            };

            // Corrigir a temperatura
            const parsedTemperature = parseFloat(this.stateManager.temperature.toString().replace(',', '.')) || 0.2;

            // Configurar o objeto de chatflowConfig com systemMessage e outras variáveis
            const chatflowConfig = {
                sessionId: this.stateManager.currentSessionId,
                systemMessage: fixedSystemMessage,
                returnSourceDocuments: true,
                retrieverTool_0: this.stateManager.retrieverTools[0] || "",
                retrieverTool_1: this.stateManager.retrieverTools[1] || "",
                description: {
                    retrieverTool_0: "Descrição da ferramenta 0",
                    retrieverTool_1: "Descrição da ferramenta 1"
                },
                maxIterations: {
                    toolAgent_0: parseInt(this.stateManager.maxIterations) || 10
                },
                openAIApiKey: this.stateManager.openAIApiKey,
                modelName: this.stateManager.modelName,
                temperature: parsedTemperature,
                pinecone: {
                    pineconeApiKey: this.stateManager.pineconeApiKey,
                    pineconeIndex: this.stateManager.pineconeIndex,
                    pineconeNamespace: this.stateManager.pineconeNamespace
                }
            };

            console.log('Chatflow Config:', chatflowConfig);

            // Inicializar o chatbot com as configurações atualizadas
            Chatbot.initFull({
                chatflowid: CONFIG.flowiseChatflowId,
                apiHost: CONFIG.flowiseApiHost,
                chatflowConfig: chatflowConfig,
                theme: {
                    chatWindow: {
                        showTitle: true,
                        title: this.stateManager.selectedGPT ? this.stateManager.selectedGPT.name : 'Escolha um GPT',
                        titleAvatarSrc:  "https://www.bhm.tec.br/images/152x152/10788698/favicon.png",
                        welcomeMessage: 'Como posso ajudar?',
                        backgroundColor: '#ffffff',
                        fontSize: 15,
                        starterPrompts: ['Quem é você?', 'O que sabe fazer?'],
                        clearChatOnReload: false, // If set to true, the chat will be cleared when the page reloads
                        botMessage: {
                            backgroundColor: "#ffffff",
                            textColor: "#303235",
                            showAvatar: true,
                            avatarSrc: "https://www.bhm.tec.br/images/152x152/10788698/favicon.png",
                        },
                        userMessage: {
                            backgroundColor: "#f7f8ff",
                            textColor: "#000000",
                            showAvatar: false,
                            avatarSrc: "https://www.bhm.tec.br/images/152x152/10788698/favicon.png",
                        },                
                        textInput: {
                            placeholder: 'Mensagem para o LexiDecis',
                            backgroundColor: '#ffffff',                    
                            textColor: '#303235',
                            sendButtonColor: '#3B81F6',
                            maxChars: 1500,
                            maxCharsWarningMessage: 'Você excedeu o limite de caracteres. Por favor, insira menos de 1500 caracteres.',
                            autoFocus: true,
                            sendMessageSound: true,
                            receiveMessageSound: true,
                        },
                        feedback: {
                            color: '#303235',
                        },
                        dateTimeToggle: {
                            date: true,
                            time: true,
                        },
                        footer: {
                            textColor: '#303235',
                            text: 'Powered by',
                            company: 'Lexidecis',
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
                document.getElementById('chatbot-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 500);
        } catch (error) {
            console.error('Erro ao inicializar o chatbot:', error);
            this.showError('Erro ao inicializar o chatbot. Verifique o console para mais detalhes.');
        }
    }

    async injectChatHistory() {
        const apiURL = `${CONFIG.flowiseApiHost}/api/v1/chatmessage/${CONFIG.flowiseChatflowId}?sessionId=${this.stateManager.currentSessionId}&user_id=${encodeURIComponent(CONFIG.userId)}`;
        try {
            const response = await fetch(apiURL, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${CONFIG.flowiseToken}`
                }
            });

            if (!response.ok) throw new Error("Erro ao buscar histórico de mensagens da API");

            const apiHistory = await response.json();

            const formattedHistory = apiHistory.map((msg) => ({
                message: msg.content,
                type: msg.role === "userMessage" ? "userMessage" : "apiMessage",
                dateTime: msg.createdDate || new Date().toISOString(),
                messageId: msg.id || Math.random().toString(36).substring(2),
                fileUploads: msg.fileUploads || []
            }));

            const chatData = {
                chatHistory: formattedHistory,
                chatId: apiHistory[0]?.chatId || "default-chat-id"
            };

            const historyKey = `${CONFIG.flowiseChatflowId}_EXTERNAL`;
            localStorage.setItem(historyKey, JSON.stringify(chatData));
            localStorage.setItem(`${CONFIG.flowiseChatflowId}_historyInjected`, "true");
        } catch (error) {
            console.error("Erro ao injetar histórico no localStorage:", error);
            this.showError("Erro ao buscar histórico de mensagens da API.");
        }
    }

    /* --- Funções de Seleção de GPT --- */
    async openModal() {
        await this.loadGPTList();
        if (this.modal) {
            this.modal.show();
        } else {
            console.error('Modal não está inicializado.');
        }
    }

    async loadGPTList() {
        const params = {
            company_name: CONFIG.companyName,
            user_name: CONFIG.userName,
            user_id: CONFIG.userId
        };
        try {
            const gptData = await this.apiService.request('readGPT', params, 'GET');
            console.log('Lista de GPTs:', gptData);
            this.populateGPTMenu(gptData);
        } catch (error) {
            console.error('Erro ao carregar lista de GPTs:', error);
            this.showError('Erro ao carregar a lista de GPTs. Verifique o console para mais detalhes.');
        }
    }

    populateGPTMenu(gpts) {
        const gptList = document.getElementById('gpt-list');
        if (!gptList) {
            console.error('Elemento gpt-list não encontrado.');
            return;
        }
        gptList.innerHTML = ''; // Limpar lista existente

        if (!gpts || gpts.length === 0) {
            const emptyMessage = document.createElement('li');
            emptyMessage.textContent = 'Nenhum GPT encontrado.';
            emptyMessage.classList.add('list-group-item', 'text-center');
            gptList.appendChild(emptyMessage);
            return;
        }

        const fragment = document.createDocumentFragment();

        gpts.forEach(gpt => {
            if (!gpt.enabled) return;

            const gptItem = document.createElement('li');
            gptItem.classList.add('list-group-item', 'gpt-list-item', 'd-flex', 'flex-column', 'cursor-pointer');
            gptItem.innerHTML = `
                <div class="gpt-name fw-bold">${gpt.name}</div>
                <div class="gpt-description text-muted">${gpt.description || 'Sem descrição'}</div>
            `;
            gptItem.dataset.gptId = gpt.id;
            gptItem.addEventListener('click', () => this.selectGPTItem(gpt));
            fragment.appendChild(gptItem);
        });

        gptList.appendChild(fragment);
    }

    async selectGPTItem(gpt) {
        this.stateManager.setSelectedGPT(gpt);
        console.log('GPT selecionado:', gpt);

        // Atualizar a configuração do chatbot com o GPT selecionado
        if (this.stateManager.selectedGPTId) {
            await this.fetchGPTConfig(this.stateManager.selectedGPTId);

            if (!this.stateManager.currentSessionId) {
                this.stateManager.setSessionId(this.generateSessionId());
                const defaultChatName = this.stateManager.selectedGPT.name;
                const defaultChat = {
                    id: this.stateManager.currentSessionId,
                    name: defaultChatName,
                    date: new Date().toISOString()
                };
                this.stateManager.addChat(defaultChat);
                this.populateChatMenu(this.stateManager.chats);
            }

            await this.initializeChatbot();
        } else {
            console.error('GPT selecionado não possui um id válido.');
        }

        // Persistir a seleção do GPT
        localStorage.setItem('selectedGPT', JSON.stringify(this.stateManager.selectedGPT));
        localStorage.setItem('selectedGPTId', this.stateManager.selectedGPTId);
        localStorage.setItem('gptConfig', JSON.stringify(this.stateManager.gptConfig));

        // Fechar o modal
        if (this.modal) {
            this.modal.hide();
        }
    }

    async fetchGPTConfig(gptId) {
        const params = {
            gpt_id: gptId,
            company_name: CONFIG.companyName,
            user_name: CONFIG.userName,
            user_id: CONFIG.userId
        };
        try {
            const configData = await this.apiService.request('overrideConfig', params, 'GET');
            console.log('Configurações do GPT:', configData);

            this.stateManager.setGPTConfig({});

            configData.forEach(configItem => {
                const { name, value } = configItem;

                switch (name) {
                    case 'openAI':
                        this.stateManager.openAIApiKey = value.openAIApiKey?.chatOpenAI_0 || "";
                        this.stateManager.modelName = value.modelName?.chatOpenAI_0 || "";
                        this.stateManager.temperature = value.temperature?.chatOpenAI_0 ? parseFloat(value.temperature.chatOpenAI_0.replace(',', '.')) : 0.2;
                        break;
                    case 'toolAgent':
                        this.stateManager.systemMessage = value.systemMessage?.toolAgent_0 || "";
                        this.stateManager.maxIterations = value.maxIterations?.toolAgent_0 || "";
                        break;
                    case 'retrieverTool':
                        this.stateManager.retrieverTools = Object.values(value.name).filter(Boolean);
                        break;
                    case 'pinecone':
                        this.stateManager.pineconeApiKey = value.pineconeApiKey?.pinecone_0 || "";
                        this.stateManager.pineconeIndex = value.pineconeIndex?.pinecone_0 || "";
                        this.stateManager.pineconeNamespace = value.pineconeNamespace?.pinecone_0 || "";
                        break;
                    default:
                        console.warn(`Configuração desconhecida: ${name}`);
                }

                // Armazenar no objeto gptConfig para uso futuro
                this.stateManager.gptConfig[name] = value;
            });

            console.log('Variáveis de configuração definidas:', {
                openAIApiKey: this.stateManager.openAIApiKey,
                modelName: this.stateManager.modelName,
                temperature: this.stateManager.temperature,
                systemMessage: this.stateManager.systemMessage,
                maxIterations: this.stateManager.maxIterations,
                retrieverTools: this.stateManager.retrieverTools,
                pineconeApiKey: this.stateManager.pineconeApiKey,
                pineconeIndex: this.stateManager.pineconeIndex,
                pineconeNamespace: this.stateManager.pineconeNamespace
            });
        } catch (error) {
            console.error('Erro ao buscar configurações do GPT:', error);
            this.showError('Erro ao buscar configurações do GPT. Verifique o console para mais detalhes.');
        }
    }

    /* --- Funções de Criação de Novo Chat --- */
    async createNewChat() {
        if (this.stateManager.currentSessionId) {
            console.log('Criando um novo chat...');
            this.stateManager.setSessionId("");
        }

        const newSessionId = this.generateSessionId();
        const newChat = {
            id: newSessionId,
            name: this.stateManager.selectedGPT ? this.stateManager.selectedGPT.name : 'LexiDecis Bot 1',
            date: new Date().toISOString()
        };
        this.stateManager.addChat(newChat);
        this.populateChatMenu(this.stateManager.chats);
        this.stateManager.setSessionId(newSessionId);

        const chatbotContainer = document.getElementById('chatbot-container');
        if (chatbotContainer) {
            chatbotContainer.innerHTML = '';
        }

        await this.initializeChatbot();
    }

    /* --- Funções de Seleção Padrão e Persistência --- */
    async loadSelectedGPT() {
        const storedGPT = localStorage.getItem('selectedGPT');
        const storedGPTId = localStorage.getItem('selectedGPTId');
        const storedGPTConfig = localStorage.getItem('gptConfig');
        if (storedGPT && storedGPTId && storedGPTConfig) {
            this.stateManager.setSelectedGPT(JSON.parse(storedGPT));
            this.stateManager.selectedGPTId = storedGPTId;
            this.stateManager.setGPTConfig(JSON.parse(storedGPTConfig));
            console.log('GPT carregado do localStorage:', this.stateManager.selectedGPT);

            // Definir as variáveis de configuração a partir de gptConfig
            if (this.stateManager.gptConfig.openAI) {
                this.stateManager.openAIApiKey = this.stateManager.gptConfig.openAI.openAIApiKey?.chatOpenAI_0 || "";
                this.stateManager.modelName = this.stateManager.gptConfig.openAI.modelName?.chatOpenAI_0 || "";
                this.stateManager.temperature = this.stateManager.gptConfig.openAI.temperature || "0.2";
                this.stateManager.temperature = parseFloat(this.stateManager.temperature.toString().replace(',', '.')) || 0.2;
            }
            if (this.stateManager.gptConfig.toolAgent) {
                this.stateManager.systemMessage = this.stateManager.gptConfig.toolAgent.systemMessage?.toolAgent_0 || "";
                this.stateManager.maxIterations = this.stateManager.gptConfig.toolAgent.maxIterations?.toolAgent_0 || "";
            }
            if (this.stateManager.gptConfig.retrieverTool) {
                this.stateManager.retrieverTools = Object.values(this.stateManager.gptConfig.retrieverTool.name).filter(Boolean);
            }
            if (this.stateManager.gptConfig.pinecone) {
                this.stateManager.pineconeApiKey = this.stateManager.gptConfig.pinecone.pineconeApiKey?.pinecone_0 || "";
                this.stateManager.pineconeIndex = this.stateManager.gptConfig.pinecone.pineconeIndex?.pinecone_0 || "";
                this.stateManager.pineconeNamespace = this.stateManager.gptConfig.pinecone.pineconeNamespace?.pinecone_0 || "";
            }

            await this.initializeChatbot();
        } else {
            await this.selectDefaultGPT(1);
        }
    }

    loadSelectedChat() {
        const selectedChatId = localStorage.getItem('selectedChatId');
        if (selectedChatId) {
            const selectedChat = this.stateManager.chats.find(chat => chat.id === selectedChatId);
            if (selectedChat) {
                this.stateManager.setSessionId(selectedChat.id);
                this.initializeChatbot();
                this.selectChatItem(selectedChat.id);
            }
        }
    }

    /* --- Funções Auxiliares --- */
    getDateGroup(date) {
        const today = new Date();
        const chatDate = new Date(date);

        today.setHours(0,0,0,0);
        chatDate.setHours(0,0,0,0);

        const diffTime = today - chatDate;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return "Hoje";
        if (diffDays === 1) return "Ontem";
        if (diffDays === 2) return "Anteontem";
        if (diffDays < 7) return "Esta semana";
        if (diffDays < 30) return "Semana passada";
        return "Mês passado";
    }

    generateSessionId() {
        return crypto.randomUUID(); // Gera um UUID
    }

    /* --- Funções de Log e Erro --- */
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
                    company_name: CONFIG.companyName,
                    user_name: CONFIG.userName,
                    user_id: CONFIG.userId,
                    sessionid: this.stateManager.currentSessionId
                };
                const response = await this.apiService.request('updateChat', params, 'POST', {});
                console.log('Resposta da API:', response);

                if (response.status === "success") {
                    console.log('Resposta da API bem-sucedida:', response.message);
                    await this.loadChatList();
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
            alert(message); // Fallback caso o container não exista
        }
    }

    showAlert(message, type = 'danger') {
        const errorContainer = document.getElementById('error-container');
        if (errorContainer) {
            errorContainer.textContent = message;
            errorContainer.className = `alert alert-${type} position-fixed bottom-0 end-0 m-3`;
            errorContainer.classList.remove('d-none');
            setTimeout(() => {
                errorContainer.classList.add('d-none');
            }, 5000);
        }
    }

    /* --- Funções de Seleção Padrão e Persistência --- */
    async selectDefaultGPT(gptId) {
        // Implemente a lógica para selecionar um GPT padrão
        console.log(`Selecione o GPT padrão com ID: ${gptId}`);
        await this.loadGPTList();
        const gptList = document.getElementById('gpt-list');
        if (gptList) {
            const defaultGPTItem = gptList.querySelector(`.gpt-list-item[data-gpt-id="${gptId}"]`);
            if (defaultGPTItem) {
                defaultGPTItem.click();
            } else {
                console.warn('GPT padrão não encontrado na lista.');
            }
        }
    }

    /* --- Funções de Controle de Cabeçalho --- */
    hideHeader() {
        // Se não estiver usando o cabeçalho, esta função pode ser omitida
    }

    showHeader() {
        // Se não estiver usando o cabeçalho, esta função pode ser omitida
    }

    /* --- Funções de Logout --- */
    logout() {
        // Implemente a lógica de logout aqui
        console.log('Usuário desconectado.');
        // Por exemplo, redirecionar para a página de login
        window.location.href = '/login';
    }
}

/* ==========================
   5. Inicialização da Aplicação
   ========================== */
document.addEventListener('DOMContentLoaded', async () => {
    const apiService = new ApiService(CONFIG);
    const stateManager = new StateManager();
    const uiManager = new UIManager(apiService, stateManager);

    // Carregar lista de chats
    await uiManager.loadChatList();

    // Carregar GPT selecionado anteriormente ou selecionar padrão
    await uiManager.loadSelectedGPT();

    // Carregar chat selecionado anteriormente
    uiManager.loadSelectedChat();

    // Se nenhum GPT foi selecionado, inicializar com GPT padrão
    if (!stateManager.selectedGPT) {
        await uiManager.initializeChatbot();
    }
});