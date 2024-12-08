export default class StateManager {
    constructor() {
        // Sessão atual
        this.currentSessionId = ""; // ID da sessão atual

        // Chats
        this.chats = []; // Lista de chats

        // GPTs
        this.gpts = []; // Lista de GPTs disponíveis
        this.selectedGPT = null; // GPT selecionado
        this.selectedGPTId = null; // ID do GPT selecionado
        this.gptConfig = {}; // Configurações do GPT selecionado

        // Estados de carregamento
        this.isLoadingGPTs = false; // Flag para controlar o estado de carregamento dos GPTs
        this.isGPTSelectionLoading = false; // Flag para controlar múltiplas requisições na seleção de GPT
    }

    /* === Sessões === */

    /**
     * Define o ID da sessão atual.
     * @param {string} sessionId - ID da nova sessão.
     */
    setSessionId(sessionId) {
        this.currentSessionId = sessionId;
        console.log(`Sessão definida para ID: ${sessionId}`);
    }

    /**
     * Recupera o ID da sessão atual.
     * @returns {string} ID da sessão atual.
     */
    getSessionId() {
        return this.currentSessionId;
    }

    /* === Chats === */

    /**
     * Adiciona um chat à lista de chats.
     * @param {Object} chat - Objeto do chat a ser adicionado.
     */
    addChat(chat) {
        this.chats.push(chat);
        console.log(`Chat adicionado: ${chat.id}`);
    }

    /**
     * Remove um chat da lista pelo ID.
     * @param {string} chatId - ID do chat a ser removido.
     */
    removeChat(chatId) {
        this.chats = this.chats.filter(chat => chat.id !== chatId);
        console.log(`Chat removido: ${chatId}`);
    }

    /**
     * Recupera a lista completa de chats.
     * @returns {Array<Object>} Lista de chats.
     */
    getChats() {
        return this.chats;
    }

    /**
     * Carrega o chat selecionado previamente a partir do localStorage.
     */
    loadSelectedChat() {
        const selectedChatId = localStorage.getItem('selectedChatId');
        if (selectedChatId) {
            const selectedChat = this.chats.find(chat => chat.id === selectedChatId);
            if (selectedChat) {
                this.setSessionId(selectedChat.id);
                console.log('Chat selecionado do localStorage:', selectedChat);
            } else {
                console.warn('Chat salvo no localStorage não encontrado na lista atual.');
            }
        } else {
            console.log('Nenhum chat selecionado previamente encontrado no localStorage.');
        }
    }

    /**
     * Salva o ID do chat selecionado no localStorage.
     * @param {string} chatId - ID do chat a ser salvo.
     */
    saveSelectedChat(chatId) {
        localStorage.setItem('selectedChatId', chatId);
        console.log(`Chat selecionado salvo no localStorage: ${chatId}`);
    }

    /* === GPTs === */

    /**
     * Define a lista de GPTs disponíveis.
     * @param {Array<Object>} gpts - Lista de GPTs recebida da API.
     */
    setGPTs(gpts) {
        this.gpts = gpts;
        console.log('GPTs atualizados no StateManager:', this.gpts);
    }

    /**
     * Recupera todos os GPTs disponíveis.
     * @returns {Array<Object>} Lista de GPTs.
     */
    getGPTs() {
        return this.gpts;
    }

    /**
     * Recupera um GPT pelo seu ID.
     * @param {string} gptId - ID do GPT a ser recuperado.
     * @returns {Object|null} GPT encontrado ou null se não encontrado.
     */
    getGPTById(gptId) {
        const gpt = this.gpts.find(gpt => gpt.id === gptId);
        if (!gpt) {
            console.warn(`GPT com ID ${gptId} não encontrado.`);
            return null;
        }
        return gpt;
    }

    /**
     * Define o GPT selecionado.
     * @param {Object} gpt - Objeto GPT a ser selecionado.
     */
    setSelectedGPT(gpt) {
        this.selectedGPT = gpt;
        this.selectedGPTId = gpt.id || null;
        console.log(`GPT selecionado: ${gpt.id}`);
    }

    /**
     * Recupera o GPT selecionado.
     * @returns {Object|null} GPT selecionado ou null se nenhum estiver selecionado.
     */
    getSelectedGPT() {
        return this.selectedGPT;
    }

    /**
     * Define as configurações do GPT selecionado.
     * @param {Object} config - Configurações do GPT.
     */
    setGPTConfig(config) {
        this.gptConfig = config;
        console.log('Configurações do GPT atualizadas:', this.gptConfig);
    }

    /**
     * Recupera as configurações do GPT selecionado.
     * @returns {Object} Configurações do GPT.
     */
    getGPTConfig() {
        return this.gptConfig;
    }

    /**
     * Carrega o GPT selecionado previamente ou seleciona o GPT padrão.
     * @param {string} defaultGPTId - ID do GPT padrão a ser selecionado se nenhum estiver armazenado.
     * @param {ApiService} apiService - Instância do ApiService para realizar requisições à API.
     */
    async loadSelectedGPT(defaultGPTId, apiService) {
        const storedGPT = localStorage.getItem('selectedGPT');
        const storedGPTId = localStorage.getItem('selectedGPTId');
        const storedGPTConfig = localStorage.getItem('gptConfig');

        if (storedGPT && storedGPTId && storedGPTConfig) {
            this.setSelectedGPT(JSON.parse(storedGPT));
            this.selectedGPTId = storedGPTId;
            this.setGPTConfig(JSON.parse(storedGPTConfig));
            console.log('GPT carregado do localStorage:', this.getSelectedGPT());
        } else {
            console.log(`Selecionando GPT padrão com ID: ${defaultGPTId}`);
            const params = {
                company_name: sessionStorage.getItem("tenant"),
                user_name: sessionStorage.getItem("email"),
                user_id: sessionStorage.getItem("userId"),
            };
            try {
                const gptData = await apiService.request('readGPT', params, 'GET');
                if (gptData && Array.isArray(gptData) && gptData.length > 0) {
                    const defaultGPT = gptData.find(gpt => gpt.id === defaultGPTId);
                    if (defaultGPT) {
                        this.setSelectedGPT(defaultGPT);
                        localStorage.setItem('selectedGPT', JSON.stringify(defaultGPT));
                        localStorage.setItem('selectedGPTId', defaultGPT.id);
                        console.log('GPT padrão selecionado:', defaultGPT);
                    } else {
                        console.warn('GPT padrão não encontrado na lista.');
                    }
                } else {
                    console.warn('Nenhum GPT disponível para seleção.');
                }
            } catch (error) {
                console.error('Erro ao carregar GPTs da API:', error);
            }
        }
    }

    /* === Estado de Carregamento dos GPTs === */

    /**
     * Define o estado de carregamento dos GPTs.
     * @param {boolean} isLoading - Indica se os GPTs estão sendo carregados.
     */
    setLoadingGPTs(isLoading) {
        this.isLoadingGPTs = isLoading;
        console.log(`Estado de carregamento dos GPTs definido para: ${isLoading}`);
    }

    /**
     * Verifica se os GPTs estão atualmente sendo carregados.
     * @returns {boolean} True se estiverem carregando, false caso contrário.
     */
    isLoadingGPTsActive() {
        return this.isLoadingGPTs;
    }

    /* === Estado de Seleção de GPT === */

    /**
     * Define o estado de carregamento durante a seleção de GPT.
     * @param {boolean} isLoading - Indica se a seleção de GPT está em andamento.
     */
    setGPTSelectionLoading(isLoading) {
        this.isGPTSelectionLoading = isLoading;
        console.log(`Estado de carregamento na seleção de GPT definido para: ${isLoading}`);
    }

    /**
     * Verifica se a seleção de GPT está atualmente sendo carregada.
     * @returns {boolean} True se estiver carregando, false caso contrário.
     */
    isGPTSelectionLoadingActive() {
        return this.isGPTSelectionLoading;
    }

    /* === Utilitários === */

    /**
     * Reseta todas as configurações e dados armazenados no StateManager.
     */
    resetAll() {
        this.currentSessionId = "";
        this.chats = [];
        this.gpts = [];
        this.selectedGPT = null;
        this.selectedGPTId = null;
        this.gptConfig = {};
        this.isLoadingGPTs = false;
        this.isGPTSelectionLoading = false;
        console.log('StateManager foi resetado.');
    }
}