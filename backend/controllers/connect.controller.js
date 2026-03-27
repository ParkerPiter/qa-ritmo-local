const connectService = require('../services/connect.service');

const startOnboarding = async (req, res) => {
  try {
    const userId = req.user.id;
    const { url } = await connectService.startOnboarding(userId);
    res.status(200).json({ success: true, url });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Error al iniciar el onboarding de Stripe Connect'
    });
  }
};

const verifyOnboarding = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await connectService.verifyOnboarding(userId);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Error al verificar el onboarding de Stripe Connect'
    });
  }
};

const getStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const status = await connectService.getStatus(userId);
    res.status(200).json({ success: true, ...status });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Error al obtener el estado de Stripe Connect'
    });
  }
};

module.exports = { startOnboarding, verifyOnboarding, getStatus };
