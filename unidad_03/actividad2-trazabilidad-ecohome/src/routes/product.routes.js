const { Router } = require('express');
const ProductController = require('../controllers/product.controller');
const { authJWT, authorizeRole } = require('../middlewares/auth.middleware');
const validateProduct = require('../middlewares/validateProduct');

const router = Router();

// Lectura del catálogo: pública.
router.get('/products', ProductController.getAllProducts);
router.get('/products/:id', ProductController.getProductById);

// Escritura del catálogo: requiere estar autenticado, tener rol 'admin'
// y que el cuerpo de la petición pase las validaciones de negocio.
router.post(
  '/products',
  authJWT,
  authorizeRole('admin'),
  validateProduct,
  ProductController.createProduct
);
router.put(
  '/products/:id',
  authJWT,
  authorizeRole('admin'),
  validateProduct,
  ProductController.updateProduct
);
router.patch(
  '/products/:id',
  authJWT,
  authorizeRole('admin'),
  validateProduct,
  ProductController.updateProduct
);
router.delete('/products/:id', authJWT, authorizeRole('admin'), ProductController.deleteProduct);

module.exports = router;
