/**
 * @file chatManager.js
 * @description Gerencia a lista de chats, interações do usuário e comunicação com a API.
 */

import { showRenamePrompt, showAlert, showDeleteConfirmation } from './alertManager.js';
import ApiService from './apiService.js'; // Importação corrigida
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

    /* --- Funções de Carregamento e População de Menus --- */

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
            console.log('Lista de chats recebida da API:', chatData);

            let dataArray = [];

            // Verifica se a resposta da API é um objeto com a propriedade 'data'
            if (chatData && typeof chatData === 'object') {
                if (Array.isArray(chatData)) {
                    // Se a resposta for um array diretamente
                    dataArray = chatData;
                } else if (Array.isArray(chatData.data)) {
                    // Se a resposta tiver uma propriedade 'data' que é um array
                    dataArray = chatData.data;
                } else if (chatData.data && Array.isArray(chatData.data.chats)) {
                    // Se a resposta tiver uma propriedade 'data.chats' que é um array
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
            //this.showError('Erro ao carregar a lista de chats. Verifique o console para mais detalhes.');
        }
    }

    /**
     * Popula o menu de chats na interface do usuário.
     * @param {Array<Object>} chatsToDisplay - Lista de chats a serem exibidos.
     */
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

        const groupedChats = {};
        chatsToDisplay.forEach(chat => {
            const group = this.getDateGroup(chat.date);
            if (!groupedChats[group]) groupedChats[group] = [];
            groupedChats[group].push(chat);
        });

        const groupOrder = ["Hoje", "Ontem", "Anteontem", "Esta semana", "Semana passada", "Mês passado"];
        groupOrder.forEach(group => {
            if (groupedChats[group]) {
                const groupHeader = document.createElement('li');
                groupHeader.classList.add('list-group-item', 'fw-bold', 'bg-light', 'text-muted');
                groupHeader.textContent = group;
                fragment.appendChild(groupHeader);

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
                    chatItem.dataset.fkGptId = chat.fk_gpt_id; // Adiciona fk_gpt_id

                    // Adiciona event listeners para os botões de renomear e excluir
                    chatItem.querySelector('.rename-chat-button').addEventListener('click', (event) => {
                        event.stopPropagation();
                        this.handleRenameChat(chat.id, chat.name || 'Chat sem nome');
                    });
                    chatItem.querySelector('.delete-chat-button').addEventListener('click', (event) => {
                        event.stopPropagation();
                        this.handleDeleteChat(chat.id, chat.name);
                    });

                    // Adiciona event listener para o clique no item do chat
                    chatItem.addEventListener('click', this.handleChatClick.bind(this)); // Garante o contexto correto
                    fragment.appendChild(chatItem);
                });
            }
        });

        chatList.appendChild(fragment);
    }

    /* --- Funções de Manipulação de Chats --- */

    /**
     * Lida com o clique em um chat existente na lista.
     * @param {Event} event - Evento de clique.
     */
    handleChatClick(event) {
        // Prevenir comportamento padrão do evento
        event.preventDefault();
    
        // Verificar se o alvo contém o ID do chat
        const chatId = event.currentTarget.dataset.chatId;
    
        if (!chatId) {
            console.warn('Chat sem ID válido:', event);
            return;
        }
    
        console.log('Chat clicado:', chatId);
    
        // Recupera o chat selecionado
        const selectedChat = this.stateManager.chats.find(chat => chat.id === chatId);
    
        if (!selectedChat) {
            console.error('Chat selecionado não encontrado:', chatId);
            showAlert('Chat selecionado não encontrado.', 'error');
            //this.uiManager.showError('Chat selecionado não encontrado.');
            return;
        }
    
        const gptId = selectedChat.fk_gpt_id;
    
        if (!gptId) {
            console.warn('Nenhum fk_gpt_id associado ao chat:', chatId);
            showAlert('Este chat não está associado a nenhum GPT.', 'error');
            //this.uiManager.showError('Este chat não está associado a nenhum GPT.');
            return;
        }
    
        // Recupera o GPT associado ao fk_gpt_id
        const associatedGPT = this.stateManager.getGPTById(gptId);
    
        if (!associatedGPT) {
            console.error(`GPT com ID ${gptId} não encontrado para o chat ${chatId}.`);
            showAlert('Configuração do GPT associada ao chat não encontrada.', 'error');
            //this.uiManager.showError('Configuração do GPT associada ao chat não encontrada.');
            return;
        }
    
        // Define o GPT selecionado no StateManager
        this.stateManager.setSelectedGPT(associatedGPT);
    
        // Define o sessionId no StateManager
        this.stateManager.setSessionId(chatId);
    
        // Atualiza a interface
        this.selectChatItem(chatId);
    
        // Inicializa o chatbot com o GPT associado
        if (this.uiManager) {
            this.uiManager.initializeChatbot();
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
            // Exibe o modal de confirmação
            const confirmDelete = await showDeleteConfirmation(chatName);
            if (!confirmDelete) return; // Sai se o usuário cancelar

            // Chamada à API para excluir o chat
            const params = {
                company_name: this.config.companyName,
                user_name: this.config.userName,
                user_id: this.config.userId,
                session_id: chatId
            };

            const deleteResponse = await this.apiService.request('deleteChat', params, 'DELETE');
            console.log('Resposta da API de exclusão:', deleteResponse);

            if (deleteResponse.status === "success") {
                showAlert('Chat excluído com sucesso.', 'info');
                this.stateManager.removeChat(chatId);
                this.populateChatMenu(this.stateManager.chats);

                if (this.stateManager.currentSessionId === chatId) {
                    this.stateManager.setSessionId("");
                    // Aqui você pode chamar uma função para reinicializar o chatbot ou outra lógica necessária
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
            showAlert('Erro ao excluir o chat.', 'error');
            console.error('Erro ao excluir o chat:', error);
        }
    }

    /* --- Funções de Seleção de Chats --- */

    /**
     * Destaca o chat selecionado na interface do usuário.
     * @param {string} chatId - ID do chat a ser destacado.
     */
    selectChatItem(chatId) {
        console.log('selectChatItem chamado com chatId:', chatId); // Log inicial

        // Filtrar apenas os itens com data-chat-id válido
        const chatItems = Array.from(document.querySelectorAll('#chat-list .chat-item'))
            .filter(item => item.dataset.chatId); // Ignora itens inválidos (sem data-chat-id)

        chatItems.forEach(item => {
            const itemChatId = item.dataset.chatId; // Obtem o chatId do item

            if (itemChatId === chatId) {
                item.classList.add('active'); // Adiciona classe 'active' ao chat selecionado
                localStorage.setItem('selectedChatId', chatId); // Salva no localStorage
                //console.log(`Chat selecionado: ${chatId}`);
            } else {
                item.classList.remove('active'); // Remove classe 'active' de outros itens
                //console.log(`Chat não selecionado: ${itemChatId}`); // Loga apenas IDs válidos
            }
        });

        // Caso não haja elementos válidos, mostrar uma mensagem
        if (chatItems.length === 0) {
            console.warn('Nenhum chat válido encontrado na lista.');
        }
    }

    /* --- Funções de Filtragem de Chats --- */

    /**
     * Filtra a lista de chats com base no termo de pesquisa.
     */
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

    /**
     * Limpa o campo de pesquisa e restaura a lista completa de chats.
     */
    clearSearch() {
        const searchInput = document.getElementById('search-input');
        searchInput.value = '';
        document.getElementById('clear-search-button').classList.remove('d-block');
        this.populateChatMenu(this.stateManager.chats);
        searchInput.focus();
    }

    /**
     * Destaca o termo de pesquisa nos nomes dos chats.
     * @param {string} text - Texto do nome do chat.
     * @returns {string} - Texto com o termo de pesquisa destacado.
     */
    highlightSearch(text) {
        const searchQuery = document.getElementById('search-input').value.toLowerCase();
        if (!searchQuery) return text;
        const regex = new RegExp(`(${this.escapeRegExp(searchQuery)})`, 'gi');
        return text.replace(regex, '<span class="highlight">$1</span>');
    }

    /**
     * Escapa caracteres especiais para uso em expressões regulares.
     * @param {string} string - String a ser escapada.
     * @returns {string} - String escapada.
     */
    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /* --- Funções Auxiliares --- */

    /**
     * Retorna o grupo de data para agrupar os chats na interface.
     * @param {string} date - Data do chat em formato ISO.
     * @returns {string} - Grupo de data correspondente.
     */
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

    /* --- Funções de Log e Erro --- */

    /**
     * Exibe uma mensagem de erro na interface do usuário.
     * @param {string} message - Mensagem de erro a ser exibida.
     */
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

    /**
     * Exibe uma mensagem de alerta na interface do usuário.
     * @param {string} message - Mensagem a ser exibida.
     * @param {string} [type='danger'] - Tipo de alerta (e.g., 'success', 'info', 'warning', 'danger').
     */
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
            // Se não houver um container específico para alertas, usar o container de erros
            this.showError(message);
        }
    }
}

export default ChatManager;