// src/index.js (Versión limpia)

// 🚨 Ya no necesitamos el bloque if/require aquí.
// El comando de arranque se encarga de esto.

import express from 'express';
import alertsRouter from './routes/alerts.js';
// ... el resto del código

const app = express();
const PORT = process.env.PORT || 3001; // Las variables ya están disponibles aquí

// ... (El resto de tu código es funcional)

// Middlewares
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ 
    message: 'SoloFarma API running 🚀',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Routes
app.use('/api/alerts', alertsRouter);

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});