const { Router } = require('express');
const ProductController = require('../controllers/product.controller');
const { authJWT } = require('../middlewares/auth.middleware');
const canModifyProduct = require('../middlewares/productOwnership');
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

// Leer y crear: cualquier usuario autenticado. El creador queda registrado
// con el id del token (trazabilidad) y alimenta el contador "Nombre (N)".
router.get('/products', ProductController.getAllProducts);
router.get('/products/:id', ProductController.getProductById);
router.post('/products', validateProduct, ProductController.createProduct);

// Editar y eliminar: el creador del producto o un admin.
router.put('/products/:id', validateProduct, canModifyProduct, ProductController.updateProduct);
router.patch('/products/:id', validateProduct, canModifyProduct, ProductController.updateProduct);
router.delete('/products/:id', canModifyProduct, ProductController.deleteProduct);

module.exports = router;
