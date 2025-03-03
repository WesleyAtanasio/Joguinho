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
let gameStates = {};

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
            players: [{ id: socket.id, name, picavara, vacalo, connected: true }], 
            hostChoices: { picavara, vacalo } 
        };
        socket.join(roomId);
        socket.roomId = roomId;
        socket.emit('roomCreated', roomId);
        console.log(`Sala criada: ${roomId} pelo host ${name} (${socket.id}) com ${picavara} e ${vacalo}`);
    });

    socket.on('rejoinRoom', (roomId) => {
        if (rooms[roomId]) {
            const player = rooms[roomId].players.find(p => p.id === socket.id || (p.connected === false && (p.id === rooms[roomId].host || !rooms[roomId].players.some(p2 => p2.id === p.id && p2.connected))));
            if (player) {
                const oldId = player.id;
                player.id = socket.id;
                player.connected = true;
                if (rooms[roomId].host === oldId) {
                    rooms[roomId].host = socket.id;
                    console.log(`Host reconectado à sala ${roomId} com novo ID ${socket.id} (antigo: ${oldId})`);
                } else {
                    console.log(`Jogador reconectado à sala ${roomId} com novo ID ${socket.id} (antigo: ${oldId})`);
                }
                socket.join(roomId);
                socket.roomId = roomId;
            } else if (rooms[roomId].players.length < 2) {
                const { picavara, vacalo } = rooms[roomId].hostChoices;
                rooms[roomId].players.push({ id: socket.id, name: 'Host', picavara, vacalo, connected: true });
                rooms[roomId].host = socket.id;
                socket.join(roomId);
                socket.roomId = roomId;
                console.log(`Host restaurado na sala ${roomId} com ID ${socket.id}`);
            }
            io.to(roomId).emit('roomUpdated', rooms[roomId]);
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
            rooms[roomId].players.push({ id: socket.id, name, picavara, vacalo, connected: true });
            socket.join(roomId);
            socket.roomId = roomId;
            socket.emit('joinedRoom', roomId);
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

    socket.on('startGame', () => {
        const roomId = socket.roomId;
        if (rooms[roomId] && socket.id === rooms[roomId].host && rooms[roomId].players.length === 2) {
            console.log(`Host (${socket.id}) iniciou o jogo na sala ${roomId}`);
            startGame(roomId);
        } else {
            socket.emit('error', rooms[roomId] ? 'Apenas o host pode iniciar o jogo com 2 jogadores!' : 'Sala não encontrada');
        }
    });

    socket.on('move', (direction) => {
        const roomId = socket.roomId;
        if (roomId && gameStates[roomId]) {
            const player = gameStates[roomId].players[socket.id];
            if (player) {
                const speed = 5;
                if (direction.up) player.y -= speed;
                if (direction.left) player.x -= speed;
                if (direction.down) player.y += speed;
                if (direction.right) player.x += speed;
                player.x = Math.max(0, Math.min(750, player.x));
                player.y = Math.max(0, Math.min(550, player.y));
                io.to(roomId).emit('updateGame', gameStates[roomId]);
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('Jogador desconectado:', socket.id);
        const roomId = socket.roomId;
        if (roomId && rooms[roomId]) {
            const player = rooms[roomId].players.find(p => p.id === socket.id);
            if (player) {
                player.connected = false;
            }
            if (rooms[roomId].players.every(p => !p.connected)) {
                setTimeout(() => {
                    if (rooms[roomId] && rooms[roomId].players.every(p => !p.connected)) {
                        delete rooms[roomId];
                        delete gameStates[roomId];
                        console.log(`Sala ${roomId} foi removida por falta de jogadores conectados`);
                    }
                }, 5000);
            } else {
                io.to(roomId).emit('roomUpdated', rooms[roomId]);
            }
        }
    });
});

function startGame(roomId) {
    const room = rooms[roomId];
    if (room && room.players.length === 2) {
        gameStates[roomId] = {
            players: {
                [room.players[0].id]: { x: 375, y: 550, character: room.players[0].picavara },
                [room.players[1].id]: { x: 375, y: 50, character: room.players[1].picavara }
            },
            projectiles: []
        };
        console.log(`Emitindo startGame para a sala ${roomId}`);
        io.to(roomId).emit('startGame', { roomId, gameState: gameStates[roomId] });
    }
}

server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});