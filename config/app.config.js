/**
 * 🚀 Configuração Centralizada - LexiDecis
 * 
 * Este arquivo contém todas as configurações da aplicação,
 * incluindo endpoints de API, configurações Firebase,
 * e outras variáveis de ambiente.
 */

// Configurações da aplicação
export const APP_CONFIG = {
    // Informações básicas da aplicação
    app: {
        name: 'LexiDecis',
        version: '1.0.0',
        description: 'Sistema de Chat com Inteligência Artificial',
        author: 'LexiDecis Team',
        environment: process.env.NODE_ENV || 'development',
        debug: process.env.NODE_ENV === 'development'
    },

    // Configurações de API
    api: {
        baseUrl: process.env.API_BASE_URL || 'http://localhost:8000',
        timeout: 30000,
        retries: 3,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    },

    // Endpoints de APIs de IA
    aiEndpoints: {
        openai: {
            url: 'https://api.openai.com/v1/chat/completions',
            model: 'gpt-4',
            maxTokens: 4000,
            temperature: 0.7
        },
        gemini: {
            url: 'https://generativelanguage.googleapis.com/v1beta/models',
            model: 'gemini-pro',
            maxTokens: 4000,
            temperature: 0.7
        },
        anthropic: {
            url: 'https://api.anthropic.com/v1/messages',
            model: 'claude-3-sonnet-20240229',
            maxTokens: 4000,
            temperature: 0.7
        },
        deepseek: {
            url: 'https://api.deepseek.com/v1/chat/completions',
            model: 'deepseek-chat',
            maxTokens: 4000,
            temperature: 0.7
        },
        groq: {
            url: 'https://api.groq.com/openai/v1/chat/completions',
            model: 'llama3-8b-8192',
            maxTokens: 4000,
            temperature: 0.7
        }
    },

    // Configurações Firebase
    firebase: {
        apiKey: process.env.FIREBASE_API_KEY || "sua-api-key-aqui",
        authDomain: process.env.FIREBASE_AUTH_DOMAIN || "seu-projeto.firebaseapp.com",
        projectId: process.env.FIREBASE_PROJECT_ID || "seu-projeto-id",
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "seu-projeto.appspot.com",
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "123456789",
        appId: process.env.FIREBASE_APP_ID || "1:123456789:web:abcdef123456"
    },

    // Configurações de UI
    ui: {
        theme: {
            primary: '#007bff',
            secondary: '#6c757d',
            success: '#28a745',
            danger: '#dc3545',
            warning: '#ffc107',
            info: '#17a2b8',
            light: '#f8f9fa',
            dark: '#343a40'
        },
        chat: {
            maxMessages: 100,
            autoScroll: true,
            typingIndicator: true,
            messageTimeout: 30000
        },
        sidebar: {
            width: 280,
            collapsedWidth: 60,
            autoCollapse: true
        }
    },

    // Configurações de teste
    testing: {
        enabled: process.env.NODE_ENV === 'development',
        mockData: true,
        timeout: 5000,
        retries: 2
    },

    // Configurações de performance
    performance: {
        debounceDelay: 300,
        throttleDelay: 100,
        maxConcurrentRequests: 5,
        cacheTimeout: 300000 // 5 minutos
    },

    // Configurações de segurança
    security: {
        sessionTimeout: 3600000, // 1 hora
        maxLoginAttempts: 5,
        passwordMinLength: 8,
        enableCORS: true
    }
};

// Configurações específicas por ambiente
export const ENV_CONFIG = {
    development: {
        debug: true,
        logLevel: 'debug',
        apiUrl: 'http://localhost:8000',
        enableHotReload: true
    },
    staging: {
        debug: false,
        logLevel: 'info',
        apiUrl: 'https://staging.lexidecis.com',
        enableHotReload: false
    },
    production: {
        debug: false,
        logLevel: 'error',
        apiUrl: 'https://api.lexidecis.com',
        enableHotReload: false
    }
};

// Configurações de logging
export const LOG_CONFIG = {
    levels: {
        error: 0,
        warn: 1,
        info: 2,
        debug: 3
    },
    colors: {
        error: 'red',
        warn: 'yellow',
        info: 'blue',
        debug: 'green'
    },
    format: '[{timestamp}] {level}: {message}',
    maxLogSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5
};

// Configurações de cache
export const CACHE_CONFIG = {
    localStorage: {
        prefix: 'lexidecis_',
        expiration: 24 * 60 * 60 * 1000 // 24 horas
    },
    sessionStorage: {
        prefix: 'lexidecis_session_',
        expiration: 60 * 60 * 1000 // 1 hora
    },
    memory: {
        maxSize: 100,
        expiration: 30 * 60 * 1000 // 30 minutos
    }
};

// Configurações de validação
export const VALIDATION_CONFIG = {
    message: {
        minLength: 1,
        maxLength: 4000,
        allowedTags: ['b', 'i', 'u', 'code', 'pre']
    },
    user: {
        name: {
            minLength: 2,
            maxLength: 50,
            pattern: /^[a-zA-ZÀ-ÿ\s]+$/
        },
        email: {
            pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        }
    }
};

// Configurações de erro
export const ERROR_CONFIG = {
    messages: {
        network: 'Erro de conexão. Verifique sua internet.',
        auth: 'Erro de autenticação. Faça login novamente.',
        validation: 'Dados inválidos. Verifique as informações.',
        server: 'Erro no servidor. Tente novamente mais tarde.',
        unknown: 'Erro desconhecido. Tente novamente.'
    },
    retry: {
        maxAttempts: 3,
        delay: 1000,
        backoff: 2
    }
};

// Configurações de notificação
export const NOTIFICATION_CONFIG = {
    types: {
        success: {
            icon: '✅',
            duration: 3000,
            position: 'top-right'
        },
        error: {
            icon: '❌',
            duration: 5000,
            position: 'top-right'
        },
        warning: {
            icon: '⚠️',
            duration: 4000,
            position: 'top-right'
        },
        info: {
            icon: 'ℹ️',
            duration: 3000,
            position: 'top-right'
        }
    }
};

// Função para obter configuração baseada no ambiente
export function getConfig() {
    const env = APP_CONFIG.app.environment;
    return {
        ...APP_CONFIG,
        ...ENV_CONFIG[env]
    };
}

// Função para validar configurações
export function validateConfig() {
    const config = getConfig();
    const errors = [];

    // Validar configurações obrigatórias
    if (!config.firebase.apiKey || config.firebase.apiKey === "sua-api-key-aqui") {
        errors.push('FIREBASE_API_KEY não configurada');
    }

    if (!config.firebase.projectId || config.firebase.projectId === "seu-projeto-id") {
        errors.push('FIREBASE_PROJECT_ID não configurado');
    }

    // Validar endpoints de IA
    Object.entries(config.aiEndpoints).forEach(([provider, endpoint]) => {
        if (!endpoint.url) {
            errors.push(`URL do endpoint ${provider} não configurada`);
        }
    });

    if (errors.length > 0) {
        console.error('❌ Erros de configuração:', errors);
        return false;
    }

    console.log('✅ Configurações válidas');
    return true;
}

// Função para obter configuração de API específica
export function getApiConfig(provider) {
    const config = getConfig();
    return config.aiEndpoints[provider] || null;
}

// Função para obter configuração de tema
export function getThemeConfig() {
    const config = getConfig();
    return config.ui.theme;
}

// Exportar configuração padrão
export default APP_CONFIG; 