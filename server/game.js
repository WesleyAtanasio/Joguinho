const socket = io('http://localhost:3000');
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let playerId;
let players = {};
const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get('roomId');

if (!roomId) {
    alert('Erro: Nenhum ID de sala fornecido!');
    window.location.href = '../index.html';
}

const images = {
    Assassina: new Image(), Tanque: new Image(), 'Fala E Filma': new Image(),
    Laercio: new Image(), Tibi: new Image(), Lelek: new Image(),
    Dudu: new Image(), Araumicio: new Image(), Lele: new Image()
};
images.Assassina.src = '../img/assassina.png';
images.Tanque.src = '../img/tanque.png';
images['Fala E Filma'].src = '../img/falaefilma.jpg';
images.Laercio.src = '../img/laercio.png';
images.Tibi.src = '../img/tibi.png';
images.Lelek.src = '../img/lelek.png';
images.Dudu.src = '../img/dudu.png';
images.Araumicio.src = '../img/araumicio.png';
images.Lele.src = '../img/lele.png';

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const id in players) {
        const player = players[id];
        const img = images[player.character];
        if (img.complete) {
            ctx.drawImage(img, player.x, player.y, 50, 50);
        }
    }
    requestAnimationFrame(draw);
}

socket.on('startGame', ({ roomId: receivedRoomId, gameState }) => {
    if (receivedRoomId === roomId) {
        playerId = socket.id;
        players = gameState.players;
        draw();
    }
});

socket.on('updateGame', (gameState) => {
    players = gameState.players;
});

const keys = {};
window.addEventListener('keydown', (e) => { keys[e.key] = true; });
window.addEventListener('keyup', (e) => { keys[e.key] = false; });

setInterval(() => {
    const direction = {
        up: keys['w'], left: keys['a'],
        down: keys['s'], right: keys['d']
    };
    socket.emit('move', direction);
}, 100);

// Reassociar o socket à sala ao carregar
socket.emit('rejoinRoom', roomId);