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
            hostChoices: { picavara, vacalo },
            gameStarted: false
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

                if (rooms[roomId].gameStarted && gameStates[roomId]) {
                    gameStates[roomId].players[socket.id] = gameStates[roomId].players[oldId];
                    delete gameStates[roomId].players[oldId];
                    console.log(`Atualizado gameStates para ${socket.id} na sala ${roomId}`);
                    socket.emit('startGame', { roomId, gameState: gameStates[roomId] });
                }
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
            rooms[roomId].gameStarted = true;
            setTimeout(() => {
                startGame(roomId);
            }, 3000);
        } else {
            socket.emit('error', rooms[roomId] ? 'Apenas o host pode iniciar o jogo com 2 jogadores!' : 'Sala não encontrada');
        }
    });

    socket.on('startMovement', (receivedRoomId) => {
        const roomId = socket.roomId;
        if (receivedRoomId === roomId && rooms[roomId] && rooms[roomId].gameStarted && gameStates[roomId] && !gameStates[roomId].roundInProgress) {
            startMovement(roomId);
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
                [room.players[0].id]: { x: 180, y: 570, character: room.players[0].picavara, vacalo: room.players[0].vacalo, name: room.players[0].name, health: 100 }, // Ajustado para largura 360
                [room.players[1].id]: { x: 180, y: 0, character: room.players[1].picavara, vacalo: room.players[1].vacalo, name: room.players[1].name, health: 100 }   // Ajustado para altura 640
            },
            round: 1,
            roundInProgress: false,
            gameOver: false,
            projectiles: []
        };
        console.log(`Emitindo startGame para a sala ${roomId} com estado:`, gameStates[roomId]);
        io.to(roomId).emit('startGame', { roomId, gameState: gameStates[roomId] });
    }
}

function startMovement(roomId) {
    const room = rooms[roomId];
    if (room && room.players.length === 2 && gameStates[roomId] && !gameStates[roomId].gameOver) {
        gameStates[roomId].roundInProgress = true;
        const interval = setInterval(() => {
            if (gameStates[roomId]) {
                const player1 = gameStates[roomId].players[room.players[0].id];
                const player2 = gameStates[roomId].players[room.players[1].id];

                if (player1 && player2) {
                    player1.y -= 2;
                    player2.y += 2;

                    if (Math.abs(player1.y - player2.y) < 50) {
                        clearInterval(interval);
                        setTimeout(() => {
                            applyRoundDamage(roomId);
                        }, 1000);
                    } else {
                        io.to(roomId).emit('updateGame', { ...gameStates[roomId], round: gameStates[roomId].round });
                    }
                } else {
                    console.error(`Jogadores não encontrados em gameStates para sala ${roomId}:`, gameStates[roomId]);
                    clearInterval(interval);
                    gameStates[roomId].roundInProgress = false;
                }
            } else {
                clearInterval(interval);
                gameStates[roomId].roundInProgress = false;
            }
        }, 100);
    }
}

function applyRoundDamage(roomId) {
    const room = rooms[roomId];
    if (room && room.players.length === 2 && gameStates[roomId] && !gameStates[roomId].gameOver) {
        const player1 = gameStates[roomId].players[room.players[0].id];
        const player2 = gameStates[roomId].players[room.players[1].id];

        if (player1 && player2) {
            const round = gameStates[roomId].round;

            if (round === 1) {
                const damage1 = Math.random() * 70;
                const damage2 = Math.random() * 70;
                player1.health = Math.max(0, player1.health - damage1);
                player2.health = Math.max(0, player2.health - damage2);
                console.log(`Round 1 - Dano aplicado: ${damage1.toFixed(2)} a ${player1.character}, ${damage2.toFixed(2)} a ${player2.character}`);
            } else if (round === 2) {
                const damage1 = Math.random() * (player1.health * 0.8);
                const damage2 = Math.random() * (player2.health * 0.8);
                player1.health = Math.max(0, player1.health - damage1);
                player2.health = Math.max(0, player2.health - damage2);
                console.log(`Round 2 - Dano aplicado: ${damage1.toFixed(2)} a ${player1.character}, ${damage2.toFixed(2)} a ${player2.character}`);
            } else if (round === 3) {
                const totalHealth = player1.health + player2.health;
                const player1WinChance = totalHealth > 0 ? player1.health / totalHealth : 0.5;
                const winnerIndex = Math.random() < player1WinChance ? 0 : 1;
                const winnerName = room.players[winnerIndex].name;
                const loserName = room.players[1 - winnerIndex].name;
                console.log(`Round 3 - Vencedor: ${winnerName} (chance de ${Math.round(player1WinChance * 100)}% para ${player1.character})`);
                gameStates[roomId].gameOver = true;
                io.to(roomId).emit('gameResult', { winnerName, loserName });
                return;
            }

            player1.x = 180; // Ajustado para largura 360
            player1.y = 570; // Ajustado para altura 640
            player2.x = 180;
            player2.y = 0;

            gameStates[roomId].round++;
            gameStates[roomId].roundInProgress = false;
            console.log(`Preparando Round ${gameStates[roomId].round} na sala ${roomId}`);
            io.to(roomId).emit('updateGame', { ...gameStates[roomId], round: gameStates[roomId].round });
        }
    }
}

server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});