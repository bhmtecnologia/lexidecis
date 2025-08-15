const DEBUG_MODE = ['localhost', '127.0.0.1'].includes(window.location.hostname);

function debugLog(...args) {
    if (DEBUG_MODE) {
        console.log(...args);
    }
}

/**
 * @file chatManager.js
 * @description Gerencia a lista de chats, interações do usuário, histórico e comunicação com a API.
 */

import { showRenamePrompt, showAlert, showDeleteConfirmation } from './alertManager.js';
import ApiService from './apiService.js';
import StateManager from './stateManager.js';
import { LoadingUtils } from './unifiedLoadingManager.js';

class ChatManager {
    /**
     * Cria uma instância de ChatManager.
     * @param {ApiService} apiService - Instância do serviço de API.
     * @param {StateManager} stateManager - Instância do gerenciador de estado.
     * @param {Object} config - Configurações da aplicação.
     */
    constructor(apiService, stateManager, config) {
        this.apiService = apiService;
        this.stateManager = stateManager;
        this.config = config;
        this.uiManager = null; // Inicializa o uiManager como nulo para evitar quebras
        
        debugLog('ChatManager constructor chamado');
        
        // Inicializa o sistema de URL (apenas o listener, não a verificação inicial)
        this.initializeUrlListener();
    }

    /**
     * Inicializa apenas o listener de URL (sem verificação inicial)
     */
    initializeUrlListener() {
        debugLog('Inicializando listener de URL...');
        
        // Listener para mudanças na URL (navegação do browser)
        window.addEventListener('popstate', (event) => {
            debugLog('Evento popstate detectado:', event);
            this.handleUrlChange();
        });
        
        debugLog('Listener de URL inicializado');
    }

    /**
     * Inicializa o sistema completo de gerenciamento de URL (chamado após carregar chats)
     */
    initializeUrlManagement() {
        debugLog('Inicializando sistema completo de gerenciamento de URL...');
        
        // Verifica se há chatId na URL
        debugLog('Verificando URL inicial...');
        this.handleUrlChange();
        
        debugLog('Sistema completo de gerenciamento de URL inicializado');
    }

    /**
     * Manipula mudanças na URL
     */
    handleUrlChange() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const chatId = urlParams.get('chatId');
            const gptId = urlParams.get('gptId');
            
            debugLog('handleUrlChange chamado. chatId na URL:', chatId);
            debugLog('handleUrlChange chamado. gptId na URL:', gptId);
            debugLog('URL atual:', window.location.href);
            
            // Se há um gptId na URL, apenas marca seleção em memória (sem iniciar chat automaticamente)
            if (gptId && this.uiManager && this.uiManager.gptManager) {
                debugLog('gptId encontrado na URL:', gptId);
                const gpt = this.uiManager.gptManager.getGPTById(gptId);
                if (gpt) {
                    this.stateManager.setSelectedGPT(gpt); // não chama selectGPTItem para evitar auto-inicialização
                    debugLog('GPT registrado em memória a partir da URL (sem iniciar):', gpt.name);
                } else {
                    debugLog('GPT com ID não encontrado:', gptId);
                }
            }
            
            if (chatId) {
                // Se há um chatId na URL, tenta carregar o chat
                debugLog('ChatId encontrado na URL, carregando chat:', chatId);
                this.loadChatFromUrl(chatId);
            } else if (gptId) {
                // Só inicia automaticamente se houver start=1 na URL
                const shouldAutoStart = urlParams.get('start') === '1';
                if (shouldAutoStart) {
                    debugLog('gptId + start=1 na URL, criando novo chat com GPT:', gptId);
                    this.createNewChatWithGpt(gptId);
                } else {
                    debugLog('gptId na URL sem start=1; não iniciando chat automaticamente.');
                }
            } else {
                // Se não há chatId nem gptId, limpa a seleção atual
                debugLog('Nenhum chatId ou gptId na URL, limpando seleção');
                this.clearChatSelection();
            }
        } catch (error) {
            console.error('Erro ao manipular mudança na URL:', error);
        }
    }

    /**
     * Carrega um chat baseado no ID da URL
     * @param {string} chatId - ID do chat a ser carregado
     */
    async loadChatFromUrl(chatId) {
        try {
            // Verifica se o stateManager e chats estão disponíveis
            if (!this.stateManager || !this.stateManager.chats) {
                console.warn('StateManager ou chats não estão disponíveis ainda');
                return;
            }
            
            // Procura o chat na lista atual
            const chat = this.stateManager.chats.find(c => c.id === chatId || c.session_id === chatId);
            
            if (chat) {
                // Se encontrou o chat, seleciona ele
                await this.selectChatFromUrl(chat);
            } else {
                // Se não encontrou, pode ser um chat que ainda não foi carregado
                // ou um ID inválido
                debugLog(`Chat com ID ${chatId} não encontrado na lista atual`);
            }
        } catch (error) {
            console.error('Erro ao carregar chat da URL:', error);
        }
    }

    /**
     * Seleciona um chat baseado na URL
     * @param {Object} chat - Objeto do chat a ser selecionado
     */
    async selectChatFromUrl(chat) {
        try {
            debugLog('selectChatFromUrl chamado com chat:', chat);
            
            // Atualiza o estado usando a propriedade selectedChat
            this.stateManager.selectedChat = chat;
            
            // Seleciona visualmente o item na lista
            this.selectChatItem(chat.id || chat.session_id);
            
            // Verifica se o GPT do chat selecionado é diferente do atual
            const currentGPT = this.stateManager.selectedGPT;
            const chatGPT = this.stateManager.getGPTs().find(gpt => gpt.id === chat.fk_gpt_id);
            
            if (currentGPT && chatGPT && currentGPT.id === chatGPT.id) {
                // Mesmo GPT, não precisa inicializar o chatbot novamente
                debugLog('Chat selecionado usa o mesmo GPT, pulando inicialização do chatbot...');
            } else {
                // GPT diferente ou não há GPT selecionado, inicializa o chatbot
                if (this.uiManager && typeof this.uiManager.initializeChatbot === 'function') {
                    // Reseta a flag de inicialização para permitir nova inicialização
                    if (this.uiManager.resetChatbotInitialization) {
                        this.uiManager.resetChatbotInitialization();
                        debugLog('Flag de inicialização resetada para chat com GPT diferente');
                    }
                    
                    debugLog('Inicializando chatbot para chat da URL:', chat.id || chat.session_id);
                    await this.uiManager.initializeChatbot();
                }
            }
            
            debugLog(`Chat carregado da URL: ${chat.id || chat.session_id}`);
        } catch (error) {
            console.error('Erro ao selecionar chat da URL:', error);
        }
    }

    /**
     * Cria um novo chat com o GPT especificado
     * @param {string} gptId - ID do GPT para criar o novo chat
     */
    async createNewChatWithGpt(gptId) {
        try {
            debugLog('createNewChatWithGpt chamado com gptId:', gptId);
            
            // Verifica se o GPT existe
            if (!this.uiManager || !this.uiManager.gptManager) {
                console.error('GPTManager não disponível');
                return;
            }
            
            const gpt = this.uiManager.gptManager.getGPTById(gptId);
            if (!gpt) {
                console.error('GPT não encontrado:', gptId);
                return;
            }
            
            // Seleciona o GPT se ainda não estiver selecionado
            if (!this.stateManager.selectedGPT || this.stateManager.selectedGPT.id !== gptId) {
                await this.uiManager.gptManager.selectGPTItem(gpt);
                this.stateManager.setSelectedGPT(gpt);
                debugLog('GPT selecionado para novo chat:', gpt.name);
            }
            
            // Cria um novo chat usando o UIManager
            if (this.uiManager && typeof this.uiManager.createNewChat === 'function') {
                debugLog('Criando novo chat com GPT:', gpt.name);
                await this.uiManager.createNewChat();
            } else {
                console.error('UIManager ou método createNewChat não disponível');
            }
            
        } catch (error) {
            console.error('Erro ao criar novo chat com GPT:', error);
        }
    }

    /**
     * Limpa a seleção atual de chat
     */
    clearChatSelection() {
        try {
            // Remove seleção visual
            const selectedItems = document.querySelectorAll('.chat-item.selected');
            selectedItems.forEach(item => item.classList.remove('selected'));
            
            // Limpa estado
            if (this.stateManager) {
                this.stateManager.selectedChat = null;
            }
            
            debugLog('Seleção de chat limpa');
        } catch (error) {
            console.error('Erro ao limpar seleção de chat:', error);
        }
    }

    /**
     * Atualiza a URL com o gptId primeiro, depois chatId
     * @param {string} chatId - ID do chat
     * @param {string} gptId - ID do GPT (opcional)
     */
    updateUrlWithChatId(chatId, gptId = null) {
        try {
            const url = new URL(window.location);
            
            // Limpa os parâmetros existentes
            url.searchParams.delete('gptId');
            url.searchParams.delete('chatId');
            
            // Adiciona gptId primeiro (se fornecido ou se há um GPT selecionado)
            const currentGptId = gptId || (this.stateManager.selectedGPT ? this.stateManager.selectedGPT.id : null);
            if (currentGptId) {
                url.searchParams.set('gptId', currentGptId);
                debugLog('Atualizando URL com gptId:', currentGptId);
            }
            
            // Depois adiciona chatId
            if (chatId) {
                url.searchParams.set('chatId', chatId);
                debugLog('Atualizando URL com chatId:', chatId);
            }
            
            // Atualiza a URL sem recarregar a página
            window.history.pushState({ chatId, gptId: currentGptId }, '', url.toString());
            
            debugLog('URL atualizada para:', url.toString());
            debugLog('URL original:', window.location.href);
            debugLog(`URL atualizada com gptId: ${currentGptId}, chatId: ${chatId}`);
        } catch (error) {
            console.error('🔗 Erro ao atualizar URL:', error);
        }
    }

    /* ============================
       1. Carregamento e Exibição
       ============================ */

    /**
     * Carrega a lista de chats a partir da API e popula o menu de chats.
     * @param {Function} populateCallback - Função de callback para popular o menu de chats.
     */
    async loadChatList(populateCallback) {
        const params = {
            company_name: this.config.companyName,
            user_name: this.config.userName,
            user_id: this.config.userId
        };

        try {
            // Faz a requisição à API para obter a lista de chats
            const chatData = await this.apiService.request('readChat', params, 'GET');
            debugLog('Lista de chats recebida da API:', chatData);

            let dataArray = [];

            // Verifica se a resposta da API é um objeto com a propriedade 'data'
            if (chatData && typeof chatData === 'object') {
                if (Array.isArray(chatData)) {
                    dataArray = chatData;
                } else if (Array.isArray(chatData.data)) {
                    dataArray = chatData.data;
                } else if (chatData.data && Array.isArray(chatData.data.chats)) {
                    dataArray = chatData.data.chats;
                } else {
                    throw new Error('Estrutura inesperada da resposta da API.');
                }
            } else {
                throw new Error('Resposta da API inválida.');
            }

            // Atualiza o estado com os chats recebidos (mesclando com chats locais não persistidos ainda)
            const serverChats = dataArray.map(chat => ({
                ...chat,
                date: chat.last_modified || new Date().toISOString()
            })).filter(chat => chat.date !== null);

            const existingChats = Array.isArray(this.stateManager.chats) ? this.stateManager.chats : [];
            const serverIds = new Set(serverChats.map(c => c.id));
            const localOnlyChats = existingChats.filter(c => c && c.id && !serverIds.has(c.id));
            this.stateManager.chats = [...serverChats, ...localOnlyChats];

            // Chama o callback para popular o menu de chats
            if (typeof populateCallback === 'function') {
                populateCallback(this.stateManager.chats);
            }
            
            // Inicializa o sistema completo de URL após carregar os chats
            debugLog('Chats carregados, inicializando sistema completo de URL...');
            this.initializeUrlManagement();
        } catch (error) {
            console.error('Erro ao carregar lista de chats:', error);
            showAlert('Erro ao carregar a lista de chats. Verifique o console para mais detalhes.', 'error');
        }
    }

    /**
     * Popula o menu de chats na interface do usuário.
     * @param {Array<Object>} chatsToDisplay - Lista de chats a serem exibidos.
     */
    populateChatMenu(chatsToDisplay) {
        const chatList = document.getElementById('chat-list');
        if (!chatList) {
            console.error('Elemento #chat-list não encontrado.');
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

        // Ordena os chats por data: os mais novos primeiro
        chatsToDisplay.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Agrupa os chats por data
        const groupedChats = this.groupChatsByDate(chatsToDisplay);
        
        // Cria os itens de chat agrupados
        const fragment = document.createDocumentFragment();
        
                    // Itera pelos grupos na ordem desejada
            const groupOrder = ['Hoje', 'Ontem', 'Esta Semana', 'Este Mês', 'Anterior'];
        
        groupOrder.forEach(groupName => {
            const chatsInGroup = groupedChats[groupName];
            if (chatsInGroup && chatsInGroup.length > 0) {
                // Cria o cabeçalho do grupo
                const groupHeader = document.createElement('li');
                groupHeader.classList.add('list-group-item', 'chat-group-header', 'fw-bold', 'bg-light', 'text-muted');
                groupHeader.textContent = groupName;
                fragment.appendChild(groupHeader);
                
                // Cria os itens de chat para este grupo
                chatsInGroup.forEach(chat => {
                    const chatItem = document.createElement('li');
                    chatItem.classList.add('list-group-item', 'chat-item', 'd-flex', 'justify-content-between', 'align-items-center');
                    chatItem.innerHTML = `
                        <div class="chat-item d-flex align-items-center justify-content-between">
                            <span class="chat-name text-start">${this.highlightSearch(chat.name || 'Chat sem nome')}</span>
                            <div class="dropdown">
                                <button 
                                    class="btn btn-sm btn-outline-secondary dropdown-toggle" 
                                    type="button" 
                                    id="chatOptions-${chat.id}" 
                                    data-bs-toggle="dropdown" 
                                    aria-expanded="false" 
                                    title="Opções">
                                    <i class="bi bi-gear"></i>
                                </button>
                                <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="chatOptions-${chat.id}">
                                    <li>
                                        <button 
                                            class="dropdown-item rename-chat-button" 
                                            data-chat-id="${chat.id}" 
                                            title="Renomear Chat">
                                            Renomear
                                        </button>
                                    </li>
                                    <li>
                                        <button 
                                            class="dropdown-item delete-chat-button" 
                                            data-chat-id="${chat.id}" 
                                            title="Excluir Chat">
                                            Excluir
                                        </button>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    `;

                    // Anexa informações importantes ao elemento
                    chatItem.dataset.chatId = chat.id;
                    chatItem.dataset.chatDate = chat.date;
                    chatItem.dataset.fkGptId = chat.fk_gpt_id;

                    // Event listeners para renomear e excluir
                    chatItem.querySelector('.rename-chat-button').addEventListener('click', (event) => {
                        event.stopPropagation();
                        this.handleRenameChat(chat.id, chat.name || 'Chat sem nome');
                    });
                    chatItem.querySelector('.delete-chat-button').addEventListener('click', (event) => {
                        event.stopPropagation();
                        this.handleDeleteChat(chat.id, chat.name);
                    });

                    // Event listener para o botão da engrenagem (evitar propagação)
                    chatItem.querySelector('.dropdown-toggle').addEventListener('click', (event) => {
                        event.stopPropagation();
                    });

                    // Clique no item de chat -> handleChatClick
                    chatItem.addEventListener('click', this.handleChatClick.bind(this));
                    fragment.appendChild(chatItem);
                });
            }
        });

        chatList.appendChild(fragment);
        
        // Restaura a seleção do chat após popular a lista
        this.restoreChatSelection();
    }

    /**
     * Agrupa os chats por data de modificação.
     * @param {Array<Object>} chats - Lista de chats para agrupar.
     * @returns {Object} Objeto com chats agrupados por período.
     */
    groupChatsByDate(chats) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);

        const groups = {
            'Hoje': [],
            'Ontem': [],
            'Esta Semana': [],
            'Este Mês': [],
            'Anterior': []
        };

        chats.forEach(chat => {
            const chatDate = new Date(chat.date);
            const chatDateOnly = new Date(chatDate.getFullYear(), chatDate.getMonth(), chatDate.getDate());

            if (chatDateOnly.getTime() === today.getTime()) {
                groups['Hoje'].push(chat);
            } else if (chatDateOnly.getTime() === yesterday.getTime()) {
                groups['Ontem'].push(chat);
            } else if (chatDateOnly >= weekAgo) {
                groups['Esta Semana'].push(chat);
            } else if (chatDateOnly >= monthAgo) {
                groups['Este Mês'].push(chat);
            } else {
                groups['Anterior'].push(chat);
            }
        });

        return groups;
    }

    /* ============================
       2. Interações com Chats
       ============================ */

    /**
     * Lida com o clique em um chat existente na lista.
     * @param {Event} event - Evento de clique.
     */
    async handleChatClick(event) {
        try {
            event.preventDefault();
            debugLog('handleChatClick chamado, event.currentTarget:', event.currentTarget);
            debugLog('dataset do elemento:', event.currentTarget.dataset);
            const chatId = event.currentTarget.dataset.chatId;

            if (!chatId) {
                debugLog('Chat sem ID válido:', event);
                debugLog('Chat sem ID válido, dataset completo:', event.currentTarget.dataset);
                return;
            }

            debugLog('Chat clicado:', chatId);
            debugLog('Chat clicado, chatId:', chatId);
            debugLog('URL antes do clique:', window.location.href);

            // Mostrar loading de chat
            const loadingId = LoadingUtils.show('CHAT_LOADING', {
                message: 'Carregando chat...',
                allowCancel: true
            });

            // Localiza o chat correspondente no StateManager
            const selectedChat = this.stateManager.chats.find(chat => chat.id === chatId);
            if (!selectedChat) {
                console.error('Chat selecionado não encontrado:', chatId);
                showAlert('Chat selecionado não encontrado.', 'error');
                return;
            }

            const gptId = selectedChat.fk_gpt_id;
            if (!gptId) {
                debugLog('Nenhum fk_gpt_id associado ao chat:', chatId);
                showAlert('Este chat não está associado a nenhum GPT.', 'error');
                return;
            }

            // Atualiza a URL com o chatId e gptId
            debugLog('Chat clicado, atualizando URL com chatId:', chatId);
            this.updateUrlWithChatId(chatId, gptId);

            // Obtém o GPT associado
            const associatedGPT = this.stateManager.getGPTById(gptId);
            if (!associatedGPT) {
                console.error(`GPT com ID ${gptId} não encontrado para o chat ${chatId}.`);
                showAlert('Configuração do GPT associada ao chat não encontrada.', 'error');
                return;
            }

            // Reutiliza a lógica do GPTManager para selecionar o GPT
            if (this.uiManager && this.uiManager.gptManager) {
                await this.uiManager.gptManager.selectGPTItem(associatedGPT);
            } else {
                console.error('Instância do GPTManager não está disponível no uiManager.');
                showAlert('Erro interno: GPTManager não encontrado.', 'error');
                return;
            }

            // Define a sessão atual para o chatId
            this.stateManager.setSessionId(chatId);

            // Carrega histórico, se existir um historyManager integrado via UIManager
            if (this.uiManager && this.uiManager.historyManager) {
                debugLog('Carregando histórico do chat:', chatId);
                
                // Atualizar mensagem do loading
                LoadingUtils.updateProgress(loadingId, 50, 'Carregando histórico...');
                
                await this.uiManager.historyManager.loadHistory(chatId);
                
                // Atualizar progresso
                LoadingUtils.updateProgress(loadingId, 100, 'Chat carregado!');
            }

            // Destaca o chat selecionado na interface
            this.selectChatItem(chatId);

            // Inicializa o chatbot, caso não tenha sido feito no GPTManager
            if (this.uiManager) {
                LoadingUtils.updateProgress(loadingId, 75, 'Inicializando chatbot...');
                
                // Verifica se o GPT do chat clicado é diferente do atual
                const currentGPT = this.stateManager.selectedGPT;
                const chatGPT = this.stateManager.getGPTs().find(gpt => gpt.id === selectedChat.fk_gpt_id);
                
                if (currentGPT && chatGPT && currentGPT.id === chatGPT.id) {
                    // Mesmo GPT, não precisa inicializar o chatbot novamente
                    LoadingUtils.updateProgress(loadingId, 90, 'Chatbot já estava inicializado para este GPT');
                    debugLog('Chat clicado usa o mesmo GPT, pulando inicialização do chatbot...');
                } else {
                    // GPT diferente ou não há GPT selecionado, inicializa o chatbot
                    // Reseta a flag de inicialização para permitir nova inicialização
                    if (this.uiManager.resetChatbotInitialization) {
                        this.uiManager.resetChatbotInitialization();
                        debugLog('Flag de inicialização resetada para chat com GPT diferente');
                    }
                    
                    await this.uiManager.initializeChatbot();
                    LoadingUtils.updateProgress(loadingId, 90, 'Chatbot inicializado');
                }
            }

            // Esconder loading após sucesso (com pequeno delay para mostrar mensagem final)
            setTimeout(() => {
                LoadingUtils.hide(loadingId);
            }, 500);

        } catch (error) {
            console.error('Erro ao processar clique no chat:', error);
            showAlert('Erro ao processar o clique no chat. Verifique o console.', 'error');
            
            // Esconder loading em caso de erro
            if (typeof loadingId !== 'undefined') {
                LoadingUtils.hide(loadingId);
            }
        }
    }

    /**
     * Lida com a renomeação de um chat.
     * @param {string} chatId - ID do chat a ser renomeado.
     * @param {string} oldChatName - Nome atual do chat.
     */
    async handleRenameChat(chatId, oldChatName) {
        try {
            const newChatName = await showRenamePrompt(oldChatName);
            if (!newChatName || newChatName === oldChatName) return;

            const params = {
                company_name: this.config.companyName,
                user_name: this.config.userName,
                user_id: this.config.userId,
                sessionid: chatId,
                new_chat_name: newChatName
            };

            const renameResponse = await this.apiService.request(
                'updateChat',
                params,
                'POST',
                null,
                { includeParamsInQuery: true }
            );

            if (renameResponse.status === "success") {
                showAlert('Chat renomeado com sucesso.', 'success');
                const chatToRename = this.stateManager.chats.find(chat => chat.id === chatId);
                if (chatToRename) {
                    chatToRename.name = newChatName;
                    this.populateChatMenu(this.stateManager.chats);
                }
            } else {
                throw new Error(renameResponse.message || 'Erro desconhecido.');
            }
        } catch (error) {
            showAlert('Erro ao renomear o chat.', 'error');
            console.error('Erro ao renomear o chat:', error);
        }
    }

    /**
     * Lida com a exclusão de um chat.
     * @param {string} chatId - ID do chat a ser excluído.
     * @param {string} chatName - Nome do chat a ser excluído.
     */
    async handleDeleteChat(chatId, chatName) {
        try {
            const confirmDelete = await showDeleteConfirmation(chatName);
            if (!confirmDelete) return;

            const params = {
                company_name: this.config.companyName,
                user_name: this.config.userName,
                user_id: this.config.userId,
                session_id: chatId
            };

            const deleteResponse = await this.apiService.request('deleteChat', params, 'DELETE');
            debugLog('Resposta da API de exclusão:', deleteResponse);

            if (deleteResponse.status === "success") {
                showAlert('Chat excluído com sucesso.', 'info');
                this.stateManager.removeChat(chatId);
                this.populateChatMenu(this.stateManager.chats);

                // Se o chat excluído era o atual, limpamos o sessionId e a URL
                if (this.stateManager.currentSessionId === chatId) {
                    this.stateManager.setSessionId("");
                    // Limpa a URL removendo o chatId
                    this.updateUrlWithChatId(null);
                }

                // Remove o chat selecionado do localStorage, se for o mesmo ID
                const selectedChatId = localStorage.getItem('selectedChatId');
                if (selectedChatId === chatId) {
                    localStorage.removeItem('selectedChatId');
                }
            } else {
                throw new Error(deleteResponse.message || 'Erro desconhecido.');
            }
        } catch (error) {
            showAlert('Erro ao excluir o chat.', 'error');
            console.error('Erro ao excluir o chat:', error);
        }
    }

    /* ================================
       3. Seleção / Destaque de Chats
       ================================ */

    /**
     * Destaca o chat selecionado na interface do usuário.
     * @param {string} chatId - ID do chat a ser destacado.
     */
    selectChatItem(chatId) {
        debugLog('selectChatItem chamado com chatId:', chatId);

        // Corrigido o seletor para pegar todos os itens de chat (que têm a classe list-group-item e chat-item)
        const chatItems = Array.from(document.querySelectorAll('#chat-list .list-group-item.chat-item'))
            .filter(item => item.dataset.chatId);

        chatItems.forEach(item => {
            const itemChatId = item.dataset.chatId;

            if (itemChatId === chatId) {
                item.classList.add('active');
                localStorage.setItem('selectedChatId', chatId);
                
                // Atualiza a URL com o chatId selecionado
                debugLog('selectChatItem: atualizando URL com chatId:', chatId);
                this.updateUrlWithChatId(chatId);
            } else {
                item.classList.remove('active');
            }
        });

        if (chatItems.length === 0) {
            debugLog('Nenhum chat válido encontrado na lista.');
        }
    }

    /**
     * Restaura a seleção do chat somente pela URL (não usa localStorage)
     * para garantir que a página abra na tela de boas-vindas por padrão.
     */
    restoreChatSelection() {
        const urlParams = new URLSearchParams(window.location.search);
        const chatIdFromUrl = urlParams.get('chatId');
        if (chatIdFromUrl) {
            debugLog('Restaurando seleção do chat (URL):', chatIdFromUrl);
            this.selectChatItem(chatIdFromUrl);
        }
    }

    /* =======================
       4. Filtragem de Chats
       ======================= */

    filterChatList() {
        const searchInput = document.getElementById('search-input').value.toLowerCase();
        const clearButton = document.getElementById('clear-search-button');

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

    /* ===================================
       5. Funções Auxiliares e Atualização
       =================================== */



    /**
     * Atualiza a lista de chats quando há alteração no estado de carregamento do chatbot.
     * ATENÇÃO: Esta função deve ser chamada APENAS ao clicar em um chat,
     * NÃO a cada mensagem enviada.
     * @param {boolean} loading - Indica se o chatbot está carregando.
     */
    async handleLoadingState(loading) {
        debugLog('handleLoadingState chamado com loading:', loading);

        if (loading) {
            debugLog('O chatbot está carregando...');
            
            // Mostrar loading de chat
            const loadingId = LoadingUtils.show('CHAT_LOADING', {
                message: 'Carregando chat...',
                allowCancel: true
            });

            try {
                const params = {
                    gpt_id: this.stateManager.selectedGPT.id,
                    user_name: this.config.userName,
                    user_id: this.config.userId,
                    sessionid: this.stateManager.currentSessionId
                };
                const response = await this.apiService.request('updateChat', params, 'POST', null, { includeParamsInQuery: true });
                debugLog('Resposta da API:', response);

                if (response.status === "success") {
                    debugLog('Resposta da API bem-sucedida:', response.message);
                    // Atualiza a lista de chats após a atualização via API
                    await this.loadChatList(this.populateChatMenu.bind(this));
                    LoadingUtils.hide(loadingId);
                } else {
                    throw new Error(response.message || 'Erro desconhecido.');
                }
            } catch (error) {
                console.error('Erro ao fazer a requisição POST:', error);
                showAlert('Erro ao atualizar o chat. Verifique o console para mais detalhes.', 'error');
                LoadingUtils.hide(loadingId);
            }
        } else {
            debugLog('O chatbot terminou de carregar.');
        }
    }

    /* ===================================
       6. Funcionalidades de Histórico Integradas
       =================================== */

    /**
     * Função auxiliar para buscar e formatar o histórico de mensagens.
     * @param {string} sessionId - ID da sessão atual.
     * @param {Object} config - Configurações da aplicação.
     * @returns {Promise<Array>} - Histórico de mensagens formatado.
     */
    async _fetchAndFormatHistory(sessionId, config) {
        const apiURL = `${config.flowise.apiHost}/api/v1/chatmessage/${config.flowise.chatflowId}?sessionId=${sessionId}`;
        debugLog('Tentando buscar histórico em:', apiURL);
        
        try {
            const response = await fetch(apiURL, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${config.flowise.token}`
                }
            });

            debugLog('Status da resposta:', response.status);
            const responseBody = await response.text();
            debugLog('Corpo da resposta:', responseBody);

            if (!response.ok) throw new Error('Erro ao buscar histórico de mensagens da API.');

            const apiHistory = JSON.parse(responseBody);

            return apiHistory.map((msg) => ({
                message: msg.content,
                type: msg.role === 'userMessage' ? 'userMessage' : 'apiMessage',
                dateTime: msg.createdDate || new Date().toISOString(),
                messageId: msg.id || Math.random().toString(36).substring(2),
                fileUploads: msg.fileUploads || []
            }));
        } catch (error) {
            console.error('Erro ao buscar histórico:', error);
            throw new Error('Erro ao buscar histórico de mensagens da API.');
        }
    }

    /**
     * Injeta o histórico de chat previamente salvo no localStorage.
     * @param {string} sessionId - ID da sessão atual.
     * @param {Object} config - Configurações da aplicação.
     * @returns {Promise<void>}
     */
    async injectChatHistory(sessionId, config) {
        try {
            const formattedHistory = await this._fetchAndFormatHistory(sessionId, config);
            const chatData = {
                chatHistory: formattedHistory,
                chatId: sessionId
            };

            const historyKey = `${config.flowise.chatflowId}_EXTERNAL`;
            localStorage.setItem(historyKey, JSON.stringify(chatData));
            localStorage.setItem(`${config.flowise.chatflowId}_historyInjected`, 'true');
        } catch (error) {
            console.error('Erro ao injetar histórico no localStorage:', error);
            throw new Error('Erro ao buscar histórico de mensagens da API.');
        }
    }

    /**
     * Busca apenas o histórico de chat de uma sessão.
     * @param {string} sessionId - ID da sessão atual.
     * @param {Object} config - Configurações da aplicação.
     * @returns {Promise<Array>} - Retorna o histórico de mensagens.
     */
    async fetchChatHistory(sessionId, config) {
        // Mostrar loading de histórico
        const loadingId = LoadingUtils.show('HISTORY_LOADING', {
            message: 'Carregando histórico do chat...',
            allowCancel: true
        });
        
        try {
            const history = await this._fetchAndFormatHistory(sessionId, config);
            LoadingUtils.hide(loadingId);
            return history;
        } catch (error) {
            LoadingUtils.hide(loadingId);
            throw error;
        }
    }

    /* =====================
       7. Exibição de Erros
       ===================== */

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

    showAlert(message, type = 'danger') {
        const alertContainer = document.getElementById('alert-container');
        if (alertContainer) {
            alertContainer.textContent = message;
            alertContainer.className = `alert alert-${type} position-fixed bottom-0 end-0 m-3`;
            alertContainer.classList.remove('d-none');
            setTimeout(() => {
                alertContainer.classList.add('d-none');
            }, 5000);
        } else {
            this.showError(message);
        }
    }

    /**
     * Exemplo de função que processa arquivo com loading
     * @param {File} file - Arquivo a ser processado
     * @returns {Promise<Object>} - Resultado do processamento
     */
    async processFileWithLoading(file) {
        const steps = [
            'Validando arquivo',
            'Extraindo conteúdo',
            'Processando dados',
            'Salvando resultado'
        ];
        
        const loadingId = LoadingUtils.show('FILE_PROCESSING', {
            message: `Processando arquivo: ${file.name}`,
            steps: steps,
            allowCancel: true
        });
        
        try {
            // Etapa 1: Validar arquivo
            LoadingUtils.step(loadingId, 'Validando arquivo', 'loading');
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            if (file.size > 10 * 1024 * 1024) { // 10MB
                throw new Error('Arquivo muito grande');
            }
            LoadingUtils.step(loadingId, 'Validando arquivo', 'completed');
            
            // Etapa 2: Extrair conteúdo
            LoadingUtils.step(loadingId, 'Extraindo conteúdo', 'loading');
            await new Promise(resolve => setTimeout(resolve, 1500));
            LoadingUtils.step(loadingId, 'Extraindo conteúdo', 'completed');
            
            // Etapa 3: Processar dados
            LoadingUtils.step(loadingId, 'Processando dados', 'loading');
            await new Promise(resolve => setTimeout(resolve, 2000));
            LoadingUtils.step(loadingId, 'Processando dados', 'completed');
            
            // Etapa 4: Salvar resultado
            LoadingUtils.step(loadingId, 'Salvando resultado', 'loading');
            await new Promise(resolve => setTimeout(resolve, 1000));
            LoadingUtils.step(loadingId, 'Salvando resultado', 'completed');
            
            LoadingUtils.hide(loadingId);
            
            return {
                success: true,
                filename: file.name,
                processedAt: new Date().toISOString()
            };
        } catch (error) {
            LoadingUtils.hide(loadingId);
            throw error;
        }
    }
}

export default ChatManager;