// Middleware de validación para POST /products y PUT|PATCH /products/:id.
// Reglas de negocio:
//   - name: obligatorio, string no vacío.
//   - price: obligatorio, numérico y estrictamente mayor a 0.
function validateProduct(req, res, next) {
  const { name, price } = req.body;
  const errors = [];

  if (typeof name !== 'string' || name.trim().length === 0) {
    errors.push('El campo "name" es obligatorio y debe ser un texto no vacío');
  }

  const priceNumber = Number(price);
  if (price === undefined || price === null || price === '' || Number.isNaN(priceNumber)) {
    errors.push('El campo "price" es obligatorio y debe ser un número');
  } else if (priceNumber <= 0) {
    errors.push('El campo "price" debe ser mayor a 0');
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  next();
}

module.exports = validateProduct;
