const ProductModel = require('../models/product.model');

const UserController = {
  // GET /users/me/stats — el usuario sale del JWT (req.user), nunca de la URL,
  // así nadie puede consultar el contador de otro usuario.
  async getMyStats(req, res) {
    try {
      const count = await ProductModel.countByCreator(req.user.id);
      res.json({ username: req.user.username, count });
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      res.status(500).json({ error: 'Error al obtener las estadísticas' });
    }
  },
};

module.exports = UserController;
