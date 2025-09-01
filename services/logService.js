/**
 * @file logService.js
 * @description Serviço centralizado de logging para controle de logs em produção
 * Baseado no padrão existente do projeto com DEBUG_MODE baseado no hostname
 */

// Detectar ambiente baseado no hostname
const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
const isDevelopment = isLocalhost || window.location.hostname.includes('dev') || window.location.hostname.includes('test');

// Configuração de logs por ambiente
const LOG_CONFIG = {
    // Em desenvolvimento: logs detalhados
    development: {
        DEBUG_MODE: true,
        INFO_MODE: true,
        WARN_MODE: true,
        ERROR_MODE: true,
        API_LOGS: true,
        AUTH_LOGS: true,
        UI_LOGS: true
    },
    // Em produção: apenas logs críticos
    production: {
        DEBUG_MODE: false,
        INFO_MODE: false,
        WARN_MODE: true,
        ERROR_MODE: true,
        API_LOGS: false,
        AUTH_LOGS: false,
        UI_LOGS: false
    }
};

// Obter configuração baseada no ambiente
const currentConfig = isDevelopment ? LOG_CONFIG.development : LOG_CONFIG.production;

/**
 * Serviço de logging centralizado
 */
class LogService {
    constructor() {
        this.config = currentConfig;
        this.environment = isDevelopment ? 'development' : 'production';
        
        // Log inicial do serviço
        this.info('LogService', `Inicializado em modo ${this.environment}`);
    }

    /**
     * Log de debug - apenas em desenvolvimento
     * @param {string} context - Contexto da operação (ex: 'fetchUsers', 'auth', 'ui')
     * @param {...any} args - Argumentos para log
     */
    debug(context, ...args) {
        if (this.config.DEBUG_MODE) {
            console.log(`[${context}] 🔍`, ...args);
        }
    }

    /**
     * Log de informação - apenas em desenvolvimento
     * @param {string} context - Contexto da operação
     * @param {...any} args - Argumentos para log
     */
    info(context, ...args) {
        if (this.config.INFO_MODE) {
            console.log(`[${context}] ℹ️`, ...args);
        }
    }

    /**
     * Log de aviso - sempre exibido
     * @param {string} context - Contexto da operação
     * @param {...any} args - Argumentos para log
     */
    warn(context, ...args) {
        if (this.config.WARN_MODE) {
            console.warn(`[${context}] ⚠️`, ...args);
        }
    }

    /**
     * Log de erro - sempre exibido
     * @param {string} context - Contexto da operação
     * @param {...any} args - Argumentos para log
     */
    error(context, ...args) {
        if (this.config.ERROR_MODE) {
            console.error(`[${context}] ❌`, ...args);
        }
    }

    /**
     * Log específico para APIs - controlado por API_LOGS
     * @param {string} context - Contexto da API (ex: 'fetchUsers', 'createUser')
     * @param {...any} args - Argumentos para log
     */
    api(context, ...args) {
        if (this.config.API_LOGS) {
            console.log(`[${context}] 📡`, ...args);
        }
    }

    /**
     * Log específico para autenticação - controlado por AUTH_LOGS
     * @param {string} context - Contexto da autenticação
     * @param {...any} args - Argumentos para log
     */
    auth(context, ...args) {
        if (this.config.AUTH_LOGS) {
            console.log(`[${context}] 🔐`, ...args);
        }
    }

    /**
     * Log específico para UI - controlado por UI_LOGS
     * @param {string} context - Contexto da UI
     * @param {...any} args - Argumentos para log
     */
    ui(context, ...args) {
        if (this.config.UI_LOGS) {
            console.log(`[${context}] 🎨`, ...args);
        }
    }

    /**
     * Log de sucesso - sempre exibido
     * @param {string} context - Contexto da operação
     * @param {...any} args - Argumentos para log
     */
    success(context, ...args) {
        if (this.config.INFO_MODE) {
            console.log(`[${context}] ✅`, ...args);
        }
    }

    /**
     * Log de início de operação - apenas em desenvolvimento
     * @param {string} context - Contexto da operação
     * @param {...any} args - Argumentos para log
     */
    start(context, ...args) {
        if (this.config.DEBUG_MODE) {
            console.log(`[${context}] 🚀 Iniciando...`, ...args);
        }
    }

    /**
     * Log de fim de operação - apenas em desenvolvimento
     * @param {string} context - Contexto da operação
     * @param {...any} args - Argumentos para log
     */
    end(context, ...args) {
        if (this.config.DEBUG_MODE) {
            console.log(`[${context}] 🏁 Finalizado`, ...args);
        }
    }

    /**
     * Log de dados - apenas em desenvolvimento
     * @param {string} context - Contexto da operação
     * @param {any} data - Dados para log
     * @param {string} label - Label opcional para os dados
     */
    data(context, data, label = 'Data') {
        if (this.config.DEBUG_MODE) {
            console.log(`[${context}] 📊 ${label}:`, data);
        }
    }

    /**
     * Log de resposta de API - apenas em desenvolvimento
     * @param {string} context - Contexto da API
     * @param {Response} response - Objeto Response do fetch
     * @param {any} data - Dados da resposta
     */
    response(context, response, data = null) {
        if (this.config.API_LOGS) {
            console.log(`[${context}] 📡 Response status:`, response.status);
            console.log(`[${context}] ✅ Response ok:`, response.ok);
            console.log(`[${context}] 📋 Response headers:`, [...response.headers.entries()]);
            
            if (data) {
                console.log(`[${context}] 📊 Response data:`, data);
            }
        }
    }

    /**
     * Log de erro de API - sempre exibido
     * @param {string} context - Contexto da API
     * @param {Error} error - Erro capturado
     * @param {Response} response - Objeto Response (opcional)
     */
    apiError(context, error, response = null) {
        if (this.config.ERROR_MODE) {
            console.error(`[${context}] ❌ Erro na API:`, error);
            if (response) {
                console.error(`[${context}] 📡 Status:`, response.status);
                console.error(`[${context}] 📡 StatusText:`, response.statusText);
            }
        }
    }

    /**
     * Obter configuração atual do serviço
     * @returns {Object} Configuração atual
     */
    getConfig() {
        return {
            ...this.config,
            environment: this.environment,
            isDevelopment
        };
    }

    /**
     * Forçar modo de debug (útil para debugging temporário)
     * @param {boolean} enabled - Habilitar/desabilitar debug
     */
    forceDebug(enabled = true) {
        this.config.DEBUG_MODE = enabled;
        this.config.INFO_MODE = enabled;
        this.config.API_LOGS = enabled;
        this.config.AUTH_LOGS = enabled;
        this.config.UI_LOGS = enabled;
        
        this.info('LogService', `Debug forçado: ${enabled ? 'HABILITADO' : 'DESABILITADO'}`);
    }
}

// Criar instância singleton
const logService = new LogService();

// Exportar instância e classe
export default logService;
export { LogService };

// Função de compatibilidade com o padrão existente
export function debugLog(...args) {
    if (isDevelopment) {
        console.log(...args);
    }
}

// 🔧 CONTROLE DE LOGS VERBOSOS - FIRESTORE E SERVICE WORKER

// Configuração inicial dos filtros
window.logFilter = {
    firestore: false,      // Desabilitado por padrão (muito verboso)
    serviceWorker: false,  // Desabilitado por padrão (muito verboso)
    uiManager: true,
    apiService: true,
    renderer: true,
    gptManager: true,
    presence: true,
    stateManager: true,
    chatManager: true,
    verbose: false
};

// Armazenar referências das funções originais do console
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

// Sobrescrever console.log para filtrar logs verbosos
console.log = function(...args) {
    const message = args.join(' ');

    // Filtrar logs do Firestore se estiver desabilitado
    if (!window.logFilter.firestore && (
        message.includes('firestore.googleapis.com') ||
        message.includes('Firestore/Write') ||
        message.includes('Firestore/Listen') ||
        message.includes('google.firestore.v1') ||
        message.includes('firestore.googleapis.com')
    )) {
        return; // Suprime o log
    }

    // Filtrar logs do Service Worker se estiver desabilitado
    if (!window.logFilter.serviceWorker && (
        message.includes('[SW]') ||
        message.includes('sw.js:') ||
        message.includes('✅ Servindo do cache') ||
        message.includes('💾 Armazenado no cache') ||
        message.includes('🔄 Buscando da rede')
    )) {
        return; // Suprime o log
    }

    // Filtrar outros logs verbosos se verbose estiver desabilitado
    if (!window.logFilter.verbose && (
        message.includes('updateUserInfo()') ||
        message.includes('Pool de elementos de mídia limpo') ||
        message.includes('Computed style') ||
        message.includes('Teste:') ||
        message.includes('Estado final')
    )) {
        return; // Suprime o log
    }

    // Aplicar filtro original
    originalConsoleLog.apply(console, args);
};

// Sobrescrever console.warn para filtrar logs verbosos
console.warn = function(...args) {
    const message = args.join(' ');

    // Filtrar logs do Firestore se estiver desabilitado
    if (!window.logFilter.firestore && (
        message.includes('firestore.googleapis.com') ||
        message.includes('Firestore/Write') ||
        message.includes('Firestore/Listen') ||
        message.includes('google.firestore.v1')
    )) {
        return; // Suprime o log
    }

    originalConsoleWarn.apply(console, args);
};

// Sobrescrever console.error para filtrar logs verbosos
console.error = function(...args) {
    const message = args.join(' ');

    // Filtrar logs do Firestore se estiver desabilitado
    if (!window.logFilter.firestore && (
        message.includes('firestore.googleapis.com') ||
        message.includes('Firestore/Write') ||
        message.includes('Firestore/Listen') ||
        message.includes('google.firestore.v1')
    )) {
        return; // Suprime o log
    }

    originalConsoleError.apply(console, args);
};

// 🔧 FUNÇÕES DE CONTROLE DE LOGS

/**
 * Ativar/desativar logs do Firestore
 */
window.toggleFirestoreLogs = () => {
    window.logFilter.firestore = !window.logFilter.firestore;
    console.log(`🔧 Logs do Firestore: ${window.logFilter.firestore ? '✅ ATIVADOS' : '❌ DESATIVADOS'}`);
};

/**
 * Ativar/desativar logs do Service Worker
 */
window.toggleServiceWorkerLogs = () => {
    window.logFilter.serviceWorker = !window.logFilter.serviceWorker;
    console.log(`🔧 Logs do Service Worker: ${window.logFilter.serviceWorker ? '✅ ATIVADOS' : '❌ DESATIVADOS'}`);
};

/**
 * Ativar/desativar logs verbosos em geral
 */
window.toggleVerboseLogs = () => {
    window.logFilter.verbose = !window.logFilter.verbose;
    console.log(`🔧 Logs verbosos: ${window.logFilter.verbose ? '✅ ATIVADOS' : '❌ DESATIVADOS'}`);
};

/**
 * Mostrar status atual de todos os filtros
 */
window.showLogStatus = () => {
    console.log('📊 STATUS DOS FILTROS DE LOG:');
    Object.entries(window.logFilter).forEach(([key, value]) => {
        console.log(`   ${key}: ${value ? '✅ ATIVO' : '❌ SUPRIMIDO'}`);
    });
};

/**
 * Desabilitar todos os logs verbosos (recomendado para produção)
 */
window.disableVerboseLogs = () => {
    window.logFilter.firestore = false;
    window.logFilter.serviceWorker = false;
    window.logFilter.verbose = false;
    console.log('🔇 Todos os logs verbosos foram desabilitados');
    console.log('💡 Use showLogStatus() para ver o status atual');
};

/**
 * Habilitar todos os logs (modo debug completo)
 */
window.enableAllLogs = () => {
    Object.keys(window.logFilter).forEach(key => {
        window.logFilter[key] = true;
    });
    console.log('🔊 Todos os logs foram ativados (modo debug)');
};

/**
 * Resetar filtros para configuração padrão
 */
window.resetLogFilters = () => {
    window.logFilter = {
        firestore: false,      // Desabilitado (muito verboso)
        serviceWorker: false,  // Desabilitado (muito verboso)
        uiManager: true,       // Ativado
        apiService: true,      // Ativado
        renderer: true,        // Ativado
        gptManager: true,      // Ativado
        presence: true,        // Ativado
        stateManager: true,    // Ativado
        chatManager: true,     // Ativado
        verbose: false         // Desabilitado
    };
    console.log('🔄 Filtros de log resetados para configuração padrão');
    window.showLogStatus();
};

// Inicializar com logs verbosos desabilitados
if (isDevelopment) {
    setTimeout(() => {
        console.log('🔧 Sistema de controle de logs inicializado');
        console.log('💡 Comandos disponíveis:');
        console.log('   • disableVerboseLogs() - Desabilitar logs verbosos');
        console.log('   • enableAllLogs() - Habilitar todos os logs');
        console.log('   • showLogStatus() - Ver status dos filtros');
        console.log('   • toggleFirestoreLogs() - Controle logs Firestore');
        console.log('   • toggleServiceWorkerLogs() - Controle logs SW');

        // Aplicar configuração padrão
        window.disableVerboseLogs();
    }, 1000);
} 