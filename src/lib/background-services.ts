import 'server-only';

function areBackgroundServicesEnabled() {
  return process.env.ENABLE_BACKGROUND_SERVICES === 'true';
}

export async function startBackgroundServices() {
  if (!areBackgroundServicesEnabled()) {
    console.log('[BackgroundServices] Disabled. Set ENABLE_BACKGROUND_SERVICES=true to enable sync scheduler and WebSocket.');
    return;
  }

  const [{ SyncScheduler }, { WebSocketServer }] = await Promise.all([
    import('./sync-scheduler'),
    import('./websocket'),
  ]);

  SyncScheduler.start();
  WebSocketServer.init(3001);
}
