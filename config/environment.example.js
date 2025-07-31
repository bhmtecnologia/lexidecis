/**
 * 🚀 Configurações de Ambiente - LexiDecis
 * 
 * Copie este arquivo para environment.js e configure suas variáveis
 * cp config/environment.example.js config/environment.js
 */

// ========================================
// CONFIGURAÇÕES DA APLICAÇÃO
// ========================================

export const ENV_CONFIG = {
    // Ambiente da aplicação
    NODE_ENV: 'development',
    
    // URL base da API
    API_BASE_URL: 'http://localhost:8000',
    
    // ========================================
    // CONFIGURAÇÕES FIREBASE
    // ========================================
    
    // Chave da API do Firebase
    FIREBASE_API_KEY: 'sua-api-key-aqui',
    
    // Domínio de autenticação
    FIREBASE_AUTH_DOMAIN: 'seu-projeto.firebaseapp.com',
    
    // ID do projeto
    FIREBASE_PROJECT_ID: 'seu-projeto-id',
    
    // Bucket de storage
    FIREBASE_STORAGE_BUCKET: 'seu-projeto.appspot.com',
    
    // ID do sender de mensagens
    FIREBASE_MESSAGING_SENDER_ID: '123456789',
    
    // ID da aplicação
    FIREBASE_APP_ID: '1:123456789:web:abcdef123456',
    
    // ========================================
    // CHAVES DE API - PROVEDORES DE IA
    // ========================================
    
    // OpenAI
    OPENAI_API_KEY: 'sua-openai-api-key',
    
    // Google Gemini
    GEMINI_API_KEY: 'sua-gemini-api-key',
    
    // Anthropic Claude
    ANTHROPIC_API_KEY: 'sua-anthropic-api-key',
    
    // DeepSeek
    DEEPSEEK_API_KEY: 'sua-deepseek-api-key',
    
    // Groq
    GROQ_API_KEY: 'sua-groq-api-key',
    
    // ========================================
    // CONFIGURAÇÕES DE TESTE
    // ========================================
    
    // Habilitar modo de teste
    TESTING_ENABLED: true,
    
    // Usar dados mock
    USE_MOCK_DATA: true,
    
    // Timeout dos testes (ms)
    TEST_TIMEOUT: 5000,
    
    // ========================================
    // CONFIGURAÇÕES DE LOG
    // ========================================
    
    // Nível de log
    LOG_LEVEL: 'debug',
    
    // Habilitar logs detalhados
    DEBUG_ENABLED: true,
    
    // ========================================
    // CONFIGURAÇÕES DE SEGURANÇA
    // ========================================
    
    // Chave secreta para sessões
    SESSION_SECRET: 'sua-chave-secreta-aqui',
    
    // Tempo de expiração da sessão (ms)
    SESSION_TIMEOUT: 3600000,
    
    // Máximo de tentativas de login
    MAX_LOGIN_ATTEMPTS: 5,
    
    // ========================================
    // CONFIGURAÇÕES DE PERFORMANCE
    // ========================================
    
    // Número máximo de requisições simultâneas
    MAX_CONCURRENT_REQUESTS: 5,
    
    // Timeout de cache (ms)
    CACHE_TIMEOUT: 300000,
    
    // ========================================
    // CONFIGURAÇÕES DE DEPLOY
    // ========================================
    
    // URL de produção
    PRODUCTION_URL: 'https://lexidecis.com',
    
    // URL de staging
    STAGING_URL: 'https://staging.lexidecis.com',
    
    // ========================================
    // CONFIGURAÇÕES DE MONITORAMENTO
    // ========================================
    
    // Chave do Sentry (opcional)
    SENTRY_DSN: 'sua-sentry-dsn',
    
    // Chave do Google Analytics (opcional)
    GA_TRACKING_ID: 'GA-XXXXXXXXX-X',
    
    // ========================================
    // CONFIGURAÇÕES ESPECÍFICAS
    // ========================================
    
    // Endpoint do Flowise (se usado)
    FLOWISE_ENDPOINT: 'https://flowise.power.tec.br',
    
    // Configurações de proxy (se necessário)
    PROXY_URL: '',
    
    // Configurações de CORS
    CORS_ORIGIN: 'http://localhost:8000'
};

// ========================================
// INSTRUÇÕES DE USO
// ========================================

/*
1. Copie este arquivo para environment.js
2. Configure suas chaves de API
3. Configure as URLs do Firebase
4. Ajuste as configurações conforme necessário
5. NUNCA commite o arquivo environment.js no repositório

Para usar as configurações:

import { ENV_CONFIG } from './config/environment.js';

// Exemplo de uso
const apiKey = ENV_CONFIG.FIREBASE_API_KEY;
const apiUrl = ENV_CONFIG.API_BASE_URL;
*/

// ========================================
// VALIDAÇÃO
// ========================================

export function validateEnvironment() {
    const required = [
        'FIREBASE_API_KEY',
        'FIREBASE_PROJECT_ID',
        'API_BASE_URL'
    ];
    
    const errors = [];
    
    required.forEach(key => {
        if (!ENV_CONFIG[key] || ENV_CONFIG[key].includes('sua-')) {
            errors.push(`${key} não configurada`);
        }
    });
    
    if (errors.length > 0) {
        console.error('❌ Erros de configuração:', errors);
        return false;
    }
    
    console.log('✅ Configurações de ambiente válidas');
    return true;
}

// Exportar configuração padrão
export default ENV_CONFIG; 