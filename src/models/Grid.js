const mongoose = require('mongoose');

const cellSchema = new mongoose.Schema({
  position: {
    x: { 
      type: Number, 
      required: true,
      min: 0
    },
    y: { 
      type: Number, 
      required: true,
      min: 0
    }
  },
  status: {
    type: String,
    enum: ['empty', 'assigned', 'occupied'],
    default: 'empty'
  },
  artworkId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Artwork',
    default: null
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Artist',
    default: null
  },
  assignedAt: {
    type: Date,
    default: null
  }
}, { _id: false });

const gridSchema = new mongoose.Schema({
  boardId: {
    type: String,
    required: true,
    unique: true,
    default: 'cadavrix-001'
  },
  title: {
    type: String,
    required: true,
    default: 'Primera Obra Colectiva'
  },
  description: {
    type: String,
    default: 'El primer cadáver exquisito digital de Cadavrix'
  },
  dimensions: {
    width: { 
      type: Number, 
      default: 10,
      min: 1,
      max: 20
    },
    height: { 
      type: Number, 
      default: 10,
      min: 1,
      max: 20
    },
    totalCells: { 
      type: Number, 
      default: 100 
    }
  },
  cells: [cellSchema],
  status: {
    type: String,
    enum: ['active', 'completed', 'archived'],
    default: 'active'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// ====================================
// MÉTODOS DE INSTANCIA
// ====================================

// Obtener celda por posición
gridSchema.methods.getCellByPosition = function(x, y) {
  return this.cells.find(cell => 
    cell.position.x === x && cell.position.y === y
  );
};

// Obtener celdas vacías
gridSchema.methods.getEmptyCells = function() {
  return this.cells.filter(cell => cell.status === 'empty');
};

// Obtener celdas ocupadas
gridSchema.methods.getOccupiedCells = function() {
  return this.cells.filter(cell => cell.status === 'occupied');
};

// Obtener vecinos de una celda (las 8 celdas alrededor)
gridSchema.methods.getNeighbors = function(x, y) {
  const neighbors = [];
  const directions = [
    [-1, -1], [0, -1], [1, -1],  // Top row
    [-1, 0],           [1, 0],   // Middle row
    [-1, 1],  [0, 1],  [1, 1]    // Bottom row
  ];

  for (const [dx, dy] of directions) {
    const nx = x + dx;
    const ny = y + dy;
    
    // Verificar que esté dentro de los límites
    if (nx >= 0 && nx < this.dimensions.width && 
        ny >= 0 && ny < this.dimensions.height) {
      const neighbor = this.getCellByPosition(nx, ny);
      if (neighbor) {
        neighbors.push({
          position: { x: nx, y: ny },
          cell: neighbor,
          direction: this.getDirection(dx, dy)
        });
      }
    }
  }

  return neighbors;
};

// Obtener dirección textual
gridSchema.methods.getDirection = function(dx, dy) {
  const directions = {
    '-1,-1': 'topLeft',
    '0,-1': 'top',
    '1,-1': 'topRight',
    '-1,0': 'left',
    '1,0': 'right',
    '-1,1': 'bottomLeft',
    '0,1': 'bottom',
    '1,1': 'bottomRight'
  };
  return directions[`${dx},${dy}`] || 'unknown';
};

// Asignar celda aleatoria a un artista
gridSchema.methods.assignRandomCell = async function(artistId) {
  const emptyCells = this.getEmptyCells();
  
  if (emptyCells.length === 0) {
    throw new Error('No hay celdas vacías disponibles');
  }

  // Seleccionar celda aleatoria
  const randomIndex = Math.floor(Math.random() * emptyCells.length);
  const selectedCell = emptyCells[randomIndex];

  // Actualizar celda
  const cellIndex = this.cells.findIndex(cell => 
    cell.position.x === selectedCell.position.x && 
    cell.position.y === selectedCell.position.y
  );

  this.cells[cellIndex].status = 'assigned';
  this.cells[cellIndex].assignedTo = artistId;
  this.cells[cellIndex].assignedAt = new Date();

  await this.save();

  return {
    position: selectedCell.position,
    cell: this.cells[cellIndex]
  };
};

// Marcar celda como ocupada (cuando se sube la obra)
gridSchema.methods.markCellAsOccupied = async function(x, y, artworkId) {
  const cellIndex = this.cells.findIndex(cell => 
    cell.position.x === x && cell.position.y === y
  );

  if (cellIndex === -1) {
    throw new Error('Celda no encontrada');
  }

  this.cells[cellIndex].status = 'occupied';
  this.cells[cellIndex].artworkId = artworkId;

  await this.save();

  return this.cells[cellIndex];
};

// Obtener estadísticas del grid
gridSchema.methods.getStatistics = function() {
  const totalCells = this.cells.length;
  const emptyCells = this.cells.filter(c => c.status === 'empty').length;
  const assignedCells = this.cells.filter(c => c.status === 'assigned').length;
  const occupiedCells = this.cells.filter(c => c.status === 'occupied').length;
  const completionPercentage = (occupiedCells / totalCells) * 100;

  return {
    totalCells,
    emptyCells,
    assignedCells,
    occupiedCells,
    completionPercentage: Math.round(completionPercentage * 100) / 100,
    status: this.status
  };
};

// ====================================
// MÉTODOS ESTÁTICOS
// ====================================

// Obtener el grid activo
gridSchema.statics.getActiveGrid = async function() {
  return await this.findOne({ status: 'active' });
};

// Inicializar un nuevo grid
gridSchema.statics.initializeGrid = async function(width = 10, height = 10) {
  const cells = [];
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      cells.push({
        position: { x, y },
        status: 'empty',
        artworkId: null,
        assignedTo: null,
        assignedAt: null
      });
    }
  }

  const grid = await this.create({
    boardId: `cadavrix-${Date.now()}`,
    dimensions: {
      width,
      height,
      totalCells: width * height
    },
    cells,
    status: 'active'
  });

  return grid;
};

// ====================================
// ÍNDICES
// ====================================
gridSchema.index({ boardId: 1 });
gridSchema.index({ status: 1 });
gridSchema.index({ 'cells.position.x': 1, 'cells.position.y': 1 });

module.exports = mongoose.model('Grid', gridSchema);
