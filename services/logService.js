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