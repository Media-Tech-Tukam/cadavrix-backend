const mongoose = require('mongoose');

const artistSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: [true, 'El nombre es requerido'],
    trim: true,
    minlength: [2, 'El nombre debe tener al menos 2 caracteres'],
    maxlength: [100, 'El nombre no puede exceder 100 caracteres']
  },
  bio: {
    type: String,
    required: [true, 'La biografía es requerida'],
    trim: true,
    minlength: [20, 'La biografía debe tener al menos 20 caracteres'],
    maxlength: [500, 'La biografía no puede exceder 500 caracteres']
  },
  socialMedia: {
    facebook: {
      type: String,
      default: '',
      trim: true
    },
    instagram: {
      type: String,
      default: '',
      trim: true
    },
    website: {
      type: String,
      default: '',
      trim: true
    }
  },
  registeredAt: {
    type: Date,
    default: Date.now
  },
  artworksCount: {
    type: Number,
    default: 0,
    min: 0
  },
  // Celda asignada en el grid (null si aún no tiene)
  assignedCell: {
    type: {
      x: Number,
      y: Number
    },
    default: null
  },
  // Si ya subió su obra a la celda asignada
  hasSubmittedArtwork: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// ====================================
// MÉTODOS DE INSTANCIA
// ====================================

// Obtener iniciales del nombre
artistSchema.methods.getInitials = function() {
  return this.name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
};

// Obtener datos públicos del artista
artistSchema.methods.toPublicJSON = function() {
  return {
    id: this._id,
    name: this.name,
    bio: this.bio,
    socialMedia: this.socialMedia,
    registeredAt: this.registeredAt,
    artworksCount: this.artworksCount,
    assignedCell: this.assignedCell,
    hasSubmittedArtwork: this.hasSubmittedArtwork
  };
};

// ====================================
// MÉTODOS ESTÁTICOS
// ====================================

// Incrementar contador de obras
artistSchema.statics.incrementArtworkCount = async function(artistId) {
  return await this.findByIdAndUpdate(
    artistId,
    { $inc: { artworksCount: 1 } },
    { new: true }
  );
};

// Decrementar contador de obras
artistSchema.statics.decrementArtworkCount = async function(artistId) {
  return await this.findByIdAndUpdate(
    artistId,
    { $inc: { artworksCount: -1 } },
    { new: true }
  );
};

// ====================================
// ÍNDICES
// ====================================
artistSchema.index({ name: 1 });
artistSchema.index({ userId: 1 });
artistSchema.index({ registeredAt: -1 });
artistSchema.index({ 'assignedCell.x': 1, 'assignedCell.y': 1 });

module.exports = mongoose.model('Artist', artistSchema);
