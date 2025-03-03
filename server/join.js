const socket = io('http://localhost:3000');

let selectedPicavara = null;
let selectedVacalo = null;
let playerName = '';
let roomId = '';

document.getElementById('checkRoomBtn').addEventListener('click', () => {
    roomId = document.getElementById('roomId').value.trim();
    if (roomId) {
        socket.emit('checkRoom', roomId);
    } else {
        alert('Digite o ID da sala!');
    }
});

socket.on('roomAvailable', (roomData) => {
    if (roomData.players.length >= 2) {
        alert('Sala cheia! Máximo de 2 jogadores.');
        return;
    }

    document.getElementById('selection').style.display = 'block';
    document.getElementById('checkRoomBtn').disabled = true;
    document.getElementById('roomId').disabled = true;

    // Desabilitar as escolhas do host
    const host = roomData.players[0]; // O host é o primeiro jogador
    const hostPicavara = host.picavara;
    const hostVacalo = host.vacalo;

    // Ajustar para os valores reais usados em server.html
    document.querySelector(`.picavara-options .option[data-picavara="${hostPicavara}"]`)?.classList.add('disabled');
    document.querySelector(`.vacalo-options .option[data-vacalo="${hostVacalo}"]`)?.classList.add('disabled');
});

function updateJoinButton() {
    const joinBtn = document.getElementById('joinRoomBtn');
    playerName = document.getElementById('playerName').value.trim();
    joinBtn.disabled = !(selectedPicavara && selectedVacalo && playerName);
}

document.getElementById('playerName').addEventListener('input', updateJoinButton);

document.querySelectorAll('.picavara-options .option').forEach(option => {
    option.addEventListener('click', () => {
        if (!option.classList.contains('disabled')) {
            selectedPicavara = option.getAttribute('data-picavara');
            document.querySelectorAll('.picavara-options .option').forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            updateJoinButton();
        }
    });
});

document.querySelectorAll('.vacalo-options .option').forEach(option => {
    option.addEventListener('click', () => {
        if (!option.classList.contains('disabled')) {
            selectedVacalo = option.getAttribute('data-vacalo');
            document.querySelectorAll('.vacalo-options .option').forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            updateJoinButton();
        }
    });
});

document.getElementById('joinRoomBtn').addEventListener('click', () => {
    socket.emit('joinRoom', { roomId, name: playerName, picavara: selectedPicavara, vacalo: selectedVacalo });
});

socket.on('joinedRoom', (roomId) => {
    window.location.href = `lobby.html?roomId=${roomId}`;
});

socket.on('error', (message) => {
    alert(message);
});