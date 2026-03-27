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
 * @param {string} to - Email del usuario
 * @param {string} fullName - Nombre completo del usuario
 * @param {string} rolSolicitado - Rol al que aplica ('artist' | 'partner')
 * @param {string} fechaSolicitud - Fecha de la solicitud (ISO string)
 * @returns {Promise}
 */
async function sendRoleRequestConfirmation(to, fullName, rolSolicitado, fechaSolicitud) {
  const rolLabel = rolSolicitado === 'artist' ? 'Artista' : 'Partner';
  const fecha = new Date(fechaSolicitud).toLocaleDateString('es-ES', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_ADMIN,
    to: [to],
    subject: `Change role to ${rolLabel} request received`,
    html: `
      <h2>Hi ${fullName},</h2>
      <p>We have received your request to change your role to <strong>${rolLabel}</strong>.</p>
      <p><strong>Request date:</strong> ${fecha}</p>
      <p>Our team will review your request and notify you once there is a response.</p>
      <br>
      <p>Thank you for being part of our community.</p>
      <p>— The Silver Glider Tickets Team</p>
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
};
