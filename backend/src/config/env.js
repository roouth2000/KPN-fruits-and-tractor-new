require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';
const enableSwagger = process.env.ENABLE_SWAGGER !== undefined
  ? process.env.ENABLE_SWAGGER === 'true'
  : !isProduction;

module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction,
  enableSwagger,
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    name: process.env.DB_NAME || 'finovore',
    user: process.env.DB_USER || 'root',
    pass: process.env.DB_PASS || 'Roovi@29',
    logging: process.env.DB_LOGGING === 'true' ? console.log : false,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'finovore_super_secret_jwt_key_2026_wholesale',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  },
};
