// Cliente HTTP hacia el microservicio de ticketing (Silver Glider Tickets).
//
// El backend principal NO emite tickets, QR ni hace check-in: delega la emisión, la
// wallet y la validación en puerta al microservicio externo. El único canal es
// servicio-a-servicio (S2S) autenticado con una API key compartida en el header
// `x-api-key` (Decisión: Problema 4 → Opción 2 del PLAN_DE_ACOPLE).
//
// Config (env):
//   TICKETING_URL    → base URL del microservicio (p. ej. https://tickets.example.com)
//   SERVICE_API_KEY  → secreto compartido para el header x-api-key (igual valor en ambos lados)
//
// Degradación defensiva: si falta configuración se loguea un warning y las llamadas se
// omiten (lanzando 503) sin romper el flujo de pago, igual que el resto de integraciones.

const TICKETING_URL = (process.env.TICKETING_URL || '').replace(/\/$/, '');
const SERVICE_API_KEY = process.env.SERVICE_API_KEY;

if (!TICKETING_URL || !SERVICE_API_KEY) {
  console.warn('⚠️  TICKETING_URL o SERVICE_API_KEY no configurados. La integración con el ticketing está deshabilitada.');
}

const isConfigured = () => Boolean(TICKETING_URL && SERVICE_API_KEY);

// Timeout por defecto: el ticketing no debe bloquear flujos sensibles (webhook de Stripe).
const DEFAULT_TIMEOUT_MS = 10000;

const request = async (method, path, body) => {
  if (!isConfigured()) {
    const error = new Error('Ticketing service not configured');
    error.statusCode = 503;
    throw error;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  const url = `${TICKETING_URL}${path}`;
  const startedAt = Date.now();
  console.log(`➡️  [ticketing] ${method} ${url} — enviando request al microservicio…`);

  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': SERVICE_API_KEY
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });

    const elapsedMs = Date.now() - startedAt;
    const text = await res.text();
    let data = null;
    if (text) {
      try { data = JSON.parse(text); } catch { data = text; }
    }

    if (!res.ok) {
      console.error(`⬅️  [ticketing] ${method} ${path} — respuesta ${res.status} en ${elapsedMs}ms (ERROR)`);
      const error = new Error((data && data.error) || `Ticketing respondió ${res.status}`);
      error.statusCode = res.status;
      error.responseData = data;
      throw error;
    }

    console.log(`⬅️  [ticketing] ${method} ${path} — respuesta ${res.status} OK en ${elapsedMs}ms`);
    return data;
  } catch (err) {
    // Distinguir un timeout/abort de un error HTTP ya logueado arriba.
    if (err.name === 'AbortError') {
      console.error(`⏱️  [ticketing] ${method} ${path} — TIMEOUT tras ${Date.now() - startedAt}ms (límite ${DEFAULT_TIMEOUT_MS}ms)`);
    } else if (!err.statusCode) {
      console.error(`❌ [ticketing] ${method} ${path} — fallo de red: ${err.message}`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
};

/**
 * Emite una orden ya pagada en el ticketing (seam principal del acople).
 * Idempotente por `external_order_id`: si la orden ya fue importada, el microservicio
 * devuelve la existente sin duplicar tickets.
 * @param {Object} payload - { external_order_id, external_event_id, buyer_first_name,
 *   buyer_last_name, buyer_email, buyer_phone, total_amount, quantity, ticket_type }
 * @returns {Promise<{ order: Object, tickets: Array }>}
 */
const importOrder = (payload) => request('POST', '/api/orders/import', payload);

/**
 * Crea o actualiza un evento en el ticketing por su id externo (Evento.id del principal).
 * Idempotente por `external_event_id`. Garantiza que el evento exista antes del primer import.
 * @param {string|number} externalEventId
 * @param {Object} payload - { name, event_date, venue, capacity, image_url }
 */
const upsertEvent = (externalEventId, payload) =>
  request('PUT', `/api/events/by-external/${encodeURIComponent(externalEventId)}`, payload);

/**
 * Anula (void) una orden en el ticketing tras un refund en el principal, para que sus
 * tickets dejen de ser válidos en puerta.
 * @param {string|number} externalOrderId
 */
const voidOrder = (externalOrderId) =>
  request('POST', `/api/orders/${encodeURIComponent(externalOrderId)}/void`);

module.exports = {
  isConfigured,
  importOrder,
  upsertEvent,
  voidOrder
};
