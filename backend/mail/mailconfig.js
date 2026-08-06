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

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE COMÚN (tema oscuro "Silver Glider")
//
// Todos los correos usan el mismo layout: tarjeta oscura centrada, eyebrow de
// marca, título serif, párrafo de entrada, bloque de contenido y pie.
// Se escribe con tablas y estilos inline porque los clientes de correo
// (Outlook, Gmail) no soportan CSS externo ni flex/grid.
// ─────────────────────────────────────────────────────────────────────────────

/** Escapa texto de entrada para que no rompa (ni inyecte) HTML en el correo. */
const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** Escapa y convierte saltos de línea en <br> (para mensajes de texto libre). */
const escapeMultiline = (value) => escapeHtml(value).replace(/\r?\n/g, '<br>');

/**
 * Fila de detalle (label a la izquierda, valor a la derecha).
 * @param {string} label
 * @param {string|number} value - Se escapa; usar '—' para vacío.
 * @param {boolean} [last] - Omite el borde inferior en la última fila.
 */
const detailRow = (label, value, last = false) => {
  const border = last ? '' : 'border-bottom:1px solid #3a3a3a;';
  const shown = value === undefined || value === null || value === '' ? '—' : escapeHtml(value);
  return `
    <tr>
      <td style="padding:18px 0;${border}font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#b5b5b5;">${escapeHtml(label)}</td>
      <td align="right" style="padding:18px 0;${border}font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#f2f0ea;font-weight:600;word-break:break-word;">${shown}</td>
    </tr>`;
};

/**
 * Tarjeta que agrupa filas de detalle.
 * @param {Array<[string, any]>} rows - Pares [label, value]; el borde de la última se quita solo.
 */
const detailsCard = (rows) => {
  const html = rows.map(([label, value], i) => detailRow(label, value, i === rows.length - 1)).join('');
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#212121;border:1px solid #333333;border-radius:14px;">
      <tr>
        <td style="padding:8px 28px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${html}</table>
        </td>
      </tr>
    </table>`;
};

/** Panel para texto largo (mensaje del formulario de contacto, etc.). */
const textPanel = (label, text) => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#212121;border:1px solid #333333;border-radius:14px;">
    <tr>
      <td style="padding:22px 28px;">
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:2px;color:#b5b5b5;text-transform:uppercase;">${escapeHtml(label)}</div>
        <p style="margin:12px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#f2f0ea;word-break:break-word;">${escapeMultiline(text)}</p>
      </td>
    </tr>
  </table>`;

/** Código de acceso destacado (letras grandes centradas). */
const codePanel = (label, code) => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#212121;border:1px solid #333333;border-radius:14px;">
    <tr>
      <td align="center" style="padding:30px 24px;">
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:2px;color:#b5b5b5;text-transform:uppercase;">${escapeHtml(label)}</div>
        <div style="margin-top:14px;font-family:Georgia,'Times New Roman',serif;font-size:38px;font-weight:600;color:#f6f4ee;letter-spacing:10px;text-indent:10px;">${escapeHtml(code)}</div>
      </td>
    </tr>
  </table>`;

/** Banner de aviso para los correos internos de alerta. */
const alertBanner = (text) => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#2a1b1b;border:1px solid #5a3030;border-radius:14px;">
    <tr>
      <td style="padding:16px 24px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#f0b8b8;">${text}</td>
    </tr>
  </table>`;

/** Botón de acción (tabla + inline styles: Outlook no renderiza <a> con padding). */
const button = (label, href) => `
  <table role="presentation" cellpadding="0" cellspacing="0">
    <tr>
      <td style="background-color:#f6f4ee;border-radius:10px;">
        <a href="${escapeHtml(href)}" style="display:inline-block;padding:13px 26px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#141414;text-decoration:none;">${escapeHtml(label)}</a>
      </td>
    </tr>
  </table>`;

/** Separador vertical entre bloques del cuerpo. */
const spacer = (height = 16) => `<div style="line-height:${height}px;height:${height}px;">&nbsp;</div>`;

/**
 * Envuelve el contenido en el layout de marca.
 * @param {Object} p
 * @param {string} p.heading - Título principal (serif).
 * @param {string} p.intro - Párrafo de entrada. Admite HTML.
 * @param {string} [p.body] - Bloques de contenido (detailsCard, textPanel, …). Admite HTML.
 * @param {string} [p.footnote] - Nota final bajo el contenido. Admite HTML.
 * @returns {string} HTML completo del correo.
 */
const renderEmail = ({ heading, intro, body = '', footnote = '' }) => `
  <body style="margin:0;padding:0;background-color:#0f0f0f;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f0f0f;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#1c1c1c;border-radius:16px;">
            <tr>
              <td style="padding:40px 40px 8px 40px;">
                <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:2px;color:#c9c6be;text-transform:uppercase;">Silver Glider</div>
                <h1 style="margin:28px 0 16px 0;font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:1.2;color:#f6f4ee;font-weight:600;">${heading}</h1>
                <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#9a9a9a;">${intro}</p>
              </td>
            </tr>
            ${body ? `<tr><td style="padding:24px 40px 8px 40px;">${body}</td></tr>` : ''}
            ${footnote ? `<tr><td style="padding:16px 40px 28px 40px;"><p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#8f8f8f;">${footnote}</p></td></tr>` : ''}
            <tr>
              <td style="padding:24px 40px 36px 40px;border-top:1px solid #2b2b2b;">
                <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#6f6f6f;">Silver Glider Tickets · San Francisco</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>`;

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
    // Se mantiene la versión de texto plano junto al HTML: es lo que ven los
    // clientes sin soporte y ayuda a que el código no caiga en spam.
    text: `Your access code is: ${token} \nThis code is valid for 15 minutes.`,
    html: renderEmail({
      heading: 'Your access code',
      intro: 'Use the code below to continue. It expires in 15 minutes.',
      body: codePanel('Access code', token),
      footnote: "If you didn't request this code, you can safely ignore this email."
    })
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
 * @param {string} [params.adminEmail] - Destinatario del correo al admin. Por defecto
 *   EMAIL_ADMIN; se usa para redirigirlo en pruebas (el `from` no cambia).
 * @returns {Promise}
 */
async function sendContactEmail(params) {
  const { toAdmin, toUser, name, email, subject, message, adminEmail } = params;

  let emailOptions;

  const firstName = (name || '').trim().split(/\s+/)[0] || 'there';

  if (toAdmin) {
    // Correo para el administrador
    emailOptions = {
      from: process.env.EMAIL_ADMIN,
      to: [adminEmail || process.env.EMAIL_ADMIN],
      subject: `New contact message: ${subject}`,
      html: renderEmail({
        heading: 'New contact message',
        intro: 'Someone reached out through the contact form on the site.',
        body: detailsCard([['Name', name], ['Email', email], ['Subject', subject]])
          + spacer()
          + textPanel('Message', message),
        footnote: 'Reply directly to this email to answer the sender.'
      }),
      reply_to: email
    };
  } else {
    // Copia para el usuario
    emailOptions = {
      from: process.env.EMAIL_ADMIN,
      to: [toUser],
      subject: `Copy of your message: ${subject}`,
      html: renderEmail({
        heading: 'Thanks for reaching out',
        intro: `Hey ${escapeHtml(firstName)} — we received your message and our team will respond shortly.`,
        body: detailsCard([['Subject', subject]])
          + spacer()
          + textPanel('Your message', message),
        footnote: 'This is a copy of what you sent us. No action needed on your side.'
      })
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

  const rows = [['Name', fullName || '—'], ['Requested as', rolLabel]];
  if (igHandle) rows.push(['Instagram', igHandle]);

  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_ADMIN,
    to: [to],
    subject: `You're in the queue — ${rolLabel} request received`,
    html: renderEmail({
      heading: "You're in the queue!",
      intro: `Hey ${escapeHtml(firstName)} — we received your request. Our team will review it and get back to you within 24 hours.`,
      body: detailsCard(rows),
      footnote: "Once approved you'll get full publishing access — create events, build your public profiles, and start selling tickets."
    })
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
 * @param {string} [toOverride] - Destinatario alternativo (pruebas). Por defecto EMAIL_ADMIN.
 * @returns {Promise}
 */
async function sendDisputeNotification(dispute, toOverride) {
  const monto = (dispute.amount / 100).toFixed(2);
  const plazo = dispute.evidenceDueBy
    ? new Date(dispute.evidenceDueBy * 1000).toLocaleString('es-ES', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
      })
    : 'No especificado';

  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_ADMIN,
    to: [toOverride || process.env.EMAIL_ADMIN],
    subject: `⚠️ New dispute in Stripe: ${dispute.id}`,
    html: renderEmail({
      heading: 'New dispute received',
      intro: 'A new dispute has been created in Stripe and requires your attention.',
      body: alertBanner(`⚠️ Respond before <strong>${escapeHtml(plazo)}</strong> or the dispute is lost by default.`)
        + spacer()
        + detailsCard([
          ['Dispute ID', dispute.id],
          ['Charge ID', dispute.chargeId],
          ['Internal order', dispute.orderId ?? 'Not found'],
          ['Amount', `${monto} ${(dispute.currency || '').toUpperCase()}`],
          ['Reason', dispute.reason],
          ['Response deadline', plazo]
        ])
        + spacer(24)
        + button('Open in Stripe Dashboard', `https://dashboard.stripe.com/disputes/${dispute.id}`)
    })
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * Alerta inmediata a soporte cuando un webhook de Stripe NO se procesa con éxito
 * (fallo de verificación de firma → 400, o error procesando el evento → 500).
 *
 * Pensado para enterarnos en el acto de que el webhook dejó de responder — el tipo
 * de caída que, sin alerta, tardó 9 días en detectarse y terminó con el endpoint
 * deshabilitado por Stripe.
 *
 * En un fallo de firma los datos vienen del body SIN verificar (best-effort): se
 * incluyen igual como pista, marcados como no confiables.
 *
 * @param {Object} p
 * @param {string} p.failureType - 'signature-verification' | 'processing'
 * @param {string} p.errorMessage - Mensaje del error capturado
 * @param {number} [p.httpStatus] - Código HTTP devuelto a Stripe (400 / 500)
 * @param {string} [p.stripeMode] - Modo activo (develop | production)
 * @param {boolean} [p.verified] - Si los datos provienen de un evento verificado
 * @param {string} [p.eventType] - Tipo de evento Stripe (checkout.session.completed, …)
 * @param {string} [p.objectId] - ID del objeto (cs_… / pi_… / …)
 * @param {number} [p.amount] - Monto en centavos
 * @param {string} [p.currency] - Moneda
 * @param {string} [p.email] - Email del comprador si se pudo extraer
 * @param {string} [p.paymentIntent] - ID del payment intent si aplica
 * @param {string} [toOverride] - Destinatario alternativo (pruebas). Por defecto SUPPORT_EMAIL.
 * @returns {Promise}
 */
async function sendWebhookFailureAlert(p, toOverride) {
  const to = toOverride || process.env.SUPPORT_EMAIL || process.env.EMAIL_ADMIN;
  const monto = typeof p.amount === 'number'
    ? `${(p.amount / 100).toFixed(2)} ${(p.currency || '').toUpperCase()}`
    : '—';

  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_ADMIN,
    to: [to],
    subject: `🔴 Webhook Stripe fail (${p.httpStatus || '?'}) — ${p.eventType || p.failureType}`,
    html: renderEmail({
      heading: 'A webhook was not processed',
      intro: 'Stripe did not receive a successful response. If this repeats, Stripe may disable the endpoint.',
      body: (p.verified === false
          ? alertBanner('⚠️ <strong>Data not verified:</strong> the signature did not verify, so the fields below come from the raw body and are not trustworthy.') + spacer()
          : '')
        + detailsCard([
          ['Tipo de fallo', p.failureType],
          ['HTTP devuelto', p.httpStatus],
          ['Modo Stripe', p.stripeMode],
          ['Evento', p.eventType],
          ['Objeto', p.objectId],
          ['Payment Intent', p.paymentIntent],
          ['Monto', monto],
          ['Comprador', p.email],
          ['Error', p.errorMessage]
        ])
        + spacer(24)
        + button('Open Webhooks in Stripe', 'https://dashboard.stripe.com/webhooks'),
      footnote: 'Check the backend logs for the full trace. This alert has anti-flood: at most one per window and failure type is sent, not one per event.'
    })
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
  sendWebhookFailureAlert,
};
