require('dotenv').config();
const mongoose = require('mongoose');

/**
 * Script simple para inicializar el grid
 */

const initGrid = async () => {
  try {
    // Conectar
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB conectado');

    // Crear schema directamente (por si hay problemas con el modelo)
    const gridSchema = new mongoose.Schema({
      boardId: String,
      title: String,
      description: String,
      dimensions: {
        width: Number,
        height: Number,
        totalCells: Number
      },
      cells: [{
        position: { x: Number, y: Number },
        status: String,
        artworkId: { type: mongoose.Schema.Types.ObjectId, default: null },
        assignedTo: { type: mongoose.Schema.Types.ObjectId, default: null },
        assignedAt: { type: Date, default: null }
      }],
      status: String,
      createdAt: { type: Date, default: Date.now }
    });

    const Grid = mongoose.models.Grid || mongoose.model('Grid', gridSchema);

    // Crear celdas
    const cells = [];
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        cells.push({
          position: { x, y },
          status: 'empty',
          artworkId: null,
          assignedTo: null,
          assignedAt: null
        });
      }
    }

    // Crear grid
    const grid = await Grid.create({
      boardId: `cadavrix-${Date.now()}`,
      title: 'Primera Obra Colectiva',
      description: 'El primer cadáver exquisito digital de Cadavrix',
      dimensions: {
        width: 10,
        height: 10,
        totalCells: 100
      },
      cells: cells,
      status: 'active'
    });

    console.log('');
    console.log('🎉 ¡Grid creado exitosamente!');
    console.log(`📋 ID: ${grid.boardId}`);
    console.log(`📐 Dimensiones: 10x10 (100 celdas)`);
    console.log(`✨ Estado: activo`);
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

initGrid();
