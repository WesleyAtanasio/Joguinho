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

    socket.on('createRoom', ({ picavara, vacalo, name }) => {
        console.log('Recebido createRoom:', { picavara, vacalo, name });
        if (!picavara || !vacalo || !name) {
            socket.emit('error', 'Dados inválidos para criar a sala');
            return;
        }
        const roomId = Math.random().toString(36).substring(2, 8);
        rooms[roomId] = { 
            host: socket.id, 
            players: [{ id: socket.id, name, picavara, vacalo }], 
            hostChoices: { picavara, vacalo } 
        };
        socket.join(roomId);
        socket.roomId = roomId;
        socket.emit('roomCreated', roomId);
        console.log(`Sala criada: ${roomId} pelo host ${name} (${socket.id}) com ${picavara} e ${vacalo}`);
    });

    socket.on('rejoinRoom', (roomId) => {
        if (rooms[roomId]) {
            const hostPlayer = rooms[roomId].players.find(p => p.id === rooms[roomId].host);
            if (hostPlayer) {
                const oldHostId = rooms[roomId].host;
                hostPlayer.id = socket.id;
                rooms[roomId].host = socket.id;
                socket.join(roomId);
                socket.roomId = roomId;
                console.log(`Host reconectado à sala ${roomId} com novo ID ${socket.id} (antigo: ${oldHostId})`);
            }
        } else {
            socket.emit('error', 'Sala não encontrada ao tentar reconectar');
        }
    });

    socket.on('checkRoom', (roomId) => {
        if (rooms[roomId]) {
            socket.emit('roomAvailable', rooms[roomId]);
        } else {
            socket.emit('error', 'Sala não encontrada');
        }
    });

    socket.on('joinRoom', ({ roomId, name, picavara, vacalo }) => {
        if (rooms[roomId]) {
            if (rooms[roomId].players.length >= 2) {
                socket.emit('error', 'Sala cheia! Máximo de 2 jogadores.');
                return;
            }
            rooms[roomId].players.push({ id: socket.id, name, picavara, vacalo });
            socket.join(roomId);
            socket.roomId = roomId;
            socket.emit('joinedRoom', roomId);
            // Atualizar todos os jogadores na sala automaticamente
            io.to(roomId).emit('roomUpdated', rooms[roomId]);
            console.log(`${name} (${socket.id}) entrou na sala ${roomId} com ${picavara} e ${vacalo}`);
        } else {
            socket.emit('error', 'Sala não encontrada');
        }
    });

    socket.on('getRoomInfo', (roomId) => {
        if (rooms[roomId]) {
            socket.emit('roomInfo', rooms[roomId]);
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