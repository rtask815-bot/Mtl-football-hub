import { SyncService } from './SyncService.ts';

export { SyncService };
export const StorageCache = SyncService;
export const DEFAULT_MATCHES_BACKUP = SyncService.getDefaultMatchesBackup();
export const DEFAULT_FIXTURES_BACKUP = SyncService.getDefaultFixturesBackup();
export const DEFAULT_TRENDING_BACKUP = SyncService.getDefaultTrendingBackup();

export function startGlobalBackgroundSync() {
  SyncService.startHeartbeat();
}

export function executeGlobalDataSync() {
  return SyncService.syncAll();
}

export default StorageCache;
