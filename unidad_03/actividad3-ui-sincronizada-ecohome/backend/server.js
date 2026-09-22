require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const attachChat = require('./src/socket/chat');
const ProductModel = require('./src/models/product.model');
const UserModel = require('./src/models/user.model');
const MessageModel = require('./src/models/message.model');

const PORT = process.env.PORT || 3000;

async function start() {
  // `users` primero: products.created_by y messages.user_id son FK hacia users.id.
  await UserModel.init();
  await ProductModel.init();
  await MessageModel.init();

  // Express (REST) y Socket.IO (chat) comparten servidor, puerto y JWT.
  const server = http.createServer(app);
  attachChat(server);

  server.listen(PORT, () => {
    console.log(`Servidor EcoHome Store (REST + chat) escuchando en http://localhost:${PORT}`);
  });
}

start().catch((error) => {
  console.error('No se pudo iniciar el servidor:', error);
  process.exit(1);
});
