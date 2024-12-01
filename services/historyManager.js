// historyManager.js

export default class HistoryManager {
    /**
     * Injeta o histórico de chat previamente salvo no localStorage.
     * @param {string} sessionId - ID da sessão atual.
     * @param {Object} config - Configurações da aplicação (contém flowiseApiHost, flowiseChatflowId, etc.).
     * @returns {Promise<void>}
     */
    static async injectChatHistory(sessionId, config) {
        const apiURL = `${config.flowise.apiHost}/api/v1/chatmessage/${config.flowise.chatflowId}?sessionId=${sessionId}&user_id=${encodeURIComponent(config.userId)}`;
        try {
            const response = await fetch(apiURL, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${config.flowise.token}`
                }
            });

            if (!response.ok) throw new Error('Erro ao buscar histórico de mensagens da API.');

            const apiHistory = await response.json();

            // Formatando o histórico para o formato necessário
            const formattedHistory = apiHistory.map((msg) => ({
                message: msg.content,
                type: msg.role === 'userMessage' ? 'userMessage' : 'apiMessage',
                dateTime: msg.createdDate || new Date().toISOString(),
                messageId: msg.id || Math.random().toString(36).substring(2),
                fileUploads: msg.fileUploads || []
            }));

            // Preparando o histórico para salvar no localStorage
            const chatData = {
                chatHistory: formattedHistory,
                chatId: apiHistory[0]?.chatId || sessionId
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
     * @param {Object} config - Configurações da aplicação (contém flowiseApiHost, flowiseChatflowId, etc.).
     * @returns {Promise<Array>} - Retorna o histórico de mensagens.
     */
    static async fetchChatHistory(sessionId, config) {
        const apiURL = `${config.flowise.apiHost}/api/v1/chatmessage/${config.flowise.chatflowId}?sessionId=${sessionId}&user_id=${encodeURIComponent(config.userId)}`;
        try {
            const response = await fetch(apiURL, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${config.flowise.token}`
                }
            });

            if (!response.ok) throw new Error('Erro ao buscar histórico de mensagens da API.');

            const apiHistory = await response.json();

            // Formatando o histórico de mensagens
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
}