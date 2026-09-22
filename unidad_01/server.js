require('dotenv').config();
const app = require('./src/app');
const ProductModel = require('./src/models/product.model');
const UserModel = require('./src/models/user.model');

const PORT = process.env.PORT || 3000;

async function start() {
  // Inicialización automática de las tablas `products` y `users` antes de aceptar tráfico.
  await ProductModel.init();
  await UserModel.init();

  app.listen(PORT, () => {
    console.log(`Servidor EcoHome Store escuchando en http://localhost:${PORT}`);
  });
}

start().catch((error) => {
  console.error('No se pudo iniciar el servidor:', error);
  process.exit(1);
});
