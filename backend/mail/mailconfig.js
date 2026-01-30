const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
dotenv.config();

// Console log para verificar que las variables de entorno están cargadas
console.log('=== Email Configuration ===');
console.log('EMAIL_ADMIN:', process.env.EMAIL_ADMIN);
console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '***configurado***' : 'NO CONFIGURADO');
console.log('===========================');

// Crear el transporter una sola vez
const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // true para 465, false para otros puertos
  auth: {
    user: process.env.EMAIL_ADMIN,
    pass: process.env.EMAIL_PASS,
  },
  // Añadir opciones de timeout y retry
  connectionTimeout: 30000, // 30 segundos
  greetingTimeout: 30000,
  socketTimeout: 30000,
  logger: false, // Cambiar a true para ver logs detallados
  debug: false, // Cambiar a true para debugging
});

// Verificar la conexión al iniciar
transporter.verify(function (error, success) {
  if (error) {
    console.error('❌ Error with email transporter:', error);
    console.error('Error code:', error.code);
    console.error('Error command:', error.command);
  } else {
    console.log('✅ Email server is ready to send messages');
  }
});

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
  const mailOptions = {
    from: process.env.EMAIL_ADMIN,
    to,
    subject: 'Your access code',
    text: `Your access code is: ${token}`,
  };

  return transporter.sendMail(mailOptions);
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

  let mailOptions;

  if (toAdmin) {
    // Correo para el administrador
    mailOptions = {
      from: process.env.EMAIL_ADMIN,
      to: process.env.EMAIL_ADMIN,
      subject: `New contact message: ${subject}`,
      html: `
        <h3>New contact message</h3>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
      `,
      replyTo: email
    };
  } else {
    // Copia para el usuario
    mailOptions = {
      from: process.env.EMAIL_ADMIN,
      to: toUser,
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

  return transporter.sendMail(mailOptions);
}

module.exports = {
  generate4DigitToken,
  sendLoginToken,
  sendContactEmail,
};