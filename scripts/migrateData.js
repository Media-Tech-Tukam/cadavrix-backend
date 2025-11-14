require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Modelos - rutas correctas desde scripts/ hacia src/models/
const User = require('../src/models/User');
const Artist = require('../src/models/Artist');
const Artwork = require('../src/models/Artwork');
const Grid = require('../src/models/Grid');

const connectDB = require('../src/config/database');

/**
 * Script para migrar datos de cadavrix-data.json a MongoDB
 */

const migrateData = async () => {
  try {
    console.log('');
    console.log('╔════════════════════════════════════════╗');
    console.log('║   📦 MIGRAR DATOS A MONGODB           ║');
    console.log('╚════════════════════════════════════════╝');
    console.log('');

    // Conectar a MongoDB usando tu función existente
    console.log('📡 Conectando a MongoDB...');
    await connectDB();
    console.log('✅ Conectado a MongoDB');
    console.log('');

    // Leer archivo JSON
    console.log('📂 Leyendo cadavrix-data.json...');
    const jsonPath = path.join(__dirname, '../cadavrix-data.json');
    
    if (!fs.existsSync(jsonPath)) {
      throw new Error(`No se encontró el archivo: ${jsonPath}`);
    }

    const rawData = fs.readFileSync(jsonPath, 'utf8');
    const data = JSON.parse(rawData);
    console.log('✅ Datos cargados del JSON');
    console.log(`   📊 ${data.cadavrix.artists.length} artistas`);
    console.log(`   🎨 ${data.cadavrix.artworks.length} obras`);
    console.log('');

    // Preguntar si desea limpiar datos existentes
    if (!process.argv.includes('--force')) {
      console.log('⚠️  ADVERTENCIA: Este script eliminará todos los datos existentes de:');
      console.log('   - Usuarios');
      console.log('   - Artistas');
      console.log('   - Obras');
      console.log('');
      console.log('💡 Para continuar, ejecuta con --force:');
      console.log('   node migrateData.js --force');
      console.log('');
      console.log('❌ Operación cancelada');
      process.exit(0);
    }

    // Limpiar colecciones
    console.log('🗑️  Limpiando datos existentes...');
    await User.deleteMany({});
    await Artist.deleteMany({});
    await Artwork.deleteMany({});
    console.log('✅ Colecciones limpiadas');
    console.log('');

    // Migrar artistas
    console.log('👥 Migrando artistas...');
    const artistsMap = new Map(); // Mapeo de IDs antiguos a nuevos

    for (const artistData of data.cadavrix.artists) {
      // Crear email válido basado en el nombre del artista
      const emailName = artistData.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
        .replace(/\s+/g, '.'); // Reemplazar espacios con puntos
      
      const email = `${emailName}@cadavrix.art`;

      try {
        // Crear usuario para cada artista
        const user = await User.create({
          email: email,
          password: 'password123' // Contraseña temporal
        });

        // Crear perfil de artista
        const artist = await Artist.create({
          userId: user._id,
          name: artistData.name,
          bio: artistData.bio,
          socialMedia: artistData.socialMedia,
          registeredAt: artistData.registeredAt,
          artworksCount: artistData.artworksCount || 0
        });

        artistsMap.set(artistData.id, artist._id);
        console.log(`   ✅ ${artistData.name} (${email})`);

      } catch (error) {
        console.error(`   ❌ Error con ${artistData.name}: ${error.message}`);
        // Intentar con un email alternativo
        const alternativeEmail = `${artistData.id}@cadavrix.art`;
        
        const user = await User.create({
          email: alternativeEmail,
          password: 'password123'
        });

        const artist = await Artist.create({
          userId: user._id,
          name: artistData.name,
          bio: artistData.bio,
          socialMedia: artistData.socialMedia,
          registeredAt: artistData.registeredAt,
          artworksCount: artistData.artworksCount || 0
        });

        artistsMap.set(artistData.id, artist._id);
        console.log(`   ✅ ${artistData.name} (${alternativeEmail})`);
      }
    }

    console.log(`✅ ${artistsMap.size} artistas migrados`);
    console.log('');

    // Migrar obras
    console.log('🎨 Migrando obras...');
    let migratedArtworks = 0;

    for (const artworkData of data.cadavrix.artworks) {
      const artistMongoId = artistsMap.get(artworkData.artistId);
      
      if (!artistMongoId) {
        console.warn(`   ⚠️  Artista no encontrado para obra: ${artworkData.title}`);
        continue;
      }

      // Mapear status para compatibilidad con el modelo
      let status = artworkData.status || 'approved';
      if (status === 'completed') {
        status = 'approved'; // Convertir 'completed' a 'approved'
      }
      if (!['pending', 'approved', 'rejected'].includes(status)) {
        status = 'approved'; // Valor por defecto para cualquier otro caso
      }

      await Artwork.create({
        artistId: artistMongoId,
        title: artworkData.title,
        description: artworkData.description,
        image: artworkData.image,
        gridPosition: artworkData.gridPosition,
        status: status,
        createdAt: artworkData.createdAt,
        uploadedAt: artworkData.uploadedAt
      });

      migratedArtworks++;
      console.log(`   ✅ ${artworkData.title} (${artworkData.gridPosition.x}, ${artworkData.gridPosition.y}) - Status: ${status}`);
    }

    console.log(`✅ ${migratedArtworks} obras migradas`);
    console.log('');

    // Actualizar grid con las obras
    console.log('🔄 Actualizando grid...');
    const grid = await Grid.findOne({ status: 'active' });

    if (!grid) {
      throw new Error('No se encontró grid activo. Ejecuta initializeGrid.js primero.');
    }

    const artworks = await Artwork.find();
    
    for (const artwork of artworks) {
      const cellIndex = grid.cells.findIndex(cell => 
        cell.position.x === artwork.gridPosition.x && 
        cell.position.y === artwork.gridPosition.y
      );

      if (cellIndex !== -1) {
        grid.cells[cellIndex].status = 'occupied';
        grid.cells[cellIndex].artworkId = artwork._id;
        grid.cells[cellIndex].assignedTo = artwork.artistId;
        grid.cells[cellIndex].assignedAt = artwork.uploadedAt;
      }
    }

    await grid.save();
    console.log('✅ Grid actualizado');
    console.log('');

    // Mostrar estadísticas finales
    console.log('╔════════════════════════════════════════╗');
    console.log('║   ✅ MIGRACIÓN COMPLETADA             ║');
    console.log('╚════════════════════════════════════════╝');
    console.log('');
    console.log('📊 Resumen:');
    console.log(`   👥 Usuarios creados: ${await User.countDocuments()}`);
    console.log(`   🎨 Artistas migrados: ${await Artist.countDocuments()}`);
    console.log(`   🖼️  Obras migradas: ${await Artwork.countDocuments()}`);
    console.log('');

    const stats = grid.getStatistics();
    console.log('📈 Estado del Grid:');
    console.log(`   Total de celdas: ${stats.totalCells}`);
    console.log(`   Celdas vacías: ${stats.emptyCells}`);
    console.log(`   Celdas ocupadas: ${stats.occupiedCells}`);
    console.log(`   Progreso: ${stats.completionPercentage}%`);
    console.log('');

    console.log('✨ Próximos pasos:');
    console.log('   1. Probar la API: http://localhost:5000/api/artworks');
    console.log('   2. Probar el grid: http://localhost:5000/api/grid');
    console.log('   3. Ver artistas: http://localhost:5000/api/artists');
    console.log('');
    console.log('🔐 Credenciales de prueba:');
    console.log('   Email: maria.gonzalez@cadavrix.art');
    console.log('   Password: password123');
    console.log('');

    process.exit(0);

  } catch (error) {
    console.error('');
    console.error('╔════════════════════════════════════════╗');
    console.error('║   ❌ ERROR EN LA MIGRACIÓN            ║');
    console.error('╚════════════════════════════════════════╝');
    console.error('');
    console.error('Detalles del error:');
    console.error(error.message);
    console.error('');

    if (error.message.includes('cadavrix-data.json')) {
      console.error('💡 Solución:');
      console.error('   Verifica que el archivo esté en:');
      console.error('   /cadavrix-data.json (raíz del proyecto)');
      console.error('');
    }

    if (error.message.includes('grid activo')) {
      console.error('💡 Solución:');
      console.error('   Primero ejecuta: node initializeGrid.js');
      console.error('');
    }

    console.error('Stack trace:');
    console.error(error.stack);
    console.error('');

    process.exit(1);
  }
};

// Ejecutar
migrateData();