// Verificar que la clave de Stripe existe antes de inicializar
if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('⚠️  STRIPE_SECRET_KEY no configurada. Los pagos no funcionarán.');
}
const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;
const orderService = require('../services/order.service');
const connectService = require('../services/connect.service');
const ticketingService = require('../services/ticketing.service');
const { sendDisputeNotification } = require('../mail/mailconfig');
const { Order, Evento, User } = require('../schemas');
const { calculateApplicationFee } = require('../utils/stripeFees');

// Separa un nombre completo en (first, last) para el contrato del ticketing.
const splitFullName = (fullName = '') => {
    const parts = String(fullName).trim().split(/\s+/).filter(Boolean);
    const first = parts.shift() || '';
    const last = parts.join(' ');
    return { first, last };
};

// Emite los tickets de una orden ya pagada delegando en el microservicio de ticketing
// (seam POST /api/orders/import). El backend principal ya NO genera QR ni email de
// entrada: esa responsabilidad vive en el microservicio externo.
// - No bloqueante: un fallo aquí no debe romper la confirmación del pago.
// - Idempotente: el import del ticketing deduplica por external_order_id, así que
//   reintentos del webhook (o el respaldo de /success) no duplican tickets.
const emitTicketsForOrder = async (orderId) => {
    if (!ticketingService.isConfigured()) {
        console.warn(`⚠️  Ticketing no configurado; se omite la emisión de tickets (orden ${orderId}).`);
        return;
    }
    try {
        const order = await Order.findByPk(orderId, {
            include: [
                { model: Evento, as: 'evento', attributes: ['id', 'titulo'] },
                { model: User, as: 'user', attributes: ['id', 'email', 'fullName', 'phone'] }
            ]
        });
        if (!order) {
            console.error(`No se encontró la orden ${orderId} para emitir tickets.`);
            return;
        }

        console.log(`🎫 [pago→ticketing] Emitiendo tickets/QR para la orden ${order.id} (evento ${order.eventoId}, ${order.cantidad} ticket(s), comprador ${order.user?.email}).`);

        const { first, last } = splitFullName(order.user?.fullName);
        const result = await ticketingService.importOrder({
            external_order_id: String(order.id),
            external_event_id: String(order.eventoId),
            buyer_first_name: first,
            buyer_last_name: last,
            buyer_email: order.user?.email,
            buyer_phone: order.user?.phone || null,
            total_amount: Number(order.precioTotal),
            quantity: order.cantidad,
            ticket_type: 'General Admission'
        });

        // Paso E: persistir order_number y secure_token devueltos para trazabilidad.
        if (result?.order) {
            await orderService.updateTicketingData(order.id, {
                ticketingOrderNumber: result.order.order_number || null,
                ticketingSecureToken: result.order.secure_token || null
            });
            console.log(`🎟️  Tickets emitidos en el ticketing (orden ${order.id} → ${result.order.order_number}).`);
        }
    } catch (err) {
        // El pago ya está confirmado; la idempotencia del import cubre reintentos.
        console.error(`⚠️ No se pudo emitir tickets en el ticketing (orden ${orderId}):`, err.message);
    }
};

// Anula los tickets de una orden en el ticketing tras un refund (Paso D), para que
// dejen de ser válidos en puerta. No bloqueante.
const voidTicketsForOrder = async (orderId) => {
    if (!ticketingService.isConfigured()) {
        console.warn(`⚠️  Ticketing no configurado; se omite la anulación de tickets (orden ${orderId}).`);
        return;
    }
    try {
        await ticketingService.voidOrder(String(orderId));
        console.log(`🚫 Tickets anulados en el ticketing (orden ${orderId}).`);
    } catch (err) {
        console.error(`⚠️ No se pudo anular tickets en el ticketing (orden ${orderId}):`, err.message);
    }
};

// Crear sesión de checkout de Stripe
const createCheckout = async (req, res) => {
    try {
        if (!stripe) {
            return res.status(503).json({ 
                error: 'Payment service not configured. Please contact support.' 
            });
        }
        const { 
            amount,
            currency = 'usd',
            eventId,
            eventTitle,
            userId,
            userEmail,
            quantity = 1,
            eventImageUrl
        } = req.body;

        // Validar datos requeridos
        if (!amount || !eventId || !userId || !userEmail || !eventTitle) {
            return res.status(400).json({
                success: false,
                message: 'Faltan datos requeridos: amount, eventId, userId, userEmail, eventTitle'
            });
        }

        // Determinar la URL base desde variables de entorno o valor por defecto
        const baseUrl = (process.env.FRONTEND_URL || 
            (process.env.NODE_ENV === 'production' 
                ? 'http://silverglidertickets.com/'
                : 'http://localhost:3000')).replace(/\/$/, ''); // Remover barra final si existe

        // Validar y construir URL de imagen
        let validImageUrl = null;
        if (eventImageUrl) {
            console.log('URL de imagen recibida:', eventImageUrl);
            try {
                // Si es una ruta relativa, convertirla a URL absoluta
                if (eventImageUrl.startsWith('/')) {
                    validImageUrl = `${baseUrl}${eventImageUrl}`;
                    console.log('URL de imagen convertida a absoluta:', validImageUrl);
                } else {
                    // Validar que sea una URL válida
                    new URL(eventImageUrl);
                    validImageUrl = eventImageUrl;
                    console.log('URL de imagen válida:', validImageUrl);
                }
            } catch (error) {
                console.log('URL de imagen inválida, omitiendo imagen:', eventImageUrl, error.message);
                validImageUrl = null;
            }
        } else {
            console.log('No se proporcionó URL de imagen');
        }

        // Calcular precio unitario (el amount que viene del frontend ya es el total)
        const unitPrice = amount / quantity; // Precio por ticket en dólares
        const unitAmountInCents = Math.round(unitPrice * 100); // Convertir a centavos y redondear
        const totalAmountInCents = Math.round(amount * 100);

        // Buscar si el evento tiene un partner con cuenta Stripe activa
        const evento = await Evento.findByPk(eventId, {
            attributes: ['partnerUserId']
        });
        let partnerConnectData = null;
        if (evento?.partnerUserId) {
            const partner = await User.findByPk(evento.partnerUserId, {
                attributes: ['stripeAccountId', 'stripeOnboardingDone']
            });
            if (partner?.stripeOnboardingDone && partner?.stripeAccountId) {
                const feeBreakdown = calculateApplicationFee(unitAmountInCents, quantity || 1);
                partnerConnectData = {
                    stripeAccountId: partner.stripeAccountId,
                    applicationFeeAmount: feeBreakdown.applicationFeeCents
                };
                console.log(`💳 Pago con split — application_fee: ${feeBreakdown.applicationFeeCents}c (profit plataforma: ${feeBreakdown.platformProfitCents}c, fee Stripe estimada: ${feeBreakdown.stripeFeeCents}c) → receptor: ${partner.stripeAccountId}`);
            }
        }

        // Construir parámetros del session según si hay split o no
        const sessionParams = {
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: currency,
                    product_data: {
                        name: eventTitle,
                        description: `Entrada para el evento: ${eventTitle}`,
                        images: validImageUrl ? [validImageUrl] : [],
                    },
                    unit_amount: unitAmountInCents
                },
                quantity: quantity || 1,
            }],
            mode: 'payment',
            success_url: `${baseUrl}/event/${eventId}?showSuccessModal=true&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${baseUrl}/event/${eventId}?showCancelModal=true&userId=${userId}`,
            metadata: {
                eventId: eventId.toString(),
                userId: userId.toString(),
                quantity: (quantity || 1).toString()
            },
            customer_email: userEmail
        };

        if (partnerConnectData) {
            sessionParams.payment_intent_data = {
                application_fee_amount: partnerConnectData.applicationFeeAmount,
                transfer_data: {
                    destination: partnerConnectData.stripeAccountId
                }
            };
        }

        // Crear sesión de checkout
        const session = await stripe.checkout.sessions.create(sessionParams);

        // Crear la orden en la base de datos en estado pending
        const order = await orderService.createOrder({
            userId,
            eventoId: eventId,
            cantidad: quantity || 1,
            precioTotal: amount,
            stripeSessionId: session.id
        });

        console.log(`📝 Orden creada: ${order.id} (estado: pending)`);

        res.status(200).json({
            success: true,
            sessionId: session.id,
            url: session.url,
            orderId: order.id,
            message: 'Sesión de checkout creada exitosamente'
        });

    } catch (error) {
        console.error('Error creando checkout session:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor al crear la sesión de pago',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Manejar éxito del pago (llamado desde el frontend)
const handleSuccess = async (req, res) => {
    try {
        const { session_id } = req.query;

        if (!session_id) {
            return res.status(400).json({
                success: false,
                message: 'Session ID es requerido'
            });
        }

        if (!stripe) {
            return res.status(503).json({ 
                success: false,
                message: 'Payment service not configured. Please contact support.' 
            });
        }

        console.log(`✅ Procesando pago exitoso para session: ${session_id}`);

        // Recuperar la sesión de Stripe
        const session = await stripe.checkout.sessions.retrieve(session_id);

        console.log(`📋 Estado de pago en Stripe: ${session.payment_status}`);

        // Confirmar la orden (actualiza de pending a paid)
        const order = await orderService.confirmOrder(session_id, session.payment_intent);

        console.log(`✅ Orden ${order.id} confirmada como pagada`);

        // Emitir tickets en el ticketing (respaldo si el webhook no llegó; idempotente).
        await emitTicketsForOrder(order.id);

        res.status(200).json({
            success: true,
            message: 'Payment confirmed successfully',
            data: {
                sessionId: session_id,
                paymentStatus: session.payment_status,
                orderId: order.id,
                orderStatus: order.estado,
                eventId: order.eventoId,
                userId: order.userId,
                quantity: order.cantidad,
                amountTotal: order.precioTotal,
                paidAt: order.fechaPago,
                currency: session.currency
            }
        });

    } catch (error) {
        console.error('Error processing successful payment:', error);
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({
            success: false,
            message: error.message || 'Internal server error while processing payment',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Manejar cancelación del pago
const handleCancel = async (req, res) => {
    try {
        const { eventId, userId } = req.query;
        
        console.log('Pago cancelado:', {
            eventId,
            userId,
            timestamp: new Date().toISOString()
        });
        
        res.status(200).json({
            success: true,
            message: 'Pago cancelado por el usuario',
            data: {
                eventId,
                userId,
                canceledAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Error procesando cancelación:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor al procesar la cancelación',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Stripe Webhook - Handles automatic events from the Stripe server
const handleWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        // Verify the webhook signature (only if the secret is configured)
        if (endpointSecret && stripe) {
            event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
        } else {
            // In development, if no secret, use the body directly
            console.warn('⚠️  STRIPE_WEBHOOK_SECRET not configured. Using webhook in insecure mode.');
            event = JSON.parse(req.body.toString());
        }
    } catch (err) {
        console.error('❌ Error verifying webhook:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log(`📨 Stripe event received: ${event.type}`);

    try {
        switch (event.type) {
            // ✅ PAYMENT COMPLETED (Main event)
            case 'checkout.session.completed': {
                const session = event.data.object;
                console.log(`✅ Checkout session completed: ${session.id}`);

                if (session.payment_status === 'paid') {
                    const order = await orderService.confirmOrder(
                        session.id,
                        session.payment_intent
                    );
                    console.log(`✅ Order ${order.id} automatically confirmed by webhook`);

                    // Si hubo split, recuperar el PaymentIntent para obtener transfer, application_fee
                    // y la fee REAL de Stripe (desde balance_transaction.fee). Eso permite separar
                    // el profit neto de la plataforma del costo de procesamiento.
                    if (session.payment_intent) {
                        try {
                            const paymentIntent = await stripe.paymentIntents.retrieve(
                                session.payment_intent,
                                { expand: ['latest_charge.transfer', 'latest_charge.balance_transaction'] }
                            );
                            const charge = paymentIntent.latest_charge;
                            const transfer = charge?.transfer;
                            const applicationFeeCents = paymentIntent.application_fee_amount;

                            if (applicationFeeCents || transfer) {
                                const totalCents = paymentIntent.amount;
                                const stripeFeeCents = charge?.balance_transaction?.fee || 0;
                                const platformProfitCents = (applicationFeeCents || 0) - stripeFeeCents;
                                const partnerCents = totalCents - (applicationFeeCents || 0);

                                await orderService.updateSplitData(order.id, {
                                    platformFee: (platformProfitCents / 100).toFixed(2),
                                    stripeFee: (stripeFeeCents / 100).toFixed(2),
                                    partnerAmount: (partnerCents / 100).toFixed(2),
                                    stripeTransferId: transfer?.id || null
                                });
                                console.log(`💰 Split guardado — profit plataforma: ${platformProfitCents / 100}, fee Stripe: ${stripeFeeCents / 100}, receptor: ${partnerCents / 100}`);
                            }
                        } catch (splitError) {
                            console.error('⚠️ No se pudo guardar el split del pago:', splitError.message);
                        }
                    }

                    // Emitir los tickets en el ticketing externo (idempotente, no bloqueante).
                    await emitTicketsForOrder(order.id);
                }
                break;
            }

            // 🔄 CUENTA CONNECT ACTUALIZADA
            case 'account.updated': {
                const account = event.data.object;
                console.log(`🔄 Account Connect Refreshed: ${account.id}`);
                await connectService.syncAccountStatus(account.id);
                break;
            }

            // ⏰ SESSION EXPIRED (Checkout not completed in 24h)
            case 'checkout.session.expired': {
                const session = event.data.object;
                console.log(`⏰ Session expired: ${session.id}`);

                // Automatically cancel order
                const order = await orderService.getOrderByStripeSessionId(session.id);
                if (order && order.estado === 'pending') {
                    await orderService.cancelOrder(order.id);
                    console.log(`❌ Order ${order.id} canceled due to session expiration`);
                }
                break;
            }

            // ✅ PAYMENT SUCCESSFUL (Backup/Additional confirmation)
            case 'payment_intent.succeeded': {
                const paymentIntent = event.data.object;
                console.log(`✅ Payment Intent successful: ${paymentIntent.id}`);

                // Double check in case checkout.session.completed failed
                const order = await orderService.getOrderByPaymentIntentId(paymentIntent.id);
                if (order && order.estado === 'pending') {
                    await orderService.confirmOrder(null, paymentIntent.id);
                    console.log(`✅ Order ${order.id} confirmed by payment_intent.succeeded`);
                }
                break;
            }

            // ❌ PAYMENT FAILED
            case 'payment_intent.payment_failed': {
                const paymentIntent = event.data.object;
                console.log(`❌ Payment failed: ${paymentIntent.id}`);

                // Mark order as canceled
                const order = await orderService.getOrderByPaymentIntentId(paymentIntent.id);
                if (order && order.estado === 'pending') {
                    await orderService.cancelOrder(order.id);
                    console.log(`❌ Order ${order.id} canceled due to payment failure`);
                }
                break;
            }

            // 💰 REFUND PROCESSED
            case 'charge.refunded': {
                const charge = event.data.object;
                console.log(`💰 Refund processed: ${charge.id}`);

                const order = await orderService.getOrderByPaymentIntentId(charge.payment_intent);
                if (order && order.estado === 'paid') {
                    await orderService.refundOrder(order.id);
                    console.log(`💰 Order ${order.id} marked as refunded`);

                    // Revertir la transferencia al partner para clawback del 95%
                    if (order.stripeTransferId && order.partnerAmount && stripe) {
                        try {
                            const reversalAmount = Math.round(parseFloat(order.partnerAmount) * 100);
                            const reversal = await stripe.transfers.createReversal(order.stripeTransferId, {
                                amount: reversalAmount,
                                description: `Reversal for refunded order ${order.id}`,
                                metadata: { orderId: order.id.toString() }
                            });
                            console.log(`↩️  Transfer reversal creada: ${reversal.id} (${reversalAmount} centavos)`);
                        } catch (reversalError) {
                            console.error(`⚠️  Error revirtiendo transfer de orden ${order.id}:`, reversalError.message);
                            // No re-lanzamos: la orden ya está marcada como refunded.
                            // La reversión fallida queda en logs para que el admin actúe manualmente.
                        }
                    }

                    // Propagar la anulación al ticketing: los tickets de esta orden
                    // dejan de ser válidos en puerta (el check-in por escaneo ya rechaza
                    // tickets refunded/void).
                    await voidTicketsForOrder(order.id);
                }
                break;
            }

            // ⚠️ DISPUTE CREATED
            case 'charge.dispute.created': {
                const dispute = event.data.object;
                console.log(`⚠️ Dispute created: ${dispute.id}`);

                let orderId = null;
                try {
                    const order = await orderService.getOrderByPaymentIntentId(dispute.payment_intent);
                    orderId = order?.id ?? null;
                } catch (lookupErr) {
                    console.error('No se pudo localizar la orden de la disputa:', lookupErr.message);
                }

                try {
                    await sendDisputeNotification({
                        id: dispute.id,
                        amount: dispute.amount,
                        currency: dispute.currency,
                        reason: dispute.reason,
                        evidenceDueBy: dispute.evidence_details?.due_by,
                        chargeId: dispute.charge,
                        orderId
                    });
                    console.log(`📧 Notificación de disputa enviada al admin`);
                } catch (mailErr) {
                    console.error('⚠️  Error enviando email de disputa:', mailErr.message);
                }
                break;
            }

            default:
                console.log(`⚠️ Unhandled event: ${event.type}`);
        }

        // Respond to Stripe that we received the event successfully
        res.json({ received: true });

    } catch (error) {
        console.error('❌ Error processing webhook:', error);
        // Return 500 so Stripe retries sending
        res.status(500).json({
            success: false,
            message: 'Error processing webhook event',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    createCheckout,
    handleSuccess,
    handleCancel,
    handleWebhook
};