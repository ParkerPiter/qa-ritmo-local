/**
 * Diagnóstico de cuentas Stripe Connect — consulta Stripe directamente.
 *
 * No depende de la base de datos: el estado real (details_submitted,
 * charges_enabled, requirements) vive en Stripe. Útil para saber por qué
 * una cuenta sigue "pending" después del onboarding.
 *
 * Uso:
 *   node script/check-connect.js                 → lista todas las cuentas Connect
 *   node script/check-connect.js acct_XXXX       → revisa solo esa cuenta
 *
 * El backend marca stripeOnboardingDone=true cuando:
 *   details_submitted === true  &&  charges_enabled === true
 */
require('dotenv').config();

const { stripe, stripeMode, isProduction } = require('../config/stripe');

if (!stripe) {
  console.error(`❌ No hay llave secreta de Stripe configurada para STRIPE_MODE=${stripeMode}`);
  process.exit(1);
}

function printAccount(account) {
  const onboardingDone = account.details_submitted && account.charges_enabled;
  const req = account.requirements || {};

  console.log('\n' + '='.repeat(60));
  console.log(`🏦 ${account.id}`);
  console.log(`   email             : ${account.email || '—'}`);
  console.log(`   type              : ${account.type}`);
  console.log(`   details_submitted : ${account.details_submitted}`);
  console.log(`   charges_enabled   : ${account.charges_enabled}`);
  console.log(`   payouts_enabled   : ${account.payouts_enabled}`);
  console.log(`   disabled_reason   : ${req.disabled_reason || '—'}`);
  console.log(`   currently_due     : ${(req.currently_due || []).join(', ') || '—'}`);
  console.log(`   past_due          : ${(req.past_due || []).join(', ') || '—'}`);
  console.log(`   eventually_due    : ${(req.eventually_due || []).join(', ') || '—'}`);
  console.log(`   pending_verification: ${(req.pending_verification || []).join(', ') || '—'}`);
  console.log(`   → stripeOnboardingDone debería ser: ${onboardingDone ? '✅ true' : '❌ false'}`);

  if (!onboardingDone) {
    if (!account.details_submitted) {
      console.log('   ⚠️  El onboarding NO se completó (faltan formularios en Stripe).');
    } else if (!account.charges_enabled) {
      console.log('   ⚠️  Datos enviados pero Stripe aún no habilita cobros.');
      console.log('       Revisá currently_due / pending_verification arriba.');
    }
  }
}

async function main() {
  console.log(`🔑 Modo Stripe: ${isProduction ? 'LIVE' : 'TEST / sandbox'} (STRIPE_MODE=${stripeMode})`);

  const idArg = process.argv.slice(2).find(a => a.startsWith('acct_'));

  if (idArg) {
    const account = await stripe.accounts.retrieve(idArg);
    printAccount(account);
    return;
  }

  const list = await stripe.accounts.list({ limit: 100 });
  if (!list.data.length) {
    console.log('⚠️  No hay cuentas Connect en este Stripe.');
    return;
  }
  console.log(`Encontradas ${list.data.length} cuenta(s) Connect:`);
  list.data.forEach(printAccount);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exitCode = 1;
});
