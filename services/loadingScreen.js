export default class LoadingScreen {
    constructor() {
        this.loadingScreen = null;
        this.progressBar = null;
        this.progressText = null;
        this.modelsList = null;
        this.modelsToLoad = []; 
        this.modelsLoaded = [];
        this.injectStyles();
        this.createLoadingScreen();
    }

    injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* 
             * Definindo uma fonte — se preferir que isso não afete nada além do 
             * #loading-screen, você pode usar uma técnica de Shadow DOM. 
             * Mas nesse exemplo, apenas importamos aqui. 
             */
            @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');

            /* 
             * Em vez de :root, definimos as variáveis dentro de #loading-screen,
             * garantindo que só sejam aplicadas dentro deste container.
             */
            #loading-screen {
                --primary-color: #005EB8;       /* Azul corporativo */
                --secondary-color: #003A70;     /* Azul-escuro */
                --text-color: #333;             /* Texto em cinza-escuro */
                --light-bg-color: #f4f4f4;      /* Fundo claro */
                --white-color: #ffffff;
                --overlay-color: rgba(0, 0, 0, 0.45); /* Overlay semitransparente */

                /* Fonte específica para este container */
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

                /* Vamos iniciar oculto e usar transição de opacidade */
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.3s ease-in-out;
            }

            /* Quando estiver .visible, fica visível */
            #loading-screen.loading-screen.visible {
                opacity: 1;
                pointer-events: auto;
            }

            /* Quando estiver .hidden, escondemos de fato */
            #loading-screen.loading-screen.hidden {
                display: none;
            }

            /* Área branca (cartão) com o loader */
            #loading-screen .loader {
                background-color: var(--white-color);
                padding: 2rem;
                border-radius: 10px;
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
                max-width: 350px;
                width: 90%;
                text-align: center;
            }

            /* Container da barra de progresso */
            #loading-screen .progress-container {
                width: 100%;
                height: 10px;
                background: var(--light-bg-color);
                border-radius: 5px;
                overflow: hidden;
                margin: 1rem 0;
            }

            /* Barra de progresso em si */
            #loading-screen .progress-bar {
                height: 100%;
                background: var(--primary-color);
                width: 0%;
                transition: width 0.4s ease;
            }

            /* Texto que exibe a porcentagem */
            #loading-screen .progress-text {
                color: var(--text-color);
                font-size: 1rem;
                font-weight: 500;
            }

            /* Seção onde listamos os modelos carregados */
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
        // Mantemos a classe 'loading-screen' para que nosso estilo funcione
        loadingDiv.className = 'loading-screen hidden'; 
        loadingDiv.innerHTML = `
            <div class="loader">
                <div class="progress-container">
                    <div class="progress-bar"></div>
                </div>
                <div class="progress-text">Carregando: 0%</div>
                <div class="models-list">
                    <h4>Modelos carregados:</h4>
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

    setModelsToLoad(models) {
        this.modelsToLoad = Array.isArray(models) ? models : [];
        this.modelsLoaded = [];
        this.modelsList.innerHTML = '';
        this.progressBar.style.width = '0%';
        this.progressText.textContent = 'Carregando: 0%';
    }

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

    async loadModel(modelName) {
        return new Promise((resolve) => {
            setTimeout(() => {
                // Evita adicionar o mesmo modelo repetidas vezes
                if (!this.modelsLoaded.includes(modelName)) {
                    this.modelsLoaded.push(modelName);
                    const modelItem = document.createElement('li');
                    modelItem.textContent = modelName;
                    this.modelsList.appendChild(modelItem);
                }
                this.updateProgress();
                resolve();
            }, Math.random() * 1000 + 500);
        });
    }

    async loadAllModels() {
        if (this.modelsToLoad.length === 0) {
            this.updateProgress();
            return;
        }
        for (const model of this.modelsToLoad) {
            await this.loadModel(model);
        }
    }

    async show(models = []) {
        if (this.loadingScreen) {
            this.setModelsToLoad(models);
            this.loadingScreen.classList.remove('hidden');
            this.loadingScreen.classList.add('visible');
            await this.loadAllModels();
        }
    }

    hide() {
        if (this.loadingScreen) {
            this.loadingScreen.classList.remove('visible');
            this.loadingScreen.classList.add('hidden');
        }
    }
}