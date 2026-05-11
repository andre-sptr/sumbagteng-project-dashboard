export async function register() {
  console.log('[Instrumentation] register() called');
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('[Instrumentation] Running on Node.js runtime');
    const { startBackgroundServices } = await import('./lib/background-services');

    await startBackgroundServices();
  }
}
