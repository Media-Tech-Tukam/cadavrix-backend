const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

// Importar controladores y middleware
const authController = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware'); // ← AGREGADO
const { validate } = require('../middleware/validator.middleware');

// ====================================
// VALIDACIONES
// ====================================

const registerValidation = [
  body('email')
    .isEmail()
    .withMessage('Debe ser un email válido')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('La contraseña debe tener al menos 6 caracteres'),
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
  body('bio')
    .trim()
    .isLength({ min: 20, max: 500 })
    .withMessage('La biografía debe tener entre 20 y 500 caracteres')
];

const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Debe ser un email válido')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('La contraseña es requerida')
];

// ====================================
// RUTAS
// ====================================

/**
 * @route   POST /api/auth/register
 * @desc    Registrar nuevo usuario y crear perfil de artista
 * @access  Public
 */
router.post('/register', registerValidation, validate, authController.register);

/**
 * @route   POST /api/auth/login
 * @desc    Iniciar sesión
 * @access  Public
 */
router.post('/login', loginValidation, validate, authController.login);

/**
 * @route   GET /api/auth/me
 * @desc    Obtener usuario actual
 * @access  Private
 */
router.get('/me', protect, authController.getMe); // ← AGREGADO protect

/**
 * @route   POST /api/auth/logout
 * @desc    Cerrar sesión (opcional, si decides implementar blacklist de tokens)
 * @access  Private
 */
router.post('/logout', protect, authController.logout); // ← AGREGADO protect

module.exports = router;