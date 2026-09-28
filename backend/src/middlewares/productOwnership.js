const ProductModel = require('../models/product.model');

// Editar o eliminar un producto: solo su creador o un administrador.
// (Crear y leer están abiertos a cualquier usuario autenticado.)
// Debe ir después de authJWT. Los productos sin creador (created_by NULL,
// anteriores a la trazabilidad) solo los puede modificar un admin.
async function canModifyProduct(req, res, next) {
  try {
    const product = await ProductModel.getById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const isOwner = product.created_by !== null && product.created_by === req.user.id;
    if (req.user.role !== 'admin' && !isOwner) {
      return res.status(403).json({
        error: 'Solo el creador del producto o un administrador puede modificarlo',
      });
    }
    next();
  } catch (error) {
    console.error('Error al verificar la propiedad del producto:', error);
    res.status(500).json({ error: 'Error al verificar los permisos del producto' });
  }
}

module.exports = canModifyProduct;
