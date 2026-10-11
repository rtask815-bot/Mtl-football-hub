import { supabase } from './supabase.ts';

/* ============================================================
   MTL FOOTBALL INTELLIGENCE HUB - UNIFIED SYNC SERVICE
   Multi-Layer LocalStorage Caching & 30-Second Heartbeat Engine
   ============================================================ */

export interface SyncEventPayload<T = any> {
  key: string;
  data: T;
  timestamp: number;
}

export interface ConnectivityState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingSyncCount: number;
  lastSyncTimestamp: number;
  offlineSince: number | null;
}

export type SyncSubscriber<T = any> = (payload: SyncEventPayload<T>) => void;
export type ConnectivitySubscriber = (state: ConnectivityState) => void;

class SyncServiceManager {
  private heartbeatInterval: any = null;
  private isSyncing = false;
  private isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private offlineSince: number | null = null;
  private lastSyncTimestamp: number = Date.now();
  private pendingQueue: Array<{ id: string; type: string; payload: any; timestamp: number }> = [];
  
  private readonly HEARTBEAT_MS = 30000; // 30-second heartbeat interval
  private subscribers: Map<string, Set<SyncSubscriber>> = new Map();
  private connectivitySubscribers: Set<ConnectivitySubscriber> = new Set();

  constructor() {
    this.initDefaultBackups();
    this.initConnectivityListeners();
    this.loadPendingQueue();
  }

  // --- 1. CONNECTIVITY MONITORING & QUEUE ---

  private initConnectivityListeners(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.offlineSince = null;
        this.notifyConnectivityChange();
        // Immediately sync all datasets and flush queue on reconnection
        this.syncAll();
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
        this.offlineSince = Date.now();
        this.notifyConnectivityChange();
      });
    }
  }

  public getConnectivityState(): ConnectivityState {
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      pendingSyncCount: this.pendingQueue.length,
      lastSyncTimestamp: this.lastSyncTimestamp,
      offlineSince: this.offlineSince
    };
  }

  public subscribeConnectivity(callback: ConnectivitySubscriber): () => void {
    this.connectivitySubscribers.add(callback);
    callback(this.getConnectivityState());
    return () => {
      this.connectivitySubscribers.delete(callback);
    };
  }

  private notifyConnectivityChange(): void {
    const state = this.getConnectivityState();
    this.connectivitySubscribers.forEach(cb => {
      try { cb(state); } catch (e) {}
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('mtl_connectivity_changed', { detail: state })
      );
    }
  }

  public queuePendingOperation(type: string, payload: any): void {
    const item = {
      id: 'pending_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      type,
      payload,
      timestamp: Date.now()
    };
    this.pendingQueue.push(item);
    this.savePendingQueue();
    this.notifyConnectivityChange();
  }

  private loadPendingQueue(): void {
    const saved = this.get('pending_sync_queue', []);
    if (Array.isArray(saved)) {
      this.pendingQueue = saved;
    }
    const lastSync = this.get('last_heartbeat_timestamp', Date.now());
    this.lastSyncTimestamp = Number(lastSync) || Date.now();
  }

  private savePendingQueue(): void {
    this.set('pending_sync_queue', this.pendingQueue);
  }

  public clearPendingQueue(): void {
    this.pendingQueue = [];
    this.savePendingQueue();
    this.notifyConnectivityChange();
  }

  // --- 2. LOCAL STORAGE BACKUP MANAGEMENT ---

  public get<T = any>(key: string, fallback: T | null = null): T | null {
    try {
      const raw = localStorage.getItem('mtl_hub_' + key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  public set<T = any>(key: string, val: T): void {
    try {
      localStorage.setItem('mtl_hub_' + key, JSON.stringify(val));
      this.notifySubscribers(key, val);
    } catch (e) {}
  }

  public remove(key: string): void {
    try {
      localStorage.removeItem('mtl_hub_' + key);
    } catch (e) {}
  }

  // --- 3. EVENT SUBSCRIPTION PROTOCOL ---

  public subscribe<T = any>(key: string, callback: SyncSubscriber<T>): () => void {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    this.subscribers.get(key)!.add(callback as SyncSubscriber);

    return () => {
      const set = this.subscribers.get(key);
      if (set) {
        set.delete(callback as SyncSubscriber);
      }
    };
  }

  private notifySubscribers<T = any>(key: string, data: T): void {
    const payload: SyncEventPayload<T> = {
      key,
      data,
      timestamp: Date.now()
    };

    const directSet = this.subscribers.get(key);
    if (directSet) {
      directSet.forEach(cb => {
        try { cb(payload); } catch (e) {}
      });
    }

    const wildcardSet = this.subscribers.get('*');
    if (wildcardSet) {
      wildcardSet.forEach(cb => {
        try { cb(payload); } catch (e) {}
      });
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('mtl_data_synced', { detail: payload })
      );
    }
  }

  // --- 4. 30-SECOND HEARTBEAT BACKGROUND SYNC ---

  public startHeartbeat(): void {
    if (this.heartbeatInterval) return;

    // Run first sync in background
    this.syncAll();

    // Enforce strict 30-second heartbeat interval
    this.heartbeatInterval = setInterval(() => {
      this.syncAll();
    }, this.HEARTBEAT_MS);
  }

  public stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  public async syncAll(): Promise<void> {
    if (this.isSyncing) return;
    
    // If browser reports offline, mark state and return cached data
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.isOnline = false;
      this.notifyConnectivityChange();
      return;
    }

    this.isSyncing = true;
    this.notifyConnectivityChange();

    try {
      await Promise.allSettled([
        this.syncMatches(),
        this.syncNews(),
        this.syncFixtures(),
        this.syncTrending(),
        this.syncGroups(),
        this.syncProfiles()
      ]);

      // If we had pending queued operations, flush them
      if (this.pendingQueue.length > 0) {
        this.pendingQueue = [];
        this.savePendingQueue();
      }

      this.isOnline = true;
      this.lastSyncTimestamp = Date.now();
      this.set('last_heartbeat_timestamp', this.lastSyncTimestamp);
    } catch (e) {
      // If error occurred during request, may be offline
      this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : false;
    } finally {
      this.isSyncing = false;
      this.notifyConnectivityChange();
    }
  }

  // Match Cards Sync
  public async syncMatches(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        this.set('matches', data);
        return;
      }
    } catch (e) {}

    // Database fallback from backend API / Firebase
    try {
      const res = await fetch('/api/matches');
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.matches) && json.matches.length > 0) {
          this.set('matches', json.matches);
        }
      }
    } catch (e) {}
  }

  // News Articles Sync
  public async syncNews(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        this.set('news_articles', data);
        return;
      }
    } catch (e) {}

    try {
      const res = await fetch('/api/news');
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.news) && json.news.length > 0) {
          this.set('news_articles', json.news);
        }
      }
    } catch (e) {}
  }

  // Fixtures Sync
  public async syncFixtures(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('fixtures')
        .select('*')
        .order('match_date', { ascending: true });

      if (!error && data && data.length > 0) {
        this.set('fixtures', data);
        return;
      }
    } catch (e) {}

    try {
      const res = await fetch('/api/fixtures');
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.fixtures) && json.fixtures.length > 0) {
          this.set('fixtures', json.fixtures);
        }
      }
    } catch (e) {}
  }

  // Trending Topics Sync
  public async syncTrending(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('trending')
        .select('*')
        .order('rank', { ascending: true });

      if (!error && data && data.length > 0) {
        this.set('trending', data);
        return;
      }
    } catch (e) {}

    try {
      const res = await fetch('/api/trending');
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.trending) && json.trending.length > 0) {
          this.set('trending', json.trending);
        }
      }
    } catch (e) {}
  }

  // Chat Groups & Members Sync
  public async syncGroups(): Promise<void> {
    try {
      const { data: groups, error: gErr } = await supabase
        .from('chat_groups')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: members } = await supabase
        .from('group_members')
        .select('*');

      if (!gErr && groups) {
        const membersByGroup: Record<string, any[]> = {};
        if (members) {
          members.forEach((m: any) => {
            if (!membersByGroup[m.group_id]) membersByGroup[m.group_id] = [];
            membersByGroup[m.group_id].push(m);
          });
        }

        const fullGroups = groups.map((g: any) => ({
          ...g,
          group_members: membersByGroup[g.id] || []
        }));

        this.set('groups', fullGroups);
      }
    } catch (e) {}
  }

  // Registered Community Profiles Sync
  public async syncProfiles(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('username', { ascending: true });

      if (!error && data && data.length > 0) {
        this.set('all_users', data);
      }
    } catch (e) {}
  }

  // --- 5. INITIAL DATABASE SYNC ---

  private initDefaultBackups(): void {
    // Dynamically load from database on initial load
    this.syncAll().catch(() => {});
  }

  public getDefaultMatchesBackup() {
    return this.get('matches', []);
  }

  public getDefaultFixturesBackup() {
    return this.get('fixtures', []);
  }

  public getDefaultTrendingBackup() {
    return this.get('trending', []);
  }
}

export const SyncService = new SyncServiceManager();
export default SyncService;
