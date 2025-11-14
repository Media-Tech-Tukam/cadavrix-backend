const express = require('express');
const router = express.Router();
const gridController = require('../controllers/grid.controller');
const { protect } = require('../middleware/auth.middleware');

// ====================================
// RUTAS PÚBLICAS
// ====================================

/**
 * @route   GET /api/grid
 * @desc    Obtener el grid activo completo
 * @access  Public
 */
router.get('/', gridController.getActiveGrid);

/**
 * @route   GET /api/grid/stats
 * @desc    Obtener estadísticas del grid
 * @access  Public
 */
router.get('/stats', gridController.getGridStats);

/**
 * @route   GET /api/grid/cell/:x/:y
 * @desc    Obtener información de una celda específica
 * @access  Public
 */
router.get('/cell/:x/:y', gridController.getCellInfo);

/**
 * @route   GET /api/grid/cell/:x/:y/neighbors
 * @desc    Obtener vecinos de una celda
 * @access  Public
 */
router.get('/cell/:x/:y/neighbors', gridController.getCellNeighbors);

// ====================================
// RUTAS PRIVADAS (Requieren autenticación)
// ====================================

/**
 * @route   POST /api/grid/assign
 * @desc    Asignar celda aleatoria al artista actual
 * @access  Private
 */
router.post('/assign', protect, gridController.assignRandomCell);

/**
 * @route   GET /api/grid/template/:x/:y
 * @desc    Generar template personalizado para una celda
 * @access  Private
 */
router.get('/template/:x/:y', protect, gridController.generateTemplate);

/**
 * @route   POST /api/grid/initialize
 * @desc    Inicializar un nuevo grid (solo admin)
 * @access  Private (Admin only)
 */
router.post('/initialize', protect, gridController.initializeGrid);

module.exports = router;
