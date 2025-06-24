const tokens = {};
const { generate4DigitToken, sendLoginToken } = require('../mail/mailconfig');

async function sendToken (req, res) {
 const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email requerido' });

  const token = generate4DigitToken();
  tokens[email] = token;

  try {
    await sendLoginToken(email, token);
    res.json({ message: 'Token enviado' });
  } catch (err) {
    res.status(500).json({ message: 'Error enviando el correo' });
  }
};

async function verifyToken (req, res) {
  const { email, token } = req.body;
  if (!email || !token) return res.status(400).json({ message: 'Datos incompletos' });

  if (tokens[email] && tokens[email] === token) {
    delete tokens[email];
    return res.json({ success: true, message: 'Código correcto' });
  } else {
    return res.status(400).json({ success: false, message: 'Código incorrecto' });
  }
};

module.exports = {
  sendToken,
  verifyToken
};
