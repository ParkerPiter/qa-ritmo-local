// Verificar que la clave de Stripe existe antes de inicializar
if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('⚠️  STRIPE_SECRET_KEY no configurada. Los pagos no funcionarán.');
}
const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;
const orderService = require('../services/order.service');

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
                ? 'https://ritmo-local-test.netlify.app'
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


        // Crear sesión de checkout
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: currency,
                    product_data: {
                        name: eventTitle,
                        description: `Entrada para el evento: ${eventTitle}`,
                        images: validImageUrl ? [validImageUrl] : [],
                    },
                    unit_amount: unitAmountInCents // Stripe usa centavos
                },
                quantity: quantity || 1 ,
            }],
            mode: 'payment',
            success_url: `${baseUrl}?showSuccessModal=true&session_id={CHECKOUT_SESSION_ID}&eventId=${eventId}`,
            cancel_url: `${baseUrl}?showCancelModal=true&userId=${userId}&eventId=${eventId}`,
            metadata: {
                eventId: eventId.toString(),
                userId: userId.toString(),
                quantity: (quantity || 1).toString()
            },
            customer_email: userEmail
        });

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

        // Recuperar la sesión de Stripe
        const session = await stripe.checkout.sessions.retrieve(session_id);

        // Buscar la orden en la base de datos
        const order = await orderService.getOrderByStripeSessionId(session_id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Not found order associated with this session ID'
            });
        }

        res.status(200).json({
            success: true,
            message: order.estado === 'paid' 
                ? 'Confirm payment successful and order confirmed' 
                : 'Payment confirmation in process',
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

                // Confirm order if payment was successful
                if (session.payment_status === 'paid') {
                    const order = await orderService.confirmOrder(
                        session.id,
                        session.payment_intent
                    );
                    console.log(`✅ Order ${order.id} automatically confirmed by webhook`);
                }
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