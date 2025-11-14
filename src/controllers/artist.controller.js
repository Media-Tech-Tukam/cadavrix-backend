const Artist = require('../models/Artist');
const Artwork = require('../models/Artwork');

/**
 * @desc    Obtener todos los artistas
 * @route   GET /api/artists
 * @access  Public
 */
exports.getAllArtists = async (req, res) => {
  try {
    const artists = await Artist.find()
      .sort({ registeredAt: -1 })
      .populate('userId', 'email isActive');

    res.status(200).json({
      success: true,
      count: artists.length,
      data: artists
    });

  } catch (error) {
    console.error('❌ Error obteniendo artistas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener artistas'
    });
  }
};

/**
 * @desc    Obtener un artista por ID
 * @route   GET /api/artists/:id
 * @access  Public
 */
exports.getArtistById = async (req, res) => {
  try {
    const artist = await Artist.findById(req.params.id)
      .populate('userId', 'email isActive');

    if (!artist) {
      return res.status(404).json({
        success: false,
        message: 'Artista no encontrado'
      });
    }

    res.status(200).json({
      success: true,
      data: artist
    });

  } catch (error) {
    console.error('❌ Error obteniendo artista:', error);
    
    // Manejar ID inválido
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Artista no encontrado'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error al obtener artista'
    });
  }
};

/**
 * @desc    Obtener todas las obras de un artista
 * @route   GET /api/artists/:id/artworks
 * @access  Public
 */
exports.getArtistArtworks = async (req, res) => {
  try {
    const artist = await Artist.findById(req.params.id);

    if (!artist) {
      return res.status(404).json({
        success: false,
        message: 'Artista no encontrado'
      });
    }

    const artworks = await Artwork.find({ artistId: req.params.id })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: artworks.length,
      data: {
        artist: artist.toPublicJSON(),
        artworks: artworks
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo obras del artista:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener obras del artista'
    });
  }
};

/**
 * @desc    Obtener estadísticas de un artista
 * @route   GET /api/artists/:id/stats
 * @access  Public
 */
exports.getArtistStats = async (req, res) => {
  try {
    const artist = await Artist.findById(req.params.id);

    if (!artist) {
      return res.status(404).json({
        success: false,
        message: 'Artista no encontrado'
      });
    }

    const artworks = await Artwork.find({ artistId: req.params.id });

    // Calcular estadísticas
    const stats = {
      totalArtworks: artworks.length,
      totalLikes: artworks.reduce((sum, artwork) => sum + artwork.likes, 0),
      totalViews: artworks.reduce((sum, artwork) => sum + artwork.views, 0),
      hasAssignedCell: artist.assignedCell !== null,
      hasSubmittedArtwork: artist.hasSubmittedArtwork,
      memberSince: artist.registeredAt,
      artworksByMonth: {}
    };

    // Agrupar obras por mes
    artworks.forEach(artwork => {
      const date = new Date(artwork.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      stats.artworksByMonth[monthKey] = (stats.artworksByMonth[monthKey] || 0) + 1;
    });

    res.status(200).json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas'
    });
  }
};

/**
 * @desc    Actualizar perfil de artista
 * @route   PUT /api/artists/:id
 * @access  Private
 */
exports.updateArtist = async (req, res) => {
  try {
    let artist = await Artist.findById(req.params.id);

    if (!artist) {
      return res.status(404).json({
        success: false,
        message: 'Artista no encontrado'
      });
    }

    // Verificar que el usuario autenticado sea el dueño del perfil
    if (artist.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para actualizar este perfil'
      });
    }

    // Campos que se pueden actualizar
    const { name, bio, socialMedia } = req.body;

    // Actualizar campos
    if (name) artist.name = name;
    if (bio) artist.bio = bio;
    if (socialMedia) {
      artist.socialMedia = {
        ...artist.socialMedia,
        ...socialMedia
      };
    }

    await artist.save();

    console.log(`✅ Perfil actualizado: ${artist.name}`);

    res.status(200).json({
      success: true,
      data: artist
    });

  } catch (error) {
    console.error('❌ Error actualizando artista:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Error de validación',
        errors: messages
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error al actualizar perfil'
    });
  }
};

/**
 * @desc    Eliminar perfil de artista
 * @route   DELETE /api/artists/:id
 * @access  Private (solo el mismo artista o admin)
 */
exports.deleteArtist = async (req, res) => {
  try {
    const artist = await Artist.findById(req.params.id);

    if (!artist) {
      return res.status(404).json({
        success: false,
        message: 'Artista no encontrado'
      });
    }

    // Verificar permisos
    if (artist.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para eliminar este perfil'
      });
    }

    // Eliminar también las obras del artista
    await Artwork.deleteMany({ artistId: req.params.id });

    // Eliminar artista
    await artist.deleteOne();

    console.log(`✅ Artista eliminado: ${artist.name}`);

    res.status(200).json({
      success: true,
      message: 'Artista y sus obras eliminados exitosamente'
    });

  } catch (error) {
    console.error('❌ Error eliminando artista:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar artista'
    });
  }
};
