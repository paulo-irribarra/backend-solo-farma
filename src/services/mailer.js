import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendPriceAlertEmail(emailData) {
  try {
    const {
      to,
      userName,
      medicamento,
      precios,
    } = emailData;

    await resend.emails.send({
      from: "SoloFarma <onboarding@resend.dev>",
      to: "pau.irribarra@duocuc.cl",
      subject: `📉 ¡${medicamento.nombre} bajó de precio!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🎉 ¡Buenas Noticias!</h1>
                      <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px;">El precio bajó</p>
                    </td>
                  </tr>
                  
                  <!-- Saludo -->
                  <tr>
                    <td style="padding: 30px 40px 20px 40px;">
                      <p style="margin: 0; font-size: 16px; color: #333333;">Hola <strong>${userName}</strong>,</p>
                      <p style="margin: 15px 0 0 0; font-size: 16px; color: #666666; line-height: 1.5;">
                        El medicamento que estás siguiendo ha bajado de precio. ¡Es el momento perfecto para comprarlo!
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Medicamento Info -->
                  <tr>
                    <td style="padding: 0 40px 20px 40px;">
                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 8px; padding: 20px;">
                        <tr>
                          <td>
                            <h2 style="margin: 0 0 10px 0; font-size: 20px; color: #333333;">${medicamento.nombre}</h2>
                            <p style="margin: 5px 0; font-size: 14px; color: #666666;">
                              <strong>Laboratorio:</strong> ${medicamento.laboratorio || 'No especificado'}
                            </p>
                            <p style="margin: 5px 0; font-size: 14px; color: #666666;">
                              <strong>Presentación:</strong> ${medicamento.presentacion || 'No especificado'}
                            </p>
                            <p style="margin: 5px 0; font-size: 14px; color: #666666;">
                              <strong>Farmacia:</strong> ${medicamento.farmacia}
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Comparación de Precios -->
                  <tr>
                    <td style="padding: 0 40px 30px 40px;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td width="50%" style="padding-right: 10px;">
                            <div style="background-color: #fee; border-radius: 8px; padding: 20px; text-align: center;">
                              <p style="margin: 0; font-size: 12px; color: #999; text-transform: uppercase; letter-spacing: 1px;">Precio Anterior</p>
                              <p style="margin: 10px 0 0 0; font-size: 28px; color: #e53e3e; font-weight: bold; text-decoration: line-through;">
                                $${precios.anterior.toLocaleString('es-CL')}
                              </p>
                            </div>
                          </td>
                          <td width="50%" style="padding-left: 10px;">
                            <div style="background-color: #d4edda; border-radius: 8px; padding: 20px; text-align: center;">
                              <p style="margin: 0; font-size: 12px; color: #155724; text-transform: uppercase; letter-spacing: 1px;">Precio Actual</p>
                              <p style="margin: 10px 0 0 0; font-size: 28px; color: #28a745; font-weight: bold;">
                                $${precios.actual.toLocaleString('es-CL')}
                              </p>
                            </div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Ahorro Badge -->
                  <tr>
                    <td style="padding: 0 40px 30px 40px; text-align: center;">
                      <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); border-radius: 50px; display: inline-block; padding: 15px 30px;">
                        <p style="margin: 0; color: #ffffff; font-size: 18px; font-weight: bold;">
                          ¡Ahorras $${precios.descuento.toLocaleString('es-CL')} (${precios.porcentaje}%)!
                        </p>
                      </div>
                    </td>
                  </tr>
                  
                  <!-- CTA Button -->
                  <tr>
                    <td style="padding: 0 40px 30px 40px; text-align: center;">
                      <a href="${medicamento.urlMedicamento}" 
                         style="display: inline-block; background-color: #667eea; color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 50px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">
                        Ver en ${medicamento.farmacia} →
                      </a>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 20px 40px; background-color: #f8f9fa; text-align: center; border-top: 1px solid #e9ecef;">
                      <p style="margin: 0; font-size: 12px; color: #999999;">
                        Recibiste este correo porque activaste una alerta de precio en SoloFarma
                      </p>
                      <p style="margin: 10px 0 0 0; font-size: 12px; color: #999999;">
                        © ${new Date().getFullYear()} SoloFarma - Comparador de precios de medicamentos en Chile
                      </p>
                    </td>
                  </tr>
                  
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    return true;
  } catch (error) {
    console.error("Error enviando correo:", error);
    return false;
  }
}