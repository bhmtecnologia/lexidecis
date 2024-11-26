import Chatbot from "./web.js";
//import { showToast } from './toast.js'; // Importa a função showToast do toast.js
import ApiService from './apiService.js';
import StateManager from './stateManager.js';
import HistoryManager from './historyManager.js';

/* ================================
   1. Configurações e Constantes
   ================================ */

// Recuperar as variáveis do sessionStorage
const tenant = sessionStorage.getItem("tenant");
const uuid = sessionStorage.getItem("uuid");
const email = sessionStorage.getItem("email");

// Definição das configurações da aplicação, incluindo informações do usuário, empresa e credenciais da API
const CONFIG = {
    userId: 4, // ID do usuário
    userUuid: uuid, // UUID do usuário
    companyName: tenant, // Nome da empresa
    userName: email, // Nome do usuário
    flowiseChatflowId: 'fd33f1f1-5543-4cf6-b22f-485bf1bedeb5', // ID do fluxo de chat do Flowise
    flowiseApiHost: 'https://flowise.prod.bhm.tec.br', // URL base da API do Flowise
    flowiseToken: '5AmGA-dXg_NfVl0dMoslPbCd8FpzRxAs7uOK91MKS_E', // Token de autenticação do Flowise
    apiCredentials: {
        // Credenciais e URLs para diferentes endpoints da API
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
   4. UI e Manipulação de Eventos
   ========================== */
// Classe para gerenciar a interface do usuário e eventos associados
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
            selectGPTButton.addEventListener('click', () => this.openModal());
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

    /* --- Funções de Carregamento e População de Menus --- */
    // Carrega a lista de chats a partir da API e atualiza a interface
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

    // Atualiza a lista de chats exibida na interface
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
                    <div class="chat-item d-flex align-items-center justify-content-between">
                        <span class="chat-name text-start">${this.highlightSearch(chat.name || 'Chat sem nome')}</span>
                        <div class="dropdown">
                            <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" id="chatOptions-${chat.id}" data-bs-toggle="dropdown" aria-expanded="false" title="Opções">
                                <i class="bi bi-three-dots"></i>
                            </button>
                            <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="chatOptions-${chat.id}">
                                <li>
                                    <button class="dropdown-item rename-chat-button" data-chat-id="${chat.id}" title="Renomear Chat">
                                        Renomear
                                    </button>
                                </li>
                                <li>
                                    <button class="dropdown-item delete-chat-button" data-chat-id="${chat.id}" title="Excluir Chat">
                                        Excluir
                                    </button>
                                </li>
                            </ul>
                        </div>
                    </div>
                `;

                    chatItem.dataset.chatId = chat.id;
                    chatItem.dataset.chatDate = chat.date;

                    // Eventos
                    chatItem.querySelector('.rename-chat-button').addEventListener('click', (event) => {
                        event.stopPropagation(); // Evita o evento de clique no chat
                        this.handleRenameChat(chat.id, chat.name || 'Chat sem nome');
                    });                    
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
    // Lida com o clique em um chat existente na lista
    handleChatClick(chat) {
        this.stateManager.setSessionId(chat.id);
        this.initializeChatbot();
        this.selectChatItem(chat.id);
    }

    // Lida com a renomeação de um chat
    async handleRenameChat(chatId, oldChatName) {
        const newChatName = prompt(`Renomear "${oldChatName}" para:`, oldChatName);
        if (!newChatName || newChatName.trim() === oldChatName.trim()) return;
    
        try {
            const params = {
                company_name: CONFIG.companyName,
                user_name: CONFIG.userName,
                user_id: CONFIG.userId,
                sessionid: chatId,
                new_chat_name: newChatName.trim()
            };
            const renameResponse = await this.apiService.request(
                'updateChat',
                params,
                'POST',
                null,
                { includeParamsInQuery: true } // Adiciona esta linha
            );
            console.log('Resposta da API de renomeação:', renameResponse);
    
            if (renameResponse.status === "success") {
                this.showAlert('Chat renomeado com sucesso.', 'success');
                const chatToRename = this.stateManager.chats.find(chat => chat.id === chatId);
                if (chatToRename) {
                    chatToRename.name = newChatName.trim();
                    this.populateChatMenu(this.stateManager.chats);
                }
            } else {
                throw new Error(renameResponse.message || 'Erro desconhecido.');
            }
        } catch (error) {
            console.error('Erro ao renomear o chat:', error);
            this.showError('Erro ao renomear o chat. Verifique o console para mais detalhes.');
        }
    }

    // Lida com a exclusão de um chat
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
    // Destaca o chat selecionado na interface
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
    // Filtra a lista de chats com base no termo de pesquisa
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

    // Limpa o campo de pesquisa e restaura a lista de chats
    clearSearch() {
        const searchInput = document.getElementById('search-input');
        searchInput.value = '';
        document.getElementById('clear-search-button').classList.remove('d-block');
        this.populateChatMenu(this.stateManager.chats);
        searchInput.focus();
    }

    // Destaca o termo de pesquisa nos nomes dos chats
    highlightSearch(text) {
        const searchQuery = document.getElementById('search-input').value.toLowerCase();
        if (!searchQuery) return text;
        const regex = new RegExp(`(${this.escapeRegExp(searchQuery)})`, 'gi');
        return text.replace(regex, '<span class="highlight">$1</span>');
    }

    // Escapa caracteres especiais para uso em expressões regulares
    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /* --- Funções de Inicialização do Chatbot --- */
    // Inicializa o chatbot com as configurações atuais
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
            await HistoryManager.injectChatHistory(this.stateManager.currentSessionId, CONFIG);

            // Remover o chatbot anterior e inserir um novo
            const chatbotContainer = document.getElementById('chatbot-container');
            if (chatbotContainer) {
                chatbotContainer.innerHTML = '<flowise-fullchatbot></flowise-fullchatbot>';
            } else {
                console.error('Elemento chatbot-container não encontrado.');
                return;
            }

            // Configurar o objeto de chatflowConfig com gptConfig completo
            const chatflowConfig = {
                sessionId: this.stateManager.currentSessionId,
                ...this.stateManager.gptConfig, // Integração direta do gptConfig
                // Adicione outras configurações fixas aqui, se necessário
            };

            console.log('Chatflow Config:', chatflowConfig);

            // Inicializar o chatbot com as configurações atualizadas
            Chatbot.initFull({
                chatflowid: CONFIG.flowiseChatflowId,
                apiHost: CONFIG.flowiseApiHost,
                chatflowConfig: chatflowConfig,
                theme: {
                    chatWindow: {
                        button: {
                            backgroundColor: "black"
                        },
                        showTitle: true,
                        title: this.stateManager.selectedGPT ? this.stateManager.selectedGPT.name : 'Escolha um GPT',
                        titleAvatarSrc:  "https://www.bhm.tec.br/images/152x152/10788698/favicon.png",
                        welcomeMessage: 'Como posso ajudar?',
                        backgroundColor: '#ffffff',
                        fontSize: 15,
                        starterPrompts: ['Quem é você?', 'O que sabe fazer?'],
                        clearChatOnReload: false, // Se verdadeiro, o chat será limpo ao recarregar a página. Está desativado para permitir o injection
                        botMessage: {
                            backgroundColor: "#ffffff",
                            textColor: "#000000",
                            showAvatar: true,
                            avatarSrc: "https://www.bhm.tec.br/images/152x152/10788698/favicon.png",
                        },
                        userMessage: {
                            backgroundColor: "#282828",
                            textColor: "#ffffff",
                            showAvatar: false,
                            //avatarSrc: "https://www.bhm.tec.br/images/152x152/10788698/favicon.png", // Se o ShowAvatar for false esse item deve estar comentado
                        },                
                        textInput: {
                            placeholder: 'Mensagem para o LexiDecis',
                            backgroundColor: '#282828',                    
                            textColor: '#ffffff',
                            sendButtonColor: '#ffffff',
                            maxChars: 5000,
                            maxCharsWarningMessage: 'Você excedeu o limite de caracteres. Por favor, insira menos de 5000 caracteres.',
                            autoFocus: true,
                            sendMessageSound: true,
                            receiveMessageSound: true,
                        },
                        feedback: {
                            color: '#000000',
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

    // Injeta o histórico de chat previamente salvo


    /* --- Funções de Seleção de GPT --- */
    // Abre o modal para seleção de um GPT
    async openModal() {
        await this.loadGPTList();
        if (this.modal) {
            this.modal.show();
        } else {
            console.error('Modal não está inicializado.');
        }
    }

    // Carrega a lista de GPTs disponíveis a partir da API
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

    // Popula o menu de seleção de GPTs na interface
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

    // Lida com a seleção de um GPT pelo usuário
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

    // Busca as configurações detalhadas do GPT selecionado
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

            // Agregar todos os objetos 'value' em um único objeto gptConfig
            const aggregatedConfig = configData.reduce((acc, current) => {
                return { ...acc, ...current.value };
            }, {});

            // Atualizar o stateManager com o gptConfig agregado
            this.stateManager.setGPTConfig(aggregatedConfig);

            console.log('Configurações agregadas do GPT:', this.stateManager.gptConfig);
        } catch (error) {
            console.error('Erro ao buscar configurações do GPT:', error);
            this.showError('Erro ao buscar configurações do GPT. Verifique o console para mais detalhes.');
        }
    }

    /* --- Funções de Criação de Novo Chat --- */
    // Cria um novo chat e inicializa o chatbot
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
            console.log('Iniciando Flowise FullChatbot');
            chatbotContainer.innerHTML = '';
        }

        await this.initializeChatbot();
    }

    /* --- Funções de Seleção Padrão e Persistência --- */
    // Carrega o GPT selecionado previamente ou seleciona o GPT padrão
    async loadSelectedGPT() {
        const storedGPT = localStorage.getItem('selectedGPT');
        const storedGPTId = localStorage.getItem('selectedGPTId');
        const storedGPTConfig = localStorage.getItem('gptConfig');
        if (storedGPT && storedGPTId && storedGPTConfig) {
            this.stateManager.setSelectedGPT(JSON.parse(storedGPT));
            this.stateManager.selectedGPTId = storedGPTId;
            this.stateManager.setGPTConfig(JSON.parse(storedGPTConfig));
            console.log('GPT carregado do localStorage:', this.stateManager.selectedGPT);

            // Nenhuma necessidade de decompor, pois utilizamos o objeto completo

            //await this.initializeChatbot(); //verificar se o chat nao está sendo puxado duplicado, e ver se remover da erro
        } else {
            await this.selectDefaultGPT(1);
        }
    }

    // Carrega o chat selecionado previamente
    loadSelectedChat() {
        const selectedChatId = localStorage.getItem('selectedChatId');
        if (selectedChatId) {
            const selectedChat = this.stateManager.chats.find(chat => chat.id === selectedChatId);
            if (selectedChat) {
                this.stateManager.setSessionId(selectedChat.id);
                //this.initializeChatbot();
                this.selectChatItem(selectedChat.id);
            }
        }
    }

    /* --- Funções Auxiliares --- */
    // Retorna o grupo de data para agrupar os chats na interface
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

    // Função para gerar um novo ID de sessão
    generateSessionId() {
        const timestamp = BigInt(Date.now()) * 1000n;  // Obtém o timestamp atual em milissegundos
        const randomComponent = BigInt(Math.floor(Math.random() * 1000));  // Gera um número aleatório entre 0 e 999
        const sessionId = timestamp + randomComponent;  // Soma o timestamp com o número aleatório para gerar um ID único
        return sessionId.toString();  // Converte o BigInt para string
    }

    /* --- Funções de Log e Erro --- */
    // Loga a entrada do usuário
    logUserInput(userInput) {
        console.log({ userInput });
    }

    // Loga as mensagens trocadas no chat
    logMessages(messages) {
        console.log({ messages });
    }

    // Lida com o estado de carregamento do chatbot
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
                const response = await this.apiService.request('updateChat', params, 'POST', null, { includeParamsInQuery: true });
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

    // Exibe uma mensagem de erro na interface
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

    // Exibe uma mensagem de alerta na interface
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
    // Seleciona o GPT padrão caso nenhum esteja selecionado
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
    // Oculta o cabeçalho da interface
    hideHeader() {
        // Implemente a lógica para ocultar o cabeçalho, se necessário
        // Por exemplo:
        const header = document.getElementById('header');
        if (header) {
            header.classList.add('d-none');
        }
    }

    // Exibe o cabeçalho da interface
    showHeader() {
        // Implemente a lógica para exibir o cabeçalho, se necessário
        // Por exemplo:
        const header = document.getElementById('header');
        if (header) {
            header.classList.remove('d-none');
        }
    }

    /* --- Funções de Logout --- */
    // Realiza o logout do usuário
    logout() {
        // Implemente a lógica de logout aqui
        console.log('Usuário desconectado.');
        // Por exemplo, limpar sessionStorage e redirecionar para a página de login
        sessionStorage.clear();
        localStorage.clear();
        window.location.href = '/login';
    }
}

/* ==========================
   5. Inicialização da Aplicação
   ========================== */
// Evento que inicia a aplicação quando o documento é carregado
// Evento que inicia a aplicação quando o documento é carregado
document.addEventListener('DOMContentLoaded', async () => {
    const apiService = new ApiService(CONFIG);
    const stateManager = new StateManager();
    const uiManager = new UIManager(apiService, stateManager);


    // Inicialização dos tooltips e Funcionalidade da Sidebar
    // Inicialização dos tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Carregar GPT selecionado ou padrão
    await stateManager.loadSelectedGPT(1, apiService); // 1 é o ID do GPT padrão

    // Carregar lista de chats
    await uiManager.loadChatList();
    
    // Carregar chat selecionado
    stateManager.loadSelectedChat();
    
    // Inicializar o chatbot após carregar GPT e chat
    await uiManager.initializeChatbot();
    
    // Adicionar uma notificação de boas-vindas ao finalizar a inicialização
    //showToast("Bem-vindo!", "Seu sistema de I.A está pronto para uso.", "success");
});