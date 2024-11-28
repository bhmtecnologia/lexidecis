// LoadingScreen.js

export default class LoadingScreen {
    constructor() {
        this.loadingScreen = null;
        this.particlesContainer = null;
        this.particlesScriptLoaded = false;
        this.createLoadingScreen();
    }

    // Cria o elemento da tela de loading dinamicamente
    createLoadingScreen() {
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'loading-screen';
        loadingDiv.className = 'loading-screen hidden'; // Inicialmente escondido
        loadingDiv.innerHTML = `
            <div id="particles-js"></div>
            <div class="loader">
                <div class="spinner">
                    <div class="double-bounce1"></div>
                    <div class="double-bounce2"></div>
                </div>
                <div class="loading-text">
                    <span class="ai-text">Carregando</span>
                    <span class="loading-dot">.</span>
                    <span class="loading-dot">.</span>
                    <span class="loading-dot">.</span>
                </div>
            </div>
        `;
        document.body.appendChild(loadingDiv);
        this.loadingScreen = loadingDiv;
    }

    // Carrega o script do tsParticles dinamicamente
    loadParticlesScript() {
        return new Promise((resolve, reject) => {
            if (this.particlesScriptLoaded) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/tsparticles@2/tsparticles.bundle.min.js';
            script.async = true;

            script.onload = () => {
                this.particlesScriptLoaded = true;
                resolve();
            };

            script.onerror = () => {
                console.error('Erro ao carregar o tsParticles.');
                reject(new Error('Falha ao carregar o tsParticles.'));
            };

            document.body.appendChild(script);
        });
    }

    // Inicializa as partículas usando tsParticles
    async initParticles() {
        try {
            await this.loadParticlesScript();

            if (window.tsParticles) {
                window.tsParticles.load("particles-js", {
                    background: {
                        color: {
                            value: "rgba(0, 0, 0, 0)", // Transparente para permitir o fundo preto da tela de loading
                        },
                    },
                    fpsLimit: 60,
                    particles: {
                        number: {
                            value: 180,
                            density: {
                                enable: true,
                                area: 800,
                            },
                        },
                        color: {
                            value: "#ffffff",
                        },
                        shape: {
                            type: "circle",
                        },
                        opacity: {
                            value: 0.5,
                            random: false,
                            anim: {
                                enable: false,
                            },
                        },
                        size: {
                            value: 3,
                            random: true,
                            anim: {
                                enable: false,
                            },
                        },
                        move: {
                            enable: true,
                            speed: 2,
                            direction: "none",
                            random: false,
                            straight: false,
                            outModes: {
                                default: "out",
                            },
                            attract: {
                                enable: true,
                            },
                        },
                    },
                    interactivity: {
                        events: {
                            onHover: {
                                enable: false,
                            },
                            onClick: {
                                enable: false,
                            },
                            resize: true,
                        },
                    },
                    detectRetina: true,
                });
            } else {
                console.error('tsParticles não está disponível.');
            }
        } catch (error) {
            console.error('Falha ao inicializar as partículas:', error);
        }
    }

    // Exibe a tela de loading
    async show() {
        if (this.loadingScreen) {
            this.loadingScreen.classList.remove('hidden');
            this.loadingScreen.classList.add('visible');
            await this.initParticles();
        }
    }

    // Oculta a tela de loading
    hide() {
        if (this.loadingScreen) {
            this.loadingScreen.classList.remove('visible');
            this.loadingScreen.classList.add('hidden');
        }
    }
}