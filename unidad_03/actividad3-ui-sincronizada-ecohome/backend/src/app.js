const express = require('express');
const cors = require('cors');
const productRoutes = require('./routes/product.routes');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');

const app = express();

// CORS: el cliente web (Vite, otro origen) consume esta API desde el navegador.
app.use(cors());
app.use(express.json());
app.use('/', authRoutes);
app.use('/', productRoutes);
app.use('/', userRoutes);

module.exports = app;
