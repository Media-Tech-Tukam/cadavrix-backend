require('dotenv').config();
const mongoose = require('mongoose');

// Importar modelos con rutas correctas desde scripts/ hacia src/models/
const User = require('../src/models/User');
const Artist = require('../src/models/Artist');
const Artwork = require('../src/models/Artwork');
const Grid = require('../src/models/Grid');

/**
 * Script para limpiar obras huérfanas (sin artista)
 */

const cleanOrphanArtworks = async () => {
  try {
    console.log('');
    console.log('╔════════════════════════════════════════╗');
    console.log('║   🧹 LIMPIAR OBRAS HUÉRFANAS          ║');
    console.log('╚════════════════════════════════════════╝');
    console.log('');

    // Conectar a MongoDB
    console.log('📡 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');
    console.log('');

    // Obtener todas las obras
    console.log('🔍 Buscando obras huérfanas...');
    const allArtworks = await Artwork.find();
    console.log(`📊 Total de obras: ${allArtworks.length}`);

    // Verificar cuáles obras tienen artistas válidos
    const orphanArtworks = [];
    const validArtworks = [];

    for (const artwork of allArtworks) {
      const artist = await Artist.findById(artwork.artistId);
      if (!artist) {
        orphanArtworks.push(artwork);
        console.log(`❌ Obra huérfana: "${artwork.title}" (artista ${artwork.artistId} no existe)`);
      } else {
        validArtworks.push(artwork);
      }
    }

    console.log('');
    console.log('📊 Resumen:');
    console.log(`   ✅ Obras válidas: ${validArtworks.length}`);
    console.log(`   ❌ Obras huérfanas: ${orphanArtworks.length}`);
    console.log('');

    if (orphanArtworks.length === 0) {
      console.log('🎉 ¡No hay obras huérfanas que limpiar!');
      console.log('✨ Todos los datos están consistentes.');
      process.exit(0);
    }

    // Confirmar antes de eliminar
    if (!process.argv.includes('--force')) {
      console.log('⚠️  ADVERTENCIA: Se eliminarán las siguientes obras huérfanas:');
      orphanArtworks.forEach(artwork => {
        console.log(`   - "${artwork.title}" (${artwork.gridPosition.x}, ${artwork.gridPosition.y})`);
      });
      console.log('');
      console.log('💡 Para continuar, ejecuta con --force:');
      console.log('   node cleanOrphanArtworks.js --force');
      console.log('');
      console.log('❌ Operación cancelada');
      process.exit(0);
    }

    // Eliminar obras huérfanas
    console.log('🗑️  Eliminando obras huérfanas...');
    const deletedIds = orphanArtworks.map(artwork => artwork._id);
    
    const deleteResult = await Artwork.deleteMany({
      _id: { $in: deletedIds }
    });
    
    console.log(`✅ ${deleteResult.deletedCount} obras eliminadas`);
    console.log('');

    // Actualizar grid - limpiar referencias de obras eliminadas
    console.log('🔄 Actualizando grid...');
    const grid = await Grid.findOne({ status: 'active' });
    
    if (grid) {
      let cellsUpdated = 0;
      
      for (let i = 0; i < grid.cells.length; i++) {
        const cell = grid.cells[i];
        
        // Si la celda tiene una obra que fue eliminada
        if (cell.artworkId && deletedIds.some(id => id.toString() === cell.artworkId.toString())) {
          grid.cells[i].status = 'empty';
          grid.cells[i].artworkId = null;
          grid.cells[i].assignedTo = null;
          grid.cells[i].assignedAt = null;
          cellsUpdated++;
        }
      }
      
      await grid.save();
      console.log(`✅ ${cellsUpdated} celdas del grid limpiadas`);
    }
    
    console.log('');

    // Mostrar estadísticas finales
    console.log('╔════════════════════════════════════════╗');
    console.log('║   ✅ LIMPIEZA COMPLETADA              ║');
    console.log('╚════════════════════════════════════════╝');
    console.log('');
    
    const finalCount = await Artwork.countDocuments();
    console.log('📊 Estadísticas finales:');
    console.log(`   👥 Artistas: ${await Artist.countDocuments()}`);
    console.log(`   🎨 Obras válidas: ${finalCount}`);
    console.log('');

    if (grid) {
      const stats = grid.getStatistics();
      console.log('📈 Estado del Grid:');
      console.log(`   Total de celdas: ${stats.totalCells}`);
      console.log(`   Celdas vacías: ${stats.emptyCells}`);
      console.log(`   Celdas ocupadas: ${stats.occupiedCells}`);
      console.log(`   Progreso: ${stats.completionPercentage}%`);
      console.log('');
    }

    console.log('✨ ¡Datos limpios y consistentes!');
    console.log('');
    
    process.exit(0);

  } catch (error) {
    console.error('');
    console.error('╔════════════════════════════════════════╗');
    console.error('║   ❌ ERROR EN LA LIMPIEZA             ║');
    console.error('╚════════════════════════════════════════╝');
    console.error('');
    console.error('Detalles del error:');
    console.error(error.message);
    console.error('');
    console.error('Stack trace:');
    console.error(error.stack);
    
    process.exit(1);
  }
};

// Ejecutar
cleanOrphanArtworks();