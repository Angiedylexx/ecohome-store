const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const PORT = 4000;

const app = express();

// Sirve el cliente de prueba (public/index.html) para poder abrir
// http://localhost:4000 en dos pestañas/navegadores distintos.
app.use(express.static(path.join(__dirname, "..", "public")));

// Servidor HTTP nativo, requerido por Socket.IO para adjuntarse a Express.
const server = http.createServer(app);

// Instancia de Socket.IO sobre el servidor HTTP, con CORS abierto
// para permitir pruebas desde cualquier origen/cliente.
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  const username = socket.handshake.query.username || socket.id;

  console.log(`Cliente conectado: ${username}`);

  // Canal de mensajería en tiempo real: recibe un mensaje de un cliente
  // y lo retransmite (broadcast) a TODOS los clientes conectados.
  socket.on("new-message", (msg) => {
    console.log(`Mensaje de ${username}:`, msg);
    io.emit("new-message", msg);
  });

  socket.on("disconnect", () => {
    console.log(`Cliente desconectado: ${username}`);
  });
});

server.listen(PORT, () => {
  console.log(`Servidor EcoHome Store escuchando en http://localhost:${PORT}`);
});
