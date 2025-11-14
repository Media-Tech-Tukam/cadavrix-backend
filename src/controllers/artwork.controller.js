const Artwork = require('../models/Artwork');
const Artist = require('../models/Artist');
const Grid = require('../models/Grid');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

/**
 * @desc    Obtener todas las obras (con filtros opcionales)
 * @route   GET /api/artworks
 * @query   artistId - ID del artista para filtrar
 * @query   status - Estado de la obra para filtrar
 * @access  Public
 */
exports.getAllArtworks = async (req, res) => {
  try {
    // Construir filtros basados en query params
    const filters = {};
    
    // Filtrar por artistId si se proporciona
    if (req.query.artistId) {
      filters.artistId = req.query.artistId;
      console.log(`🔍 Filtrando obras del artista: ${req.query.artistId}`);
    }
    
    // Filtrar por estado si se proporciona
    if (req.query.status) {
      filters.status = req.query.status;
    }
    
    const artworks = await Artwork.find(filters)
      .populate('artistId', 'name bio socialMedia')
      .sort({ createdAt: -1 });

    console.log(`✅ ${artworks.length} obras encontradas con filtros:`, filters);

    res.status(200).json({
      success: true,
      count: artworks.length,
      data: artworks,
      filters: filters // Para debugging
    });

  } catch (error) {
    console.error('⚠️ Error obteniendo obras:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener obras'
    });
  }
};

/**
 * @desc    Obtener una obra por ID
 * @route   GET /api/artworks/:id
 * @access  Public
 */
exports.getArtworkById = async (req, res) => {
  try {
    const artwork = await Artwork.findById(req.params.id)
      .populate('artistId', 'name bio socialMedia');

    if (!artwork) {
      return res.status(404).json({
        success: false,
        message: 'Obra no encontrada'
      });
    }

    res.status(200).json({
      success: true,
      data: artwork
    });

  } catch (error) {
    console.error('⚠️ Error obteniendo obra:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Obra no encontrada'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error al obtener obra'
    });
  }
};

/**
 * @desc    Obtener obra por posición en el grid
 * @route   GET /api/artworks/position/:x/:y
 * @access  Public
 */
exports.getArtworkByPosition = async (req, res) => {
  try {
    const { x, y } = req.params;

    const artwork = await Artwork.findOne({
      'gridPosition.x': parseInt(x),
      'gridPosition.y': parseInt(y)
    }).populate('artistId', 'name bio socialMedia');

    if (!artwork) {
      return res.status(404).json({
        success: false,
        message: 'No hay obra en esta posición'
      });
    }

    res.status(200).json({
      success: true,
      data: artwork
    });

  } catch (error) {
    console.error('⚠️ Error obteniendo obra por posición:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener obra'
    });
  }
};

/**
 * @desc    Crear nueva obra (subir imagen)
 * @route   POST /api/artworks
 * @access  Private
 */
exports.createArtwork = async (req, res) => {
  try {
    // Verificar que se subió una imagen
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Por favor sube una imagen'
      });
    }

    const { title, description, gridX, gridY } = req.body;

    // Validar campos requeridos
    if (!title || !description || !gridX || !gridY) {
      return res.status(400).json({
        success: false,
        message: 'Por favor proporciona título, descripción y posición en el grid'
      });
    }

    // Obtener el perfil del artista
    const artist = await Artist.findOne({ userId: req.user.id });

    if (!artist) {
      return res.status(404).json({
        success: false,
        message: 'Perfil de artista no encontrado'
      });
    }

    // Verificar que el artista tenga esta celda asignada
    if (!artist.assignedCell || 
        artist.assignedCell.x !== parseInt(gridX) || 
        artist.assignedCell.y !== parseInt(gridY)) {
      return res.status(403).json({
        success: false,
        message: 'Esta celda no está asignada a ti'
      });
    }

    // Verificar que la posición no esté ocupada
    const existingArtwork = await Artwork.findOne({
      'gridPosition.x': parseInt(gridX),
      'gridPosition.y': parseInt(gridY)
    });

    if (existingArtwork) {
      return res.status(400).json({
        success: false,
        message: 'Esta posición ya está ocupada'
      });
    }

    // Procesar imagen con Sharp
    const imagePath = req.file.path;
    const processedImageName = `processed-${Date.now()}-${req.file.filename}`;
    const processedImagePath = path.join(path.dirname(imagePath), processedImageName);

    // Extraer área central de 2000x2000px
    await sharp(imagePath)
      .extract({ left: 100, top: 100, width: 2000, height: 2000 })
      .resize(2000, 2000, { fit: 'cover' })
      .webp({ quality: 90 })
      .toFile(processedImagePath);

    // Obtener metadata de la imagen procesada
    const metadata = await sharp(processedImagePath).metadata();

    // Eliminar imagen original
    await fs.unlink(imagePath);

    // Crear obra en la base de datos
    const artwork = await Artwork.create({
      artistId: artist._id,
      title,
      description,
      image: `uploads/${processedImageName}`,
      imageMetadata: {
        filename: processedImageName,
        mimetype: 'image/webp',
        size: metadata.size,
        width: metadata.width,
        height: metadata.height
      },
      gridPosition: {
        x: parseInt(gridX),
        y: parseInt(gridY)
      },
      status: 'approved'
    });

    // Actualizar grid: marcar celda como ocupada
    const grid = await Grid.getActiveGrid();
    if (grid) {
      await grid.markCellAsOccupied(parseInt(gridX), parseInt(gridY), artwork._id);
    }

    // Actualizar artista: marcar que ya subió su obra
    artist.hasSubmittedArtwork = true;
    await artist.save();

    console.log(`✅ Nueva obra creada: "${title}" por ${artist.name}`);

    res.status(201).json({
      success: true,
      data: artwork
    });

  } catch (error) {
    console.error('⚠️ Error creando obra:', error);

    // Eliminar archivo si hubo error
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error eliminando archivo:', unlinkError);
      }
    }

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
      message: 'Error al crear obra'
    });
  }
};

/**
 * @desc    Actualizar obra
 * @route   PUT /api/artworks/:id
 * @access  Private (solo el artista creador)
 */
exports.updateArtwork = async (req, res) => {
  try {
    let artwork = await Artwork.findById(req.params.id);

    if (!artwork) {
      return res.status(404).json({
        success: false,
        message: 'Obra no encontrada'
      });
    }

    // Obtener artista del usuario autenticado
    const artist = await Artist.findOne({ userId: req.user.id });

    // Verificar que sea el dueño de la obra
    if (artwork.artistId.toString() !== artist._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para actualizar esta obra'
      });
    }

    // Campos que se pueden actualizar
    const { title, description } = req.body;

    if (title) artwork.title = title;
    if (description) artwork.description = description;

    await artwork.save();

    console.log(`✅ Obra actualizada: "${artwork.title}"`);

    res.status(200).json({
      success: true,
      data: artwork
    });

  } catch (error) {
    console.error('⚠️ Error actualizando obra:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar obra'
    });
  }
};

/**
 * @desc    Eliminar obra
 * @route   DELETE /api/artworks/:id
 * @access  Private (solo el artista creador o admin)
 */
exports.deleteArtwork = async (req, res) => {
  try {
    const artwork = await Artwork.findById(req.params.id);

    if (!artwork) {
      return res.status(404).json({
        success: false,
        message: 'Obra no encontrada'
      });
    }

    // Obtener artista del usuario autenticado
    const artist = await Artist.findOne({ userId: req.user.id });

    // Verificar permisos
    if (artwork.artistId.toString() !== artist._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para eliminar esta obra'
      });
    }

    // Eliminar archivo de imagen
    const imagePath = path.join(__dirname, '../../', artwork.image);
    try {
      await fs.unlink(imagePath);
    } catch (error) {
      console.warn('⚠️ No se pudo eliminar la imagen:', error.message);
    }

    // Liberar celda en el grid
    const grid = await Grid.getActiveGrid();
    if (grid) {
      const cellIndex = grid.cells.findIndex(cell => 
        cell.position.x === artwork.gridPosition.x && 
        cell.position.y === artwork.gridPosition.y
      );
      if (cellIndex !== -1) {
        grid.cells[cellIndex].status = 'empty';
        grid.cells[cellIndex].artworkId = null;
        await grid.save();
      }
    }

    // Eliminar obra
    await artwork.deleteOne();

    console.log(`✅ Obra eliminada: "${artwork.title}"`);

    res.status(200).json({
      success: true,
      message: 'Obra eliminada exitosamente'
    });

  } catch (error) {
    console.error('⚠️ Error eliminando obra:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar obra'
    });
  }
};

/**
 * @desc    Dar like a una obra
 * @route   POST /api/artworks/:id/like
 * @access  Private
 */
exports.likeArtwork = async (req, res) => {
  try {
    const artwork = await Artwork.findById(req.params.id);

    if (!artwork) {
      return res.status(404).json({
        success: false,
        message: 'Obra no encontrada'
      });
    }

    // Incrementar likes
    artwork.likes += 1;
    await artwork.save();

    res.status(200).json({
      success: true,
      data: {
        likes: artwork.likes
      }
    });

  } catch (error) {
    console.error('⚠️ Error dando like:', error);
    res.status(500).json({
      success: false,
      message: 'Error al dar like'
    });
  }
};

/**
 * @desc    Incrementar vistas de una obra
 * @route   POST /api/artworks/:id/view
 * @access  Public
 */
exports.incrementViews = async (req, res) => {
  try {
    const artwork = await Artwork.findById(req.params.id);

    if (!artwork) {
      return res.status(404).json({
        success: false,
        message: 'Obra no encontrada'
      });
    }

    await artwork.incrementViews();

    res.status(200).json({
      success: true,
      data: {
        views: artwork.views
      }
    });

  } catch (error) {
    console.error('⚠️ Error incrementando vistas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al incrementar vistas'
    });
  }
};