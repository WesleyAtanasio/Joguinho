const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

let rooms = {};

io.on('connection', (socket) => {
    console.log('Novo jogador conectado:', socket.id);

    // Quando o host cria a sala com escolhas
    socket.on('createRoom', ({ picavara, vacalo }) => {
        const roomId = Math.random().toString(36).substring(2, 8);
        rooms[roomId] = { 
            host: socket.id, 
            players: [socket.id], 
            hostChoices: { picavara, vacalo } 
        };
        socket.join(roomId);
        socket.emit('roomCreated', roomId);
        console.log(`Sala criada: ${roomId} pelo host ${socket.id} com ${picavara} e ${vacalo}`);
    });

    socket.on('joinRoom', (roomId) => {
        if (rooms[roomId]) {
            rooms[roomId].players.push(socket.id);
            socket.join(roomId);
            io.to(roomId).emit('playerJoined', socket.id);
            console.log(`${socket.id} entrou na sala ${roomId}`);
        } else {
            socket.emit('error', 'Sala não encontrada');
        }
    });

    socket.on('disconnect', () => {
        console.log('Jogador desconectado:', socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});