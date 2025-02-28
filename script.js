// Conectar ao servidor Socket.IO
const socket = io('http://localhost:3000');

// Evento para o botão "Ser Host" - apenas redireciona
document.querySelector('.host-btn').addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = 'server/server.html'; // Redireciona para a página de escolha
});

// Evento para "Entrar em Partida" (deixaremos para depois)
document.querySelector('.join-btn').addEventListener('click', (e) => {
    e.preventDefault();
    alert('Funcionalidade de entrar em partida ainda não implementada!');
});