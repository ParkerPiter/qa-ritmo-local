const { Resend } = require('resend');
const dotenv = require('dotenv');
dotenv.config();

// Inicializar Resend
const resend = new Resend(process.env.RESEND_API_KEY);

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
    text: `Your access code is: ${token}`,
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
        <p><strong>Your message:</strong></p>
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

module.exports = {
  generate4DigitToken,
  sendLoginToken,
  sendContactEmail,
};