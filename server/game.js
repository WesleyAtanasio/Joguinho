const socket = io('http://localhost:3000');
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let playerId;
let roomId;
let players = {};
let winner = null;
let loser = null;
let imagesLoaded = 0;
let allImagesLoaded = false;
let countdown = 5;
let round = 1;
let roundStarted = false;
let loserAnimation = null;
let winnerAnimation = null;

const images = {
    Assassina: new Image(), Tanque: new Image(), 'Fala E Filma': new Image(),
    Laercio: new Image(), Tibi: new Image(), Lelek: new Image(),
    Dudu: new Image(), Araumicio: new Image(), Lele: new Image(),
    background: new Image()
};
images.Assassina.src = '../img/assassina.png';
images.Tanque.src = '../img/tanque.png';
images['Fala E Filma'].src = '../img/falafilmasemfundo.png'; // Ajustado conforme sua mudança
images.Laercio.src = '../img/laercio.png';
images.Tibi.src = '../img/tibi.png';
images.Lelek.src = '../img/lelek.png';
images.Dudu.src = '../img/dudu.png';
images.Araumicio.src = '../img/araumicio.png';
images.Lele.src = '../img/lele.png';
images.background.src = '../img/back.png';

const totalImages = Object.keys(images).length;

for (const key in images) {
    images[key].onload = () => {
        console.log(`${key} carregada com sucesso`);
        imagesLoaded++;
        if (imagesLoaded === totalImages) {
            allImagesLoaded = true;
            startCountdown();
        }
    };
    images[key].onerror = () => console.error(`Erro ao carregar ${key} em ${images[key].src}`);
}

const urlParams = new URLSearchParams(window.location.search);
roomId = urlParams.get('roomId');

if (!roomId) {
    alert('Erro: Nenhum ID de sala fornecido!');
    window.location.href = '../index.html';
}

socket.emit('rejoinRoom', roomId);

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (images.background.complete) {
        ctx.drawImage(images.background, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = '#4b0082';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (!allImagesLoaded) {
        ctx.fillStyle = 'black'; // Alterado para preto
        ctx.font = '24px Arial'; // Reduzido para caber na largura de 360px
        ctx.textAlign = 'center';
        ctx.fillText('Carregando...', canvas.width / 2, canvas.height / 2);
    } else if (countdown > 0) {
        ctx.fillStyle = 'black'; // Alterado para preto
        ctx.font = '36px Arial'; // Reduzido de 50px para caber na tela
        ctx.textAlign = 'center';
        ctx.fillText(`Round ${round} começa em ${countdown}`, canvas.width / 2, canvas.height / 2);
    } else if (roundStarted) {
        console.log('Desenhando frame, players:', players);

        for (const id in players) {
            const player = players[id];
            const picavaraImg = images[player.character];
            const vacaloImg = images[player.vacalo];

            if (picavaraImg.complete && vacaloImg.complete && (!loserAnimation || player.name !== loser) && (!winnerAnimation || player.name !== winner)) {
                ctx.drawImage(picavaraImg, player.x, player.y, 70, 70);
                console.log(`Desenhando ${player.character} em (${player.x}, ${player.y}) para jogador ${id}`);

                const vacaloX = player.x - 40;
                ctx.drawImage(vacaloImg, vacaloX, player.y + 10, 30, 30);

                const healthWidth = (player.health / 100) * 70;
                ctx.fillStyle = 'green';
                ctx.fillRect(player.x, player.y - 10, healthWidth, 5);
                ctx.fillStyle = 'black';
                ctx.strokeRect(player.x, player.y - 10, 70, 5);

                ctx.fillStyle = 'black'; // Alterado para preto
                ctx.font = '14px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(player.name, player.x + 35, player.y + 85);
            }
        }

        if (loserAnimation) {
            const loserPlayer = loserAnimation;
            const picavaraImg = images[loserPlayer.character];
            if (picavaraImg.complete) {
                ctx.save();
                ctx.translate(loserPlayer.x + 35, loserPlayer.y + 35);
                ctx.rotate(loserPlayer.rotation);
                ctx.drawImage(picavaraImg, -35, -35, 70, 70);
                ctx.restore();

                loserPlayer.x += loserPlayer.dx;
                loserPlayer.y += loserPlayer.dy;
                loserPlayer.rotation += 0.2;

                if (loserPlayer.x < -70 || loserPlayer.x > canvas.width + 70 || loserPlayer.y < -70 || loserPlayer.y > canvas.height + 70) {
                    for (const id in players) {
                        if (players[id].name === loserPlayer.name) {
                            delete players[id];
                            break;
                        }
                    }
                    loserAnimation = null;
                    startWinnerAnimation();
                }
            }
        }

        if (winnerAnimation) {
            const winnerPlayer = winnerAnimation;
            const picavaraImg = images[winnerPlayer.character];
            const vacaloImg = images[winnerPlayer.vacalo];
            if (picavaraImg.complete && vacaloImg.complete) {
                const scale = winnerPlayer.scale;
                const picavaraSize = 70 * scale;
                const vacaloSize = 30 * scale;

                const picavaraX = canvas.width / 2 - picavaraSize / 2;
                const picavaraY = canvas.height / 2 - picavaraSize / 2 - 50;
                ctx.drawImage(picavaraImg, picavaraX, picavaraY, picavaraSize, picavaraSize);

                const vacaloX = picavaraX - vacaloSize - 10;
                const vacaloY = picavaraY + (picavaraSize - vacaloSize) / 2;
                ctx.drawImage(vacaloImg, vacaloX, vacaloY, vacaloSize, vacaloSize);

                ctx.fillStyle = 'black'; // Alterado para preto
                ctx.font = `${20 * scale}px Arial`;
                ctx.textAlign = 'center';
                ctx.fillText(winnerPlayer.name, canvas.width / 2, picavaraY + picavaraSize + 30);
                ctx.fillText("O Milór", canvas.width / 2, picavaraY + picavaraSize + 60);

                winnerPlayer.scale += 0.02;
                if (winnerPlayer.scale > 2) winnerPlayer.scale = 2;
            }
        }
    }

    requestAnimationFrame(draw);
}

function startCountdown() {
    const countdownInterval = setInterval(() => {
        countdown--;
        console.log(`Contagem regressiva: ${countdown}`);
        if (countdown <= 0) {
            clearInterval(countdownInterval);
            roundStarted = true;
            socket.emit('startMovement', roomId);
        }
    }, 1000);
}

function startLoserAnimation(loserName) {
    for (const id in players) {
        if (players[id].name === loserName) {
            loserAnimation = { ...players[id], rotation: 0, dx: (Math.random() - 0.5) * 10, dy: (Math.random() - 0.5) * 10 };
            break;
        }
    }
}

function startWinnerAnimation() {
    for (const id in players) {
        if (players[id].name === winner) {
            winnerAnimation = { ...players[id], scale: 1 };
            delete players[id];
            break;
        }
    }
}

draw();

socket.on('startGame', ({ roomId: receivedRoomId, gameState }) => {
    if (receivedRoomId === roomId) {
        playerId = socket.id;
        players = gameState.players;
        round = gameState.round;
        console.log('Evento startGame recebido:', { roomId, playerId, players });
    }
});

socket.on('updateGame', (gameState) => {
    players = gameState.players;
    round = gameState.round;
    console.log('Evento updateGame recebido:', gameState);
    if (gameState.round <= 3 && !gameState.gameOver && !gameState.roundInProgress) {
        countdown = 5;
        roundStarted = false;
        startCountdown();
    }
});

socket.on('gameResult', ({ winnerName, loserName }) => {
    winner = winnerName;
    loser = loserName;
    console.log('Resultado do jogo recebido:', { winner, loser });
    startLoserAnimation(loserName);
});

socket.on('error', (message) => {
    console.error('Erro em game.js:', message);
    alert(message);
    window.location.href = '../index.html';
});

socket.on('connect', () => console.log('Conectado ao servidor com ID:', socket.id));