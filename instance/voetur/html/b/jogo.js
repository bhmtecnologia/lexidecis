// Configuração básica do jogo Phaser
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: '#2d2d2d', // Cor de fundo do canvas do Phaser
    scene: {
        preload: preload,
        create: create
        // Não precisamos de 'update' para este exemplo simples
    }
};

// Cria uma nova instância do jogo Phaser
const game = new Phaser.Game(config);

/**
 * Função preload: Carrega recursos.
 * Não precisamos carregar nada específico para o vídeo da câmara aqui,
 * pois ele será obtido em tempo real.
 */
function preload() {
    // Podes carregar outras coisas aqui se quiseres, como imagens de interface.
}

/**
 * Função create: Configura os objetos e o estado inicial do jogo.
 */
function create() {
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    let statusText = this.add.text(20, 20, 'A tentar aceder à câmara...', {
        fontSize: '18px',
        fill: '#ffffff',
        backgroundColor: '#000000aa', // Um fundo semi-transparente para o texto
        padding: { x: 10, y: 5 }
    });

    // Verifica se o navegador suporta mediaDevices e getUserMedia
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        statusText.setText('A pedir permissão para a câmara...');

        navigator.mediaDevices.getUserMedia({ video: true, audio: false })
            .then((stream) => {
                statusText.setText('Permissão concedida! A carregar vídeo...');
                console.log("Stream da câmara obtido:", stream); // Verifica se o stream é válido

                let phaserVideoObject;
                try {
                    // Tenta criar o objeto de vídeo do Phaser
                    phaserVideoObject = this.add.video(centerX, centerY);
                    console.log("Objeto Phaser.Video criado:", phaserVideoObject); // Vê o que foi criado
                } catch (e) {
                    console.error("ERRO FATAL ao chamar this.add.video():", e);
                    statusText.setText('Falha crítica ao criar objeto Phaser.Video.');
                    statusText.setBackgroundColor('#aa0000aa');
                    return; // Interrompe se a criação falhar
                }

                // Agora, vamos verificar especificamente a propriedade .video
                if (phaserVideoObject) {
                    console.log("Elemento HTML <video> interno (phaserVideoObject.video):", phaserVideoObject.video);
                } else {
                    // Este log pode ser redundante se o try-catch apanhar a falha na criação
                    console.error("phaserVideoObject é nulo ou indefinido após a tentativa de criação.");
                }


                // Verifica se o phaserVideoObject e a sua propriedade .video existem ANTES de os usar
                if (phaserVideoObject && phaserVideoObject.video) {
                    statusText.setText('Objeto de vídeo Phaser parece OK. A configurar stream...');
                    phaserVideoObject.video.srcObject = stream; // Linha que estava a dar erro
                    phaserVideoObject.video.playsInline = true;

                    phaserVideoObject.video.play()
                        .then(() => {
                            console.log("Vídeo da câmara a ser reproduzido.");
                            statusText.setText('Câmara ativa no Phaser!');
                            statusText.setBackgroundColor('#00aa00aa'); // Verde para sucesso

                            const videoWidthInGame = 480;
                            const videoHeightInGame = 360;
                            phaserVideoObject.setSize(videoWidthInGame, videoHeightInGame);
                            phaserVideoObject.setOrigin(0.5, 0.5); // Centraliza o vídeo

                            // Opcional: Adiciona uma borda ou outro elemento gráfico
                            let graphics = this.add.graphics();
                            graphics.lineStyle(4, 0xffffff, 1); // Borda branca
                            graphics.strokeRect(
                                phaserVideoObject.x - phaserVideoObject.displayWidth / 2 - 2,
                                phaserVideoObject.y - phaserVideoObject.displayHeight / 2 - 2,
                                phaserVideoObject.displayWidth + 4,
                                phaserVideoObject.displayHeight + 4
                            );

                        })
                        .catch(playError => {
                            console.error("Erro ao tentar reproduzir o vídeo da câmara:", playError);
                            statusText.setText(`Erro ao reproduzir: ${playError.name} - ${playError.message}`);
                            statusText.setBackgroundColor('#aa0000aa'); // Vermelho para erro
                        });
                } else {
                    console.error("ERRO CRÍTICO: phaserVideoObject.video é undefined ou o próprio phaserVideoObject não foi criado corretamente.");
                    statusText.setText('Erro: Elemento de vídeo interno não encontrado no objeto Phaser.');
                    statusText.setBackgroundColor('#aa0000aa');
                }

            })
            .catch((getUserMediaError) => {
                // Este catch apanha erros tanto do getUserMedia como erros não apanhados dentro do .then() anterior.
                console.error("Erro durante o processo de getUserMedia ou no seu callback .then(): ", getUserMediaError);
                statusText.setText(`Erro no processo: ${getUserMediaError.name}`);
                statusText.setBackgroundColor('#aa0000aa'); // Vermelho para erro
                if (getUserMediaError.name === 'NotAllowedError') {
                    statusText.setText('Permissão para câmara negada. Atualiza e permite o acesso.');
                } else {
                    // Para outros erros, incluindo o TypeError que estávamos a ver
                    statusText.setText(`Erro: ${getUserMediaError.message}`);
                }
                statusText.setWordWrapWidth(this.cameras.main.width - 40);
            });
    } else {
        statusText.setText('API de câmara (getUserMedia) não suportada.');
        statusText.setBackgroundColor('#aa0000aa'); // Vermelho para erro
        console.error("getUserMedia não é suportado neste navegador.");
    }
}