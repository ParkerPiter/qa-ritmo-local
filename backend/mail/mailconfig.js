const { Resend } = require('resend');
const dotenv = require('dotenv');
dotenv.config();

// Inicializar Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// ─────────────────────────────────────────────────────────────────────────────
// WEBMAIL (SiteGround SMTP via Nodemailer) — comentado para referencia futura
// Para activar: comentar el bloque de Resend y descomentar este bloque.
// Variables .env necesarias: MAIL_HOST, MAIL_PORT, MAIL_SECURE, MAIL_USER, MAIL_PASS
// ─────────────────────────────────────────────────────────────────────────────
// const nodemailer = require('nodemailer');
// const transporter = nodemailer.createTransport({
//   host: process.env.MAIL_HOST,
//   port: parseInt(process.env.MAIL_PORT),
//   secure: process.env.MAIL_SECURE === 'true',
//   auth: {
//     user: process.env.MAIL_USER,
//     pass: process.env.MAIL_PASS,
//   },
// });
// ─────────────────────────────────────────────────────────────────────────────

/* Genera un token numérico de 4 dígitos como string. */
function generate4DigitToken() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * Envía un correo con el token de acceso.
 * @param {string} to - Email del destinatario
 * @param {string} token - Token de 4 dígitos
 * @returns {Promise}
 */
async function sendLoginToken(to, token) {
  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_ADMIN,
    to: [to],
    subject: 'Your access code',
    text: `Your access code is: ${token} \nThis code is valid for 15 minutes.`,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * Envía correos de contacto desde el formulario.
 * @param {object} params - Parámetros del correo
 * @param {boolean} params.toAdmin - Si es true, envía al admin
 * @param {string} params.toUser - Email del usuario para enviar copia (opcional)
 * @param {string} params.name - Nombre del remitente
 * @param {string} params.email - Email del remitente
 * @param {string} params.subject - Asunto del mensaje
 * @param {string} params.message - Contenido del mensaje
 * @returns {Promise}
 */
async function sendContactEmail(params) {
  const { toAdmin, toUser, name, email, subject, message } = params;

  let emailOptions;

  if (toAdmin) {
    // Correo para el administrador
    emailOptions = {
      from: process.env.EMAIL_ADMIN,
      to: [process.env.EMAIL_ADMIN],
      subject: `New contact message: ${subject}`,
      html: `
        <h3>New contact message</h3>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
      `,
      reply_to: email
    };
  } else {
    // Copia para el usuario
    emailOptions = {
      from: process.env.EMAIL_ADMIN,
      to: [toUser],
      subject: `Copy of your message: ${subject}`,
      html: `
        <h3>Thank you for contacting us</h3>
        <p>Hello ${name},</p>
        <p>We have received your message and will respond shortly.</p>
        <br>
        <p><strong>Your email:</strong></p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
        <br>
        <p>Best regards,</p>
        <p>Support Team</p>
      `
    };
  }

  const { data, error } = await resend.emails.send(emailOptions);

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * Envía un correo de confirmación al usuario cuando solicita un cambio de rol.
 * Replica el diseño "You're in the queue!" (tema oscuro, tarjeta de detalles).
 * @param {string} to - Email del usuario
 * @param {string} fullName - Nombre completo del usuario
 * @param {string} rolSolicitado - Rol al que aplica ('artist' | 'partner' | 'promoter' | 'venue')
 * @param {string} fechaSolicitud - Fecha de la solicitud (ISO string)
 * @param {string} [instagram] - Handle de Instagram (opcional; solo se muestra si se provee)
 * @returns {Promise}
 */
async function sendRoleRequestConfirmation(to, fullName, rolSolicitado, fechaSolicitud, instagram) {
  const ROL_LABELS = { artist: 'Artist', partner: 'Partner', promoter: 'Promoter', venue: 'Venue' };
  const rolLabel = ROL_LABELS[rolSolicitado] || 'Partner';
  const firstName = (fullName || '').trim().split(/\s+/)[0] || 'there';
  const igHandle = instagram
    ? (String(instagram).trim().startsWith('@') ? String(instagram).trim() : `@${String(instagram).trim()}`)
    : null;

  // Fila de detalle reutilizable. `last` omite el borde inferior.
  const detailRow = (label, value, last = false) => `
    <tr>
      <td style="padding:18px 0;${last ? '' : 'border-bottom:1px solid #3a3a3a;'}font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#b5b5b5;">${label}</td>
      <td align="right" style="padding:18px 0;${last ? '' : 'border-bottom:1px solid #3a3a3a;'}font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#f2f0ea;font-weight:600;">${value}</td>
    </tr>`;

  const detailRows = [
    detailRow('Name', fullName || '—'),
    detailRow('Requested as', rolLabel, !igHandle),
  ];
  if (igHandle) detailRows.push(detailRow('Instagram', igHandle, true));

  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_ADMIN,
    to: [to],
    subject: `You're in the queue — ${rolLabel} request received`,
    html: `
    <body style="margin:0;padding:0;background-color:#0f0f0f;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f0f0f;">
        <tr>
          <td align="center" style="padding:32px 16px;">
            <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#1c1c1c;border-radius:16px;">
              <tr>
                <td style="padding:40px 40px 8px 40px;">
                  <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:2px;color:#c9c6be;text-transform:uppercase;">Silver Glider</div>
                  <h1 style="margin:28px 0 16px 0;font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:1.2;color:#f6f4ee;font-weight:600;">You're in the queue!</h1>
                  <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#9a9a9a;">Hey ${firstName} — we received your request. Our team will review it and get back to you within 24 hours.</p>
                </td>
              </tr>
              <tr>
                <td style="padding:24px 40px 8px 40px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#212121;border:1px solid #333333;border-radius:14px;">
                    <tr>
                      <td style="padding:8px 28px;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                          ${detailRows.join('')}
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:16px 40px 28px 40px;">
                  <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#8f8f8f;">Once approved you'll get full publishing access — create events, build your public profiles, and start selling tickets.</p>
                </td>
              </tr>
              <tr>
                <td style="padding:24px 40px 36px 40px;border-top:1px solid #2b2b2b;">
                  <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#6f6f6f;">Silver Glider Tickets · San Francisco</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    `
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * Notifica al administrador cuando se crea una disputa en Stripe.
 * @param {Object} dispute - Datos de la disputa
 * @param {string} dispute.id - ID de la disputa en Stripe
 * @param {number} dispute.amount - Monto disputado (en centavos)
 * @param {string} dispute.currency - Moneda
 * @param {string} dispute.reason - Razón de la disputa
 * @param {number} dispute.evidenceDueBy - Plazo para responder (timestamp Unix)
 * @param {string} dispute.chargeId - ID del cargo disputado
 * @param {string|number|null} dispute.orderId - ID interno de la orden (si se pudo localizar)
 * @returns {Promise}
 */
async function sendDisputeNotification(dispute) {
  const monto = (dispute.amount / 100).toFixed(2);
  const plazo = dispute.evidenceDueBy
    ? new Date(dispute.evidenceDueBy * 1000).toLocaleString('es-ES', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
      })
    : 'No especificado';

  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_ADMIN,
    to: [process.env.EMAIL_ADMIN],
    subject: `⚠️ New dispute in Stripe: ${dispute.id}`,
    html: `
      <h2>⚠️ New dispute received</h2>
      <p>A new dispute has been created in Stripe that requires your attention.</p>
      <table style="border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 6px 12px;"><strong>Dispute ID:</strong></td><td style="padding: 6px 12px;">${dispute.id}</td></tr>
        <tr><td style="padding: 6px 12px;"><strong>Charge ID:</strong></td><td style="padding: 6px 12px;">${dispute.chargeId || '—'}</td></tr>
        <tr><td style="padding: 6px 12px;"><strong>Internal order:</strong></td><td style="padding: 6px 12px;">${dispute.orderId ?? 'Not found'}</td></tr>
        <tr><td style="padding: 6px 12px;"><strong>Amount:</strong></td><td style="padding: 6px 12px;">${monto} ${(dispute.currency || '').toUpperCase()}</td></tr>
        <tr><td style="padding: 6px 12px;"><strong>Reason:</strong></td><td style="padding: 6px 12px;">${dispute.reason || '—'}</td></tr>
        <tr><td style="padding: 6px 12px;"><strong>Response deadline:</strong></td><td style="padding: 6px 12px;">${plazo}</td></tr>
      </table>
      <p>Check the dispute in the <a href="https://dashboard.stripe.com/disputes/${dispute.id}">Stripe Dashboard</a>.</p>
    `
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

module.exports = {
  generate4DigitToken,
  sendLoginToken,
  sendContactEmail,
  sendRoleRequestConfirmation,
  sendDisputeNotification,
};
