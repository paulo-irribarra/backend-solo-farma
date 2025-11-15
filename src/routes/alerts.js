import { Router } from "express";
import { desmarkAlert, getActiveAlerts, getCurrentPrice, markAlertAsSent } from "../services/alerts.js";
import { sendPriceAlertEmail } from "../services/mailer.js";
// 🚨 SOLUCIÓN: IMPORTAR LA VARIABLE SUPABASE
import { supabase } from '../services/supabase.js';

const router = Router();

// ------------------------------------------------------------------
// 🎯 Endpoint: Activar/Crear Alarma (Usando UPSERT)
// ------------------------------------------------------------------
router.post('/toggle', async (req, res) => {
    
    // 1. Obtener los datos necesarios
    const { 
        idUsuario, 
        idMedicamento,
        precioAlarma, 
        activo // Estado deseado: true (activar) o false (desactivar)
    } = req.body;

    // 2. Validación de la existencia de campos
    // Verificamos que los campos obligatorios NO sean 'undefined'.
    if (activo === true) {
    // Lógica 1: ACTIVAR (UPSERT)
    
    const { data, error } = await supabase
        .from('alertas') // 🚨 Nombre de la tabla según tu diagrama
        .upsert({
            // 🚨 CORRECCIÓN 1: Usar 'id_usuario' y 'valor_al_activar'
            id_usuario: idUsuario,        
            id_medicamento: idMedicamento, 
            valor_al_activar: precioAlarma, // Nombre de columna corregido
            activo: true 
        }, { 
            // 🚨 CORRECCIÓN 2: Usar 'id_usuario' en el onConflict
            onConflict: 'id_usuario, id_medicamento' 
        })
        .select()
        .limit(1);
        
      if (error) throw error;
    
      // 🚨 CORRECCIÓN DEL RESPONSE: Retorna data o null si está vacío (aunque no debería)
      return res.status(200).json({ 
        message: 'Alarma activada con éxito.', 
        data: data ? data[0] : null
      });
    
    // ... (manejo de error y response)
    
} else {
    // Lógica 2: DESACTIVAR (UPDATE)
    
    const { error } = await supabase
        .from('alertas') // 🚨 Nombre de la tabla según tu diagrama
        .update({ activo: false })
        .eq('id_usuario', idUsuario) // 🚨 CORRECCIÓN: usar 'id_usuario'
        .eq('id_medicamento', idMedicamento);

    // ... (manejo de error y response)
}

    try {
        let dbResponse; // Variable para almacenar la respuesta de Supabase
        
        if (activo === true) {
            // Lógica 1: ACTIVAR (Usamos UPSERT para crear si no existe o actualizar si ya existe)
            
            dbResponse = await supabase
                .from('alarma')
                .upsert({
                    id_usuario: idUsuario,        // Clave de conflicto
                    id_medicamento: idMedicamento, // Clave de conflicto
                    precio_monitoreo: precioAlarma, // Precio que se guarda
                    activo: true // Siempre true en este bloque
                }, { onConflict: 'usuario_id, id_medicamento' })
                .select(); 
            
            // La respuesta de éxito contiene el registro afectado
            return res.status(200).json({ 
                message: 'Alarma activada con éxito.', 
                data: dbResponse.data ? dbResponse.data[0] : null
            });

        } else {
            // Lógica 2: DESACTIVAR (Solo UPDATE, asumimos que el registro existe)
            
            dbResponse = await supabase
                .from('alarma')
                .update({ activo: false }) // Poner a false
                .eq('usuario_id', idUsuario)
                .eq('id_medicamento', idMedicamento)
                .select(); // Opcional: obtener el registro actualizado
                
            return res.status(200).json({ 
                message: 'Alarma desactivada con éxito.',
                data: dbResponse.data ? dbResponse.data[0] : null 
            });
        }

    } catch (error) {
        // Capturamos cualquier error de Supabase o conexión
        console.error('❌ Error crítico en toggle-activate:', error); 
        
        // Devolvemos el error completo a la consola para diagnóstico
        if (error.code) {
             console.error('Error de BD (Postgres):', error.message);
        }
        
        return res.status(500).json({ 
            error: 'Fallo al procesar la alarma.', 
            details: error.message || 'Error de conexión con la base de datos.'
        });
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