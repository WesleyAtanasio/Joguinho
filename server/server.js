const socket = io('http://localhost:3000');

let selectedPicavara = null;
let selectedVacalo = null;
let playerName = '';

function updateCreateButton() {
    const createBtn = document.getElementById('create-room-btn');
    playerName = document.getElementById('playerName').value.trim();
    createBtn.disabled = !(selectedPicavara && selectedVacalo && playerName);
}

document.getElementById('playerName').addEventListener('input', updateCreateButton);

document.querySelectorAll('.picavara-options .option').forEach(option => {
    option.addEventListener('click', () => {
        selectedPicavara = option.getAttribute('data-picavara');
        document.querySelectorAll('.picavara-options .option').forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        updateCreateButton();
    });
});

document.querySelectorAll('.vacalo-options .option').forEach(option => {
    option.addEventListener('click', () => {
        selectedVacalo = option.getAttribute('data-vacalo');
        document.querySelectorAll('.vacalo-options .option').forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        updateCreateButton();
    });
});

document.getElementById('create-room-btn').addEventListener('click', () => {
    if (!selectedPicavara || !selectedVacalo || !playerName) {
        alert('Escolha uma Picavara, um Vacalo e digite seu nome!');
        return;
    }
    console.log('Enviando createRoom:', { picavara: selectedPicavara, vacalo: selectedVacalo, name: playerName });
    socket.emit('createRoom', { 
        picavara: selectedPicavara, 
        vacalo: selectedVacalo, 
        name: playerName 
    });
});

socket.on('roomCreated', (roomId) => {
    console.log('Sala criada com ID:', roomId);
    window.location.href = `lobby.html?roomId=${roomId}`; // Corrigido o caminho (sem "../server/")
});

socket.on('error', (message) => {
    console.error('Erro em server.js:', message);
    alert(message);
    window.location.href = '../index.html';
});