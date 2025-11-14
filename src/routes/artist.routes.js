const express = require('express');
const router = express.Router();
const artistController = require('../controllers/artist.controller');
const { protect } = require('../middleware/auth.middleware');

// ====================================
// RUTAS PÚBLICAS
// ====================================

/**
 * @route   GET /api/artists
 * @desc    Obtener todos los artistas
 * @access  Public
 */
router.get('/', artistController.getAllArtists);

/**
 * @route   GET /api/artists/:id
 * @desc    Obtener un artista por ID
 * @access  Public
 */
router.get('/:id', artistController.getArtistById);

/**
 * @route   GET /api/artists/:id/artworks
 * @desc    Obtener todas las obras de un artista
 * @access  Public
 */
router.get('/:id/artworks', artistController.getArtistArtworks);

/**
 * @route   GET /api/artists/:id/stats
 * @desc    Obtener estadísticas de un artista
 * @access  Public
 */
router.get('/:id/stats', artistController.getArtistStats);

// ====================================
// RUTAS PRIVADAS (Requieren autenticación)
// ====================================

/**
 * @route   PUT /api/artists/:id
 * @desc    Actualizar perfil de artista
 * @access  Private
 */
router.put('/:id', protect, artistController.updateArtist);

/**
 * @route   DELETE /api/artists/:id
 * @desc    Eliminar perfil de artista
 * @access  Private (solo el mismo artista o admin)
 */
router.delete('/:id', protect, artistController.deleteArtist);

module.exports = router;
