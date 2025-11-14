const express = require('express');
const router = express.Router();
const artworkController = require('../controllers/artwork.controller');
const { protect } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

// ====================================
// RUTAS PÚBLICAS
// ====================================

/**
 * @route   GET /api/artworks
 * @desc    Obtener todas las obras
 * @access  Public
 */
router.get('/', artworkController.getAllArtworks);

/**
 * @route   GET /api/artworks/:id
 * @desc    Obtener una obra por ID
 * @access  Public
 */
router.get('/:id', artworkController.getArtworkById);

/**
 * @route   GET /api/artworks/position/:x/:y
 * @desc    Obtener obra por posición en el grid
 * @access  Public
 */
router.get('/position/:x/:y', artworkController.getArtworkByPosition);

// ====================================
// RUTAS PRIVADAS (Requieren autenticación)
// ====================================

/**
 * @route   POST /api/artworks
 * @desc    Crear nueva obra (subir imagen)
 * @access  Private
 */
router.post('/', 
  protect, 
  upload.single('image'), 
  artworkController.createArtwork
);

/**
 * @route   PUT /api/artworks/:id
 * @desc    Actualizar obra
 * @access  Private (solo el artista creador)
 */
router.put('/:id', protect, artworkController.updateArtwork);

/**
 * @route   DELETE /api/artworks/:id
 * @desc    Eliminar obra
 * @access  Private (solo el artista creador o admin)
 */
router.delete('/:id', protect, artworkController.deleteArtwork);

/**
 * @route   POST /api/artworks/:id/like
 * @desc    Dar like a una obra
 * @access  Private
 */
router.post('/:id/like', protect, artworkController.likeArtwork);

/**
 * @route   POST /api/artworks/:id/view
 * @desc    Registrar vista de una obra
 * @access  Public
 */
router.post('/:id/view', artworkController.incrementViews);

module.exports = router;
