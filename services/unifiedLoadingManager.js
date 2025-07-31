// unifiedLoadingManager.js - Sistema Unificado de Loading para LexiDecis

import logService from './logService.js';

/**
 * Sistema unificado de loading que consolida todos os tipos de loading da aplicação
 * Substitui os múltiplos sistemas fragmentados por uma solução centralizada
 */
export default class UnifiedLoadingManager {
    constructor(options = {}) {
        // Configurações padrão
        this.config = {
            primaryColor: '#3B81F6',
            secondaryColor: '#1E40AF',
            successColor: '#10B981',
            errorColor: '#EF4444',
            warningColor: '#F59E0B',
            textColor: '#FFFFFF',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            animationDuration: 300,
            defaultTimeout: 30000, // 30 segundos
            enableSound: false,
            enableKeyboardShortcuts: true,
            ...options
        };

        // Estado interno
        this.activeLoadings = new Map();
        this.loadingCounter = 0;
        this.isInitialized = false;

        // Contextos de loading predefinidos
        this.contexts = {
            APP_INITIALIZATION: {
                name: 'Inicialização da Aplicação',
                type: 'fullscreen',
                showProgress: true,
                showSteps: true,
                allowCancel: false,
                timeout: 60000
            },
            CHAT_LOADING: {
                name: 'Carregamento de Chat',
                type: 'overlay',
                showProgress: false,
                showSteps: false,
                allowCancel: true,
                timeout: 15000
            },
            MESSAGE_SENDING: {
                name: 'Envio de Mensagem',
                type: 'inline',
                showProgress: false,
                showSteps: false,
                allowCancel: false,
                timeout: 10000
            },
            FILE_PROCESSING: {
                name: 'Processamento de Arquivo',
                type: 'overlay',
                showProgress: true,
                showSteps: false,
                allowCancel: true,
                timeout: 30000
            },
            API_CALLS: {
                name: 'Chamada de API',
                type: 'inline',
                showProgress: false,
                showSteps: false,
                allowCancel: false,
                timeout: 10000
            },
            HISTORY_LOADING: {
                name: 'Carregamento de Histórico',
                type: 'overlay',
                showProgress: true,
                showSteps: false,
                allowCancel: true,
                timeout: 20000
            }
        };

        this.init();
    }

    /**
     * Inicializa o sistema de loading
     */
    init() {
        if (this.isInitialized) return;

        this.injectStyles();
        this.createLoadingContainer();
        this.setupEventListeners();
        this.isInitialized = true;

        logService.info('UnifiedLoadingManager', 'Sistema de loading unificado inicializado');
    }

    /**
     * Injeta os estilos CSS necessários
     */
    injectStyles() {
        if (document.getElementById('unified-loading-styles')) {
            return;
        }

        const style = document.createElement('style');
        style.id = 'unified-loading-styles';
        style.textContent = `
            /* Sistema Unificado de Loading - LexiDecis */
            .unified-loading-container {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 99999;
                pointer-events: none;
                transition: opacity ${this.config.animationDuration}ms ease-in-out;
            }

            .unified-loading-container.visible {
                pointer-events: auto;
            }

            .unified-loading-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: ${this.config.backgroundColor};
                backdrop-filter: blur(2px);
                display: flex;
                justify-content: center;
                align-items: center;
                opacity: 0;
                transition: opacity ${this.config.animationDuration}ms ease-in-out;
            }

            .unified-loading-overlay.visible {
                opacity: 1;
            }

            .unified-loading-modal {
                background-color: #1a1a1a;
                border-radius: 12px;
                padding: 2rem;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
                max-width: 400px;
                width: 90%;
                text-align: center;
                animation: slideInUp 0.5s ease-out;
            }

            @keyframes slideInUp {
                from {
                    opacity: 0;
                    transform: translateY(30px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            .unified-loading-spinner {
                width: 50px;
                height: 50px;
                border: 4px solid rgba(255, 255, 255, 0.3);
                border-top: 4px solid ${this.config.primaryColor};
                border-radius: 50%;
                animation: unified-spin 1s linear infinite;
                margin: 0 auto 1rem;
            }

            @keyframes unified-spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            .unified-loading-title {
                color: ${this.config.textColor};
                font-size: 1.2rem;
                font-weight: 600;
                margin-bottom: 0.5rem;
            }

            .unified-loading-message {
                color: rgba(255, 255, 255, 0.8);
                font-size: 1rem;
                margin-bottom: 1rem;
            }

            .unified-loading-progress {
                width: 100%;
                height: 8px;
                background-color: rgba(255, 255, 255, 0.2);
                border-radius: 4px;
                overflow: hidden;
                margin-bottom: 1rem;
            }

            .unified-loading-progress-bar {
                height: 100%;
                background: linear-gradient(90deg, ${this.config.primaryColor}, ${this.config.secondaryColor});
                width: 0%;
                transition: width 0.3s ease;
                position: relative;
            }

            .unified-loading-progress-bar::after {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
                animation: shimmer 2s infinite;
            }

            @keyframes shimmer {
                0% { left: -100%; }
                100% { left: 100%; }
            }

            .unified-loading-steps {
                text-align: left;
                margin-top: 1rem;
            }

            .unified-loading-step {
                color: rgba(255, 255, 255, 0.7);
                font-size: 0.9rem;
                margin-bottom: 0.25rem;
                padding: 0.25rem 0;
                transition: all 0.3s ease;
            }

            .unified-loading-step.completed {
                color: ${this.config.successColor};
            }

            .unified-loading-step.error {
                color: ${this.config.errorColor};
            }

            .unified-loading-step.loading {
                color: ${this.config.primaryColor};
            }

            .unified-loading-cancel {
                background-color: rgba(255, 255, 255, 0.1);
                color: ${this.config.textColor};
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 6px;
                padding: 0.5rem 1rem;
                cursor: pointer;
                font-size: 0.9rem;
                transition: all 0.3s ease;
                margin-top: 1rem;
            }

            .unified-loading-cancel:hover {
                background-color: rgba(255, 255, 255, 0.2);
            }

            .unified-loading-inline {
                display: inline-flex;
                align-items: center;
                gap: 0.5rem;
                color: ${this.config.primaryColor};
                font-size: 0.9rem;
            }

            .unified-loading-inline .unified-loading-spinner {
                width: 16px;
                height: 16px;
                border-width: 2px;
                margin: 0;
            }

            /* Responsividade */
            @media (max-width: 768px) {
                .unified-loading-modal {
                    padding: 1.5rem;
                    margin: 1rem;
                }

                .unified-loading-title {
                    font-size: 1.1rem;
                }

                .unified-loading-message {
                    font-size: 0.9rem;
                }
            }

            /* Acessibilidade */
            .unified-loading-container:focus-within {
                outline: 2px solid ${this.config.primaryColor};
                outline-offset: 2px;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Cria o container principal de loading
     */
    createLoadingContainer() {
        const container = document.createElement('div');
        container.id = 'unified-loading-container';
        container.className = 'unified-loading-container';
        container.setAttribute('role', 'dialog');
        container.setAttribute('aria-modal', 'true');
        container.setAttribute('aria-hidden', 'true');
        
        container.innerHTML = `
            <div class="unified-loading-overlay">
                <div class="unified-loading-modal">
                    <div class="unified-loading-spinner"></div>
                    <div class="unified-loading-title"></div>
                    <div class="unified-loading-message"></div>
                    <div class="unified-loading-progress" style="display: none;">
                        <div class="unified-loading-progress-bar"></div>
                    </div>
                    <div class="unified-loading-steps" style="display: none;"></div>
                    <button class="unified-loading-cancel" style="display: none;">Cancelar</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(container);
        this.container = container;
        this.overlay = container.querySelector('.unified-loading-overlay');
        this.modal = container.querySelector('.unified-loading-modal');
    }

    /**
     * Configura os event listeners
     */
    setupEventListeners() {
        // Atalhos de teclado
        if (this.config.enableKeyboardShortcuts) {
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.activeLoadings.size > 0) {
                    this.cancelAllLoadings();
                }
            });
        }

        // Botão de cancelar
        const cancelButton = this.container.querySelector('.unified-loading-cancel');
        if (cancelButton) {
            cancelButton.addEventListener('click', () => {
                this.cancelAllLoadings();
            });
        }

        // Foco automático para acessibilidade
        this.container.addEventListener('transitionend', () => {
            if (this.activeLoadings.size > 0) {
                this.container.focus();
            }
        });
    }

    /**
     * Exibe um loading
     * @param {string} context - Contexto do loading (APP_INITIALIZATION, CHAT_LOADING, etc.)
     * @param {Object} options - Opções de configuração
     * @returns {string} ID do loading criado
     */
    showLoading(context, options = {}) {
        const loadingId = `loading_${++this.loadingCounter}`;
        const contextConfig = this.contexts[context] || this.contexts.API_CALLS;
        
        const config = {
            ...contextConfig,
            ...options,
            id: loadingId,
            context: context,
            startTime: Date.now()
        };

        // Inicializar etapas se fornecidas
        if (options.steps && Array.isArray(options.steps)) {
            config.steps = options.steps.map(step => ({
                name: step,
                status: 'pending'
            }));
        }

        this.activeLoadings.set(loadingId, config);
        this.updateDisplay();

        logService.debug('UnifiedLoadingManager', `Loading iniciado: ${context} (ID: ${loadingId})`);
        
        // Timeout automático
        if (config.timeout) {
            setTimeout(() => {
                if (this.activeLoadings.has(loadingId)) {
                    this.hideLoading(loadingId, { reason: 'timeout' });
                }
            }, config.timeout);
        }

        return loadingId;
    }

    /**
     * Atualiza o progresso de um loading
     * @param {string} loadingId - ID do loading
     * @param {number} progress - Progresso (0-100)
     * @param {string} message - Mensagem opcional
     */
    updateProgress(loadingId, progress, message = null) {
        const loading = this.activeLoadings.get(loadingId);
        if (!loading) return;

        loading.progress = Math.max(0, Math.min(100, progress));
        if (message) {
            loading.message = message;
        }

        this.updateDisplay();
    }

    /**
     * Marca uma etapa como concluída
     * @param {string} loadingId - ID do loading
     * @param {string} stepName - Nome da etapa
     * @param {string} status - Status da etapa (completed, error, loading, pending)
     */
    updateStep(loadingId, stepName, status = 'completed') {
        const loading = this.activeLoadings.get(loadingId);
        if (!loading) return;

        if (!loading.steps) {
            loading.steps = [];
        }

        const stepIndex = loading.steps.findIndex(step => step.name === stepName);
        if (stepIndex >= 0) {
            loading.steps[stepIndex].status = status;
        } else {
            loading.steps.push({ name: stepName, status });
        }

        this.updateDisplay();
    }

    /**
     * Esconde um loading específico
     * @param {string} loadingId - ID do loading
     * @param {Object} options - Opções adicionais
     */
    hideLoading(loadingId, options = {}) {
        const loading = this.activeLoadings.get(loadingId);
        if (!loading) return;

        const duration = options.duration || this.config.animationDuration;
        
        this.activeLoadings.delete(loadingId);
        
        if (this.activeLoadings.size === 0) {
            this.hideDisplay(duration);
        } else {
            this.updateDisplay();
        }

        logService.debug('UnifiedLoadingManager', `Loading finalizado: ${loading.context} (ID: ${loadingId})`);
        
        // Emitir evento
        this.dispatchEvent('loadingComplete', { loadingId, context: loading.context, options });
    }

    /**
     * Cancela todos os loadings ativos
     */
    cancelAllLoadings() {
        const loadings = Array.from(this.activeLoadings.entries());
        
        loadings.forEach(([loadingId, loading]) => {
            this.hideLoading(loadingId, { reason: 'cancelled' });
        });

        logService.info('UnifiedLoadingManager', 'Todos os loadings foram cancelados');
    }

    /**
     * Atualiza a exibição do loading
     */
    updateDisplay() {
        if (this.activeLoadings.size === 0) {
            this.hideDisplay();
            return;
        }

        // Pega o loading mais recente para exibir
        const latestLoading = Array.from(this.activeLoadings.values())
            .sort((a, b) => b.startTime - a.startTime)[0];

        this.showDisplay(latestLoading);
    }

    /**
     * Mostra a exibição do loading
     * @param {Object} loading - Configuração do loading
     */
    showDisplay(loading) {
        const title = this.container.querySelector('.unified-loading-title');
        const message = this.container.querySelector('.unified-loading-message');
        const progress = this.container.querySelector('.unified-loading-progress');
        const progressBar = this.container.querySelector('.unified-loading-progress-bar');
        const steps = this.container.querySelector('.unified-loading-steps');
        const cancelButton = this.container.querySelector('.unified-loading-cancel');

        // Atualizar conteúdo
        title.textContent = loading.name || loading.context;
        message.textContent = loading.message || 'Carregando...';

        // Progresso
        if (loading.showProgress && loading.progress !== undefined) {
            progress.style.display = 'block';
            progressBar.style.width = `${loading.progress}%`;
        } else {
            progress.style.display = 'none';
        }

        // Etapas
        if (loading.showSteps && loading.steps && loading.steps.length > 0) {
            steps.style.display = 'block';
            steps.innerHTML = loading.steps.map(step => `
                <div class="unified-loading-step ${step.status}">
                    ${this.getStepIcon(step.status)} ${step.name}
                </div>
            `).join('');
        } else {
            steps.style.display = 'none';
        }

        // Botão de cancelar
        if (loading.allowCancel) {
            cancelButton.style.display = 'block';
        } else {
            cancelButton.style.display = 'none';
        }

        // Mostrar container
        this.container.classList.add('visible');
        this.overlay.classList.add('visible');
        this.container.setAttribute('aria-hidden', 'false');
    }

    /**
     * Esconde a exibição do loading
     * @param {number} duration - Duração da animação
     */
    hideDisplay(duration = this.config.animationDuration) {
        this.overlay.classList.remove('visible');
        
        setTimeout(() => {
            this.container.classList.remove('visible');
            this.container.setAttribute('aria-hidden', 'true');
        }, duration);
    }

    /**
     * Retorna o ícone para uma etapa baseado no status
     * @param {string} status - Status da etapa
     * @returns {string} HTML do ícone
     */
    getStepIcon(status) {
        switch (status) {
            case 'completed':
                return '✓';
            case 'error':
                return '✗';
            case 'loading':
                return '⟳';
            case 'pending':
                return '○';
            default:
                return '○';
        }
    }

    /**
     * Cria um loading inline (para uso em componentes)
     * @param {string} context - Contexto do loading
     * @param {Object} options - Opções
     * @returns {HTMLElement} Elemento de loading inline
     */
    createInlineLoading(context, options = {}) {
        const loadingId = this.showLoading(context, { ...options, type: 'inline' });
        const element = document.createElement('div');
        element.className = 'unified-loading-inline';
        element.innerHTML = `
            <div class="unified-loading-spinner"></div>
            <span>${options.message || 'Carregando...'}</span>
        `;
        
        // Limpar loading quando elemento for removido
        const observer = new MutationObserver(() => {
            if (!document.contains(element)) {
                this.hideLoading(loadingId);
                observer.disconnect();
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        
        return element;
    }

    /**
     * Emite eventos customizados
     * @param {string} eventName - Nome do evento
     * @param {Object} detail - Detalhes do evento
     */
    dispatchEvent(eventName, detail = {}) {
        const event = new CustomEvent(`unifiedLoading:${eventName}`, {
            detail: { ...detail, manager: this }
        });
        document.dispatchEvent(event);
    }

    /**
     * Retorna estatísticas do sistema
     * @returns {Object} Estatísticas
     */
    getStats() {
        return {
            activeLoadings: this.activeLoadings.size,
            totalLoadings: this.loadingCounter,
            contexts: Object.keys(this.contexts),
            isInitialized: this.isInitialized
        };
    }

    /**
     * Destrói o sistema de loading
     */
    destroy() {
        this.cancelAllLoadings();
        
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }

        const styleElement = document.getElementById('unified-loading-styles');
        if (styleElement) {
            styleElement.remove();
        }

        this.isInitialized = false;
        logService.info('UnifiedLoadingManager', 'Sistema de loading destruído');
    }
}

// Instância global
let globalLoadingManager = null;

/**
 * Obtém a instância global do UnifiedLoadingManager
 * @returns {UnifiedLoadingManager} Instância do manager
 */
export function getLoadingManager() {
    if (!globalLoadingManager) {
        globalLoadingManager = new UnifiedLoadingManager();
    }
    return globalLoadingManager;
}

/**
 * Funções de conveniência para uso rápido
 */
export const LoadingUtils = {
    show: (context, options) => getLoadingManager().showLoading(context, options),
    hide: (loadingId, options) => getLoadingManager().hideLoading(loadingId, options),
    updateProgress: (loadingId, progress, message) => getLoadingManager().updateProgress(loadingId, progress, message),
    progress: (loadingId, progress, message) => getLoadingManager().updateProgress(loadingId, progress, message), // Alias para compatibilidade
    step: (loadingId, stepName, status) => getLoadingManager().updateStep(loadingId, stepName, status),
    cancel: () => getLoadingManager().cancelAllLoadings(),
    createInlineLoading: (context, options) => getLoadingManager().createInlineLoading(context, options),
    inline: (context, options) => getLoadingManager().createInlineLoading(context, options) // Alias para compatibilidade
}; 