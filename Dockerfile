# ======================================
# DOCKERFILE PARA CADAVRIX BACKEND
# ======================================
# Imagen base de Node.js
FROM node:18-alpine

# Establecer directorio de trabajo
WORKDIR /app

# Copiar package files primero para optimizar cache de Docker
COPY package*.json ./

# Instalar dependencias de producción
RUN npm ci --only=production && npm cache clean --force

# Crear usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs
RUN adduser -S cadavrix -u 1001

# Copiar el resto del código
COPY . .

# Crear directorios necesarios y asignar permisos
RUN mkdir -p uploads/img uploads/artworks templates && \
    chown -R cadavrix:nodejs uploads templates

# Cambiar a usuario no-root
USER cadavrix

# Exponer puerto
EXPOSE 5000

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:$PORT/health || exit 1

# Comando para iniciar la aplicación
CMD ["npm", "start"]
