/**
 * @file testHelpers.js
 * @description Utilitários de teste reutilizáveis para a aplicação Chat LexiDecis
 * @version 1.0
 */

// ============================
// 1. GERENCIAMENTO DE TESTES
// ============================

class TestManager {
    constructor() {
        this.tests = [];
        this.results = {
            passed: 0,
            failed: 0,
            total: 0
        };
        this.startTime = null;
        this.endTime = null;
    }

    /**
     * Registra um teste para execução
     * @param {string} name - Nome do teste
     * @param {Function} testFn - Função de teste
     * @param {string} category - Categoria do teste
     */
    addTest(name, testFn, category = 'general') {
        this.tests.push({
            name,
            testFn,
            category,
            status: 'pending'
        });
    }

    /**
     * Executa todos os testes registrados
     */
    async runTests() {
        this.startTime = Date.now();
        this.results = { passed: 0, failed: 0, total: this.tests.length };

        console.log(`🧪 Iniciando execução de ${this.tests.length} testes...`);

        for (const test of this.tests) {
            try {
                await test.testFn();
                test.status = 'passed';
                this.results.passed++;
                console.log(`✅ ${test.name} - PASSOU`);
            } catch (error) {
                test.status = 'failed';
                this.results.failed++;
                console.error(`❌ ${test.name} - FALHOU:`, error.message);
            }
        }

        this.endTime = Date.now();
        this.printResults();
    }

    /**
     * Imprime resultados dos testes
     */
    printResults() {
        const duration = this.endTime - this.startTime;
        console.log('\n📊 RESULTADOS DOS TESTES:');
        console.log(`⏱️  Duração: ${duration}ms`);
        console.log(`✅ Passaram: ${this.results.passed}`);
        console.log(`❌ Falharam: ${this.results.failed}`);
        console.log(`📈 Taxa de sucesso: ${((this.results.passed / this.results.total) * 100).toFixed(1)}%`);
    }

    /**
     * Retorna estatísticas dos testes
     */
    getStats() {
        return {
            ...this.results,
            duration: this.endTime - this.startTime,
            successRate: (this.results.passed / this.results.total) * 100
        };
    }
}

// ============================
// 2. ASSERTIONS E VALIDAÇÕES
// ============================

class TestAssertions {
    /**
     * Verifica se uma condição é verdadeira
     * @param {boolean} condition - Condição a ser verificada
     * @param {string} message - Mensagem de erro
     */
    static assert(condition, message = 'Assertion failed') {
        if (!condition) {
            throw new Error(message);
        }
    }

    /**
     * Verifica se dois valores são iguais
     * @param {*} actual - Valor atual
     * @param {*} expected - Valor esperado
     * @param {string} message - Mensagem de erro
     */
    static assertEquals(actual, expected, message = 'Values are not equal') {
        if (actual !== expected) {
            throw new Error(`${message}: expected ${expected}, got ${actual}`);
        }
    }

    /**
     * Verifica se um valor é verdadeiro
     * @param {*} value - Valor a ser verificado
     * @param {string} message - Mensagem de erro
     */
    static assertTrue(value, message = 'Value is not true') {
        if (!value) {
            throw new Error(message);
        }
    }

    /**
     * Verifica se um valor é falso
     * @param {*} value - Valor a ser verificado
     * @param {string} message - Mensagem de erro
     */
    static assertFalse(value, message = 'Value is not false') {
        if (value) {
            throw new Error(message);
        }
    }

    /**
     * Verifica se um valor é null ou undefined
     * @param {*} value - Valor a ser verificado
     * @param {string} message - Mensagem de erro
     */
    static assertNull(value, message = 'Value is not null or undefined') {
        if (value !== null && value !== undefined) {
            throw new Error(message);
        }
    }

    /**
     * Verifica se um valor não é null ou undefined
     * @param {*} value - Valor a ser verificado
     * @param {string} message - Mensagem de erro
     */
    static assertNotNull(value, message = 'Value is null or undefined') {
        if (value === null || value === undefined) {
            throw new Error(message);
        }
    }

    /**
     * Verifica se um array contém um elemento
     * @param {Array} array - Array a ser verificado
     * @param {*} element - Elemento a ser encontrado
     * @param {string} message - Mensagem de erro
     */
    static assertContains(array, element, message = 'Array does not contain element') {
        if (!array.includes(element)) {
            throw new Error(message);
        }
    }

    /**
     * Verifica se uma função lança uma exceção
     * @param {Function} fn - Função a ser executada
     * @param {string} expectedError - Tipo de erro esperado
     * @param {string} message - Mensagem de erro
     */
    static assertThrows(fn, expectedError = null, message = 'Function did not throw') {
        try {
            fn();
            throw new Error(message);
        } catch (error) {
            if (expectedError && !(error instanceof expectedError)) {
                throw new Error(`Expected ${expectedError.name}, got ${error.constructor.name}`);
            }
        }
    }
}

// ============================
// 3. MOCKING E STUBBING
// ============================

class MockManager {
    constructor() {
        this.mocks = new Map();
        this.originalFunctions = new Map();
    }

    /**
     * Cria um mock para uma função
     * @param {Object} target - Objeto alvo
     * @param {string} method - Nome do método
     * @param {Function} mockFn - Função mock
     */
    mock(target, method, mockFn) {
        const key = `${target.constructor.name}.${method}`;
        this.originalFunctions.set(key, target[method]);
        target[method] = mockFn;
        this.mocks.set(key, mockFn);
    }

    /**
     * Restaura uma função mockada
     * @param {Object} target - Objeto alvo
     * @param {string} method - Nome do método
     */
    restore(target, method) {
        const key = `${target.constructor.name}.${method}`;
        if (this.originalFunctions.has(key)) {
            target[method] = this.originalFunctions.get(key);
            this.originalFunctions.delete(key);
            this.mocks.delete(key);
        }
    }

    /**
     * Restaura todos os mocks
     */
    restoreAll() {
        for (const [key, originalFn] of this.originalFunctions) {
            const [className, method] = key.split('.');
            // Implementar restauração baseada no contexto
        }
        this.originalFunctions.clear();
        this.mocks.clear();
    }
}

// ============================
// 4. UTILITÁRIOS DE DOM
// ============================

class DOMTestUtils {
    /**
     * Cria um elemento DOM temporário para testes
     * @param {string} tag - Tag do elemento
     * @param {Object} attributes - Atributos do elemento
     * @returns {HTMLElement} Elemento criado
     */
    static createTestElement(tag = 'div', attributes = {}) {
        const element = document.createElement(tag);
        Object.entries(attributes).forEach(([key, value]) => {
            element.setAttribute(key, value);
        });
        return element;
    }

    /**
     * Simula um evento DOM
     * @param {HTMLElement} element - Elemento alvo
     * @param {string} eventType - Tipo do evento
     * @param {Object} options - Opções do evento
     */
    static simulateEvent(element, eventType, options = {}) {
        const event = new Event(eventType, { bubbles: true, ...options });
        element.dispatchEvent(event);
    }

    /**
     * Simula um clique em um elemento
     * @param {HTMLElement} element - Elemento alvo
     */
    static simulateClick(element) {
        this.simulateEvent(element, 'click');
    }

    /**
     * Simula digitação em um input
     * @param {HTMLInputElement} input - Elemento input
     * @param {string} text - Texto a ser digitado
     */
    static simulateInput(input, text) {
        input.value = text;
        this.simulateEvent(input, 'input');
        this.simulateEvent(input, 'change');
    }

    /**
     * Aguarda um elemento aparecer no DOM
     * @param {string} selector - Seletor CSS
     * @param {number} timeout - Timeout em ms
     * @returns {Promise<HTMLElement>} Elemento encontrado
     */
    static waitForElement(selector, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const element = document.querySelector(selector);
            if (element) {
                resolve(element);
                return;
            }

            const observer = new MutationObserver(() => {
                const element = document.querySelector(selector);
                if (element) {
                    observer.disconnect();
                    resolve(element);
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Element ${selector} not found within ${timeout}ms`));
            }, timeout);
        });
    }
}

// ============================
// 5. UTILITÁRIOS DE TEMPO
// ============================

class TimeUtils {
    /**
     * Aguarda um tempo específico
     * @param {number} ms - Milissegundos para aguardar
     * @returns {Promise} Promise que resolve após o tempo
     */
    static delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Mede o tempo de execução de uma função
     * @param {Function} fn - Função a ser medida
     * @returns {Object} Objeto com tempo e resultado
     */
    static async measureTime(fn) {
        const start = performance.now();
        const result = await fn();
        const end = performance.now();
        return {
            duration: end - start,
            result
        };
    }
}

// ============================
// 6. UTILITÁRIOS DE LOG
// ============================

class TestLogger {
    constructor() {
        this.logs = [];
        this.enabled = true;
    }

    /**
     * Adiciona um log
     * @param {string} level - Nível do log
     * @param {string} message - Mensagem
     * @param {*} data - Dados adicionais
     */
    log(level, message, data = null) {
        if (!this.enabled) return;

        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            data
        };

        this.logs.push(logEntry);
        console.log(`[${level.toUpperCase()}] ${message}`, data || '');
    }

    /**
     * Log de informação
     * @param {string} message - Mensagem
     * @param {*} data - Dados adicionais
     */
    info(message, data = null) {
        this.log('info', message, data);
    }

    /**
     * Log de sucesso
     * @param {string} message - Mensagem
     * @param {*} data - Dados adicionais
     */
    success(message, data = null) {
        this.log('success', message, data);
    }

    /**
     * Log de erro
     * @param {string} message - Mensagem
     * @param {*} data - Dados adicionais
     */
    error(message, data = null) {
        this.log('error', message, data);
    }

    /**
     * Log de debug
     * @param {string} message - Mensagem
     * @param {*} data - Dados adicionais
     */
    debug(message, data = null) {
        this.log('debug', message, data);
    }

    /**
     * Retorna todos os logs
     * @returns {Array} Array de logs
     */
    getLogs() {
        return this.logs;
    }

    /**
     * Limpa os logs
     */
    clear() {
        this.logs = [];
    }
}

// ============================
// 7. EXPORTAÇÃO DOS UTILITÁRIOS
// ============================

export {
    TestManager,
    TestAssertions as Assert,
    MockManager,
    DOMTestUtils as DOM,
    TimeUtils as Time,
    TestLogger as Logger
}; 