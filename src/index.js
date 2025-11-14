// src/index.js
import express from 'express';
import alertsRouter from './routes/alerts.js';

// Solo cargar dotenv en desarrollo
if (process.env.NODE_ENV !== 'production') {
  const dotenv = await import('dotenv');
  dotenv.config();
}

const app = express();
const PORT = process.env.PORT || 3001;

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