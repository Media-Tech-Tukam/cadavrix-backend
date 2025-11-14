const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Opciones de conexión
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    };

    // Conectar a MongoDB
    const conn = await mongoose.connect(process.env.MONGODB_URI, options);

    console.log('');
    console.log('╔════════════════════════════════════════╗');
    console.log('║   ✅ MONGODB CONECTADO EXITOSAMENTE   ║');
    console.log('╚════════════════════════════════════════╝');
    console.log(`📊 Host: ${conn.connection.host}`);
    console.log(`📁 Base de datos: ${conn.connection.name}`);
    console.log(`🔌 Puerto: ${conn.connection.port}`);
    console.log('');

    // Event listeners para la conexión
    mongoose.connection.on('error', (err) => {
      console.error('❌ Error de MongoDB:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB desconectado');
    });

    // Manejo graceful de cierre
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('👋 MongoDB desconectado debido a cierre de aplicación');
      process.exit(0);
    });

  } catch (error) {
    console.error('');
    console.error('╔════════════════════════════════════════╗');
    console.error('║   ❌ ERROR AL CONECTAR A MONGODB      ║');
    console.error('╚════════════════════════════════════════╝');
    console.error('');
    console.error('Detalles del error:');
    console.error(`Mensaje: ${error.message}`);
    console.error('');
    console.error('Posibles soluciones:');
    console.error('1. Verifica que MONGODB_URI en .env sea correcta');
    console.error('2. Asegúrate de tener acceso a internet');
    console.error('3. Verifica tu IP en MongoDB Atlas Network Access');
    console.error('4. Confirma que el usuario y contraseña sean correctos');
    console.error('');
    
    process.exit(1);
  }
};

module.exports = connectDB;
