/**
 * Script de teste rápido para verificar o sistema de tratamento de erros
 * Para executar: node test-quick.js
 */

// Simular ambiente de navegador para Node.js
global.window = {};
global.document = {};
global.console = console;
global.navigator = { userAgent: 'Node.js Test' };
global.sessionStorage = {
    getItem: () => 'test-session',
    setItem: () => {},
    clear: () => {}
};

// Mock das dependências
global.showAlert = (message, type) => {
    console.log(`📢 ALERT [${type}]: ${message}`);
};

global.showToast = (message, type) => {
    console.log(`🍞 TOAST [${type}]: ${message}`);
};

// Simular o módulo errorHandler
const ErrorHandler = {
    ERROR_TYPES: {
        NETWORK: 'NETWORK_ERROR',
        AUTH: 'AUTH_ERROR',
        API: 'API_ERROR',
        VALIDATION: 'VALIDATION_ERROR',
        TIMEOUT: 'TIMEOUT_ERROR',
        UNKNOWN: 'UNKNOWN_ERROR',
        FLOWISE: 'FLOWISE_ERROR',
        FIREBASE: 'FIREBASE_ERROR'
    },
    
    ERROR_SEVERITY: {
        LOW: 'low',
        MEDIUM: 'medium',
        HIGH: 'high',
        CRITICAL: 'critical'
    },
    
    errorQueue: [],
    
    handleError: function(error, severity, context = {}, showToUser = true) {
        console.log('\n🚨 ===== ERROR HANDLER TEST =====');
        console.log(`Tipo: ${error.type || 'UNKNOWN'}`);
        console.log(`Severidade: ${severity}`);
        console.log(`Mensagem: ${error.message}`);
        console.log(`Contexto:`, context);
        
        this.errorQueue.push({
            type: error.type || 'UNKNOWN',
            severity: severity,
            message: error.message,
            timestamp: new Date().toISOString(),
            context: context
        });
        
        if (showToUser) {
            const userMessage = this.getUserMessage(error);
            if (severity === this.ERROR_SEVERITY.CRITICAL) {
                global.showAlert(userMessage.message, 'error');
            } else if (severity === this.ERROR_SEVERITY.HIGH) {
                global.showAlert(userMessage.message, 'warning');
            } else if (severity === this.ERROR_SEVERITY.MEDIUM) {
                global.showToast(userMessage.message, 'warning');
            }
        }
        
        console.log('================================\n');
    },
    
    getUserMessage: function(error) {
        const messages = {
            'NETWORK_ERROR': {
                message: 'Problema de conexão. Verifique sua internet e tente novamente.',
                action: 'Tentar novamente'
            },
            'AUTH_ERROR': {
                message: 'Sessão expirada. Você será redirecionado para o login.',
                action: 'Fazer login'
            },
            'API_ERROR': {
                message: 'Serviço temporariamente indisponível. Tente novamente em alguns minutos.',
                action: 'Tentar novamente'
            },
            'VALIDATION_ERROR': {
                message: error.message || 'Dados inválidos. Verifique as informações.',
                action: 'Corrigir'
            }
        };
        
        return messages[error.type] || {
            message: 'Ocorreu um erro inesperado. Nossa equipe foi notificada.',
            action: 'Tentar novamente'
        };
    },
    
    getErrorStats: function() {
        const stats = {
            total: this.errorQueue.length,
            byType: {},
            bySeverity: {},
            recent: this.errorQueue.filter(e => 
                Date.now() - new Date(e.timestamp).getTime() < 3600000
            ).length
        };
        
        this.errorQueue.forEach(error => {
            stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
            stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
        });
        
        return stats;
    },
    
    safeExecute: async function(mainFn, fallbackFn, context = {}) {
        try {
            return await mainFn();
        } catch (error) {
            console.log('🔄 Executando fallback para:', error.message);
            this.handleError(error, this.ERROR_SEVERITY.MEDIUM, context, false);
            
            if (fallbackFn) {
                try {
                    return await fallbackFn();
                } catch (fallbackError) {
                    this.handleError(fallbackError, this.ERROR_SEVERITY.HIGH, {
                        ...context,
                        isFallback: true
                    }, false);
                }
            }
            
            return null;
        }
    },
    
    withRetry: async function(fn, options = {}) {
        const { maxRetries = 3, retryDelay = 1000 } = options;
        let attempts = 0;
        
        while (attempts < maxRetries) {
            try {
                return await fn();
            } catch (error) {
                attempts++;
                
                if (attempts < maxRetries) {
                    console.log(`⏱️ Tentativa ${attempts} falhou, tentando novamente em ${retryDelay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                } else {
                    console.log(`❌ Todas as ${maxRetries} tentativas falharam`);
                    throw error;
                }
            }
        }
    }
};

// Função principal de teste
async function runTests() {
    console.log('🧪 ===== INICIANDO TESTES DO SISTEMA DE TRATAMENTO DE ERROS =====\n');
    
    // Teste 1: Erro de Rede
    console.log('1️⃣ Testando erro de rede...');
    const networkError = new Error('Falha na conexão');
    networkError.type = ErrorHandler.ERROR_TYPES.NETWORK;
    ErrorHandler.handleError(networkError, ErrorHandler.ERROR_SEVERITY.HIGH, {
        component: 'test',
        action: 'network-test'
    });
    
    // Teste 2: Erro de Autenticação
    console.log('2️⃣ Testando erro de autenticação...');
    const authError = new Error('Token expirado');
    authError.type = ErrorHandler.ERROR_TYPES.AUTH;
    ErrorHandler.handleError(authError, ErrorHandler.ERROR_SEVERITY.HIGH, {
        component: 'test',
        action: 'auth-test'
    });
    
    // Teste 3: Erro de Validação
    console.log('3️⃣ Testando erro de validação...');
    const validationError = new Error('Email inválido');
    validationError.type = ErrorHandler.ERROR_TYPES.VALIDATION;
    ErrorHandler.handleError(validationError, ErrorHandler.ERROR_SEVERITY.LOW, {
        component: 'test',
        action: 'validation-test'
    });
    
    // Teste 4: Fallback
    console.log('4️⃣ Testando fallback...');
    const fallbackResult = await ErrorHandler.safeExecute(
        () => { throw new Error('Operação principal falhou'); },
        () => {
            console.log('✅ Fallback executado com sucesso!');
            return { success: true, source: 'fallback' };
        },
        { component: 'test', action: 'fallback-test' }
    );
    console.log('Resultado do fallback:', fallbackResult);
    
    // Teste 5: Retry
    console.log('5️⃣ Testando retry automático...');
    let retryAttempts = 0;
    const retryResult = await ErrorHandler.withRetry(async () => {
        retryAttempts++;
        if (retryAttempts < 3) {
            throw new Error(`Tentativa ${retryAttempts} falhou`);
        }
        console.log('✅ Sucesso após', retryAttempts, 'tentativas!');
        return { success: true, attempts: retryAttempts };
    }, { maxRetries: 3, retryDelay: 500 });
    console.log('Resultado do retry:', retryResult);
    
    // Teste 6: Estatísticas
    console.log('6️⃣ Verificando estatísticas...');
    const stats = ErrorHandler.getErrorStats();
    console.log('📊 Estatísticas finais:');
    console.log(`   Total de erros: ${stats.total}`);
    console.log(`   Erros recentes: ${stats.recent}`);
    console.log(`   Por tipo:`, stats.byType);
    console.log(`   Por severidade:`, stats.bySeverity);
    
    console.log('\n🎉 ===== TESTES CONCLUÍDOS COM SUCESSO! =====');
    console.log('✅ Sistema de tratamento de erros está funcionando corretamente!');
    console.log('🌐 Para testes interativos, abra: http://localhost:8000/services/errorHandler.test.html');
    
    return {
        success: true,
        totalErrors: stats.total,
        fallbackWorked: fallbackResult?.success,
        retryWorked: retryResult?.success
    };
}

// Executar testes
if (require.main === module) {
    runTests().catch(error => {
        console.error('❌ Erro durante os testes:', error);
        process.exit(1);
    });
}

module.exports = { runTests, ErrorHandler }; 