const { Router } = require('express');
const UserController = require('../controllers/user.controller');
const { authJWT } = require('../middlewares/auth.middleware');

const router = Router();

// Métrica de actividad del usuario autenticado: { username, count }.
router.get('/users/me/stats', authJWT, UserController.getMyStats);

module.exports = router;
