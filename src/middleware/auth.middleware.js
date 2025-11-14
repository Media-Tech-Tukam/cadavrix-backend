const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware para proteger rutas
 * Verifica que el usuario esté autenticado mediante JWT
 */
exports.protect = async (req, res, next) => {
  try {
    let token;

    // 1. Obtener token del header Authorization
    if (req.headers.authorization && 
        req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // 2. Verificar que el token existe
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No autorizado. Por favor inicia sesión.'
      });
    }

    try {
      // 3. Verificar y decodificar el token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 4. Buscar usuario por ID del token
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      // 5. Verificar que el usuario esté activo
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Cuenta desactivada'
        });
      }

      // 6. Agregar usuario al request
      req.user = user;
      next();

    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido o expirado'
      });
    }

  } catch (error) {
    console.error('Error en middleware de autenticación:', error);
    res.status(500).json({
      success: false,
      message: 'Error en autenticación'
    });
  }
};

/**
 * Middleware para verificar si el usuario es administrador
 */
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `El rol ${req.user.role} no está autorizado para acceder a esta ruta`
      });
    }
    next();
  };
};

/**
 * Generar JWT token
 */
exports.generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

/**
 * Enviar respuesta con token
 */
exports.sendTokenResponse = (user, statusCode, res) => {
  // Generar token
  const token = exports.generateToken(user._id);

  res.status(statusCode).json({
    success: true,
    token,
    user: user.toPublicJSON()
  });
};
