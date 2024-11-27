export default class ChatManager {
    /**
     * Carrega a lista de chats do usuário a partir da API.
     * @param {Object} config - Configurações da aplicação (contém companyName, userName, userId, apiCredentials).
     * @param {Object} apiService - Serviço de API para realizar requisições.
     * @returns {Promise<Array>} - Retorna a lista de chats.
     */
    static async loadChatList(config, apiService) {
        const params = {
            company_name: config.companyName,
            user_name: config.userName,
            user_id: config.userId
        };
        try {
            const response = await apiService.request('readChat', params, 'GET');
            if (response.status !== 'success') {
                throw new Error(response.message || 'Erro ao carregar a lista de chats.');
            }

            const chatData = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
            if (!Array.isArray(chatData)) {
                throw new Error('Dados da API não são um array válido.');
            }

            // Formatar os dados para inclusão no estado
            return chatData.map(chat => ({
                ...chat,
                date: chat.last_modified || new Date().toISOString()
            }));
        } catch (error) {
            console.error('Erro ao carregar lista de chats:', error);
            throw new Error('Erro ao carregar a lista de chats. Verifique o console para mais detalhes.');
        }
    }

    /**
     * Renomeia um chat existente.
     * @param {Object} config - Configurações da aplicação.
     * @param {Object} apiService - Serviço de API para realizar requisições.
     * @param {string} chatId - ID do chat a ser renomeado.
     * @param {string} newChatName - Novo nome para o chat.
     * @returns {Promise<Object>} - Retorna os dados atualizados do chat.
     */
    static async renameChat(config, apiService, chatId, newChatName) {
        const params = {
            company_name: config.companyName,
            user_name: config.userName,
            user_id: config.userId,
            sessionid: chatId,
            new_chat_name: newChatName.trim()
        };

        try {
            const response = await apiService.request('updateChat', params, 'POST', null, { includeParamsInQuery: true });
            if (response.status !== 'success') {
                throw new Error(response.message || 'Erro ao renomear o chat.');
            }

            return response.data;
        } catch (error) {
            console.error('Erro ao renomear o chat:', error);
            throw new Error('Erro ao renomear o chat. Verifique o console para mais detalhes.');
        }
    }

    /**
     * Exclui um chat existente.
     * @param {Object} config - Configurações da aplicação.
     * @param {Object} apiService - Serviço de API para realizar requisições.
     * @param {string} chatId - ID do chat a ser excluído.
     * @returns {Promise<void>}
     */
    static async deleteChat(config, apiService, chatId) {
        const params = {
            company_name: config.companyName,
            user_name: config.userName,
            user_id: config.userId,
            session_id: chatId
        };

        try {
            const response = await apiService.request('deleteChat', params, 'DELETE');
            if (response.status !== 'success') {
                throw new Error(response.message || 'Erro ao excluir o chat.');
            }
        } catch (error) {
            console.error('Erro ao excluir o chat:', error);
            throw new Error('Erro ao excluir o chat. Verifique o console para mais detalhes.');
        }
    }

    /**
     * Cria um novo chat.
     * @param {Object} stateManager - Gerenciador de estado da aplicação.
     * @param {Object} selectedGPT - GPT selecionado no momento.
     * @returns {Object} - Retorna os dados do novo chat criado.
     */
    static createNewChat(stateManager, selectedGPT) {
        const newSessionId = '1'; // Gerar ID de sessão único
        const newChat = {
            id: newSessionId,
            name: selectedGPT ? selectedGPT.name : 'Novo Chat',
            date: new Date().toISOString()
        };

        stateManager.addChat(newChat);
        stateManager.setSessionId(newSessionId);
        return newChat;
    }

    /**
     * Atualiza a lista de chats exibida na interface.
     * @param {HTMLElement} chatListElement - Elemento do DOM para a lista de chats.
     * @param {Array} chatsToDisplay - Lista de chats para exibir.
     * @param {Function} handleRenameChat - Função para renomear chat.
     * @param {Function} handleDeleteChat - Função para excluir chat.
     * @param {Function} handleChatClick - Função para selecionar chat.
     */
    static populateChatMenu(chatListElement, chatsToDisplay, handleRenameChat, handleDeleteChat, handleChatClick) {
        if (!chatListElement) {
            console.error('Elemento chat-list não encontrado.');
            return;
        }

        chatListElement.innerHTML = '';

        if (!chatsToDisplay || chatsToDisplay.length === 0) {
            const emptyMessage = document.createElement('li');
            emptyMessage.textContent = 'Nenhum chat encontrado.';
            emptyMessage.classList.add('list-group-item', 'text-center');
            chatListElement.appendChild(emptyMessage);
            return;
        }

        const fragment = document.createDocumentFragment();
        chatsToDisplay.forEach(chat => {
            const chatItem = document.createElement('li');
            chatItem.classList.add('list-group-item', 'chat-item', 'd-flex', 'justify-content-between', 'align-items-center');
            chatItem.innerHTML = `
                <span class="chat-name">${chat.name || 'Chat sem nome'}</span>
                <div class="dropdown">
                    <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                        <i class="bi bi-three-dots"></i>
                    </button>
                    <ul class="dropdown-menu">
                        <li><button class="dropdown-item rename-chat-button">Renomear</button></li>
                        <li><button class="dropdown-item delete-chat-button">Excluir</button></li>
                    </ul>
                </div>
            `;

            chatItem.querySelector('.rename-chat-button').addEventListener('click', () => handleRenameChat(chat.id, chat.name));
            chatItem.querySelector('.delete-chat-button').addEventListener('click', () => handleDeleteChat(chat.id, chat.name));
            chatItem.addEventListener('click', () => handleChatClick(chat));

            fragment.appendChild(chatItem);
        });

        chatListElement.appendChild(fragment);
    }

    /**
     * Filtra a lista de chats com base no termo de pesquisa.
     * @param {Array} chats - Lista completa de chats.
     * @param {string} searchTerm - Termo de pesquisa.
     * @returns {Array} - Lista de chats filtrados.
     */
    static filterChatList(chats, searchTerm) {
        return chats.filter(chat => {
            const chatName = chat.name || 'Chat sem nome';
            return chatName.toLowerCase().includes(searchTerm.toLowerCase());
        });
    }

    /**
     * Destaca o chat selecionado na interface.
     * @param {string} chatId - ID do chat selecionado.
     * @param {NodeList} chatItems - Lista de itens do DOM representando os chats.
     */
    static selectChatItem(chatId, chatItems) {
        chatItems.forEach(item => {
            if (item.dataset.chatId === chatId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    /**
     * Limpa o campo de pesquisa e restaura a lista de chats.
     * @param {HTMLInputElement} searchInput - Campo de entrada de pesquisa.
     * @param {HTMLElement} chatListElement - Elemento do DOM para a lista de chats.
     * @param {Array} chats - Lista completa de chats.
     * @param {Function} populateChatMenu - Função para atualizar a interface da lista de chats.
     */
    static clearSearch(searchInput, chatListElement, chats, populateChatMenu) {
        searchInput.value = '';
        populateChatMenu(chatListElement, chats);
        searchInput.focus();
    }
}