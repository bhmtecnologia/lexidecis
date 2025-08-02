/**
 * @file stateManager.js
 * @description Gerenciador de estado centralizado da aplicação LexiDecis
 * @version 2.0 - Refatorado com melhores práticas
 */

// ============================
// 1. CONFIGURAÇÕES E UTILITÁRIOS
// ============================

const DEBUG_MODE = true; // Sempre ativo para facilitar manutenção

function debugLog(context, message, data = null) {
    if (DEBUG_MODE) {
        const timestamp = new Date().toISOString();
        const logMessage = `[StateManager:${context}] ${message}`;
        if (data) {
            console.log(timestamp, logMessage, data);
        } else {
            console.log(timestamp, logMessage);
        }
    }
}

function validateData(data, type, required = true) {
    if (required && !data) {
        throw new Error(`Dados obrigatórios não fornecidos para ${type}`);
    }
    return true;
}

function safeJsonParse(jsonString, defaultValue = null) {
    try {
        return jsonString ? JSON.parse(jsonString) : defaultValue;
    } catch (error) {
        debugLog('UTILS', `Erro ao fazer parse do JSON: ${error.message}`);
        return defaultValue;
    }
}

function safeJsonStringify(data) {
    try {
        return JSON.stringify(data);
    } catch (error) {
        debugLog('UTILS', `Erro ao serializar dados: ${error.message}`);
        return null;
    }
}

// ============================
// 2. SISTEMA DE EVENTOS SIMPLES
// ============================

class EventEmitter {
    constructor() {
        this.events = {};
    }

    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
        debugLog('EVENTS', `Evento registrado: ${event}`);
    }

    emit(event, data = null) {
        if (this.events[event]) {
            this.events[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    debugLog('EVENTS', `Erro no callback do evento ${event}: ${error.message}`);
                }
            });
            debugLog('EVENTS', `Evento emitido: ${event}`, data);
        }
    }

    off(event, callback) {
        if (this.events[event]) {
            this.events[event] = this.events[event].filter(cb => cb !== callback);
            debugLog('EVENTS', `Evento removido: ${event}`);
        }
    }
}

// ============================
// 3. GERENCIADORES ESPECIALIZADOS
// ============================

class SessionManager extends EventEmitter {
    constructor() {
        super();
        this.currentSessionId = "";
        this.loadFromStorage();
    }

    setSessionId(sessionId) {
        validateData(sessionId, 'sessionId');
        this.currentSessionId = sessionId;
        this.saveToStorage();
        this.emit('sessionChanged', sessionId);
        debugLog('SESSION', `Sessão definida: ${sessionId}`);
    }

    getSessionId() {
        return this.currentSessionId;
    }

    loadFromStorage() {
        const stored = localStorage.getItem('selectedChatId');
        if (stored) {
            this.currentSessionId = stored;
            debugLog('SESSION', `Sessão carregada do storage: ${stored}`);
        }
    }

    saveToStorage() {
        if (this.currentSessionId) {
            localStorage.setItem('selectedChatId', this.currentSessionId);
        }
    }

    reset() {
        this.currentSessionId = "";
        localStorage.removeItem('selectedChatId');
        this.emit('sessionReset');
        debugLog('SESSION', 'Sessão resetada');
    }
}

class ChatManager extends EventEmitter {
    constructor() {
        super();
        this.chats = [];
    }

    setChats(chats) {
        validateData(chats, 'chats');
        if (!Array.isArray(chats)) {
            throw new Error('Chats deve ser um array');
        }
        this.chats = chats;
        this.emit('chatsUpdated', chats);
        debugLog('CHAT', `Chats atualizados: ${chats.length} chats`);
    }

    addChat(chat) {
        validateData(chat, 'chat');
        if (!chat.id) {
            throw new Error('Chat deve ter um ID');
        }
        this.chats.push(chat);
        this.emit('chatAdded', chat);
        debugLog('CHAT', `Chat adicionado: ${chat.id}`);
    }

    removeChat(chatId) {
        validateData(chatId, 'chatId');
        const initialLength = this.chats.length;
        this.chats = this.chats.filter(chat => chat.id !== chatId);
        if (this.chats.length < initialLength) {
            this.emit('chatRemoved', chatId);
            debugLog('CHAT', `Chat removido: ${chatId}`);
        }
    }

    getChats() {
        return [...this.chats]; // Retorna cópia para evitar modificação externa
    }

    getChatById(chatId) {
        return this.chats.find(chat => chat.id === chatId) || null;
    }

    reset() {
        this.chats = [];
        this.emit('chatsReset');
        debugLog('CHAT', 'Chats resetados');
    }
}

class GPTManager extends EventEmitter {
    constructor() {
        super();
        this.gpts = [];
        this.selectedGPT = null;
        this.selectedGPTId = null;
        this.gptConfig = {};
        this.isLoading = false;
        this.isSelectionLoading = false;
        this.loadFromStorage();
    }

    setGPTs(gpts) {
        validateData(gpts, 'gpts');
        if (!Array.isArray(gpts)) {
            throw new Error('GPTs deve ser um array');
        }
        this.gpts = gpts;
        this.emit('gptsUpdated', gpts);
        debugLog('GPT', `GPTs atualizados: ${gpts.length} GPTs`);
    }

    setSelectedGPT(gpt) {
        validateData(gpt, 'gpt');
        if (!gpt.id) {
            throw new Error('GPT deve ter um ID');
        }
        this.selectedGPT = gpt;
        this.selectedGPTId = gpt.id;
        this.saveToStorage();
        this.emit('gptSelected', gpt);
        debugLog('GPT', `GPT selecionado: ${gpt.id}`);
    }

    setGPTConfig(config) {
        validateData(config, 'config');
        this.gptConfig = config;
        this.saveToStorage();
        this.emit('gptConfigUpdated', config);
        debugLog('GPT', 'Configuração do GPT atualizada');
    }

    setLoading(isLoading) {
        this.isLoading = isLoading;
        this.emit('loadingChanged', isLoading);
        debugLog('GPT', `Loading GPTs: ${isLoading}`);
    }

    setSelectionLoading(isLoading) {
        this.isSelectionLoading = isLoading;
        this.emit('selectionLoadingChanged', isLoading);
        debugLog('GPT', `Loading seleção: ${isLoading}`);
    }

    getGPTs() {
        return [...this.gpts];
    }

    getSelectedGPT() {
        return this.selectedGPT;
    }

    getGPTById(gptId) {
        return this.gpts.find(gpt => gpt.id === gptId) || null;
    }

    getGPTConfig() {
        return { ...this.gptConfig };
    }

    getFlowiseConfig() {
        return this.gptConfig?.flowise || null;
    }

    async loadSelectedGPT(defaultGPTId, apiService) {
        try {
            this.setSelectionLoading(true);
            
            const storedGPT = safeJsonParse(localStorage.getItem('selectedGPT'));
            const storedGPTId = localStorage.getItem('selectedGPTId');
            const storedConfig = safeJsonParse(localStorage.getItem('gptConfig'));

            if (storedGPT && storedGPTId && storedConfig) {
                this.setSelectedGPT(storedGPT);
                this.setGPTConfig(storedConfig);
                debugLog('GPT', 'GPT carregado do storage');
                return;
            }

            // Carrega GPT padrão da API
            await this.loadDefaultGPT(defaultGPTId, apiService);
            
        } catch (error) {
            debugLog('GPT', `Erro ao carregar GPT: ${error.message}`);
            this.emit('gptLoadError', error);
        } finally {
            this.setSelectionLoading(false);
        }
    }

    async loadDefaultGPT(defaultGPTId, apiService) {
        const params = {
            company_name: sessionStorage.getItem("tenant"),
            user_name: sessionStorage.getItem("email"),
            user_id: sessionStorage.getItem("userId"),
        };

        const gptData = await apiService.request('readGPT', params, 'GET');
        
        if (gptData && Array.isArray(gptData) && gptData.length > 0) {
            const defaultGPT = gptData.find(gpt => gpt.id === defaultGPTId);
            if (defaultGPT) {
                this.setSelectedGPT(defaultGPT);
                
                // Carrega configuração
                try {
                    const configResponse = await apiService.request(
                        'readGPTConfig', 
                        { gptId: defaultGPT.id }, 
                        'GET'
                    );
                    if (configResponse) {
                        this.setGPTConfig(configResponse);
                    }
                } catch (configError) {
                    debugLog('GPT', `Erro ao carregar configuração: ${configError.message}`);
                }
                
                debugLog('GPT', `GPT padrão carregado: ${defaultGPT.id}`);
            }
        }
    }

    loadFromStorage() {
        const storedGPT = safeJsonParse(localStorage.getItem('selectedGPT'));
        const storedConfig = safeJsonParse(localStorage.getItem('gptConfig'));
        
        if (storedGPT) {
            this.selectedGPT = storedGPT;
            this.selectedGPTId = storedGPT.id;
        }
        
        if (storedConfig) {
            this.gptConfig = storedConfig;
        }
    }

    saveToStorage() {
        if (this.selectedGPT) {
            const serialized = safeJsonStringify(this.selectedGPT);
            if (serialized) {
                localStorage.setItem('selectedGPT', serialized);
                localStorage.setItem('selectedGPTId', this.selectedGPT.id);
            }
        }
        
        if (Object.keys(this.gptConfig).length > 0) {
            const serialized = safeJsonStringify(this.gptConfig);
            if (serialized) {
                localStorage.setItem('gptConfig', serialized);
            }
        }
    }

    reset() {
        this.gpts = [];
        this.selectedGPT = null;
        this.selectedGPTId = null;
        this.gptConfig = {};
        this.isLoading = false;
        this.isSelectionLoading = false;
        
        localStorage.removeItem('selectedGPT');
        localStorage.removeItem('selectedGPTId');
        localStorage.removeItem('gptConfig');
        
        this.emit('gptReset');
        debugLog('GPT', 'GPT resetado');
    }
}

// ============================
// 4. STATEMANAGER PRINCIPAL
// ============================

export default class StateManager extends EventEmitter {
    constructor() {
        super();
        
        // Inicializa gerenciadores especializados
        this.session = new SessionManager();
        this.chat = new ChatManager();
        this.gpt = new GPTManager();
        
        // Propaga eventos dos gerenciadores especializados
        this.setupEventPropagation();
        
        debugLog('MAIN', 'StateManager inicializado');
    }

    // ============================
    // PROPRIEDADES DE COMPATIBILIDADE
    // ============================

    // Propriedades de sessão
    get currentSessionId() { return this.session.getSessionId(); }
    set currentSessionId(value) { this.session.setSessionId(value); }

    // Propriedades de chat
    get chats() { return this.chat.getChats(); }
    set chats(value) { this.chat.setChats(value); }

    // Propriedades de GPT
    get gpts() { return this.gpt.getGPTs(); }
    set gpts(value) { this.gpt.setGPTs(value); }

    get selectedGPT() { return this.gpt.getSelectedGPT(); }
    set selectedGPT(value) { this.gpt.setSelectedGPT(value); }

    get selectedGPTId() { return this.gpt.selectedGPTId; }
    set selectedGPTId(value) { 
        const gpt = this.gpt.getGPTById(value);
        if (gpt) this.gpt.setSelectedGPT(gpt);
    }

    get gptConfig() { return this.gpt.getGPTConfig(); }
    set gptConfig(value) { this.gpt.setGPTConfig(value); }

    get isLoadingGPTs() { return this.gpt.isLoading; }
    set isLoadingGPTs(value) { this.gpt.setLoading(value); }

    get isGPTSelectionLoading() { return this.gpt.isSelectionLoading; }
    set isGPTSelectionLoading(value) { this.gpt.setSelectionLoading(value); }

    // Propriedades de compatibilidade para selectedChat
    get selectedChat() { 
        const sessionId = this.session.getSessionId();
        return sessionId ? this.chat.getChatById(sessionId) : null;
    }
    set selectedChat(value) { 
        if (value && value.id) {
            this.session.setSessionId(value.id);
        }
    }

    setupEventPropagation() {
        // Propaga eventos da sessão
        this.session.on('sessionChanged', (data) => this.emit('sessionChanged', data));
        this.session.on('sessionReset', () => this.emit('sessionReset'));
        
        // Propaga eventos dos chats
        this.chat.on('chatsUpdated', (data) => this.emit('chatsUpdated', data));
        this.chat.on('chatAdded', (data) => this.emit('chatAdded', data));
        this.chat.on('chatRemoved', (data) => this.emit('chatRemoved', data));
        this.chat.on('chatsReset', () => this.emit('chatsReset'));
        
        // Propaga eventos dos GPTs
        this.gpt.on('gptsUpdated', (data) => this.emit('gptsUpdated', data));
        this.gpt.on('gptSelected', (data) => this.emit('gptSelected', data));
        this.gpt.on('gptConfigUpdated', (data) => this.emit('gptConfigUpdated', data));
        this.gpt.on('loadingChanged', (data) => this.emit('gptLoadingChanged', data));
        this.gpt.on('selectionLoadingChanged', (data) => this.emit('gptSelectionLoadingChanged', data));
        this.gpt.on('gptLoadError', (data) => this.emit('gptLoadError', data));
        this.gpt.on('gptReset', () => this.emit('gptReset'));
    }

    // ============================
    // MÉTODOS DE CONVENIÊNCIA
    // ============================

    // Sessão
    setSessionId(sessionId) { this.session.setSessionId(sessionId); }
    getSessionId() { return this.session.getSessionId(); }

    // Métodos de compatibilidade para sessão/chat
    loadSelectedChat() { 
        const selectedChatId = localStorage.getItem('selectedChatId');
        if (selectedChatId) {
            const selectedChat = this.chat.getChats().find(chat => chat.id === selectedChatId);
            if (selectedChat) {
                this.session.setSessionId(selectedChat.id);
                debugLog('MAIN', 'Chat selecionado do localStorage:', selectedChat);
            } else {
                debugLog('MAIN', 'Chat salvo no localStorage não encontrado na lista atual.');
            }
        } else {
            debugLog('MAIN', 'Nenhum chat selecionado previamente encontrado no localStorage.');
        }
    }

    saveSelectedChat(chatId) { 
        this.session.setSessionId(chatId);
        debugLog('MAIN', `Chat selecionado salvo no localStorage: ${chatId}`);
    }

    // Chats
    setChats(chats) { this.chat.setChats(chats); }
    addChat(chat) { this.chat.addChat(chat); }
    removeChat(chatId) { this.chat.removeChat(chatId); }
    getChats() { return this.chat.getChats(); }
    getChatById(chatId) { return this.chat.getChatById(chatId); }
    setSelectedChat(chat) { this.selectedChat = chat; }

    // GPTs
    setGPTs(gpts) { this.gpt.setGPTs(gpts); }
    setSelectedGPT(gpt) { this.gpt.setSelectedGPT(gpt); }
    setGPTConfig(config) { this.gpt.setGPTConfig(config); }
    setLoadingGPTs(isLoading) { this.gpt.setLoading(isLoading); }
    setGPTSelectionLoading(isLoading) { this.gpt.setSelectionLoading(isLoading); }
    
    getGPTs() { return this.gpt.getGPTs(); }
    getSelectedGPT() { return this.gpt.getSelectedGPT(); }
    getGPTById(gptId) { return this.gpt.getGPTById(gptId); }
    getGPTConfig() { return this.gpt.getGPTConfig(); }
    getFlowiseConfig() { return this.gpt.getFlowiseConfig(); }
    
    isLoadingGPTsActive() { return this.gpt.isLoading; }
    isGPTSelectionLoadingActive() { return this.gpt.isSelectionLoading; }
    
    async loadSelectedGPT(defaultGPTId, apiService) { 
        return this.gpt.loadSelectedGPT(defaultGPTId, apiService); 
    }

    // ============================
    // MÉTODOS DE UTILIDADE
    // ============================

    /**
     * Reseta todo o estado da aplicação
     */
    resetAll() {
        this.session.reset();
        this.chat.reset();
        this.gpt.reset();
        this.emit('stateReset');
        debugLog('MAIN', 'Estado completo resetado');
    }

    /**
     * Obtém snapshot completo do estado atual
     */
    getStateSnapshot() {
        return {
            session: {
                currentSessionId: this.session.getSessionId()
            },
            chat: {
                chats: this.chat.getChats(),
                totalChats: this.chat.getChats().length
            },
            gpt: {
                gpts: this.gpt.getGPTs(),
                selectedGPT: this.gpt.getSelectedGPT(),
                selectedGPTId: this.gpt.selectedGPTId,
                gptConfig: this.gpt.getGPTConfig(),
                isLoading: this.gpt.isLoading,
                isSelectionLoading: this.gpt.isSelectionLoading
            }
        };
    }

    /**
     * Verifica se o estado está em um estado válido
     */
    isValidState() {
        const snapshot = this.getStateSnapshot();
        
        // Verifica se há pelo menos um GPT disponível
        if (snapshot.gpt.gpts.length === 0) {
            debugLog('MAIN', 'Estado inválido: Nenhum GPT disponível');
            return false;
        }
        
        // Verifica se há um GPT selecionado
        if (!snapshot.gpt.selectedGPT) {
            debugLog('MAIN', 'Estado inválido: Nenhum GPT selecionado');
            return false;
        }
        
        debugLog('MAIN', 'Estado válido');
        return true;
    }

    /**
     * Loga o estado atual para debug
     */
    logCurrentState() {
        const snapshot = this.getStateSnapshot();
        debugLog('MAIN', 'Estado atual:', snapshot);
    }

    // ============================
    // MÉTODOS DE CONFIGURAÇÕES (COMPATIBILIDADE)
    // ============================

    /**
     * Obtém uma configuração do localStorage
     * @param {string} key - Chave da configuração
     * @param {*} defaultValue - Valor padrão se não encontrado
     * @returns {*} Valor da configuração
     */
    getSetting(key, defaultValue = null) {
        try {
            const value = localStorage.getItem(`setting_${key}`);
            return value ? safeJsonParse(value, defaultValue) : defaultValue;
        } catch (error) {
            debugLog('MAIN', `Erro ao obter configuração ${key}: ${error.message}`);
            return defaultValue;
        }
    }

    /**
     * Define uma configuração no localStorage
     * @param {string} key - Chave da configuração
     * @param {*} value - Valor da configuração
     */
    setSetting(key, value) {
        try {
            const serialized = safeJsonStringify(value);
            if (serialized !== null) {
                localStorage.setItem(`setting_${key}`, serialized);
                debugLog('MAIN', `Configuração ${key} definida:`, value);
            }
        } catch (error) {
            debugLog('MAIN', `Erro ao definir configuração ${key}: ${error.message}`);
        }
    }
}