const socket = io('http://localhost:3000');

const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get('roomId');
const startGameBtn = document.getElementById('startGameBtn');

if (!roomId) {
    alert('Erro: Nenhum ID de sala fornecido!');
    window.location.href = '../index.html';
}

socket.emit('rejoinRoom', roomId);

setTimeout(() => {
    socket.emit('getRoomInfo', roomId);
}, 500);

socket.on('roomInfo', (roomData) => {
    if (!roomData || !roomData.host) {
        console.error('Dados da sala inválidos:', roomData);
        alert('Erro ao carregar a sala');
        window.location.href = '../index.html';
        return;
    }
    updateRoom(roomData);
});

socket.on('roomUpdated', (roomData) => {
    if (!roomData || !roomData.host) {
        console.error('Dados da sala inválidos:', roomData);
        return;
    }
    updateRoom(roomData);
});

socket.on('startGame', () => {
    console.log(`Recebido startGame para a sala ${roomId}, redirecionando para game.html`);
    window.location.href = `game.html?roomId=${roomId}`;
});

socket.on('error', (message) => {
    console.error('Erro em lobby.js:', message);
    alert(message);
    window.location.href = '../index.html';
});

function updateRoom(roomData) {
    const roomInfo = document.getElementById('roomInfo');
    const host = roomData.players.find(p => p.id === roomData.host);
    if (!host) {
        console.error('Host não encontrado nos dados da sala:', roomData);
        alert('Host não encontrado');
        window.location.href = '../index.html';
        return;
    }
    roomInfo.innerHTML = `
        <p>ID da Sala: ${roomId}</p>
        <p>Host: ${host.name} (Picavara ${host.picavara}, Vacalo ${host.vacalo})</p>
    `;
    updatePlayerList(roomData.players, roomData.host);
}

function updatePlayerList(players, hostId) {
    const playerList = document.getElementById('playerList');
    playerList.innerHTML = '';
    players.forEach(player => {
        const li = document.createElement('li');
        li.textContent = `${player.name} ${player.picavara && player.vacalo ? `(Picavara ${player.picavara}, Vacalo ${player.vacalo})` : ''} ${player.connected ? '' : '(Desconectado)'}`;
        playerList.appendChild(li);
    });

    // Habilitar/desabilitar botão "Iniciar Jogo"
    if (socket.id === hostId && players.length === 2 && players.every(p => p.connected)) {
        startGameBtn.disabled = false;
        startGameBtn.style.opacity = '1';
        startGameBtn.onclick = () => {
            console.log('Botão Iniciar Jogo clicado');
            socket.emit('startGame');
            startGameBtn.disabled = true; // Desabilitar após o clique
            startGameBtn.style.opacity = '0.5';
        };
    } else {
        startGameBtn.disabled = true;
        startGameBtn.style.opacity = '0.5';
        startGameBtn.onclick = null; // Remover evento para não-hosts
    }
}

socket.on('connect', () => console.log('Conectado ao servidor com ID:', socket.id));