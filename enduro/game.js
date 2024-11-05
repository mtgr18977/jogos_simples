const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Configurações do Jogo
const GAME_WIDTH = canvas.width;
const GAME_HEIGHT = canvas.height;

// Carro do Jogador
const player = {
    width: 20,
    height: 40,
    x: GAME_WIDTH / 2 - 10,
    y: GAME_HEIGHT - 100,
    speed: 5,
    dx: 0,
    color: 'white',
    draw: function() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    },
    update: function() {
        this.x += this.dx;

        // Limitar dentro da pista
        if (this.x < 90) this.x = 90;
        if (this.x + this.width > GAME_WIDTH - 90) this.x = GAME_WIDTH - 90 - this.width;
    }
};

// Obstáculos (outros carros)
const obstacles = [];
const obstacleFrequency = 80; // A cada 80 frames
let frameCount = 0;

// Função para criar obstáculos
function createObstacle() {
    const obstacleWidth = 20;
    const obstacleHeight = 40;
    const xPositions = [100, 150, 200, 250, 300];
    const x = xPositions[Math.floor(Math.random() * xPositions.length)];
    const y = -obstacleHeight;
    const colors = ['red', 'blue', 'green'];
    const color = colors[Math.floor(Math.random() * colors.length)];

    obstacles.push({ x, y, width: obstacleWidth, height: obstacleHeight, color });
}

// Detectar colisões
function detectCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// Controle do Teclado
const keys = {};

document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
});

document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// Atualizar a posição do jogador com base nas teclas pressionadas
function updatePlayer() {
    if (keys['ArrowLeft']) {
        player.dx = -player.speed;
    } else if (keys['ArrowRight']) {
        player.dx = player.speed;
    } else {
        player.dx = 0;
    }

    player.update();
}

// Atualizar obstáculos
function updateObstacles() {
    obstacles.forEach((obstacle, index) => {
        obstacle.y += 3; // Velocidade dos obstáculos

        // Remover obstáculos que saíram da tela
        if (obstacle.y > GAME_HEIGHT) {
            obstacles.splice(index, 1);
        }

        // Detectar colisão com o jogador
        if (detectCollision(player, obstacle)) {
            // Finalizar o jogo
            alert('Game Over!');
            document.location.reload();
        }
    });
}

// Desenhar obstáculos
function drawObstacles() {
    obstacles.forEach(obstacle => {
        ctx.fillStyle = obstacle.color;
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    });
}

// Configuração do Parallax da Estrada
let roadLineY = 0;
const lineSpacing = 40; // Espaçamento entre as linhas

// Desenhar o cenário (fundo, estrada, linhas com parallax)
function drawBackground() {
    // Fundo (céu e montanhas)
    ctx.fillStyle = '#00008B'; // Céu azul escuro
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT / 3);

    ctx.fillStyle = '#8B4513'; // Montanhas marrons
    ctx.beginPath();
    ctx.moveTo(50, GAME_HEIGHT / 3);
    ctx.lineTo(150, GAME_HEIGHT / 6);
    ctx.lineTo(250, GAME_HEIGHT / 3);
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(200, GAME_HEIGHT / 3);
    ctx.lineTo(300, GAME_HEIGHT / 6);
    ctx.lineTo(400, GAME_HEIGHT / 3);
    ctx.fill();

    // Estrada
    ctx.fillStyle = '#006400'; // Verde da estrada
    ctx.fillRect(0, GAME_HEIGHT / 3, GAME_WIDTH, GAME_HEIGHT);

    ctx.fillStyle = '#333'; // Estrada cinza escuro
    ctx.fillRect(90, 0, GAME_WIDTH - 180, GAME_HEIGHT);

    // Linhas da estrada (com efeito parallax)
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    for (let i = 0; i < GAME_HEIGHT / lineSpacing; i++) {
        const lineY = (roadLineY + i * lineSpacing) % GAME_HEIGHT;
        ctx.beginPath();
        ctx.moveTo(GAME_WIDTH / 2, lineY);
        ctx.lineTo(GAME_WIDTH / 2, lineY + 20);
        ctx.stroke();
    }

    // Atualiza a posição das linhas para dar o efeito de movimento
    roadLineY += 3; // Ajuste a velocidade para controlar o efeito
    if (roadLineY > lineSpacing) {
        roadLineY = 0;
    }
}

// Função de desenho principal
function draw() {
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    drawBackground();
    player.draw();
    drawObstacles();
}

// Função de atualização do jogo
function update() {
    updatePlayer();
    updateObstacles();

    // Incrementar frame count e criar obstáculos periodicamente
    frameCount++;
    if (frameCount % obstacleFrequency === 0) {
        createObstacle();
    }
}

// Loop do Jogo
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Iniciar o jogo
gameLoop();
