const ProductModel = require('../models/product.model');
const UserModel = require('../models/user.model');

// En ambos endpoints el usuario sale del JWT (req.user), nunca de la URL,
// así nadie puede consultar los datos o el contador de otro usuario.
const UserController = {
  // GET /users/me — perfil del usuario autenticado + contador de productos.
  async getMe(req, res) {
    try {
      const user = await UserModel.findById(req.user.id);
      if (!user) {
        return res.status(401).json({ error: 'El usuario del token ya no existe' });
      }
      const productCount = await ProductModel.countByCreator(user.id);
      res.json({ ...user, productCount });
    } catch (error) {
      console.error('Error al obtener el perfil:', error);
      res.status(500).json({ error: 'Error al obtener el perfil' });
    }
  },

  // GET /users/me/stats — { username, count }: base del indicador "Nombre (N)".
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
