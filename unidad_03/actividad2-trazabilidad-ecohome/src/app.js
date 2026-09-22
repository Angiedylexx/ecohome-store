const express = require('express');
const productRoutes = require('./routes/product.routes');
const authRoutes = require('./routes/auth.routes');

const app = express();

app.use(express.json());
app.use('/', authRoutes);
app.use('/', productRoutes);

module.exports = app;
