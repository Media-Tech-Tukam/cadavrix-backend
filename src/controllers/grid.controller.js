const Grid = require('../models/Grid');
const Artist = require('../models/Artist');
const Artwork = require('../models/Artwork');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

/**
 * @desc    Obtener el grid activo completo
 * @route   GET /api/grid
 * @access  Public
 */
exports.getActiveGrid = async (req, res) => {
  try {
    const grid = await Grid.findOne({ status: 'active' })
      .populate({
        path: 'cells.artworkId',
        populate: {
          path: 'artistId',
          select: 'name bio socialMedia'
        }
      })
      .populate('cells.assignedTo', 'name');

    if (!grid) {
      return res.status(404).json({
        success: false,
        message: 'No hay grid activo'
      });
    }

    res.status(200).json({
      success: true,
      data: grid
    });

  } catch (error) {
    console.error('❌ Error obteniendo grid:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener grid'
    });
  }
};

/**
 * @desc    Obtener estadísticas del grid
 * @route   GET /api/grid/stats
 * @access  Public
 */
exports.getGridStats = async (req, res) => {
  try {
    const grid = await Grid.findOne({ status: 'active' });

    if (!grid) {
      return res.status(404).json({
        success: false,
        message: 'No hay grid activo'
      });
    }

    const stats = grid.getStatistics();

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
 * @desc    Obtener información de una celda específica
 * @route   GET /api/grid/cell/:x/:y
 * @access  Public
 */
exports.getCellInfo = async (req, res) => {
  try {
    const { x, y } = req.params;
    const grid = await Grid.findOne({ status: 'active' });

    if (!grid) {
      return res.status(404).json({
        success: false,
        message: 'No hay grid activo'
      });
    }

    const cell = grid.getCellByPosition(parseInt(x), parseInt(y));

    if (!cell) {
      return res.status(404).json({
        success: false,
        message: 'Celda no encontrada'
      });
    }

    // Poblar información si está ocupada
    if (cell.artworkId) {
      await Artwork.populate(cell, {
        path: 'artworkId',
        populate: {
          path: 'artistId',
          select: 'name bio socialMedia'
        }
      });
    }

    if (cell.assignedTo) {
      await Artist.populate(cell, {
        path: 'assignedTo',
        select: 'name'
      });
    }

    res.status(200).json({
      success: true,
      data: cell
    });

  } catch (error) {
    console.error('❌ Error obteniendo celda:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener información de la celda'
    });
  }
};

/**
 * @desc    Obtener vecinos de una celda
 * @route   GET /api/grid/cell/:x/:y/neighbors
 * @access  Public
 */
exports.getCellNeighbors = async (req, res) => {
  try {
    const { x, y } = req.params;
    const grid = await Grid.findOne({ status: 'active' });

    if (!grid) {
      return res.status(404).json({
        success: false,
        message: 'No hay grid activo'
      });
    }

    const neighbors = grid.getNeighbors(parseInt(x), parseInt(y));

    // Poblar información de obras si existen
    for (let neighbor of neighbors) {
      if (neighbor.cell.artworkId) {
        await Artwork.populate(neighbor.cell, {
          path: 'artworkId',
          populate: {
            path: 'artistId',
            select: 'name'
          }
        });
      }
    }

    res.status(200).json({
      success: true,
      count: neighbors.length,
      data: neighbors
    });

  } catch (error) {
    console.error('❌ Error obteniendo vecinos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener vecinos'
    });
  }
};

/**
 * @desc    Asignar celda aleatoria al artista actual
 * @route   POST /api/grid/assign
 * @access  Private
 */
exports.assignRandomCell = async (req, res) => {
  try {
    // Obtener artista del usuario autenticado
    const artist = await Artist.findOne({ userId: req.user.id });

    if (!artist) {
      return res.status(404).json({
        success: false,
        message: 'Perfil de artista no encontrado'
      });
    }

    // Verificar si ya tiene celda asignada
    if (artist.assignedCell) {
      return res.status(400).json({
        success: false,
        message: 'Ya tienes una celda asignada',
        data: {
          position: artist.assignedCell
        }
      });
    }

    // Obtener grid activo
    const grid = await Grid.findOne({ status: 'active' });

    if (!grid) {
      return res.status(404).json({
        success: false,
        message: 'No hay grid activo'
      });
    }

    // Asignar celda aleatoria
    const assignment = await grid.assignRandomCell(artist._id);

    // Actualizar artista
    artist.assignedCell = assignment.position;
    await artist.save();

    // Obtener vecinos para generar template
    const neighbors = grid.getNeighbors(assignment.position.x, assignment.position.y);

    console.log(`✅ Celda asignada a ${artist.name}: (${assignment.position.x}, ${assignment.position.y})`);

    res.status(200).json({
      success: true,
      message: 'Celda asignada exitosamente',
      data: {
        position: assignment.position,
        cell: assignment.cell,
        neighbors: neighbors
      }
    });

  } catch (error) {
    console.error('❌ Error asignando celda:', error);

    if (error.message === 'No hay celdas vacías disponibles') {
      return res.status(400).json({
        success: false,
        message: 'El grid está completo. No hay celdas disponibles.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error al asignar celda'
    });
  }
};

/**
 * @desc    Generar template personalizado para una celda
 * @route   GET /api/grid/template/:x/:y
 * @access  Private
 */
exports.generateTemplate = async (req, res) => {
  try {
    const { x, y } = req.params;

    // Obtener artista del usuario autenticado
    const artist = await Artist.findOne({ userId: req.user.id });

    if (!artist) {
      return res.status(404).json({
        success: false,
        message: 'Perfil de artista no encontrado'
      });
    }

    // Verificar que esta celda esté asignada a este artista
    if (!artist.assignedCell || 
        artist.assignedCell.x !== parseInt(x) || 
        artist.assignedCell.y !== parseInt(y)) {
      return res.status(403).json({
        success: false,
        message: 'Esta celda no está asignada a ti'
      });
    }

    // Obtener grid
    const grid = await Grid.findOne({ status: 'active' });

    if (!grid) {
      return res.status(404).json({
        success: false,
        message: 'No hay grid activo'
      });
    }

    // Obtener vecinos
    const neighbors = grid.getNeighbors(parseInt(x), parseInt(y));

    // Crear template de 2200x2200px
    const templateSize = 2200;
    const centerSize = 2000;
    const borderSize = 100;

    // Crear imagen base blanca
    const template = sharp({
      create: {
        width: templateSize,
        height: templateSize,
        channels: 3,
        background: { r: 255, g: 255, b: 255 }
      }
    });

    // Crear composiciones para los fragmentos de vecinos
    const composites = [];

    for (let neighbor of neighbors) {
      if (neighbor.cell.artworkId) {
        // Poblar artwork si aún no está poblado
        if (typeof neighbor.cell.artworkId === 'string') {
          neighbor.cell.artworkId = await Artwork.findById(neighbor.cell.artworkId);
        }

        const artwork = neighbor.cell.artworkId;
        if (artwork && artwork.image) {
          const imagePath = path.join(__dirname, '../../', artwork.image);

          try {
            // Extraer fragmento según la dirección
            let extractOptions = this.getExtractOptionsForNeighbor(neighbor.direction);
            
            const fragmentBuffer = await sharp(imagePath)
              .extract(extractOptions)
              .resize(borderSize, borderSize)
              .toBuffer();

            // Calcular posición en el template
            const position = this.getTemplatePositionForNeighbor(neighbor.direction, borderSize);

            composites.push({
              input: fragmentBuffer,
              top: position.top,
              left: position.left
            });

          } catch (error) {
            console.warn(`⚠️ No se pudo procesar vecino ${neighbor.direction}:`, error.message);
          }
        }
      }
    }

    // Componer template
    const templateBuffer = await template
      .composite(composites)
      .webp({ quality: 90 })
      .toBuffer();

    // Guardar template
    const templatesDir = path.join(__dirname, '../../templates');
    await fs.mkdir(templatesDir, { recursive: true });

    const templateFilename = `template-${x}-${y}-${Date.now()}.webp`;
    const templatePath = path.join(templatesDir, templateFilename);
    await fs.writeFile(templatePath, templateBuffer);

    console.log(`✅ Template generado para celda (${x}, ${y})`);

    res.status(200).json({
      success: true,
      message: 'Template generado exitosamente',
      data: {
        templatePath: `templates/${templateFilename}`,
        position: { x: parseInt(x), y: parseInt(y) },
        neighborsCount: composites.length
      }
    });

  } catch (error) {
    console.error('❌ Error generando template:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar template'
    });
  }
};

/**
 * Helper: Obtener opciones de extracción según dirección del vecino
 */
exports.getExtractOptionsForNeighbor = (direction) => {
  const borderSize = 100;
  const imageSize = 2000;

  const extractMap = {
    'topLeft': { left: imageSize - borderSize, top: imageSize - borderSize, width: borderSize, height: borderSize },
    'top': { left: 0, top: imageSize - borderSize, width: imageSize, height: borderSize },
    'topRight': { left: 0, top: imageSize - borderSize, width: borderSize, height: borderSize },
    'left': { left: imageSize - borderSize, top: 0, width: borderSize, height: imageSize },
    'right': { left: 0, top: 0, width: borderSize, height: imageSize },
    'bottomLeft': { left: imageSize - borderSize, top: 0, width: borderSize, height: borderSize },
    'bottom': { left: 0, top: 0, width: imageSize, height: borderSize },
    'bottomRight': { left: 0, top: 0, width: borderSize, height: borderSize }
  };

  return extractMap[direction] || { left: 0, top: 0, width: borderSize, height: borderSize };
};

/**
 * Helper: Obtener posición en el template según dirección
 */
exports.getTemplatePositionForNeighbor = (direction, borderSize) => {
  const centerSize = 2000;

  const positionMap = {
    'topLeft': { top: 0, left: 0 },
    'top': { top: 0, left: borderSize },
    'topRight': { top: 0, left: borderSize + centerSize },
    'left': { top: borderSize, left: 0 },
    'right': { top: borderSize, left: borderSize + centerSize },
    'bottomLeft': { top: borderSize + centerSize, left: 0 },
    'bottom': { top: borderSize + centerSize, left: borderSize },
    'bottomRight': { top: borderSize + centerSize, left: borderSize + centerSize }
  };

  return positionMap[direction] || { top: 0, left: 0 };
};

/**
 * @desc    Inicializar un nuevo grid (solo admin)
 * @route   POST /api/grid/initialize
 * @access  Private (Admin only)
 */
exports.initializeGrid = async (req, res) => {
  try {
    // Verificar que sea admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Solo administradores pueden inicializar grids'
      });
    }

    const { width, height, title, description } = req.body;

    // Archivar grid actual si existe
    const currentGrid = await Grid.findOne({ status: 'active' });
    if (currentGrid) {
      currentGrid.status = 'archived';
      await currentGrid.save();
    }

    // Crear nuevo grid
    const grid = await Grid.initializeGrid(
      width || 10,
      height || 10
    );

    if (title) grid.title = title;
    if (description) grid.description = description;
    await grid.save();

    console.log(`✅ Nuevo grid inicializado: ${width || 10}x${height || 10}`);

    res.status(201).json({
      success: true,
      message: 'Grid inicializado exitosamente',
      data: grid
    });

  } catch (error) {
    console.error('❌ Error inicializando grid:', error);
    res.status(500).json({
      success: false,
      message: 'Error al inicializar grid'
    });
  }
};
