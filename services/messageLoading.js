/**
 * @file messageLoading.js
 * @description Sistema de loading simples para mensagens - Padrão ChatGPT
 */

// Configuração global - desabilitar loading inline por padrão
let MESSAGE_LOADING_ENABLED = false;

/**
 * Cria um loading de mensagem simples (padrão ChatGPT)
 * @param {Object} options - Opções de configuração
 * @returns {HTMLElement} Elemento de loading
 */
export function createMessageLoading(options = {}) {
    const {
        size = 'small', // 'small', 'medium', 'large'
        color = '#666666',
        text = 'Enviando...',
        showText = true
    } = options;

    const container = document.createElement('div');
    container.className = `message-loading message-loading-${size}`;
    
    // Criar os 3 pontos animados
    const dotsContainer = document.createElement('div');
    dotsContainer.className = 'message-loading-dots';
    
    for (let i = 0; i < 3; i++) {
        const dot = document.createElement('div');
        dot.className = 'message-loading-dot';
        dot.style.animationDelay = `${i * 0.2}s`;
        dotsContainer.appendChild(dot);
    }
    
    container.appendChild(dotsContainer);
    
    // Adicionar texto se solicitado
    if (showText && text) {
        const textElement = document.createElement('span');
        textElement.className = 'message-loading-text';
        textElement.textContent = text;
        container.appendChild(textElement);
    }
    
    // Injetar estilos se ainda não existirem
    injectMessageLoadingStyles();
    
    return container;
}

/**
 * Injetar estilos CSS para o loading de mensagem
 */
function injectMessageLoadingStyles() {
    if (document.getElementById('message-loading-styles')) {
        return;
    }

    const style = document.createElement('style');
    style.id = 'message-loading-styles';
    style.textContent = `
        /* Loading de Mensagem - Padrão ChatGPT */
        .message-loading {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            color: #666666;
            user-select: none;
        }

        .message-loading-small {
            font-size: 12px;
            gap: 6px;
        }

        .message-loading-medium {
            font-size: 14px;
            gap: 8px;
        }

        .message-loading-large {
            font-size: 16px;
            gap: 10px;
        }

        .message-loading-dots {
            display: flex;
            gap: 2px;
            align-items: center;
        }

        .message-loading-dot {
            width: 4px;
            height: 4px;
            border-radius: 50%;
            background-color: currentColor;
            animation: message-loading-pulse 1.4s ease-in-out infinite both;
        }

        .message-loading-small .message-loading-dot {
            width: 3px;
            height: 3px;
        }

        .message-loading-large .message-loading-dot {
            width: 5px;
            height: 5px;
        }

        .message-loading-text {
            font-weight: 400;
            opacity: 0.8;
        }

        @keyframes message-loading-pulse {
            0%, 80%, 100% {
                opacity: 0.3;
                transform: scale(0.8);
            }
            40% {
                opacity: 1;
                transform: scale(1);
            }
        }

        /* Variantes de cor */
        .message-loading-primary {
            color: #007bff;
        }

        .message-loading-success {
            color: #28a745;
        }

        .message-loading-warning {
            color: #ffc107;
        }

        .message-loading-danger {
            color: #dc3545;
        }

        .message-loading-light {
            color: #ffffff;
        }

        .message-loading-dark {
            color: #343a40;
        }
    `;
    
    document.head.appendChild(style);
}

/**
 * Substituir conteúdo de um elemento por loading de mensagem
 * @param {HTMLElement} element - Elemento a ser substituído
 * @param {Object} options - Opções do loading
 * @returns {Object} Objeto com métodos para restaurar e remover
 */
export function replaceWithMessageLoading(element, options = {}) {
    if (!element) return null;
    
    // Verificar se o loading está habilitado
    if (!MESSAGE_LOADING_ENABLED) {
        return {
            restore: () => {},
            remove: () => {},
            updateText: () => {}
        };
    }
    
    // Salvar conteúdo original
    const originalContent = element.innerHTML;
    const originalDisabled = element.disabled;
    
    // Criar loading
    const loadingElement = createMessageLoading(options);
    
    // Substituir conteúdo
    element.innerHTML = '';
    element.appendChild(loadingElement);
    element.disabled = true;
    
    // Retornar métodos para controle
    return {
        restore: () => {
            element.innerHTML = originalContent;
            element.disabled = originalDisabled;
        },
        remove: () => {
            if (element.contains(loadingElement)) {
                element.removeChild(loadingElement);
            }
        },
        updateText: (newText) => {
            const textElement = loadingElement.querySelector('.message-loading-text');
            if (textElement) {
                textElement.textContent = newText;
            }
        }
    };
}

/**
 * Adicionar loading de mensagem a um elemento existente
 * @param {HTMLElement} element - Elemento onde adicionar o loading
 * @param {Object} options - Opções do loading
 * @returns {HTMLElement} Elemento de loading criado
 */
export function addMessageLoading(element, options = {}) {
    if (!element) return null;
    
    const loadingElement = createMessageLoading(options);
    element.appendChild(loadingElement);
    
    return loadingElement;
}

/**
 * Remover loading de mensagem de um elemento
 * @param {HTMLElement} element - Elemento pai
 * @param {HTMLElement} loadingElement - Elemento de loading a remover
 */
export function removeMessageLoading(element, loadingElement) {
    if (element && loadingElement && element.contains(loadingElement)) {
        element.removeChild(loadingElement);
    }
}

/**
 * Utilitário para loading automático em botões
 * @param {HTMLElement} button - Botão a ser processado
 * @param {Function} action - Ação a ser executada
 * @param {Object} options - Opções do loading
 */
export async function withMessageLoading(button, action, options = {}) {
    if (!button || typeof action !== 'function') return;
    
    // Verificar se o loading está habilitado
    if (!MESSAGE_LOADING_ENABLED) {
        return await action();
    }
    
    const loading = replaceWithMessageLoading(button, options);
    
    try {
        await action();
    } catch (error) {
        console.error('Erro durante ação com loading:', error);
        throw error;
    } finally {
        loading.restore();
    }
}

/**
 * Habilitar/desabilitar o sistema de loading de mensagens
 * @param {boolean} enabled - Se deve habilitar ou desabilitar
 */
export function setMessageLoadingEnabled(enabled) {
    MESSAGE_LOADING_ENABLED = enabled;
    console.log(`Loading de mensagens ${enabled ? 'habilitado' : 'desabilitado'}`);
}

/**
 * Verificar se o loading de mensagens está habilitado
 * @returns {boolean} Status atual
 */
export function isMessageLoadingEnabled() {
    return MESSAGE_LOADING_ENABLED;
}

/**
 * Alternar o estado do loading de mensagens
 * @returns {boolean} Novo estado
 */
export function toggleMessageLoading() {
    MESSAGE_LOADING_ENABLED = !MESSAGE_LOADING_ENABLED;
    console.log(`Loading de mensagens ${MESSAGE_LOADING_ENABLED ? 'habilitado' : 'desabilitado'}`);
    return MESSAGE_LOADING_ENABLED;
} 