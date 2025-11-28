// ---------------------------------------------------
// 1) Obtener alertas activas con toda la info necesaria
// ---------------------------------------------------
// src/services/alerts.js
import supabase from "./supabase.js";

// ---------------------------------------------------
// 1) Obtener alertas activas con toda la info necesaria
// ---------------------------------------------------
export async function getActiveAlerts() {
  // 1. Obtener alertas activas
  const { data: alertas, error: alertasError } = await supabase
    .from("alertas")
    .select("*")
    .eq("activo", true)
    .eq("enviada", false);

  if (alertasError) {
    throw new Error("Error obteniendo alertas: " + alertasError.message);
  }

  if (!alertas || alertas.length === 0) {
    return [];
  }

  // 2. Obtener IDs únicos
  const medicamentoIds = [...new Set(alertas.map((a) => a.id_medicamento))];
  const usuarioIds = [...new Set(alertas.map((a) => a.id_usuario))];

  // 3. Obtener medicamentos (tabla base)
  const { data: medicamentos, error: medicamentosError } = await supabase
    .from("medicamento")
    .select(
      "id_medicamento, nombre, laboratorio, presentacion, url_medicamento, imagen_url"
    )
    .in("id_medicamento", medicamentoIds);

  if (medicamentosError) {
    throw new Error(
      "Error obteniendo medicamentos: " + medicamentosError.message
    );
  }

  // ⭐ 3.1. Obtener datos extra desde vista_productos (farmacia, precio, url)
  const { data: productos, error: productosError } = await supabase
    .from("vista_productos")
    .select("id_medicamento, farmacia, precio, url")
    .in("id_medicamento", medicamentoIds);

  if (productosError) {
    throw new Error(
      "Error obteniendo productos: " + productosError.message
    );
  }

  // 4. Obtener usuarios
  const { data: usuarios, error: usuariosError } = await supabase
    .from("usuario")
    .select("id_usuario, nombre, correo")
    .in("id_usuario", usuarioIds);

  if (usuariosError) {
    throw new Error("Error obteniendo usuarios: " + usuariosError.message);
  }

  // 5. Combinar los datos
  const alertasCompletas = alertas.map((alerta) => {
    const medicamentoBase = medicamentos?.find(
      (m) => m.id_medicamento === alerta.id_medicamento
    );

    const producto = productos?.find(
      (p) => p.id_medicamento === alerta.id_medicamento
    );

    const usuario = usuarios?.find((u) => u.id_usuario === alerta.id_usuario);

    // 🔹 armamos un objeto medicamento más completo
    const medicamento =
      medicamentoBase || producto
        ? {
            ...medicamentoBase,
            // completamos farmacia y url desde vista_productos si existen
            farmacia: producto?.farmacia ?? medicamentoBase?.farmacia ?? null,
            precio: producto?.precio ?? null,
            url_medicamento:
              producto?.url ?? medicamentoBase?.url_medicamento ?? null,
          }
        : null;

    return {
      ...alerta,
      medicamento, // ahora con farmacia y precio cuando existan
      usuario: usuario || null,
    };
  });

  return alertasCompletas;
}


// ---------------------------------------------------
// 2) Obtener precio actual del medicamento
// ---------------------------------------------------
export async function getCurrentPrice(id_medicamento) {
  const { data, error } = await supabase
    .from("precio")
    .select("precio_actual, precio_normal, fecha_actualizacion")
    .eq("id_medicamento", id_medicamento)
    .order("fecha_actualizacion", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error("Error obteniendo el precio: " + error.message);
  }

  return data && data.length > 0 ? data[0] : null;
}

// ---------------------------------------------------
// 3) Marcar alerta como enviada
// ---------------------------------------------------
export async function markAlertAsSent(alertId) {
  const { error } = await supabase
    .from("alertas")
    .update({ enviada: true })
    .eq("id", alertId);

  if (error) {
    throw new Error("Error actualizando alerta: " + error.message);
  }

  return true;
}

// ---------------------------------------------------
// 4) Desactivar alerta
// ---------------------------------------------------
export async function desmarkAlert(alertId) {
  const { error } = await supabase
    .from("alertas")
    .update({ activo: false })
    .eq("id", alertId);

  if (error) {
    throw new Error("Error desactivando alerta: " + error.message);
  }

  return true;
}

