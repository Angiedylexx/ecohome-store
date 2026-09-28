const { Router } = require('express');
const ProductController = require('../controllers/product.controller');
const { authJWT, authorizeRole } = require('../middlewares/auth.middleware');
const validateProduct = require('../middlewares/validateProduct');

const router = Router();

// Un id no numérico llegaría a PostgreSQL como error de tipo (500): se corta antes.
router.param('id', (req, res, next, id) => {
  if (!/^\d+$/.test(id) || Number(id) > 2147483647) {
    return res.status(400).json({ error: 'El id del producto debe ser un entero positivo' });
  }
  next();
});

// Todo el catálogo requiere JWT (la web y la app móvil ya inician sesión antes).
router.use('/products', authJWT);

// Lectura: cualquier usuario autenticado.
router.get('/products', ProductController.getAllProducts);
router.get('/products/:id', ProductController.getProductById);

// Escritura: rol 'admin' y cuerpo válido (name no vacío, price > 0).
router.post('/products', authorizeRole('admin'), validateProduct, ProductController.createProduct);
router.put('/products/:id', authorizeRole('admin'), validateProduct, ProductController.updateProduct);
router.patch('/products/:id', authorizeRole('admin'), validateProduct, ProductController.updateProduct);
router.delete('/products/:id', authorizeRole('admin'), ProductController.deleteProduct);

module.exports = router;
