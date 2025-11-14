const User = require('../models/User');
const Artist = require('../models/Artist');
const { sendTokenResponse } = require('../middleware/auth.middleware');

/**
 * @desc    Registrar nuevo usuario y crear perfil de artista
 * @route   POST /api/auth/register
 * @access  Public
 */
exports.register = async (req, res) => {
  try {
    const { email, password, name, bio, socialMedia } = req.body;

    // 1. Verificar si el email ya existe
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'El email ya está registrado'
      });
    }

    // 2. Crear usuario
    const user = await User.create({
      email,
      password // Se encripta automáticamente en el modelo
    });

    // 3. Crear perfil de artista
    const artist = await Artist.create({
      userId: user._id,
      name,
      bio,
      socialMedia: socialMedia || {}
    });

    console.log(`✅ Nuevo usuario registrado: ${email}`);
    console.log(`🎨 Nuevo artista creado: ${name}`);

    // 4. Generar token y enviar respuesta CON datos del artista
    const token = require('jsonwebtoken').sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    const response = {
      success: true,
      token,
      user: user.toPublicJSON(),
      artist: {
        _id: artist._id,
        name: artist.name,
        bio: artist.bio,
        socialMedia: artist.socialMedia,
        artworksCount: artist.artworksCount,
        registeredAt: artist.registeredAt
      }
    };

    res.status(201).json(response);

  } catch (error) {
    console.error('❌ Error en registro:', error);
    
    // Manejar errores de validación de Mongoose
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Error de validación',
        errors: messages
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error al registrar usuario'
    });
  }
};

/**
 * @desc    Iniciar sesión
 * @route   POST /api/auth/login
 * @access  Public
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Validar que se proporcionen email y password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Por favor proporciona email y contraseña'
      });
    }

    // 2. Buscar usuario (incluir password que normalmente está oculto)
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // 3. Verificar contraseña
    const isPasswordMatch = await user.matchPassword(password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // 4. Verificar que el usuario esté activo
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Cuenta desactivada. Contacta al administrador.'
      });
    }

    // 5. Buscar perfil de artista asociado
    const artist = await Artist.findOne({ userId: user._id });

    // 6. Actualizar último login
    user.lastLogin = Date.now();
    await user.save();

    console.log(`✅ Login exitoso: ${email}`);
    if (artist) {
      console.log(`🎨 Artista asociado: ${artist.name}`);
    }

    // 7. Generar token y enviar respuesta CON datos del artista
    const token = require('jsonwebtoken').sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    const response = {
      success: true,
      token,
      user: user.toPublicJSON()
    };

    // Agregar datos del artista si existe
    if (artist) {
      response.artist = {
        _id: artist._id,
        name: artist.name,
        bio: artist.bio,
        socialMedia: artist.socialMedia,
        artworksCount: artist.artworksCount,
        registeredAt: artist.registeredAt
      };
    }

    res.status(200).json(response);

  } catch (error) {
    console.error('❌ Error en login:', error);
    res.status(500).json({
      success: false,
      message: 'Error al iniciar sesión'
    });
  }
};

/**
 * @desc    Obtener usuario actual
 * @route   GET /api/auth/me
 * @access  Private
 */
exports.getMe = async (req, res) => {
  try {
    // req.user viene del middleware de autenticación
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Obtener también el perfil de artista
    const artist = await Artist.findOne({ userId: user._id });

    res.status(200).json({
      success: true,
      data: {
        user: user.toPublicJSON(),
        artist: artist ? artist.toPublicJSON() : null
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener información del usuario'
    });
  }
};

/**
 * @desc    Cerrar sesión (opcional)
 * @route   POST /api/auth/logout
 * @access  Private
 */
exports.logout = async (req, res) => {
  try {
    // En una implementación con JWT, el logout se maneja en el frontend
    // eliminando el token del localStorage/sessionStorage
    // Aquí podrías implementar un sistema de blacklist de tokens si lo deseas

    res.status(200).json({
      success: true,
      message: 'Sesión cerrada exitosamente'
    });

  } catch (error) {
    console.error('❌ Error en logout:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cerrar sesión'
    });
  }
};

/**
 * @desc    Actualizar contraseña
 * @route   PUT /api/auth/password
 * @access  Private
 */
exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validar que se proporcionen ambas contraseñas
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Por favor proporciona la contraseña actual y la nueva'
      });
    }

    // Obtener usuario con contraseña
    const user = await User.findById(req.user.id).select('+password');

    // Verificar contraseña actual
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Contraseña actual incorrecta'
      });
    }

    // Actualizar contraseña
    user.password = newPassword;
    await user.save();

    console.log(`✅ Contraseña actualizada: ${user.email}`);

    sendTokenResponse(user, 200, res);

  } catch (error) {
    console.error('❌ Error actualizando contraseña:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar contraseña'
    });
  }
};