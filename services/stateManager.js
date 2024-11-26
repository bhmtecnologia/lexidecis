// Classe para gerenciar o estado da aplicação, incluindo sessões, chats e configurações do GPT
export default class StateManager {
    constructor() {
        this.currentSessionId = ""; // ID da sessão atual
        this.chats = []; // Lista de chats
        this.selectedGPT = null; // GPT selecionado
        this.selectedGPTId = null; // ID do GPT selecionado
        this.gptConfig = {}; // Configurações do GPT selecionado
    }

    // Define o ID da sessão atual
    setSessionId(sessionId) {
        this.currentSessionId = sessionId;
    }

    // Adiciona um chat à lista
    addChat(chat) {
        this.chats.push(chat);
    }

    // Remove um chat da lista pelo ID
    removeChat(chatId) {
        this.chats = this.chats.filter(chat => chat.id !== chatId);
    }

    // Define o GPT selecionado
    setSelectedGPT(gpt) {
        this.selectedGPT = gpt;
        this.selectedGPTId = gpt.id || null;
    }

    // Define as configurações do GPT
    setGPTConfig(config) {
        this.gptConfig = config;
    }

    // Recupera o ID da sessão atual
    getSessionId() {
        return this.currentSessionId;
    }

    // Recupera a lista de chats
    getChats() {
        return this.chats;
    }

    // Recupera o GPT selecionado
    getSelectedGPT() {
        return this.selectedGPT;
    }

    // Recupera as configurações do GPT selecionado
    getGPTConfig() {
        return this.gptConfig;
    }
}