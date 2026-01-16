// Validar que la API key de Stripe esté configurada
if (!process.env.STRIPE_SECRET_KEY) {
    console.error('STRIPE_SECRET_KEY no está configurada');
}

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Crear sesión de checkout de Stripe
const createCheckout = async (req, res) => {
    try {
        // Verificar que Stripe esté configurado
        if (!process.env.STRIPE_SECRET_KEY) {
            return res.status(500).json({
                success: false,
                message: 'Stripe no está configurado en el servidor'
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

        console.log('Datos recibidos:', {
            amount,
            eventId,
            eventTitle,
            userId,
            userEmail,
            quantity,
            eventImageUrl
        });

        // Validar datos requeridos
        if (!amount || !eventId || !userId || !userEmail || !eventTitle) {
            return res.status(400).json({
                success: false,
                message: 'Faltan datos requeridos: amount, eventId, userId, userEmail, eventTitle'
            });
        }

        // Validar y limpiar URL de imagen
        let validImageUrl = null;
        if (eventImageUrl && typeof eventImageUrl === 'string') {
            try {
                // Verificar que sea una URL válida
                new URL(eventImageUrl);
                // Verificar que comience con http o https
                if (eventImageUrl.startsWith('http://') || eventImageUrl.startsWith('https://')) {
                    validImageUrl = eventImageUrl;
                }
            } catch (error) {
                console.log('URL de imagen inválida, se omitirá:', eventImageUrl);
            }
        }

        // Crear sesión de checkout
        console.log('Intentando crear sesión de Stripe...');
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
                    unit_amount: Math.round(amount * 100), // Stripe usa centavos
                },
                quantity: quantity,
            }],
            mode: 'payment',
            success_url: `https://ritmo-local-test.netlify.app/payment/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `https://ritmo-local-test.netlify.app/payment/cancel`,
            metadata: {
                eventId: eventId.toString(),
                userId: userId.toString(),
                quantity: quantity.toString()
            },
            customer_email: userEmail
        });

        console.log('Sesión creada exitosamente:', session.id);
        res.status(200).json({
            success: true,
            sessionId: session.id,
            url: session.url,
            message: 'Sesión de checkout creada exitosamente'
        });

    } catch (error) {
        console.error('Error detallado creando checkout session:', {
            message: error.message,
            type: error.type,
            code: error.code,
            stack: error.stack
        });
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor al crear la sesión de pago',
            details: error.message,
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Manejar éxito del pago
const handleSuccess = async (req, res) => {
    try {
        const { session_id } = req.query;

        if (!session_id) {
            return res.status(400).json({
                success: false,
                message: 'Session ID es requerido'
            });
        }

        // Recuperar la sesión de Stripe
        const session = await stripe.checkout.sessions.retrieve(session_id);

        if (session.payment_status === 'paid') {
            const { eventId, userId, quantity } = session.metadata;

            res.status(200).json({
                success: true,
                message: 'Pago procesado exitosamente',
                data: {
                    sessionId: session_id,
                    paymentStatus: session.payment_status,
                    eventId,
                    userId,
                    quantity,
                    amountTotal: session.amount_total,
                    currency: session.currency
                }
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'El pago no fue completado exitosamente',
                paymentStatus: session.payment_status
            });
        }

    } catch (error) {
        console.error('Error procesando pago exitoso:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor al procesar el pago',
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

module.exports = {
    createCheckout,
    handleSuccess,
    handleCancel
};