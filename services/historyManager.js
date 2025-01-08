export default class HistoryManager {
    /**
     * Função auxiliar para buscar e formatar o histórico de mensagens.
     * @param {string} sessionId - ID da sessão atual.
     * @param {Object} config - Configurações da aplicação.
     * @returns {Promise<Array>} - Histórico de mensagens formatado.
     */
    static async _fetchAndFormatHistory(sessionId, config) {
        const apiURL = `${config.flowise.apiHost}/api/v1/chatmessage/${config.flowise.chatflowId}?sessionId=${sessionId}`;
        console.log('Tentando buscar histórico em:', apiURL);
        
        try {
            const response = await fetch(apiURL, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${config.flowise.token}`
                }
            });

            console.log('Status da resposta:', response.status);
            const responseBody = await response.text();
            console.log('Corpo da resposta:', responseBody);

            if (!response.ok) throw new Error('Erro ao buscar histórico de mensagens da API.');

            const apiHistory = JSON.parse(responseBody);

            return apiHistory.map((msg) => ({
                message: msg.content,
                type: msg.role === 'userMessage' ? 'userMessage' : 'apiMessage',
                dateTime: msg.createdDate || new Date().toISOString(),
                messageId: msg.id || Math.random().toString(36).substring(2), // Pode ser futuramente substituído pelo valor que voltar na API
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
    static async injectChatHistory(sessionId, config) {
        try {
            const formattedHistory = await this._fetchAndFormatHistory(sessionId, config);

            const chatData = {
                chatHistory: formattedHistory,
                chatId: sessionId // Define chatId como sessionId diretamente
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
    static async fetchChatHistory(sessionId, config) {
        return await this._fetchAndFormatHistory(sessionId, config);
    }
}