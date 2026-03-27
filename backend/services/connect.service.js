if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('⚠️  STRIPE_SECRET_KEY no configurada. El servicio Connect no funcionará.');
}
const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;

const { User } = require('../schemas');

class ConnectService {
  /**
   * Inicia o reanuda el onboarding de Stripe Connect para un partner.
   * Crea una cuenta Express si el partner no tiene una, luego genera el link de onboarding.
   * @param {number} userId - ID del usuario con rol partner
   * @returns {Promise<{ url: string }>} URL de onboarding de Stripe
   */
  async startOnboarding(userId) {
    if (!stripe) {
      const error = new Error('Servicio de pagos no configurado');
      error.statusCode = 503;
      throw error;
    }

    const user = await User.findByPk(userId);
    if (!user) {
      const error = new Error('Usuario no encontrado');
      error.statusCode = 404;
      throw error;
    }

    if (user.rol !== 'partner') {
      const error = new Error('Solo los usuarios con rol partner pueden conectar una cuenta de Stripe');
      error.statusCode = 403;
      throw error;
    }

    let accountId = user.stripeAccountId;

    // Si no tiene cuenta Express en Stripe, crearla
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true }
        },
        metadata: { userId: userId.toString() }
      });
      accountId = account.id;
      await user.update({ stripeAccountId: accountId, stripeOnboardingDone: false });
    }

    const baseUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${baseUrl}/partner/connect/refresh`,
      return_url: `${baseUrl}/partner/connect/return`,
      type: 'account_onboarding'
    });

    return { url: accountLink.url };
  }

  /**
   * Verifica si la cuenta Connect del partner completó el onboarding y actualiza el estado.
   * Llamar cuando el partner vuelve desde la URL de retorno de Stripe.
   * @param {number} userId - ID del usuario con rol partner
   * @returns {Promise<{ onboardingDone: boolean, stripeAccountId: string }>}
   */
  async verifyOnboarding(userId) {
    if (!stripe) {
      const error = new Error('Servicio de pagos no configurado');
      error.statusCode = 503;
      throw error;
    }

    const user = await User.findByPk(userId);
    if (!user || !user.stripeAccountId) {
      const error = new Error('El usuario no ha iniciado el proceso de onboarding');
      error.statusCode = 400;
      throw error;
    }

    const account = await stripe.accounts.retrieve(user.stripeAccountId);
    const onboardingDone = account.details_submitted && account.charges_enabled;

    await user.update({ stripeOnboardingDone: onboardingDone });

    return {
      onboardingDone,
      stripeAccountId: user.stripeAccountId
    };
  }

  /**
   * Devuelve el estado actual de la cuenta Connect del partner.
   * @param {number} userId - ID del usuario
   * @returns {Promise<Object>}
   */
  async getStatus(userId) {
    const user = await User.findByPk(userId, {
      attributes: ['id', 'fullName', 'email', 'rol', 'stripeAccountId', 'stripeOnboardingDone']
    });

    if (!user) {
      const error = new Error('Usuario no encontrado');
      error.statusCode = 404;
      throw error;
    }

    return {
      stripeAccountId: user.stripeAccountId,
      stripeOnboardingDone: user.stripeOnboardingDone,
      isReady: !!user.stripeAccountId && user.stripeOnboardingDone
    };
  }

  /**
   * Sincroniza el estado de una cuenta Connect desde un evento webhook account.updated.
   * @param {string} stripeAccountId - ID de la cuenta de Stripe
   */
  async syncAccountStatus(stripeAccountId) {
    const user = await User.findOne({ where: { stripeAccountId } });
    if (!user) return;

    if (!stripe) return;

    const account = await stripe.accounts.retrieve(stripeAccountId);
    const onboardingDone = account.details_submitted && account.charges_enabled;

    await user.update({ stripeOnboardingDone: onboardingDone });
    console.log(`🔄 Cuenta Connect ${stripeAccountId} sincronizada. onboardingDone: ${onboardingDone}`);
  }
}

module.exports = new ConnectService();
