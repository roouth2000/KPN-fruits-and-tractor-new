const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const swaggerUi = require('swagger-ui-express');
const config = require('./config/env');
const swaggerSpec = require('./config/swagger');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const requestLogger = require('./middleware/requestLogger');

const app = express();

// Middlewares
app.use(cors({
  origin: '*', // Allow frontend development ports & same-origin
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Swagger Documentation Route (Controlled via config.enableSwagger & NODE_ENV)
if (config.enableSwagger) {
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customSiteTitle: 'Finovore Produce Mandi API Documentation',
      customCss: `
        .swagger-ui .topbar { background-color: #0f172a; border-bottom: 2px solid #10b981; }
        .swagger-ui .topbar-wrapper .link { color: #fff; font-weight: bold; }
        .swagger-ui .info .title { color: #0f172a; font-family: Inter, sans-serif; }
      `,
    })
  );
} else {
  // In production or when ENABLE_SWAGGER=false, block access with 404 Not Found
  app.use(['/api-docs', '/api-docs/*'], (req, res) => {
    return res.status(404).json({
      success: false,
      message: 'API documentation is disabled in this environment',
      timestamp: new Date().toISOString(),
    });
  });
}

// Mount API routes under /api
app.use('/api', routes);

// Serve static frontend assets built from React Vite
const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath));

// SPA Fallback: Any non-API GET request serves the React frontend index.html
app.get('*', (req, res, next) => {
  // Let /api requests pass to next for standard 404 handling if not matched
  if (req.path.startsWith('/api')) {
    return next();
  }

  const indexPath = path.join(publicPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }

  // Fallback info if frontend build has not yet been executed
  return res.status(200).send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>Finovore Produce Mandi ERP</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #1e293b; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .card { background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 36px; max-width: 520px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); text-align: center; }
          h1 { font-size: 20px; color: #0f172a; margin-bottom: 12px; }
          p { font-size: 14px; color: #64748b; line-height: 1.6; }
          code { background: #f1f5f9; padding: 2px 6px; border-radius: 6px; font-size: 13px; color: #0f172a; }
          .btn { display: inline-block; margin-top: 20px; padding: 10px 20px; background: #0f172a; color: white; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Finovore Billing &amp; ERP Engine Active</h1>
          <p>The backend is running on <strong>http://localhost:5000</strong>.</p>
          <p>To view the React UI, run <code>cd front && npm run build</code> to compile the frontend assets into <code>backend/public</code>.</p>
          <a class="btn" href="/api-docs/">Open Swagger API Docs</a>
        </div>
      </body>
    </html>
  `);
});

// Global Error Handler
app.use(errorHandler);

module.exports = app;
