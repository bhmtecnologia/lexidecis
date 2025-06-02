// Configuração básica do Phaser
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 400,
    parent: 'game-container',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 600 },
            debug: true // MANTENHA TRUE PARA AJUSTAR! Mude para FALSE quando estiver perfeito.
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

// Crie uma nova instância do jogo Phaser
const game = new Phaser.Game(config);

// Variáveis globais para a cena
let player;
let ground;
let obstacles;
let bonuses;
let score = 0;
let scoreText;
let cursors;

// --- Funções da Cena do Jogo ---

/**
 * preload(): Carrega todos os assets.
 */
function preload() {
    // --- IMPORTANTE: Certifique-se que estas imagens existam na pasta 'assets/' ---
    // platform.png: Chão (ex: 400x32 pixels, cinza/marrom)
    // obstacle_placeholder.png: Obstáculo (ex: um cubo/caixa)
    // bonus_placeholder.png: Bônus (ex: a nota de dinheiro)
    // personagem.png: O seu personagem!

    this.load.image('ground_texture', 'assets/platform.png');
    this.load.image('obstacle_texture', 'assets/obstacle_placeholder.png');
    this.load.image('bonus_texture', 'assets/bonus_placeholder.png');
    this.load.image('player_texture', 'assets/personagem.png'); 

    // Fundo (gradiente de azul claro para azul um pouco mais escuro)
    if (!this.textures.exists('sky_texture')) {
        const skyCanvasTexture = this.textures.createCanvas('sky_texture', 800, 400);
        const skyCtx = skyCanvasTexture.getContext();
        const gradient = skyCtx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(1, '#ADD8E6');
        skyCtx.fillStyle = gradient;
        skyCtx.fillRect(0, 0, 800, 400);
        skyCanvasTexture.refresh();
    }

    const createGraphicTexture = (key, width, height, fillStyle) => {
        if (!this.textures.exists(key)) {
            const graphics = this.add.graphics({ x: 0, y: 0 });
            graphics.fillStyle(fillStyle);
            graphics.fillRect(0, 0, width, height);
            graphics.generateTexture(key, width, height);
            graphics.destroy();
        }
    };
}

/**
 * create(): Cria os objetos do jogo quando o jogo inicia.
 */
function create() {
    this.add.image(config.width / 2, config.height / 2, 'sky_texture');

    ground = this.physics.add.staticGroup();
    let groundSprite = ground.create(config.width / 2, config.height - 16, 'ground_texture');
    groundSprite.setDisplaySize(config.width, 32);
    groundSprite.body.setSize(config.width, 32);
    groundSprite.refreshBody();

    player = this.physics.add.sprite(100, 300, 'player_texture');
    player.setBounce(0.2);
    player.setCollideWorldBounds(true);

    // --- AJUSTE FINO DA CAIXA DE COLISÃO DO PERSONAGEM ---
    const playerVisualWidth = player.width;  // ex: 48px
    const playerVisualHeight = player.height; // ex: 48px

    // Largura da hitbox
    const playerHitboxWidth = playerVisualWidth * 0.3; // 30% da largura visual
    const playerHitboxHeight = playerVisualHeight * 0.7; // 70% da altura visual
    
    // Offset X: Centraliza a hitbox horizontalmente
    const playerHitboxOffsetX = (playerVisualWidth - playerHitboxWidth) / 2;
    
    // --- NOVO AJUSTE PARA DESCER O PERSONAGEM (VISUAL) ---
    // Aumentei o valor de playerHitboxOffsetY novamente.
    // Quanto MAIOR este número, mais a caixa de colisão é "empurrada para baixo"
    // dentro da imagem do sprite, fazendo com que o visual do personagem desça.
    // Tente aumentar esse valor gradualmente (30, 35, 40, etc.)
    const playerHitboxOffsetY = 30; // Ajustado para tentar descer mais.

    player.body.setSize(playerHitboxWidth, playerHitboxHeight);
    player.body.setOffset(playerHitboxOffsetX, playerHitboxOffsetY);

    // ---


    this.physics.add.collider(player, ground);

    obstacles = this.physics.add.group();
    bonuses = this.physics.add.group();

    this.physics.add.collider(player, obstacles, hitObstacle, null, this);
    this.physics.add.overlap(player, bonuses, collectBonus, null, this);

    scoreText = this.add.text(16, 16, 'Pontuação: 0', { fontSize: '32px', fill: '#000' });

    cursors = this.input.keyboard.createCursorKeys();

    this.time.addEvent({
        delay: 1500,
        callback: generateItem,
        callbackScope: this,
        loop: true
    });
}

/**
 * update(): Loop principal do jogo.
 */
function update() {
    if (cursors.up.isDown && player.body.touching.down) {
        player.setVelocityY(-350);
    } else if (cursors.up.isUp && player.body.velocity.y < 0) {
        player.setVelocityY(player.body.velocity.y * 0.8);
    }

    [...obstacles.children.entries, ...bonuses.children.entries].forEach(item => {
        item.setVelocityX(-200);
        if (item.x < -50) {
            item.destroy();
        }
    });
}

/**
 * hitObstacle(): Função chamada quando o jogador colide com um obstáculo.
 */
function hitObstacle(player, obstacle) {
    this.physics.pause();
    player.setTint(0xff0000);
    this.add.text(config.width / 2, config.height / 2, 'FALHA DE SEGURANÇA!', { fontSize: '40px', fill: '#e74c3c' }).setOrigin(0.5);
    this.add.text(config.width / 2, config.height / 2 + 60, 'Clique para Reiniciar', { fontSize: '24px', fill: '#000' })
        .setOrigin(0.5)
        .setInteractive()
        .on('pointerdown', () => {
            this.scene.restart();
            score = 0;
        });
}

/**
 * generateItem(): Gera um novo obstáculo ou bônus.
 */
function generateItem() {
    const itemX = config.width + 50;
    const isObstacle = Phaser.Math.Between(0, 1) === 0;

    const itemVisualWidth = 48; // Assumindo tamanho padrão da imagem placeholder
    const itemVisualHeight = 48; // Assumindo tamanho padrão da imagem placeholder

    if (isObstacle) {
        const obstacleY = config.height - 16 - (itemVisualHeight / 2);
        const obstacle = obstacles.create(itemX, obstacleY, 'obstacle_texture');
        obstacle.setCollideWorldBounds(false);
        obstacle.body.allowGravity = false;
        obstacle.setImmovable(true);

        const obstacleHitboxWidth = itemVisualWidth * 0.8;
        const obstacleHitboxHeight = itemVisualHeight * 0.8;
        const obstacleHitboxOffsetX = itemVisualWidth * 0.1;
        const obstacleHitboxOffsetY = itemVisualHeight * 0.1;

        obstacle.body.setSize(obstacleHitboxWidth, obstacleHitboxHeight);
        obstacle.body.setOffset(obstacleHitboxOffsetX, obstacleHitboxOffsetY);

    } else {
        const bonusY = Phaser.Math.Between(200, 300);
        const bonus = bonuses.create(itemX, bonusY, 'bonus_texture');
        bonus.body.allowGravity = false;
        bonus.setImmovable(true);

        const bonusContentWidth = 40;
        const bonusContentHeight = 20;

        const bonusHitboxOffsetX = (itemVisualWidth - bonusContentWidth) / 2;
        const bonusHitboxOffsetY = (itemVisualHeight - bonusContentHeight) / 2;

        bonus.body.setSize(bonusContentWidth, bonusContentHeight);
        bonus.body.setOffset(bonusHitboxOffsetX, bonusHitboxOffsetY);
    }
}

/**
 * collectBonus(): Função chamada quando o jogador coleta um bônus.
 */
function collectBonus(player, bonus) {
    bonus.destroy();
    score += 50;
    scoreText.setText('Pontuação: ' + score);
}