// loadingScreen.js - Versão Melhorada

export default class LoadingScreen {
    constructor(options = {}) {
        // Configurações padrão com possibilidade de customização
        this.config = {
            primaryColor: '#000000',
            secondaryColor: '#555555',
            textColor: '#333333',
            lightBgColor: '#f4f4f4',
            whiteColor: '#ffffff',
            overlayColor: 'rgba(0, 0, 0, 0.45)',
            logoUrl: 'https://www.bhm.tec.br/images/152x152/10788698/favicon.png',
            appName: 'lexidecis',
            animationDuration: 300,
            progressBarHeight: '10px',
            maxWidth: '350px',
            enableSound: false,
            enableKeyboardShortcuts: true,
            showTimeEstimate: true,
            ...options
        };

        // Versão será gerada dinamicamente

        // Elementos DOM
        this.loadingScreen = null;
        this.progressBar = null;
        this.progressText = null;
        this.modelsList = null;
        this.timeEstimate = null;
        this.errorContainer = null;
        this.retryButton = null;

        // Estado interno
        this.modelsToLoad = [];
        this.modelsLoaded = [];
        this.startTime = null;
        this.errorCount = 0;
        this.maxErrors = 3;
        this.isVisible = false;

        // Event listeners
        this.eventListeners = new Map();

        this.injectStyles();
        this.createLoadingScreen();
        this.setupEventListeners();
    }

    injectStyles() {
        // Verifica se o estilo já foi injetado para evitar duplicação
        if (document.getElementById('loading-screen-styles')) {
            return;
        }

        const style = document.createElement('style');
        style.id = 'loading-screen-styles';
        style.textContent = `
            @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');

            #loading-screen {
                --primary-color: ${this.config.primaryColor};
                --secondary-color: ${this.config.secondaryColor};
                --text-color: ${this.config.textColor};
                --light-bg-color: ${this.config.lightBgColor};
                --white-color: ${this.config.whiteColor};
                --overlay-color: ${this.config.overlayColor};
                --success-color: #28a745;
                --error-color: #dc3545;
                --warning-color: #ffc107;

                font-family: 'Roboto', sans-serif;
            }

            #loading-screen.loading-screen {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                background: var(--overlay-color);
                z-index: 9999;
                opacity: 0;
                pointer-events: none;
                transition: opacity ${this.config.animationDuration}ms ease-in-out;
                backdrop-filter: blur(2px);
                padding: 1rem; /* Adicionar padding para evitar que o modal toque as bordas */
            }

            #loading-screen.loading-screen.visible {
                opacity: 1;
                pointer-events: auto;
            }

            #loading-screen.loading-screen.hidden {
                display: none;
            }

            #loading-screen .loader {
                background-color: #1a1a1a;
                padding: 2rem;
                border-radius: 15px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                max-width: ${this.config.maxWidth};
                width: 90%;
                text-align: center;
                position: relative;
                animation: slideInUp 0.5s ease-out;
                /* Remover altura máxima e scroll - deixar expandir naturalmente */
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

            #loading-screen .logo-container {
                display: flex;
                flex-direction: column;
                align-items: center;
                margin-bottom: 1.5rem;
            }

            #loading-screen .logo-container .logo {
                width: 60px;
                height: 60px;
                margin-bottom: 0.5rem;
                border-radius: 50%;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                animation: pulse 2s infinite;
            }

            @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
            }

            #loading-screen .logo-container .app-name {
                font-size: 1.5rem;
                font-weight: 700;
                color: #ffffff;
                text-transform: uppercase;
                margin: 0;
                letter-spacing: 1px;
            }

            #loading-screen .logo-container .version {
                font-size: 0.8rem;
                color: #888888;
                margin-top: 0.2rem;
                font-weight: 400;
            }

            #loading-screen .progress-container {
                width: 100%;
                height: ${this.config.progressBarHeight};
                background: var(--light-bg-color);
                border-radius: 8px;
                overflow: hidden;
                margin: 1rem 0;
                position: relative;
            }

            #loading-screen .progress-bar {
                height: 100%;
                background: linear-gradient(90deg, var(--primary-color), var(--secondary-color));
                width: 0%;
                transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
                position: relative;
                overflow: hidden;
            }

            #loading-screen .progress-bar::after {
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

            #loading-screen .progress-text {
                color: #ffffff;
                font-size: 1rem;
                font-weight: 500;
                margin-bottom: 0.5rem;
            }

            #loading-screen .time-estimate {
                color: #cccccc;
                font-size: 0.85rem;
                font-weight: 400;
                margin-bottom: 1rem;
            }

            #loading-screen .models-list {
                margin-top: 1.5rem;
                text-align: left;
                /* Removido max-height e overflow para evitar scroll */
            }

            #loading-screen .models-list h4 {
                margin-bottom: 0.5rem;
                font-size: 1.1rem;
                font-weight: 600;
                color: #cccccc;
                border-left: 4px solid var(--primary-color);
                padding-left: 0.5rem;
                background: #1a1a1a;
            }

            #loading-screen .models-list ul {
                list-style: none;
                padding: 0;
                margin: 0;
            }

            #loading-screen .models-list li {
                font-size: 0.9rem;
                color: #ffffff;
                margin-bottom: 0.15rem;
                padding: 0.1rem 0;
                border-radius: 4px;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                gap: 0.4rem;
            }

            #loading-screen .models-list li.completed {
                color: var(--success-color);
                background: rgba(40, 167, 69, 0.1);
                padding-left: 0.5rem;
            }

            #loading-screen .models-list li.error {
                color: var(--error-color);
                background: rgba(220, 53, 69, 0.1);
                padding-left: 0.5rem;
            }

            #loading-screen .models-list li.loading {
                color: var(--primary-color);
                background: rgba(0, 0, 0, 0.05);
                padding-left: 0.5rem;
            }

            #loading-screen .status-icon {
                width: 16px;
                height: 16px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                font-size: 0.7rem;
                font-weight: bold;
            }

            #loading-screen .error-container {
                margin-top: 1rem;
                padding: 1rem;
                background: rgba(220, 53, 69, 0.1);
                border: 1px solid var(--error-color);
                border-radius: 8px;
                display: none;
            }

            #loading-screen .error-container.visible {
                display: block;
                animation: slideInDown 0.3s ease-out;
            }

            @keyframes slideInDown {
                from {
                    opacity: 0;
                    transform: translateY(-10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            #loading-screen .retry-button {
                background: var(--primary-color);
                color: var(--white-color);
                border: none;
                padding: 0.5rem 1rem;
                border-radius: 4px;
                cursor: pointer;
                font-size: 0.9rem;
                transition: all 0.3s ease;
                margin-top: 0.5rem;
            }

            #loading-screen .retry-button:hover {
                background: var(--secondary-color);
                transform: translateY(-1px);
            }

            #loading-screen .retry-button:active {
                transform: translateY(0);
            }

            /* Scrollbar removida - modal se expande naturalmente */

            /* Responsividade */
            @media (max-width: 768px) {
                #loading-screen .loader {
                    padding: 1.5rem;
                    margin: 1rem;
                    /* Remover altura máxima - expandir naturalmente */
                }

                #loading-screen .logo-container .logo {
                    width: 50px;
                    height: 50px;
                }

                #loading-screen .logo-container .app-name {
                    font-size: 1.3rem;
                }

                #loading-screen .logo-container .version {
                    font-size: 0.7rem;
                }

                /* Reduzir espaçamento das etapas em mobile */
                #loading-screen .models-list li {
                    margin-bottom: 0.1rem;
                    padding: 0.1rem 0;
                    font-size: 0.85rem;
                }
            }

            /* Modo escuro */
            @media (prefers-color-scheme: dark) {
                #loading-screen {
                    --text-color: #e0e0e0;
                    --light-bg-color: #2a2a2a;
                    --white-color: #1a1a1a;
                    --overlay-color: rgba(0, 0, 0, 0.7);
                }
            }

            /* Acessibilidade */
            #loading-screen:focus-within {
                outline: 2px solid var(--primary-color);
                outline-offset: 2px;
            }

            /* Animações de entrada/saída */
            #loading-screen.fade-out {
                animation: fadeOut 0.3s ease-out forwards;
            }

            @keyframes fadeOut {
                to {
                    opacity: 0;
                    transform: scale(0.95);
                }
            }
        `;
        document.head.appendChild(style);
    }

    createLoadingScreen() {
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'loading-screen';
        loadingDiv.className = 'loading-screen hidden';
        loadingDiv.setAttribute('role', 'dialog');
        loadingDiv.setAttribute('aria-labelledby', 'loading-title');
        loadingDiv.setAttribute('aria-describedby', 'loading-description');
        loadingDiv.setAttribute('aria-modal', 'true');
        
        // Gerar versão com hash baseado no timestamp
        const timestamp = Date.now().toString(36);
        const hash = timestamp.substring(timestamp.length - 7);
        const version = `v1.${hash}`;
        
        loadingDiv.innerHTML = `
            <div class="loader">
                <div class="logo-container">
                    <img src="${this.config.logoUrl}" alt="${this.config.appName} Logo" class="logo">
                    <h1 class="app-name" id="loading-title">${this.config.appName}</h1>
                    <div class="version">${version}</div>
                </div>
                <div class="progress-container">
                    <div class="progress-bar" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
                </div>
                <div class="progress-text" id="loading-description">Carregando: 0%</div>
                <div class="time-estimate" id="time-estimate"></div>
                <div class="models-list">
                    <h4>Etapas:</h4>
                    <ul id="models-list"></ul>
                </div>
                <div class="error-container" id="error-container">
                    <div class="error-message"></div>
                    <button class="retry-button" id="retry-button">Tentar Novamente</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(loadingDiv);

        // Referências aos elementos
        this.loadingScreen = loadingDiv;
        this.progressBar = loadingDiv.querySelector('.progress-bar');
        this.progressText = loadingDiv.querySelector('#loading-description');
        this.modelsList = loadingDiv.querySelector('#models-list');
        this.timeEstimate = loadingDiv.querySelector('#time-estimate');
        this.errorContainer = loadingDiv.querySelector('#error-container');
        this.retryButton = loadingDiv.querySelector('#retry-button');
    }

    setupEventListeners() {
        // Atalhos de teclado
        if (this.config.enableKeyboardShortcuts) {
            this.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.isVisible) {
                    this.hide();
                }
            });
        }

        // Botão de retry
        if (this.retryButton) {
            this.retryButton.addEventListener('click', () => {
                this.retry();
            });
        }

        // Foco automático para acessibilidade
        this.loadingScreen.addEventListener('transitionend', () => {
            if (this.isVisible) {
                this.loadingScreen.focus();
            }
        });
    }

    addEventListener(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
        document.addEventListener(event, callback);
    }

    removeEventListener(event, callback) {
        const listeners = this.eventListeners.get(event) || [];
        const index = listeners.indexOf(callback);
        if (index > -1) {
            listeners.splice(index, 1);
            document.removeEventListener(event, callback);
        }
    }

    setModelsToLoad(models) {
        this.modelsToLoad = Array.isArray(models) ? models : [];
        this.modelsLoaded = [];
        this.errorCount = 0;
        this.startTime = Date.now();

        this.modelsList.innerHTML = '';
        this.progressBar.style.width = '0%';
        this.progressBar.setAttribute('aria-valuenow', '0');
        this.progressText.textContent = 'Carregando: 0%';
        this.timeEstimate.textContent = '';
        this.hideError();

        this.modelsToLoad.forEach((etapa, index) => {
            const li = document.createElement('li');
            li.textContent = etapa;
            li.setAttribute('data-step', index);
            this.modelsList.appendChild(li);
        });
    }

    updateProgress() {
        let progressPercentage = 0;
        if (this.modelsToLoad.length > 0) {
            progressPercentage = Math.floor((this.modelsLoaded.length / this.modelsToLoad.length) * 100);
            progressPercentage = Math.min(progressPercentage, 100);
        } else {
            progressPercentage = 100;
        }

        this.progressBar.style.width = `${progressPercentage}%`;
        this.progressBar.setAttribute('aria-valuenow', progressPercentage);
        this.progressText.textContent = `Carregando: ${progressPercentage}%`;

        // Atualizar estimativa de tempo
        if (this.config.showTimeEstimate && this.startTime) {
            this.updateTimeEstimate(progressPercentage);
        }
    }

    updateTimeEstimate(progressPercentage) {
        if (progressPercentage === 0) {
            this.timeEstimate.textContent = '';
            return;
        }

        const elapsed = Date.now() - this.startTime;
        const estimatedTotal = (elapsed / progressPercentage) * 100;
        const remaining = Math.max(0, estimatedTotal - elapsed);

        if (remaining > 0) {
            const seconds = Math.ceil(remaining / 1000);
            if (seconds < 60) {
                this.timeEstimate.textContent = `Tempo estimado: ${seconds}s`;
            } else {
                const minutes = Math.ceil(seconds / 60);
                this.timeEstimate.textContent = `Tempo estimado: ~${minutes}min`;
            }
        } else {
            this.timeEstimate.textContent = 'Finalizando...';
        }
    }

    async loadModel(etapaNome, options = {}) {
        const { error = false, loading = false } = options;
        
        return new Promise((resolve) => {
            setTimeout(() => {
                const liElement = Array.from(this.modelsList.querySelectorAll('li'))
                    .find(li => li.textContent.trim() === etapaNome);

                if (liElement) {
                    if (error) {
                        this.markStepAsError(liElement, etapaNome);
                        this.errorCount++;
                        this.showError(`Erro ao carregar: ${etapaNome}`);
                    } else if (loading) {
                        this.markStepAsLoading(liElement, etapaNome);
                    } else {
                        this.markStepAsCompleted(liElement, etapaNome);
                        if (!this.modelsLoaded.includes(etapaNome)) {
                            this.modelsLoaded.push(etapaNome);
                        }
                    }
                }

                this.updateProgress();
                resolve();
            }, this.config.animationDuration);
        });
    }

    markStepAsCompleted(liElement, etapaNome) {
        liElement.className = 'completed';
        liElement.innerHTML = `
            <span class="status-icon" style="background: var(--success-color); color: white;">✓</span>
            ${etapaNome}
        `;
    }

    markStepAsError(liElement, etapaNome) {
        liElement.className = 'error';
        liElement.innerHTML = `
            <span class="status-icon" style="background: var(--error-color); color: white;">✗</span>
            ${etapaNome}
        `;
    }

    markStepAsLoading(liElement, etapaNome) {
        liElement.className = 'loading';
        liElement.innerHTML = `
            <span class="status-icon" style="background: var(--primary-color); color: white;">⟳</span>
            ${etapaNome}
        `;
    }

    showError(message) {
        if (this.errorContainer) {
            const errorMessage = this.errorContainer.querySelector('.error-message');
            errorMessage.textContent = message;
            this.errorContainer.classList.add('visible');
        }
    }

    hideError() {
        if (this.errorContainer) {
            this.errorContainer.classList.remove('visible');
        }
    }

    retry() {
        this.hideError();
        this.errorCount = 0;
        this.modelsLoaded = [];
        this.updateProgress();
        
        // Emitir evento de retry
        this.dispatchEvent('retry', { models: this.modelsToLoad });
    }

    dispatchEvent(eventName, detail = {}) {
        const event = new CustomEvent(`loadingScreen:${eventName}`, {
            detail: { ...detail, loadingScreen: this }
        });
        document.dispatchEvent(event);
    }

    async show(models = []) {
        if (this.loadingScreen) {
            this.setModelsToLoad(models);
            this.loadingScreen.classList.remove('hidden');
            
            // Forçar reflow para garantir que a transição funcione
            this.loadingScreen.offsetHeight;
            
            this.loadingScreen.classList.add('visible');
            this.isVisible = true;
            
            this.dispatchEvent('show', { models });
        }
    }

    async hide() {
        if (this.loadingScreen && this.isVisible) {
            this.loadingScreen.classList.add('fade-out');
            
            await new Promise(resolve => {
                setTimeout(() => {
                    this.loadingScreen.classList.remove('visible', 'fade-out');
                    this.loadingScreen.classList.add('hidden');
                    this.isVisible = false;
                    this.dispatchEvent('hide');
                    resolve();
                }, this.config.animationDuration);
            });
        }
    }

    // Métodos utilitários
    getProgress() {
        return this.modelsLoaded.length / Math.max(this.modelsToLoad.length, 1);
    }

    getRemainingSteps() {
        return this.modelsToLoad.filter(step => !this.modelsLoaded.includes(step));
    }

    isComplete() {
        return this.modelsLoaded.length >= this.modelsToLoad.length;
    }

    hasErrors() {
        return this.errorCount > 0;
    }

    // Método para destruir a instância
    destroy() {
        // Remover event listeners
        this.eventListeners.forEach((listeners, event) => {
            listeners.forEach(callback => {
                document.removeEventListener(event, callback);
            });
        });
        this.eventListeners.clear();

        // Remover elementos DOM
        if (this.loadingScreen && this.loadingScreen.parentNode) {
            this.loadingScreen.parentNode.removeChild(this.loadingScreen);
        }

        // Remover estilos se não houver outras instâncias
        const styleElement = document.getElementById('loading-screen-styles');
        if (styleElement && !document.querySelector('#loading-screen')) {
            styleElement.remove();
        }
    }
}