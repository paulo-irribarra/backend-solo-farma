import "./loadEnv.js"; // 👈 Import obligatorio al inicio

import express from "express";
import cors from "cors";
import alertsRouter from "./routes/alerts.js";

const app = express();
app.use(express.json());
app.use(cors());

// rutas
app.use("/api/alerts", alertsRouter);


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend Solofarma ejecutándose en http://localhost:${PORT}`);
});
