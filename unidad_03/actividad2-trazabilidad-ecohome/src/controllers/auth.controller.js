const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/user.model');

const SALT_ROUNDS = 10;

const AuthController = {
  async signup(req, res) {
    try {
      const { username, email, password, role } = req.body;

      if (!username || !email || !password) {
        return res.status(400).json({ error: 'username, email y password son obligatorios' });
      }

      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      const newUser = await UserModel.create({ username, email, passwordHash, role });

      res.status(201).json(newUser);
    } catch (error) {
      // Violación de restricción UNIQUE (username o email ya registrados).
      if (error.code === '23505') {
        return res.status(409).json({ error: 'El username o el email ya están registrados' });
      }

      console.error('Error en signup:', error);
      res.status(500).json({ error: 'Error al registrar el usuario' });
    }
  },

  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'email y password son obligatorios' });
      }

      const user = await UserModel.findByEmail(email);
      if (!user) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      const passwordMatches = await bcrypt.compare(password, user.password_hash);
      if (!passwordMatches) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      const payload = { id: user.id, username: user.username, role: user.role };
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

      res.json({ token });
    } catch (error) {
      console.error('Error en login:', error);
      res.status(500).json({ error: 'Error al iniciar sesión' });
    }
  },
};

module.exports = AuthController;
