require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path'); // Agregar path
const connectDB = require('./src/config/database');

// Inicializar Express
const app = express();

// Conectar a MongoDB
connectDB();

// ====================================
// MIDDLEWARE
// ====================================

// CORS - Permitir peticiones desde el frontend
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:8000',
    'http://localhost:8000',
    process.env.CLIENT_URL
  ].filter(Boolean),
  credentials: true
}));

// Servir archivos estáticos (imágenes)
app.use('/img', express.static(path.join(__dirname, 'uploads', 'img')));

// Body parser - Para poder leer JSON en las peticiones
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Servir archivos estáticos (templates y uploads)
app.use('/templates', express.static(path.join(__dirname, 'templates')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Logging simple (opcional, útil para desarrollo)
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// ====================================
// RUTAS
// ====================================

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ 
    message: '🎨 Cadavrix API v1.0',
    status: 'OK',
    timestamp: new Date().toISOString()
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    database: 'connected',
    timestamp: new Date().toISOString()
  });
});

// API Routes (se agregarán progresivamente)
app.use('/api/auth', require('./src/routes/auth.routes'));
app.use('/api/artists', require('./src/routes/artist.routes'));
app.use('/api/artworks', require('./src/routes/artwork.routes'));
app.use('/api/grid', require('./src/routes/grid.routes'));

// ====================================
// MANEJO DE ERRORES
// ====================================

// Ruta no encontrada
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada',
    path: req.path
  });
});

// Error handler global
app.use((err, req, res, next) => {
  console.error('⚠ Error:', err.stack);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ====================================
// INICIAR SERVIDOR
// ====================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log('╔══════════════════════════════════════╗');
  console.log('║                                      ║');
  console.log('║     🎨 CADAVRIX API INICIADO 🎨       ║');
  console.log('║                                      ║');
  console.log('╚══════════════════════════════════════╝');
  console.log('');
  console.log(`🚀 Servidor corriendo en puerto: ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`📝 Modo: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Frontend: ${process.env.CLIENT_URL || 'http://localhost:3000'}`);
  console.log('');
  console.log('📋 Endpoints disponibles:');
  console.log('   GET  /                    - Información de la API');
  console.log('   GET  /health              - Estado del servidor');
  console.log('   POST /api/auth/register   - Registrar usuario');
  console.log('   POST /api/auth/login      - Iniciar sesión');
  console.log('   GET  /api/artists         - Obtener artistas');
  console.log('   GET  /api/artworks        - Obtener obras');
  console.log('   GET  /api/grid            - Obtener estado del grid');
  console.log('');
  console.log('✨ Listo para recibir peticiones!');
  console.log('');
  console.log('🌍 CORS configurado para:');
  console.log('   - http://localhost:3000');
  console.log('   - http://127.0.0.1:8000');
  console.log('   - http://localhost:8000');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});

// Manejo de cierre graceful
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM recibido. Cerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('👋 SIGINT recibido. Cerrando servidor...');
  process.exit(0);
});
