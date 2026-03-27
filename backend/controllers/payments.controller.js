// Verificar que la clave de Stripe existe antes de inicializar
if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('⚠️  STRIPE_SECRET_KEY no configurada. Los pagos no funcionarán.');
}
const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;
const orderService = require('../services/order.service');
const connectService = require('../services/connect.service');
const { Evento, User } = require('../schemas');

const PLATFORM_FEE_PERCENT = 0.05; // 5% para la plataforma

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
                partnerConnectData = {
                    stripeAccountId: partner.stripeAccountId,
                    applicationFeeAmount: Math.round(totalAmountInCents * PLATFORM_FEE_PERCENT)
                };
                console.log(`💳 Pago con split — plataforma: ${partnerConnectData.applicationFeeAmount} centavos, partner: ${partner.stripeAccountId}`);
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

                    // Si hubo split, recuperar el PaymentIntent para obtener el transfer y la fee
                    if (session.payment_intent) {
                        try {
                            const paymentIntent = await stripe.paymentIntents.retrieve(
                                session.payment_intent,
                                { expand: ['latest_charge.transfer'] }
                            );
                            const charge = paymentIntent.latest_charge;
                            const transfer = charge?.transfer;
                            const applicationFeeAmount = paymentIntent.application_fee_amount;

                            if (applicationFeeAmount || transfer) {
                                const totalCents = paymentIntent.amount;
                                const feeCents = applicationFeeAmount || 0;
                                const partnerCents = totalCents - feeCents;

                                await orderService.updateSplitData(order.id, {
                                    platformFee: (feeCents / 100).toFixed(2),
                                    partnerAmount: (partnerCents / 100).toFixed(2),
                                    stripeTransferId: transfer?.id || null
                                });
                                console.log(`💰 Split guardado — fee: ${feeCents / 100}, partner: ${partnerCents / 100}`);
                            }
                        } catch (splitError) {
                            console.error('⚠️ No se pudo guardar el split del pago:', splitError.message);
                        }
                    }
                }
                break;
            }

            // 🔄 CUENTA CONNECT ACTUALIZADA
            case 'account.updated': {
                const account = event.data.object;
                console.log(`🔄 Cuenta Connect actualizada: ${account.id}`);
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

                // Update order
                const order = await orderService.getOrderByPaymentIntentId(charge.payment_intent);
                if (order && order.estado === 'paid') {
                    await orderService.refundOrder(order.id);
                    console.log(`💰 Order ${order.id} marked as refunded`);
                }
                break;
            }

            // ⚠️ DISPUTE CREATED
            case 'charge.dispute.created': {
                const dispute = event.data.object;
                console.log(`⚠️ Dispute created: ${dispute.id}`);
                // TODO: Notify administrator
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