const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const MessageModel = require('../models/message.model');

// Contrato idéntico al chat de la Unidad 2 (React y Flutter ya lo consumen):
//   handshake: auth.token (JWT)   ->  connect_error si falta/es inválido
//   servidor -> cliente: "messages" (historial, últimos 10) y "new-message"
//   cliente  -> servidor: "new-message" { text }
// La diferencia es que el JWT es el MISMO que emite POST /auth/login.
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
      socket.emit('messages', (await MessageModel.listLast(10)).reverse());
    } catch (err) {
      console.error('Error cargando historial:', err.message);
    }

    socket.on('new-message', async (payload) => {
      const text = ((payload && payload.text) || '').trim();
      if (!text) return;
      try {
        // La identidad sale del JWT del socket, nunca del payload (anti-suplantación).
        const saved = await MessageModel.insert({ userId: id, username, text });
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
