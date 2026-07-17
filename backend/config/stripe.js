/**
 * Configuración centralizada de Stripe — resuelve credenciales según STRIPE_MODE.
 *
 * STRIPE_MODE=production → llaves Live   (STRIPE_LIVE_*)
 * STRIPE_MODE=develop    → llaves Test   (STRIPE_TEST_*)
 *
 * Si no se declaran las llaves por modo, se cae a las variables legacy
 * (STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET) para no romper despliegues existentes.
 *
 * Importante: los IDs de Stripe que guarda la BD (User.stripeAccountId,
 * Order.stripePaymentIntentId, Order.stripeTransferId) pertenecen al modo en que
 * fueron creados. Test y Live son universos aislados: una cuenta creada en Test no
 * existe para una llave Live y viceversa. Cada modo debe usar su propia base de datos.
 */
const dotenv = require('dotenv');
dotenv.config();

const MODES = ['develop', 'production'];

// Sin STRIPE_MODE declarado se infiere el modo de la llave legacy en vez de asumir
// develop: un despliegue existente con STRIPE_SECRET_KEY=sk_live_ y sin la variable
// nueva debe seguir funcionando igual que antes, no romperse en el arranque.
const inferModeFromLegacyKey = () => {
  const legacyKey = process.env.STRIPE_SECRET_KEY || '';
  const inferred = legacyKey.startsWith('sk_live') ? 'production' : 'develop';
  console.warn(
    `⚠️  STRIPE_MODE no está definido. Modo inferido de STRIPE_SECRET_KEY: ${inferred}. ` +
    'Declaralo explícitamente (develop | production) en el entorno.'
  );
  return inferred;
};

const stripeMode = process.env.STRIPE_MODE
  ? process.env.STRIPE_MODE.trim().toLowerCase()
  : inferModeFromLegacyKey();

if (!MODES.includes(stripeMode)) {
  throw new Error(
    `STRIPE_MODE inválido: "${process.env.STRIPE_MODE}". Valores admitidos: ${MODES.join(' | ')}.`
  );
}

const isProduction = stripeMode === 'production';

const secretKey = isProduction
  ? process.env.STRIPE_LIVE_SECRET_KEY || process.env.STRIPE_SECRET_KEY
  : process.env.STRIPE_TEST_SECRET_KEY || process.env.STRIPE_SECRET_KEY;

const STRIPE_WEBHOOK_SECRET = isProduction
  ? process.env.STRIPE_LIVE_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET
  : process.env.STRIPE_TEST_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET;

// La llave debe corresponder al modo declarado. Cobrar tarjetas reales desde develop,
// o dejar producción operando contra el sandbox, son fallos silenciosos y caros:
// aquí se cortan en el arranque, en ambos modos.
if (secretKey) {
  if (isProduction && secretKey.startsWith('sk_test')) {
    throw new Error(
      'STRIPE_MODE=production pero la llave secreta es de test (sk_test_...). ' +
      'Configurá STRIPE_LIVE_SECRET_KEY con una llave sk_live_.'
    );
  }
  if (!isProduction && secretKey.startsWith('sk_live')) {
    throw new Error(
      'STRIPE_MODE=develop pero la llave secreta es LIVE (sk_live_...). ' +
      'Se cobrarían tarjetas reales: configurá STRIPE_TEST_SECRET_KEY con una llave sk_test_.'
    );
  }
}

// Sin llave, producción no arranca; en develop se degrada con warning para que el
// backend siga levantando sin credenciales (mismo comportamiento que antes).
if (!secretKey) {
  if (isProduction) {
    throw new Error(
      'STRIPE_MODE=production pero no hay llave secreta de Stripe. Configurá STRIPE_LIVE_SECRET_KEY.'
    );
  }
  console.warn('⚠️  Llave secreta de Stripe no configurada (modo develop). Los pagos no funcionarán.');
}

const stripe = secretKey ? require('stripe')(secretKey) : null;

if (stripe) {
  console.log(`[Stripe] Inicializado en modo: ${isProduction ? 'LIVE (producción)' : 'SANDBOX (develop)'}`);
  if (!STRIPE_WEBHOOK_SECRET) {
    console.warn('⚠️  Webhook secret de Stripe no configurado: el webhook no verificará firmas.');
  }
}

/**
 * Detecta si un error de Stripe se debe a usar un objeto del modo contrario
 * (típicamente un acct_/pi_ creado en Test consultado con llave Live, o al revés).
 *
 * Los IDs de Stripe no codifican el modo en el string, así que la única señal
 * confiable llega en la respuesta de la API: Stripe responde "No such ..." y, cuando
 * el objeto existe en el otro modo, lo aclara en el mensaje.
 * @param {Error} err - Error lanzado por el SDK de Stripe
 * @returns {boolean}
 */
const isModeMismatchError = (err) => {
  const message = err?.raw?.message || err?.message || '';
  return /similar object exists in (test|live) mode/i.test(message);
};

/**
 * Log explicativo para un posible cruce de modos. El mensaje crudo de Stripe
 * ("No such account") no dice nada del switch, y sin este contexto el síntoma
 * parece un dato corrupto en la BD.
 * @param {Error} err - Error lanzado por el SDK de Stripe
 * @param {string} objectId - ID de Stripe involucrado (acct_..., pi_..., etc.)
 */
const warnIfModeMismatch = (err, objectId) => {
  if (!isModeMismatchError(err)) return;
  console.warn(
    `⚠️  ${objectId} pertenece al modo Stripe contrario (STRIPE_MODE=${stripeMode}). ` +
    'Los datos de Test y Live no se cruzan: esta BD parece tener IDs creados con el otro modo.'
  );
};

module.exports = {
  stripe,
  stripeMode,
  isProduction,
  isStripeConfigured: !!stripe,
  STRIPE_WEBHOOK_SECRET,
  isModeMismatchError,
  warnIfModeMismatch
};
