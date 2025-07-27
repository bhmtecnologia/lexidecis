const DEBUG_MODE = false; // Altere para true se quiser habilitar os logs

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

            // Atualiza o estado com os chats recebidos
            this.stateManager.chats = dataArray.map(chat => ({
                ...chat,
                date: chat.last_modified || new Date().toISOString()
            })).filter(chat => chat.date !== null);

            // Chama o callback para popular o menu de chats
            if (typeof populateCallback === 'function') {
                populateCallback(this.stateManager.chats);
            }
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

        // Cria os itens de chat diretamente sem agrupamento por data
        const fragment = document.createDocumentFragment();
        
        // Ordena os chats por data: os mais novos primeiro
        chatsToDisplay.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Cria os itens de chat para cada chat
        chatsToDisplay.forEach(chat => {
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

        chatList.appendChild(fragment);
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
            const chatId = event.currentTarget.dataset.chatId;

            if (!chatId) {
                debugLog('Chat sem ID válido:', event);
                return;
            }

            debugLog('Chat clicado:', chatId);

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
                await this.uiManager.historyManager.loadHistory(chatId);
            }

            // Destaca o chat selecionado na interface
            this.selectChatItem(chatId);

            // Inicializa o chatbot, caso não tenha sido feito no GPTManager
            if (this.uiManager) {
                await this.uiManager.initializeChatbot();
            }

        } catch (error) {
            console.error('Erro ao processar clique no chat:', error);
            showAlert('Erro ao processar o clique no chat. Verifique o console.', 'error');
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

                // Se o chat excluído era o atual, limpamos o sessionId
                if (this.stateManager.currentSessionId === chatId) {
                    this.stateManager.setSessionId("");
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

        const chatItems = Array.from(document.querySelectorAll('#chat-list .chat-item'))
            .filter(item => item.dataset.chatId);

        chatItems.forEach(item => {
            const itemChatId = item.dataset.chatId;

            if (itemChatId === chatId) {
                item.classList.add('active');
                localStorage.setItem('selectedChatId', chatId);
            } else {
                item.classList.remove('active');
            }
        });

        if (chatItems.length === 0) {
            debugLog('Nenhum chat válido encontrado na lista.');
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
     * @param {boolean} loading - Indica se o chatbot está carregando.
     */
    async handleLoadingState(loading) {
        debugLog('handleLoadingState chamado com loading:', loading);

        if (loading) {
            debugLog('O chatbot está carregando...');
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
                } else {
                    throw new Error(response.message || 'Erro desconhecido.');
                }
            } catch (error) {
                console.error('Erro ao fazer a requisição POST:', error);
                showAlert('Erro ao atualizar o chat. Verifique o console para mais detalhes.', 'error');
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
        return await this._fetchAndFormatHistory(sessionId, config);
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
}

export default ChatManager;