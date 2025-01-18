// Defina debugLog antes da classe
const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);

const DEBUG_MODE = isLocalhost; // Define DEBUG_MODE com base no hostname

function debugLog(...args) {
    if (DEBUG_MODE) {
        console.log(...args);
    }
}

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
        debugLog(`Sessão definida para ID: ${sessionId}`);
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
        debugLog(`Chat adicionado: ${chat.id}`);
    }

    /**
     * Remove um chat da lista pelo ID.
     * @param {string} chatId - ID do chat a ser removido.
     */
    removeChat(chatId) {
        this.chats = this.chats.filter(chat => chat.id !== chatId);
        debugLog(`Chat removido: ${chatId}`);
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
                debugLog('Chat selecionado do localStorage:', selectedChat);
            } else {
                console.warn('Chat salvo no localStorage não encontrado na lista atual.');
            }
        } else {
            debugLog('Nenhum chat selecionado previamente encontrado no localStorage.');
        }
    }

    /**
     * Salva o ID do chat selecionado no localStorage.
     * @param {string} chatId - ID do chat a ser salvo.
     */
    saveSelectedChat(chatId) {
        localStorage.setItem('selectedChatId', chatId);
        debugLog(`Chat selecionado salvo no localStorage: ${chatId}`);
    }

    /* === GPTs === */

    /**
     * Define a lista de GPTs disponíveis.
     * @param {Array<Object>} gpts - Lista de GPTs recebida da API.
     */
    setGPTs(gpts) {
        this.gpts = gpts;
        debugLog('GPTs atualizados no StateManager:', this.gpts);
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
     * Define o GPT selecionado e armazena no localStorage.
     * @param {Object} gpt - Objeto GPT a ser selecionado.
     */
    setSelectedGPT(gpt) {
        this.selectedGPT = gpt;
        this.selectedGPTId = gpt.id || null;
        debugLog(`GPT selecionado: ${gpt.id}`);
        // Atualiza o localStorage com o GPT selecionado
        localStorage.setItem('selectedGPT', JSON.stringify(gpt));
        localStorage.setItem('selectedGPTId', gpt.id);
    }

    /**
     * Recupera o GPT selecionado.
     * @returns {Object|null} GPT selecionado ou null se nenhum estiver selecionado.
     */
    getSelectedGPT() {
        return this.selectedGPT;
    }

    /**
     * Define as configurações do GPT selecionado e armazena no localStorage.
     * @param {Object} config - Configurações do GPT.
     */
    setGPTConfig(config) {
        this.gptConfig = config;
        debugLog('Configurações do GPT atualizadas:', this.gptConfig);
        // Armazena a configuração do GPT no localStorage
        localStorage.setItem('gptConfig', JSON.stringify(config));
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
        debugLog('GPT carregado do localStorage:', this.getSelectedGPT());
    } else {
        debugLog(`Selecionando GPT padrão com ID: ${defaultGPTId}`);
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
                    // Seleciona o GPT padrão e atualiza no localStorage
                    this.setSelectedGPT(defaultGPT);
                    localStorage.setItem('selectedGPT', JSON.stringify(defaultGPT));
                    localStorage.setItem('selectedGPTId', defaultGPT.id);

                    // Realiza fetch para obter a configuração do GPT baseado no ID
                    try {
                        // Ajuste a URL/endereço da API conforme necessário
                        const configResponse = await apiService.request(
                            'readGPTConfig', 
                            { gptId: defaultGPT.id }, 
                            'GET'
                        );
                        if (configResponse) {
                            this.setGPTConfig(configResponse);
                            // As configurações já foram armazenadas no localStorage dentro de setGPTConfig
                        } else {
                            console.warn('Nenhuma configuração encontrada para o GPT padrão.');
                        }
                    } catch (configError) {
                        console.error('Erro ao buscar configuração do GPT:', configError);
                    }

                    debugLog('GPT padrão selecionado:', defaultGPT);
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
        debugLog(`Estado de carregamento dos GPTs definido para: ${isLoading}`);
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
        debugLog(`Estado de carregamento na seleção de GPT definido para: ${isLoading}`);
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
        debugLog('StateManager foi resetado.');
        // Limpa dados do localStorage relacionados ao GPT
        localStorage.removeItem('selectedGPT');
        localStorage.removeItem('selectedGPTId');
        localStorage.removeItem('gptConfig');
    }

    /**
     * Recupera a configuração do Flowise.
     * @returns {Object|null} Configuração do Flowise ou null se não estiver definido.
     */
    getFlowiseConfig() {
        if (this.gptConfig && this.gptConfig.flowise) {
            return this.gptConfig.flowise;
        }
        console.warn('Configuração do Flowise não está definida.');
        return null;
    }
}