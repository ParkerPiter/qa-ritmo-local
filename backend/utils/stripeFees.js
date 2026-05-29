// Comisión de procesamiento estándar de Stripe (US): 2.9% + $0.30 por transacción.
// El valor fijo se cobra una sola vez por cargo, no por unidad.
const STRIPE_PERCENT = 0.029;
const STRIPE_FIXED_CENTS = 30;

// Umbral y reglas de profit de la plataforma.
// Bajo $15 unitario: cobramos $0.75 fijo por ticket.
// Desde $15 unitario: cobramos 5% del total. (En $15, 5% = $0.75, así que la
// función es continua al cruzar el umbral.)
const LOW_PRICE_THRESHOLD_CENTS = 1500;
const LOW_PRICE_PROFIT_CENTS = 75;
const HIGH_PRICE_PROFIT_PERCENT = 0.05;

/**
 * Calcula el `application_fee_amount` que la plataforma debe enviar en el
 * checkout de Stripe Connect (Destination Charges) para quedarse con un profit
 * neto después de la comisión de procesamiento de Stripe.
 *
 * El application_fee se compone de:
 *   - El profit de la plataforma según el tramo de precio (fijo o porcentaje).
 *   - Una estimación de la comisión de Stripe (2.9% + $0.30) que la plataforma
 *     traslada al receptor (artist/partner) para no absorberla.
 *
 * Stripe descuenta su comisión real del balance de la plataforma; al sumarla al
 * application_fee, el receptor termina cargando con ese costo en su transferencia
 * y la plataforma queda con el profit definido.
 *
 * @param {number} unitPriceCents - Precio unitario del ticket en centavos.
 * @param {number} quantity - Cantidad de tickets en la orden (>= 1).
 * @returns {{ applicationFeeCents: number, platformProfitCents: number, stripeFeeCents: number }}
 */
function calculateApplicationFee(unitPriceCents, quantity) {
  if (!Number.isFinite(unitPriceCents) || unitPriceCents < 0) {
    throw new Error('unitPriceCents debe ser un número >= 0');
  }
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error('quantity debe ser un entero >= 1');
  }

  const totalCents = unitPriceCents * quantity;
  const stripeFeeCents = Math.round(totalCents * STRIPE_PERCENT) + STRIPE_FIXED_CENTS;

  const platformProfitCents = unitPriceCents < LOW_PRICE_THRESHOLD_CENTS
    ? LOW_PRICE_PROFIT_CENTS * quantity
    : Math.round(totalCents * HIGH_PRICE_PROFIT_PERCENT);

  return {
    applicationFeeCents: platformProfitCents + stripeFeeCents,
    platformProfitCents,
    stripeFeeCents
  };
}

module.exports = {
  calculateApplicationFee,
  STRIPE_PERCENT,
  STRIPE_FIXED_CENTS,
  LOW_PRICE_THRESHOLD_CENTS,
  LOW_PRICE_PROFIT_CENTS,
  HIGH_PRICE_PROFIT_PERCENT
};
