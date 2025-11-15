// src/index.js (Versión con orden corregido)

import express from 'express';
import alertsRouter from './routes/alerts.js';
import cors from 'cors';
// ... el resto del código

const app = express();
const PORT = process.env.PORT || 3001; 

// --------------------------------------------------
// 🚨 ORDEN CORREGIDO DE MIDDLEWARES 🚨
// --------------------------------------------------

// 1. CORS: Debe ir primero para permitir la conexión.
app.use(cors()); 

// 2. JSON: Debe ir antes de cualquier ruta que use req.body (como tu UPSERT).
app.use(express.json()); 

// Health check
app.get('/', (req, res) => {
  res.json({ 
    message: 'SoloFarma API running 🚀',
    environment: process.env.NODE_ENV || 'development'
  });
});

// 3. Routes: Las rutas se procesan al final.
app.use('/api/alerts', alertsRouter);

// --------------------------------------------------

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});