// Configuração do jogo
const config = {
    type: Phaser.AUTO, // Phaser decide automaticamente se usa WebGL ou Canvas
    width: 800,        // Largura da janela do jogo em pixels
    height: 600,       // Altura da janela do jogo em pixels
    physics: {
        default: 'arcade', // Usaremos a física Arcade, simples e eficiente
        arcade: {
            gravity: { y: 0 }, // Sem gravidade neste exemplo
            debug: false       // Mude para true para ver as caixas de colisão
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    },
    backgroundColor: '#2d2d2d' // Cor de fundo para a área do jogo
};

// Variáveis globais da cena
let player;
let cursors;
const worldWidth = 1600;  // Largura do nosso mundo do jogo (maior que a janela)
const worldHeight = 1200; // Altura do nosso mundo do jogo (maior que a janela)

// Cria uma nova instância do jogo Phaser
const game = new Phaser.Game(config);

/**
 * Função preload: Carrega os recursos antes do jogo começar.
 * Para este exemplo, não estamos a carregar imagens ou sons externos.
 */
function preload() {
    // Se quiséssemos carregar uma imagem para o jogador, faríamos algo como:
    // this.load.image('playerSprite', 'caminho/para/sprite.png');
    // Por agora, usaremos uma forma geométrica.
}

/**
 * Função create: Configura os objetos e o estado inicial do jogo.
 * É chamada uma vez após o preload.
 */
function create() {
    // Desenha uma grelha para ajudar a visualizar o movimento da câmara e o tamanho do mundo
    // Isto é opcional e apenas para fins de depuração/visualização.
    this.add.grid(0, 0, worldWidth * 2, worldHeight * 2, 32, 32, 0x00b9f2, 0.2).setOrigin(0,0);


    // Adiciona o jogador como um retângulo verde no centro do nosso mundo
    // Usamos this.add.rectangle(x, y, largura, altura, cor)
    // O jogador será um objeto de física para que possamos movê-lo
    player = this.physics.add.sprite(worldWidth / 2, worldHeight / 2, 'player');
    // Como não carregamos uma textura 'player', vamos criar uma dinamicamente.
    // Para simplificar, vamos usar um retângulo. Em vez de this.physics.add.sprite,
    // podemos usar this.add.rectangle e depois adicionar física a ele.
    // Mas para o startFollow funcionar bem, é mais fácil com um Sprite.
    // Vamos criar uma textura "placeholder" para o nosso jogador.
    let graphics = this.make.graphics();
    graphics.fillStyle(0x00ff00, 1); // Cor verde
    graphics.fillRect(0, 0, 50, 50);  // Um quadrado de 50x50 pixels
    graphics.generateTexture('playerTexture', 50, 50);
    graphics.destroy(); // Já não precisamos do objeto graphics

    player = this.physics.add.sprite(worldWidth / 2, worldHeight / 2, 'playerTexture');
    player.setCollideWorldBounds(false); // Não vamos usar as colisões com os limites do MUNDO da física ainda

    // Configura os limites do mundo da física.
    // O jogador não poderá sair destes limites SE setCollideWorldBounds(true) estivesse ativo.
    // No nosso caso, a câmara usará estes limites.
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);

    // Configura a câmara principal
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight); // A câmara não mostrará nada fora destes limites
    this.cameras.main.startFollow(player, true, 0.08, 0.08); // A câmara seguirá o 'player'
    // Os parâmetros de startFollow são:
    // 1. target: o objeto a seguir (player)
    // 2. roundPixels: (true/false) arredondar as coordenadas para evitar subpixel rendering (pode causar trepidação)
    // 3. lerpX: (0 a 1) suavidade do movimento horizontal da câmara (quanto menor, mais suave/lento)
    // 4. lerpY: (0 a 1) suavidade do movimento vertical da câmara

    // Adiciona um texto para mostrar as coordenadas do jogador e da câmara (para depuração)
    this.debugText = this.add.text(10, 10, '', { font: '16px Courier', fill: '#ffffff' });
    this.debugText.setScrollFactor(0); // Fixa o texto na tela, não se move com a câmara

    // Configura as teclas direcionais (setas) para entrada do utilizador
    cursors = this.input.keyboard.createCursorKeys();
}

/**
 * Função update: Chamada repetidamente em cada frame do jogo.
 * É aqui que colocamos a lógica que precisa ser verificada continuamente, como entrada e movimento.
 */
function update() {
    // Define a velocidade do jogador
    const speed = 200;

    // Reseta a velocidade do jogador em cada frame
    player.setVelocity(0);

    // Movimento horizontal
    if (cursors.left.isDown) {
        player.setVelocityX(-speed);
    } else if (cursors.right.isDown) {
        player.setVelocityX(speed);
    }

    // Movimento vertical
    if (cursors.up.isDown) {
        player.setVelocityY(-speed);
    } else if (cursors.down.isDown) {
        player.setVelocityY(speed);
    }

    // Atualiza o texto de depuração
    this.debugText.setText(
        `Jogador X: ${player.x.toFixed(2)} Y: ${player.y.toFixed(2)}\n` +
        `Câmara ScrollX: ${this.cameras.main.scrollX.toFixed(2)} ScrollY: ${this.cameras.main.scrollY.toFixed(2)}`
    );

    // Mantém o jogador dentro dos limites do mundo
    // Embora a câmara siga, podemos querer que o jogador também não ultrapasse certos limites visuais
    // ou de interação com o mundo. A linha player.setCollideWorldBounds(true) faria isso automaticamente
    // com as this.physics.world.setBounds. Como está false, ele pode sair, mas a câmara vai parar.
    // Para uma experiência melhor, o jogador não deveria poder sair da área que a câmara pode ver.
    // A forma mais robusta seria usar `this.physics.world.setBoundsCollision(true, true, true, true);`
    // e `player.setCollideWorldBounds(true);`
    // Por agora, a câmara vai parar nos limites do mundo que definimos com `this.cameras.main.setBounds`.
}