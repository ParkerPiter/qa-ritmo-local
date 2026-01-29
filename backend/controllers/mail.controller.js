const tokens = {};
const { generate4DigitToken, sendLoginToken, sendContactEmail } = require('../mail/mailconfig');

async function sendToken (req, res) {
 const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email requerido' });

  const token = generate4DigitToken();
  tokens[email] = token;

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

  if (tokens[email] && tokens[email] === token) {
    delete tokens[email];
    return res.json({ success: true, message: 'Correct code' });
  } else {
    return res.status(400).json({ success: false, message: 'Incorrect code' });
  }
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
