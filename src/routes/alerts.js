import { Router } from "express";
import { desmarkAlert, getActiveAlerts, getCurrentPrice, markAlertAsSent } from "../services/alerts.js";
import { sendPriceAlertEmail } from "../services/mailer.js";
// 🚨 SOLUCIÓN: IMPORTAR LA VARIABLE SUPABASE
import { supabase } from '../services/supabase.js';

const router = Router();

// ------------------------------------------------------------------
// 🎯 Endpoint: Activar/Crear Alarma (Usando UPSERT)
// ------------------------------------------------------------------
router.post('/upsert-activate', async (req, res) => {

    console.log('Cliente de Supabase importado:', !!supabase); 
    console.log('Intentando UPSERT con datos:', req.body);

    // 1. Obtener los datos necesarios desde React
    const { 
        idUsuario, 
        idMedicamento,
        precioAlarma 
    } = req.body;

    // 2. Validación básica
    if (!idUsuario || !idMedicamento || !precioAlarma) {
        return res.status(400).json({ error: 'Faltan parámetros (usuario, medicamento o precio) para crear/activar la alarma.' });
    }

    try {
        
        const { data, error } = await supabase
            .from('alertas')
            .upsert({
                // 🚨 CORRECCIÓN AQUÍ: Usamos 'usuario_id' para ser coherentes con 'onConflict'
                id_usuario: idUsuario,
                id_medicamento: idMedicamento,
                valor_al_activar: precioAlarma,
                activo: true 
            }, {
                // La clave de conflicto:
                onConflict: 'id_usuario, id_medicamento', 
                ignoreDuplicates: false
            })
            .select();

        if (error) {
            // 🚨 Ahora deberías ver el error completo en tu consola si hay otro problema.
            console.error('Error en UPSERT de Supabase:', JSON.stringify(error, null, 2)); 
            
            return res.status(500).json({ error: 'Fallo al procesar la alarma en la base de datos.', details: error.message });
        }

        // 4. Éxito:
        return res.status(200).json({ 
            message: 'Alarma creada/activada con éxito.',
            data: data[0]
        });

    } catch (error) {
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

router.post("/run", async (req, res) => {
  try {
    const alertas = await getActiveAlerts();
    
    if (!alertas || alertas.length === 0) {
      return res.json({
        message: "No hay alertas activas para procesar",
        resultados: []
      });
    }

    const resultados = [];

    for (const alerta of alertas) {
      try {
        // Validar que tengamos los datos necesarios
        if (!alerta.medicamento || !alerta.usuario) {
          resultados.push({
            alertaId: alerta.id,
            estado: "❌ Datos incompletos en la alerta",
          });
          continue;
        }

        const current = await getCurrentPrice(alerta.id_medicamento);
        
        if (!current || !current.precio_actual) {
          resultados.push({
            alertaId: alerta.id,
            medicamento: alerta.medicamento.nombre,
            estado: "⚠️ No se encontró precio actual",
          });
          continue;
        }

        const precioActual = Number(current.precio_actual);
        const precioAnterior = Number(alerta.valor_al_activar);

        // Validar que los precios sean números válidos
        if (isNaN(precioActual) || isNaN(precioAnterior)) {
          resultados.push({
            alertaId: alerta.id,
            medicamento: alerta.medicamento.nombre,
            estado: "❌ Precios inválidos",
          });
          continue;
        }

        // Si el precio bajó, enviar email
        if (precioActual < precioAnterior) {
          const descuento = precioAnterior - precioActual;
          const porcentajeDescuento = ((descuento / precioAnterior) * 100).toFixed(1);

          // Preparar datos para el email
          const emailData = {
            to: alerta.usuario.correo,
            userName: alerta.usuario.nombre,
            medicamento: {
              nombre: alerta.medicamento.nombre,
              laboratorio: alerta.medicamento.laboratorio,
              presentacion: alerta.medicamento.presentacion,
              farmacia: alerta.medicamento.farmacia,
              urlMedicamento: alerta.medicamento.url_medicamento,
              imagenUrl: alerta.medicamento.imagen_url,
            },
            precios: {
              anterior: precioAnterior,
              actual: precioActual,
              descuento: descuento,
              porcentaje: porcentajeDescuento,
            },
          };

          const emailEnviado = await sendPriceAlertEmail(emailData);

          if (emailEnviado) {
            await markAlertAsSent(alerta.id);
            await desmarkAlert(alerta.id);
            
            resultados.push({
              alertaId: alerta.id,
              medicamento: alerta.medicamento.nombre,
              farmacia: alerta.medicamento.farmacia,
              precioAnterior,
              precioActual,
              descuento,
              porcentajeDescuento: `${porcentajeDescuento}%`,
              correoEnviado: alerta.usuario.correo,
              estado: "✅ Correo enviado correctamente",
            });
          } else {
            resultados.push({
              alertaId: alerta.id,
              medicamento: alerta.medicamento.nombre,
              estado: "❌ Error al enviar correo",
            });
          }
        } else {
          resultados.push({
            alertaId: alerta.id,
            medicamento: alerta.medicamento.nombre,
            farmacia: alerta.medicamento.farmacia,
            precioAnterior,
            precioActual,
            diferencia: precioActual - precioAnterior,
            estado: "📊 Precio sin cambios o más alto",
          });
        }
      } catch (error) {
        // Error en una alerta específica, pero continuamos con las demás
        resultados.push({
          alertaId: alerta.id,
          estado: `❌ Error procesando alerta: ${error.message}`,
        });
      }
    }

    return res.json({
      message: "Job completado",
      totalAlertas: alertas.length,
      procesadas: resultados.length,
      enviadas: resultados.filter(r => r.estado.includes("✅")).length,
      resultados,
    });

  } catch (error) {
    console.error("Error ejecutando job:", error);
    return res.status(500).json({
      message: "Error ejecutando job",
      error: error.message,
    });
  }
});

export default router;