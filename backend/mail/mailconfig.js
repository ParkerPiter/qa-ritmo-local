const nodemailer = require('nodemailer');
dotenv = require('dotenv');
dotenv.config();

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
  // Configura tu transporter (ajusta los datos reales)
  const transporter = nodemailer.createTransport({
    service: 'gmail', // o el que uses
    auth: {
      user: process.env.EMAIL_ADMIN,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_ADMIN,
    to,
    subject: 'Tu código de acceso',
    text: `Tu código de acceso es: ${token}`,
  };

  return transporter.sendMail(mailOptions);
}

module.exports = {
  generate4DigitToken,
  sendLoginToken,
};