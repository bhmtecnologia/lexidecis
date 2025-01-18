// loadingScreen.js

export default class LoadingScreen {
    constructor() {
        this.loadingScreen = null;
        this.progressBar = null;
        this.progressText = null;
        this.modelsList = null;

        // Lista total de etapas a cumprir
        this.modelsToLoad = []; 
        // Lista das etapas já cumpridas
        this.modelsLoaded = [];

        this.injectStyles();
        this.createLoadingScreen();
    }

    injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');

            /*
             * Usamos #loading-screen como “namespace” para impedir que o CSS
             * afete outros elementos da página.
             */
            #loading-screen {
                --primary-color: #005EB8;
                --secondary-color: #003A70;
                --text-color: #333;
                --light-bg-color: #f4f4f4;
                --white-color: #ffffff;
                --overlay-color: rgba(0, 0, 0, 0.45);

                font-family: 'Roboto', sans-serif;
            }

            /* Container geral da tela de loading */
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
                transition: opacity 0.3s ease-in-out;
            }

            /* Quando estiver visível */
            #loading-screen.loading-screen.visible {
                opacity: 1;
                pointer-events: auto;
            }

            /* Quando estiver oculto */
            #loading-screen.loading-screen.hidden {
                display: none;
            }

            /* Caixa branca com sombra */
            #loading-screen .loader {
                background-color: var(--white-color);
                padding: 2rem;
                border-radius: 10px;
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
                max-width: 350px;
                width: 90%;
                text-align: center;
            }

            /* Barra de progresso */
            #loading-screen .progress-container {
                width: 100%;
                height: 10px;
                background: var(--light-bg-color);
                border-radius: 5px;
                overflow: hidden;
                margin: 1rem 0;
            }

            #loading-screen .progress-bar {
                height: 100%;
                background: var(--primary-color);
                width: 0%;
                transition: width 0.4s ease;
            }

            #loading-screen .progress-text {
                color: var(--text-color);
                font-size: 1rem;
                font-weight: 500;
            }

            #loading-screen .models-list {
                margin-top: 1.5rem;
                text-align: left;
            }

            #loading-screen .models-list h4 {
                margin-bottom: 0.5rem;
                font-size: 1.1rem;
                font-weight: 600;
                color: var(--secondary-color);
                border-left: 4px solid var(--primary-color);
                padding-left: 0.5rem;
            }

            #loading-screen .models-list ul {
                list-style: none;
                padding: 0;
                margin: 0;
            }

            #loading-screen .models-list li {
                font-size: 0.95rem;
                color: var(--text-color);
                margin-bottom: 0.3rem;
            }
        `;
        document.head.appendChild(style);
    }

    createLoadingScreen() {
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'loading-screen';
        loadingDiv.className = 'loading-screen hidden'; 
        loadingDiv.innerHTML = `
            <div class="loader">
                <div class="progress-container">
                    <div class="progress-bar"></div>
                </div>
                <div class="progress-text">Carregando: 0%</div>
                <div class="models-list">
                    <h4>Etapas:</h4>
                    <ul id="models-list"></ul>
                </div>
            </div>
        `;
        document.body.appendChild(loadingDiv);

        this.loadingScreen = loadingDiv;
        this.progressBar = loadingDiv.querySelector('.progress-bar');
        this.progressText = loadingDiv.querySelector('.progress-text');
        this.modelsList = loadingDiv.querySelector('#models-list');
    }

    /**
     * Define a lista de etapas que serão exibidas no loading.
     */
    setModelsToLoad(models) {
        this.modelsToLoad = Array.isArray(models) ? models : [];
        this.modelsLoaded = [];

        // Resetar a lista exibida
        this.modelsList.innerHTML = '';
        this.progressBar.style.width = '0%';
        this.progressText.textContent = 'Carregando: 0%';

        // Pré-cria a <li> para cada etapa, para aparecer em “cinza” ou algo do tipo
        this.modelsToLoad.forEach((etapa) => {
            const li = document.createElement('li');
            li.textContent = etapa; 
            this.modelsList.appendChild(li);
        });
    }

    /**
     * Atualiza a barra de progresso com base em quantas etapas
     * já foram “carregadas” (this.modelsLoaded).
     */
    updateProgress() {
        let progressPercentage = 0;
        if (this.modelsToLoad.length > 0) {
            progressPercentage = Math.floor((this.modelsLoaded.length / this.modelsToLoad.length) * 100);
            if (progressPercentage > 100) progressPercentage = 100;
        } else {
            progressPercentage = 100;
        }
        this.progressBar.style.width = `${progressPercentage}%`;
        this.progressText.textContent = `Carregando: ${progressPercentage}%`;
    }

    /**
     * Marca uma etapa como concluída. 
     * Isso incrementa o número de “modelsLoaded” e atualiza a barra.
     */
    async loadModel(etapaNome) {
        // Se preferir, remova setTimeout se não quiser delay
        return new Promise((resolve) => {
            setTimeout(() => {
                // Evita duplicar a mesma etapa
                if (!this.modelsLoaded.includes(etapaNome)) {
                    this.modelsLoaded.push(etapaNome);
                    // Atualiza a cor do <li> daquela etapa (por ex., “✓”)
                    const liElement = Array.from(this.modelsList.querySelectorAll('li'))
                        .find(li => li.textContent.trim() === etapaNome);
                    if (liElement) {
                        liElement.textContent = `✓ ${etapaNome}`;
                    }
                }
                this.updateProgress();
                resolve();
            }, 300); 
        });
    }

    /**
     * Mostra a tela de loading e, se desejar, carrega tudo da setModelsToLoad
     */
    async show(models = []) {
        if (this.loadingScreen) {
            this.setModelsToLoad(models);
            this.loadingScreen.classList.remove('hidden');
            this.loadingScreen.classList.add('visible');
        }
    }

    /**
     * Esconde a tela de loading
     */
    hide() {
        if (this.loadingScreen) {
            this.loadingScreen.classList.remove('visible');
            this.loadingScreen.classList.add('hidden');
        }
    }
}