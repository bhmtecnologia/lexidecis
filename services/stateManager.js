export default class StateManager {
    constructor() {
        this.currentSessionId = ""; // ID da sessão atual
        this.chats = []; // Lista de chats
        this.selectedGPT = null; // GPT selecionado
        this.selectedGPTId = null; // ID do GPT selecionado
        this.gptConfig = {}; // Configurações do GPT selecionado
        this.isLoadingGPTs = false; // Flag para controlar o estado de carregamento dos GPTs
        this.isGPTSelectionLoading = false; // Flag para controlar múltiplas requisições na seleção de GPT
    }

    /* === Sessões === */
    // Define o ID da sessão atual
    setSessionId(sessionId) {
        this.currentSessionId = sessionId;
    }

    // Recupera o ID da sessão atual
    getSessionId() {
        return this.currentSessionId;
    }

    /* === Chats === */
    // Adiciona um chat à lista
    addChat(chat) {
        this.chats.push(chat);
    }

    // Remove um chat da lista pelo ID
    removeChat(chatId) {
        this.chats = this.chats.filter(chat => chat.id !== chatId);
    }

    // Recupera a lista de chats
    getChats() {
        return this.chats;
    }

    // Carrega o chat selecionado previamente
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
        }
    }

    /* === GPTs === */
    // Define o GPT selecionado
    setSelectedGPT(gpt) {
        this.selectedGPT = gpt;
        this.selectedGPTId = gpt.id || null;
    }

    // Recupera o GPT selecionado
    getSelectedGPT() {
        return this.selectedGPT;
    }

    // Define as configurações do GPT
    setGPTConfig(config) {
        this.gptConfig = config;
    }

    // Recupera as configurações do GPT selecionado
    getGPTConfig() {
        return this.gptConfig;
    }

    // Carrega o GPT selecionado previamente ou seleciona o GPT padrão
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
            const gptData = await apiService.request('readGPT', params, 'GET');
            if (gptData && gptData.length > 0) {
                const defaultGPT = gptData.find(gpt => gpt.id === defaultGPTId);
                if (defaultGPT) {
                    this.setSelectedGPT(defaultGPT);
                    localStorage.setItem('selectedGPT', JSON.stringify(defaultGPT));
                    localStorage.setItem('selectedGPTId', defaultGPT.id);
                    console.log('GPT padrão selecionado:', defaultGPT);
                } else {
                    console.warn('GPT padrão não encontrado na lista.');
                }
            }
        }
    }

    /* === Estado de Carregamento dos GPTs === */
    // Marca o estado de carregamento dos GPTs como ativo ou inativo
    setLoadingGPTs(isLoading) {
        this.isLoadingGPTs = isLoading;
    }

    // Retorna o estado de carregamento dos GPTs
    isLoadingGPTsActive() {
        return this.isLoadingGPTs;
    }

    /* === Estado de Seleção de GPT === */
    // Marca o estado de carregamento na seleção de GPT como ativo ou inativo
    setGPTSelectionLoading(isLoading) {
        this.isGPTSelectionLoading = isLoading;
    }

    // Retorna o estado de carregamento na seleção de GPT
    isGPTSelectionLoadingActive() {
        return this.isGPTSelectionLoading;
    }
}