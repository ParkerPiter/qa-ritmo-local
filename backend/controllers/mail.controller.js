const tokens = {};
const TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes
const { generate4DigitToken, sendLoginToken, sendContactEmail } = require('../mail/mailconfig');
const authService = require('../services/auth.service');

async function sendToken (req, res) {
 const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email requerido' });

  const token = generate4DigitToken();
  tokens[email] = { code: token, expiresAt: Date.now() + TOKEN_TTL_MS };

  try {
    await sendLoginToken(email, token);
    res.json({ message: 'Token sent' });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Error sending the email' });
  }
};

async function verifyToken (req, res) {
  const { email, token } = req.body;
  if (!email || !token) return res.status(400).json({ message: 'Incomplete data' });

  const entry = tokens[email];

  if (!entry) {
    return res.status(400).json({ success: false, message: 'No active code found. Please request a new one.' });
  }

  if (Date.now() > entry.expiresAt) {
    delete tokens[email];
    return res.status(400).json({ success: false, message: 'The code has expired. Please request a new one.' });
  }

  if (entry.code === token) {
    // El código es de un solo uso: se borra y se canjea por un resetToken con la
    // misma vigencia. Sin esto la verificación no dejaba rastro y el paso siguiente
    // (cambiar la contraseña) no tenía forma de probar que el email fue validado.
    delete tokens[email];
    const resetToken = authService.generatePasswordResetToken(email);

    return res.json({
      success: true,
      message: 'Correct code',
      resetToken,
      expiresIn: authService.passwordResetTtlSeconds,
    });
  }

  return res.status(400).json({ success: false, message: 'Incorrect code' });
};

async function formContact(req, res) {
  const { name, email, subject, message, copyOfMessage } = req.body;
  
  // Validar campos requeridos
  if (!name || !email || !subject || !message) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    // Enviar correo al administrador
    await sendContactEmail({
      toAdmin: true,
      name,
      email,
      subject,
      message
    });

    // Enviar copia al usuario si es solicitada
    if (copyOfMessage) {
      await sendContactEmail({
        toAdmin: false,
        toUser: email,
        name,
        email,
        subject,
        message
      });
    }

    res.json({ message: 'Message sent successfully' });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Error sending the message' });
  }
};

module.exports = {
  sendToken,
  verifyToken,
  formContact
};
