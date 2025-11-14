const mongoose = require('mongoose');

const artworkSchema = new mongoose.Schema({
  artistId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Artist',
    required: true
  },
  title: {
    type: String,
    required: [true, 'El título es requerido'],
    trim: true,
    minlength: [3, 'El título debe tener al menos 3 caracteres'],
    maxlength: [200, 'El título no puede exceder 200 caracteres']
  },
  description: {
    type: String,
    required: [true, 'La descripción es requerida'],
    trim: true,
    minlength: [10, 'La descripción debe tener al menos 10 caracteres'],
    maxlength: [1000, 'La descripción no puede exceder 1000 caracteres']
  },
  image: {
    type: String,
    required: [true, 'La imagen es requerida']
  },
  // Información de la imagen
  imageMetadata: {
    filename: String,
    mimetype: String,
    size: Number,
    width: Number,
    height: Number
  },
  gridPosition: {
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
  // Template que se usó para crear esta obra
  templateUsed: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved' // Por ahora auto-aprobar
  },
  // Likes (futuro)
  likes: {
    type: Number,
    default: 0,
    min: 0
  },
  // Vistas (futuro)
  views: {
    type: Number,
    default: 0,
    min: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// ====================================
// MIDDLEWARE
// ====================================

// Después de guardar, incrementar contador del artista
artworkSchema.post('save', async function(doc) {
  const Artist = mongoose.model('Artist');
  await Artist.incrementArtworkCount(doc.artistId);
});

// Antes de eliminar, decrementar contador del artista
artworkSchema.pre('remove', async function() {
  const Artist = mongoose.model('Artist');
  await Artist.decrementArtworkCount(this.artistId);
});

// ====================================
// MÉTODOS DE INSTANCIA
// ====================================

// Obtener datos públicos de la obra
artworkSchema.methods.toPublicJSON = function() {
  return {
    id: this._id,
    title: this.title,
    description: this.description,
    image: this.image,
    gridPosition: this.gridPosition,
    likes: this.likes,
    views: this.views,
    createdAt: this.createdAt,
    artistId: this.artistId
  };
};

// Incrementar vistas
artworkSchema.methods.incrementViews = async function() {
  this.views += 1;
  return await this.save();
};

// ====================================
// MÉTODOS ESTÁTICOS
// ====================================

// Obtener obras por posición en el grid
artworkSchema.statics.getByPosition = async function(x, y) {
  return await this.findOne({ 
    'gridPosition.x': x, 
    'gridPosition.y': y 
  }).populate('artistId', 'name bio socialMedia');
};

// Verificar si una posición está ocupada
artworkSchema.statics.isPositionOccupied = async function(x, y) {
  const artwork = await this.findOne({ 
    'gridPosition.x': x, 
    'gridPosition.y': y 
  });
  return artwork !== null;
};

// Obtener todas las obras de un artista
artworkSchema.statics.getByArtist = async function(artistId) {
  return await this.find({ artistId })
    .sort({ createdAt: -1 })
    .populate('artistId', 'name bio socialMedia');
};

// ====================================
// ÍNDICES
// ====================================

// Índice compuesto único para posición en el grid
artworkSchema.index({ 'gridPosition.x': 1, 'gridPosition.y': 1 }, { unique: true });

// Índices para búsquedas
artworkSchema.index({ artistId: 1 });
artworkSchema.index({ createdAt: -1 });
artworkSchema.index({ status: 1 });
artworkSchema.index({ likes: -1 });

module.exports = mongoose.model('Artwork', artworkSchema);
