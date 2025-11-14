require('dotenv').config();
const mongoose = require('mongoose');
const Grid = require('../src/models/Grid');

/**
 * Script para inicializar el grid de Cadavrix
 * Crea un grid de 10x10 con todas las celdas vacías
 */

const initializeGrid = async () => {
  try {
    console.log('');
    console.log('╔════════════════════════════════════════╗');
    console.log('║   🎨 INICIALIZAR GRID DE CADAVRIX     ║');
    console.log('╚════════════════════════════════════════╝');
    console.log('');

    // Conectar a MongoDB
    console.log('📡 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');
    console.log('');

    // Verificar si ya existe un grid activo
    const existingGrid = await Grid.findOne({ status: 'active' });
    
    if (existingGrid) {
      console.log('⚠️  Ya existe un grid activo:');
      console.log(`   ID: ${existingGrid.boardId}`);
      console.log(`   Título: ${existingGrid.title}`);
      console.log(`   Dimensiones: ${existingGrid.dimensions.width}x${existingGrid.dimensions.height}`);
      console.log(`   Celdas totales: ${existingGrid.dimensions.totalCells}`);
      console.log('');
      
      const stats = existingGrid.getStatistics();
      console.log('📊 Estadísticas actuales:');
      console.log(`   Celdas vacías: ${stats.emptyCells}`);
      console.log(`   Celdas asignadas: ${stats.assignedCells}`);
      console.log(`   Celdas ocupadas: ${stats.occupiedCells}`);
      console.log(`   Progreso: ${stats.completionPercentage}%`);
      console.log('');
      
      // Preguntar si desea archivar el grid existente
      console.log('💡 Para crear un nuevo grid, el grid actual será archivado.');
      console.log('   Si deseas continuar, ejecuta el script con --force');
      console.log('   Ejemplo: node scripts/initializeGrid.js --force');
      console.log('');
      
      // Verificar si se pasó el flag --force
      if (process.argv.includes('--force')) {
        console.log('🗄️  Archivando grid actual...');
        existingGrid.status = 'archived';
        await existingGrid.save();
        console.log('✅ Grid archivado');
        console.log('');
      } else {
        console.log('❌ Operación cancelada');
        process.exit(0);
      }
    }

    // Crear nuevo grid
    console.log('🎨 Creando nuevo grid de 10x10...');
    
    const grid = await Grid.initializeGrid(10, 10);
    
    console.log('✅ Grid creado exitosamente!');
    console.log('');
    console.log('📋 Detalles del grid:');
    console.log(`   ID: ${grid.boardId}`);
    console.log(`   Título: ${grid.title}`);
    console.log(`   Descripción: ${grid.description}`);
    console.log(`   Dimensiones: ${grid.dimensions.width}x${grid.dimensions.height}`);
    console.log(`   Celdas totales: ${grid.dimensions.totalCells}`);
    console.log(`   Estado: ${grid.status}`);
    console.log('');
    
    const stats = grid.getStatistics();
    console.log('📊 Estadísticas:');
    console.log(`   ✅ Celdas vacías: ${stats.emptyCells}`);
    console.log(`   ⏳ Celdas asignadas: ${stats.assignedCells}`);
    console.log(`   🎨 Celdas ocupadas: ${stats.occupiedCells}`);
    console.log(`   📈 Progreso: ${stats.completionPercentage}%`);
    console.log('');
    
    console.log('🎉 ¡Grid inicializado correctamente!');
    console.log('');
    console.log('✨ Próximos pasos:');
    console.log('   1. Ejecutar: node scripts/migrateData.js');
    console.log('   2. Para migrar artistas y obras del JSON');
    console.log('');
    
    process.exit(0);

  } catch (error) {
    console.error('');
    console.error('╔════════════════════════════════════════╗');
    console.error('║   ❌ ERROR AL INICIALIZAR GRID        ║');
    console.error('╚════════════════════════════════════════╝');
    console.error('');
    console.error('Detalles del error:');
    console.error(error);
    console.error('');
    
    if (error.message.includes('MONGODB_URI')) {
      console.error('💡 Solución:');
      console.error('   Verifica que el archivo .env tenga MONGODB_URI configurada');
      console.error('');
    }
    
    process.exit(1);
  }
};

// Ejecutar
initializeGrid();
