const { Router } = require('express');
const UserController = require('../controllers/user.controller');
const { authJWT } = require('../middlewares/auth.middleware');

const router = Router();

router.get('/users/me', authJWT, UserController.getMe);
router.get('/users/me/stats', authJWT, UserController.getMyStats);

module.exports = router;
