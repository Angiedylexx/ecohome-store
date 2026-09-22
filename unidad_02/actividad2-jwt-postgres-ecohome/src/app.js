const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const path = require("path");

const config = require("./config");
const authRoutes = require("./routes/authRoutes");
const requireAuth = require("./auth/httpAuth");
const socketAuthMiddleware = require("./socket/authMiddleware");
const { insertMessage, listMessages } = require("./models/messageModel");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

// Endpoints REST de autenticación: emiten el JWT que luego se usa
// tanto para el WebSocket como para el endpoint /api/messages.
app.use("/api", authRoutes);

// Endpoint de verificación (evidencia): lista los últimos mensajes
// persistidos en PostgreSQL. Protegido con el mismo JWT.
app.get("/api/messages", requireAuth, async (req, res) => {
  try {
    const messages = await listMessages(50);
    res.json(messages);
  } catch (err) {
    console.error("Error consultando mensajes:", err.message);
    res.status(500).json({ error: "Error del servidor" });
  }
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" },
});

// Middleware de autenticación de Socket.IO: intercepta CADA intento de
// conexión en el handshake, antes del evento "connection".
io.use(socketAuthMiddleware);

io.on("connection", async (socket) => {
  const { username } = socket.user;

  console.log(`Cliente conectado: ${username} (user_id: ${socket.user.id})`);

  // Historial: al conectarse, se envían solo a ESE socket (no broadcast)
  // los últimos 10 mensajes persistidos, en orden cronológico (más
  // antiguo primero) para que el cliente los pinte de arriba hacia abajo.
  try {
    const last10 = await listMessages(10);
    socket.emit("messages", last10.reverse());
  } catch (err) {
    console.error("Error cargando historial:", err.message);
  }

  socket.on("new-message", async (payload) => {
    try {
      const text = (payload && payload.text || "").trim();
      if (!text) return;

      // Persistencia automática ANTES de retransmitir: se guarda el
      // mensaje en PostgreSQL usando el usuario autenticado del socket
      // (nunca el que venga del cliente, para evitar suplantación).
      const saved = await insertMessage({
        userId: socket.user.id,
        username: socket.user.username,
        text,
      });

      // Una vez guardado con éxito, se retransmite a todos los
      // clientes conectados con su id y fecha reales de la BD.
      io.emit("new-message", saved);
    } catch (err) {
      console.error("Error guardando mensaje:", err.message);
      socket.emit("message-error", { error: "No se pudo guardar el mensaje" });
    }
  });

  socket.on("disconnect", () => {
    console.log(`Cliente desconectado: ${username}`);
  });
});

server.listen(config.port, () => {
  console.log(`Servidor EcoHome Store (JWT + PostgreSQL) escuchando en http://localhost:${config.port}`);
});
