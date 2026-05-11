import * as cron from 'node-cron';
import { SyncService } from './sync-service';

type SyncSchedulerGlobalState = {
  job: cron.ScheduledTask | null;
};

const syncSchedulerState = ((globalThis as typeof globalThis & {
  __dashboardSyncScheduler?: SyncSchedulerGlobalState;
}).__dashboardSyncScheduler ??= {
  job: null,
});

export class SyncScheduler {
  static start() {
    if (syncSchedulerState.job) {
      console.log('[SyncScheduler] Job already running');
      return;
    }

    // Schedule sync every hour
    syncSchedulerState.job = cron.schedule('0 * * * *', async () => {
      console.log('[SyncScheduler] Starting scheduled sync...');
      try {
        const result = await SyncService.syncProjects();
        console.log('[SyncScheduler] Sync completed:', result);
      } catch (error) {
        console.error('[SyncScheduler] Sync failed:', error);
      }
    });

    console.log('[SyncScheduler] Job started (Hourly)');
  }

  static stop() {
    if (syncSchedulerState.job) {
      syncSchedulerState.job.stop();
      syncSchedulerState.job = null;
      console.log('[SyncScheduler] Job stopped');
    }
  }

  static isRunning() {
    return !!syncSchedulerState.job;
  }
}
