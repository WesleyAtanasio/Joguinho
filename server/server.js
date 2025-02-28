// Conectar ao servidor Socket.IO
const socket = io('http://localhost:3000');

let selectedPicavara = null;
let selectedVacalo = null;

// Função para habilitar/desabilitar o botão de criar sala
function updateCreateButton() {
    const createBtn = document.getElementById('create-room-btn');
    createBtn.disabled = !(selectedPicavara && selectedVacalo);
}

// Seleção de Picavaras
document.querySelectorAll('.picavara-options .option').forEach(option => {
    option.addEventListener('click', () => {
        selectedPicavara = option.getAttribute('data-picavara');
        document.querySelectorAll('.picavara-options .option').forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        updateCreateButton();
    });
});

// Seleção de Vacalos
document.querySelectorAll('.vacalo-options .option').forEach(option => {
    option.addEventListener('click', () => {
        selectedVacalo = option.getAttribute('data-vacalo');
        document.querySelectorAll('.vacalo-options .option').forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        updateCreateButton();
    });
});

// Criar a sala ao clicar no botão
document.getElementById('create-room-btn').addEventListener('click', () => {
    socket.emit('createRoom', { picavara: selectedPicavara, vacalo: selectedVacalo });
});

// Quando a sala é criada, exibe o ID
socket.on('roomCreated', (roomId) => {
    document.getElementById('roomInfo').innerText = `Sala criada! ID: ${roomId}\nPicavara: ${selectedPicavara}, Vacalo: ${selectedVacalo}`;
    // Aqui você pode redirecionar para a tela do jogo futuramente
});

// Tratamento de erros
socket.on('error', (message) => {
    alert(message);
});