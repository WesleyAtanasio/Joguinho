const socket = io('http://localhost:3000'); // Ajuste a URL conforme seu servidor
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Estado do jogo
let playerId;
let players = {};

// Carregar imagens dos personagens
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

// Desenhar o jogo
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Desenhar jogadores
    for (const id in players) {
        const player = players[id];
        const img = images[player.character];
        if (img.complete) {
            ctx.drawImage(img, player.x, player.y, 50, 50); // Tamanho 50x50
        }
    }

    requestAnimationFrame(draw);
}

// Receber estado inicial
socket.on('initGame', (data) => {
    playerId = data.playerId;
    players = data.players;
    draw();
});

// Atualizar estado
socket.on('updateGame', (data) => {
    players = data.players;
});

// Capturar teclas
const keys = {};
window.addEventListener('keydown', (e) => { keys[e.key] = true; });
window.addEventListener('keyup', (e) => { keys[e.key] = false; });

// Enviar movimento
setInterval(() => {
    const direction = {
        up: keys['w'], left: keys['a'],
        down: keys['s'], right: keys['d']
    };
    socket.emit('move', direction);
}, 100);