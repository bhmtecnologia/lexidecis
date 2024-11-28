export default class LoadingScreen {
    constructor() {
        this.loadingScreen = null;
        this.createLoadingScreen();
    }

    // Cria o elemento da tela de loading dinamicamente
    createLoadingScreen() {
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'loading-screen';
        loadingDiv.className = 'loading-screen';
        loadingDiv.innerHTML = `
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Carregando...</span>
            </div>
        `;
        document.body.appendChild(loadingDiv);
        this.loadingScreen = loadingDiv;
    }

    // Exibe a tela de loading
    show() {
        if (this.loadingScreen) {
            this.loadingScreen.style.display = 'flex';
            this.loadingScreen.classList.remove('hidden');
        }
    }

    // Oculta a tela de loading
    hide() {
        if (this.loadingScreen) {
            this.loadingScreen.classList.add('hidden');
            setTimeout(() => {
                this.loadingScreen.style.display = 'none';
            }, 300); // Tempo para a transição terminar
        }
    }
}