const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const MessageModel = require('../models/message.model');

const HISTORY_SIZE = 10;
const MAX_MESSAGE_LENGTH = 500;

// Contrato del chat (lo consumen React y Flutter):
//   handshake: auth.token (JWT)  ->  connect_error si falta o es inválido
//   servidor -> cliente: "messages"    historial (últimos 10, orden cronológico)
//                        "new-message" { id, user_id, username, content, created_at }
//   cliente  -> servidor: "new-message" { content }
// El JWT es el MISMO que emite POST /auth/login.
function attachChat(httpServer) {
  const io = new Server(httpServer, { cors: { origin: '*' } });

  io.use((socket, next) => {
    const header = socket.handshake.headers.authorization;
    const token =
      socket.handshake.auth?.token ||
      (header && header.startsWith('Bearer ') ? header.slice(7) : null);

    if (!token) return next(new Error('Autenticación requerida: token no proporcionado'));

    try {
      const { id, username } = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = { id, username };
      next();
    } catch {
      next(new Error('Token inválido o expirado'));
    }
  });

  io.on('connection', async (socket) => {
    const { id, username } = socket.user;
    console.log(`Chat: conectado ${username} (id ${id})`);

    try {
      // Historial solo para este socket, en orden cronológico.
      socket.emit('messages', (await MessageModel.listLast(HISTORY_SIZE)).reverse());
    } catch (err) {
      console.error('Error cargando historial:', err.message);
    }

    socket.on('new-message', async (payload) => {
      const content = String((payload && payload.content) ?? '').trim();
      if (!content) return;
      if (content.length > MAX_MESSAGE_LENGTH) {
        return socket.emit('message-error', {
          error: `El mensaje supera los ${MAX_MESSAGE_LENGTH} caracteres`,
        });
      }
      try {
        // La identidad sale del JWT del socket, nunca del payload (anti-suplantación).
        const saved = await MessageModel.insert({ userId: id, content });
        io.emit('new-message', saved);
      } catch (err) {
        console.error('Error guardando mensaje:', err.message);
        socket.emit('message-error', { error: 'No se pudo guardar el mensaje' });
      }
    });

    socket.on('disconnect', () => console.log(`Chat: desconectado ${username}`));
  });

  return io;
}

module.exports = attachChat;
