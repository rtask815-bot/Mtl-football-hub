import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  initializeFirestore,
  disableNetwork,
  setLogLevel,
  getDocFromServer,
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc,
  query, 
  where, 
  limit, 
  onSnapshot 
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { 
  getStorage, 
  ref, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';
import { supabase } from './supabase.ts';
import { StorageCache } from './storageCache.ts';

// Suppress internal 10-second backend connection warning when Cloud Firestore API is offline or unreachable
try {
  setLogLevel('silent');
} catch {}

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const db = (() => {
  try {
    return (firebaseConfig as any).firestoreDatabaseId
      ? initializeFirestore(app, {
          experimentalForceLongPolling: true,
          experimentalAutoDetectLongPolling: true,
        }, (firebaseConfig as any).firestoreDatabaseId)
      : initializeFirestore(app, {
          experimentalForceLongPolling: true,
          experimentalAutoDetectLongPolling: true,
        });
  } catch {
    return (firebaseConfig as any).firestoreDatabaseId
      ? getFirestore(app, (firebaseConfig as any).firestoreDatabaseId)
      : getFirestore(app);
  }
})();

// Proactively test Firestore connectivity
// If the backend cannot be reached or the Firestore API has not been enabled on the project,
// gracefully switch to offline mode to prevent 10s connection timeout warnings.
if (typeof window !== 'undefined') {
  (async () => {
    try {
      const testTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2500));
      await Promise.race([
        getDocFromServer(doc(db, 'test', 'connection')),
        testTimeout
      ]);
    } catch {
      try {
        await disableNetwork(db);
      } catch {}
    }
  })();
}

export const auth = getAuth(app);
export const storage = getStorage(app);

// Types
export type StatusType = 'match_card' | 'reel' | 'image';

export interface MatchCardStatus {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  statusType?: StatusType; // 'match_card' | 'reel' | 'image'
  matchFixture: string;
  league?: string;
  homeTeam?: string;
  awayTeam?: string;
  predictedScore?: string;
  predictionPick: string;
  decimalOdds?: number;
  confidenceStars?: number;
  caption?: string;
  mediaUrl?: string; // Image or Video URL
  mediaType?: 'image' | 'video';
  themeColor?: string; // 'emerald' | 'cyan' | 'purple' | 'amber' | 'rose'
  viewsCount?: number;
  likesCount?: number;
  viewers?: string[];
  likers?: string[];
  createdAt: string;
  expiresAt: string;
}

export interface UserActivityItem {
  id: string;
  userId: string;
  type: 'status_post' | 'profile_update' | 'password_change' | 'prediction_added' | 'login' | 'favorite_team' | 'media_upload' | 'reaction_added';
  title: string;
  description: string;
  timestamp: string;
  badge?: string;
}

export interface UserPredictionItem {
  id: string;
  userId: string;
  fixture: string;
  league: string;
  pick: string;
  predictedScore?: string;
  odds: number;
  outcome: 'WON' | 'LOST' | 'PENDING' | 'REFUND';
  finalScore?: string;
  matchDate: string;
  createdAt: string;
}

export interface MediaAsset {
  id: string;
  userId: string;
  name: string;
  downloadUrl: string;
  storagePath?: string;
  contentType: string;
  size: number;
  mediaType: 'image' | 'video';
  tags?: string;
  createdAt: string;
}

export interface MessageReactionRecord {
  id: string;
  messageId: string;
  emoji: string;
  userId: string;
  username?: string;
  timestamp: string;
}

export interface MatchReactionRecord {
  id: string;
  matchId: string;
  reactionType: string;
  userId: string;
  timestamp: string;
}

// Local cache keys
const STATUS_CACHE_KEY = 'mtl_real_statuses_v4';
const ACTIVITY_CACHE_KEY = 'mtl_real_activities_v4';
const PREDICTION_CACHE_KEY = 'mtl_real_predictions_v4';
const MEDIA_CACHE_KEY = 'mtl_real_media_v4';
const MATCHES_CACHE_KEY = 'mtl_real_matches_v4';
const FIXTURES_CACHE_KEY = 'mtl_real_fixtures_v4';
const NEWS_CACHE_KEY = 'mtl_real_news_v4';
const TRENDING_CACHE_KEY = 'mtl_real_trending_v4';

// Clean empty initial state - absolutely NO mock data
export const INITIAL_COMMUNITY_STATUSES: MatchCardStatus[] = [];

function getCachedList<T>(key: string, fallback: T[] = []): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setCachedList<T>(key: string, list: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch (e) {
    console.warn('Cache write warning:', e);
  }
}

// ============================================================================
// 1. DIGITAL IMAGE & VIDEO STORAGE (FIREBASE STORAGE + FIRESTORE PERSISTENCE)
// ============================================================================

export async function uploadDigitalMedia(
  file: File | Blob,
  fileName: string,
  userId: string,
  onProgress?: (percent: number) => void
): Promise<MediaAsset> {
  const isVideo = file.type.startsWith('video/');
  const mediaType: 'image' | 'video' = isVideo ? 'video' : 'image';
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const mediaId = `media_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  let downloadUrl = '';

  // 1. Direct Backend Upload
  try {
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const res = await fetch('/api/media/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: safeName,
        data: base64Data,
        contentType: file.type || (isVideo ? 'video/mp4' : 'image/jpeg'),
      }),
    });

    if (res.ok) {
      const json = await res.json();
      downloadUrl = json.downloadUrl;
      if (onProgress) onProgress(100);
    }
  } catch (backendErr) {
    console.warn('Backend upload notice:', backendErr);
  }

  // 2. Also try Firebase Storage
  const storagePath = `uploads/${mediaType}s/${userId}/${Date.now()}_${safeName}`;
  try {
    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: file.type || (isVideo ? 'video/mp4' : 'image/jpeg'),
    });

    await new Promise<void>((resolve) => {
      uploadTask.on(
        'state_changed',
        (snap) => {
          const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
          if (onProgress) onProgress(pct);
        },
        () => resolve(),
        async () => {
          try {
            const fbUrl = await getDownloadURL(uploadTask.snapshot.ref);
            if (fbUrl) downloadUrl = fbUrl;
          } catch {}
          resolve();
        }
      );
    });
  } catch (storageErr) {
    console.warn('Firebase Storage upload notice:', storageErr);
  }

  if (!downloadUrl) {
    throw new Error('Failed to upload file. Please try again.');
  }

  const asset: MediaAsset = {
    id: mediaId,
    userId,
    name: safeName,
    downloadUrl,
    storagePath,
    contentType: file.type,
    size: file.size,
    mediaType,
    createdAt: new Date().toISOString(),
  };

  // Save to Firebase Firestore /media/{mediaId}
  try {
    await setDoc(doc(db, 'media', mediaId), asset);
  } catch (fsErr) {
    console.warn('Firestore media record notice:', fsErr);
  }

  // Cache locally
  const currentMedia = getCachedList<MediaAsset>(`${MEDIA_CACHE_KEY}_${userId}`, []);
  setCachedList(`${MEDIA_CACHE_KEY}_${userId}`, [asset, ...currentMedia]);

  // Log activity in Firestore and backend
  await logUserActivity(userId, {
    type: 'media_upload',
    title: `Uploaded ${mediaType === 'video' ? 'Reel Video Clip' : 'Digital Image'}`,
    description: `File: ${safeName} (${(file.size / 1024).toFixed(1)} KB) saved to Firebase digital storage.`,
  });

  return asset;
}

export async function fetchUserMedia(userId: string): Promise<MediaAsset[]> {
  try {
    const q = query(collection(db, 'media'), where('userId', '==', userId));
    const snap = await getDocs(q);
    const list: MediaAsset[] = [];
    snap.forEach(d => {
      const data = d.data() as MediaAsset;
      if (data && data.id) list.push(data);
    });
    if (list.length > 0) {
      setCachedList(`${MEDIA_CACHE_KEY}_${userId}`, list);
      return list;
    }
  } catch {}

  return getCachedList<MediaAsset>(`${MEDIA_CACHE_KEY}_${userId}`, []);
}

export async function deleteMediaAsset(mediaId: string, userId: string, storagePath?: string): Promise<void> {
  const local = getCachedList<MediaAsset>(`${MEDIA_CACHE_KEY}_${userId}`, []);
  setCachedList(`${MEDIA_CACHE_KEY}_${userId}`, local.filter(m => m.id !== mediaId));

  // Delete from Firestore
  try {
    const { deleteDoc } = await import('firebase/firestore');
    await deleteDoc(doc(db, 'media', mediaId));
  } catch {}

  if (storagePath) {
    try {
      const storageRef = ref(storage, storagePath);
      await deleteObject(storageRef);
    } catch {}
  }
}

// ============================================================================
// 2. REAL USER STATUSES (MATCH CARDS, REELS, IMAGES) SAVED TO SUPABASE
// ============================================================================

// Serialization helper for Supabase table: public.user_statuses
function toSupabaseStatusRecord(status: MatchCardStatus) {
  return {
    id: status.id,
    user_id: status.userId,
    user_name: status.userName || 'Anonymous Fan',
    user_avatar: status.userAvatar || null,
    status_type: status.statusType || 'match_card',
    match_fixture: status.matchFixture || 'Match Day',
    league: status.league || null,
    home_team: status.homeTeam || null,
    away_team: status.awayTeam || null,
    predicted_score: status.predictedScore || null,
    prediction_pick: status.predictionPick || '',
    decimal_odds: status.decimalOdds != null ? Number(status.decimalOdds) : 1.95,
    confidence_stars: status.confidenceStars != null ? Number(status.confidenceStars) : 5,
    caption: status.caption || null,
    media_url: status.mediaUrl || null,
    media_type: status.mediaType || 'image',
    theme_color: status.themeColor || 'emerald',
    views_count: status.viewsCount != null ? Number(status.viewsCount) : 1,
    likes_count: status.likesCount != null ? Number(status.likesCount) : 0,
    viewers: Array.isArray(status.viewers) ? status.viewers : [status.userId],
    likers: Array.isArray(status.likers) ? status.likers : [],
    created_at: status.createdAt,
    expires_at: status.expiresAt
  };
}

// Deserialization helper for Supabase row -> MatchCardStatus
function fromSupabaseStatusRecord(row: any): MatchCardStatus {
  return {
    id: String(row.id),
    userId: String(row.user_id || row.userId || ''),
    userName: String(row.user_name || row.userName || 'Anonymous Fan'),
    userAvatar: row.user_avatar || row.userAvatar || undefined,
    statusType: (row.status_type || row.statusType || 'match_card') as StatusType,
    matchFixture: String(row.match_fixture || row.matchFixture || 'Match Day'),
    league: row.league || undefined,
    homeTeam: row.home_team || row.homeTeam || undefined,
    awayTeam: row.away_team || row.awayTeam || undefined,
    predictedScore: row.predicted_score || row.predictedScore || undefined,
    predictionPick: String(row.prediction_pick || row.predictionPick || ''),
    decimalOdds: Number(row.decimal_odds ?? row.decimalOdds ?? 1.95),
    confidenceStars: Number(row.confidence_stars ?? row.confidenceStars ?? 5),
    caption: row.caption || undefined,
    mediaUrl: row.media_url || row.mediaUrl || undefined,
    mediaType: (row.media_type || row.mediaType || 'image') as 'image' | 'video',
    themeColor: row.theme_color || row.themeColor || 'emerald',
    viewsCount: Number(row.views_count ?? row.viewsCount ?? 1),
    likesCount: Number(row.likes_count ?? row.likesCount ?? 0),
    viewers: Array.isArray(row.viewers)
      ? row.viewers
      : typeof row.viewers === 'string'
      ? (() => { try { return JSON.parse(row.viewers); } catch { return []; } })()
      : [],
    likers: Array.isArray(row.likers)
      ? row.likers
      : typeof row.likers === 'string'
      ? (() => { try { return JSON.parse(row.likers); } catch { return []; } })()
      : [],
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    expiresAt: row.expires_at || row.expiresAt || new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
  };
}

export async function saveUserMatchStatus(
  status: Omit<MatchCardStatus, 'id' | 'createdAt' | 'expiresAt' | 'viewsCount' | 'likesCount' | 'viewers' | 'likers'>
): Promise<MatchCardStatus> {
  const statusId = `status_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const fullStatus: MatchCardStatus = {
    ...status,
    id: statusId,
    statusType: status.statusType || (status.mediaType === 'video' ? 'reel' : status.mediaType === 'image' && !status.predictedScore ? 'image' : 'match_card'),
    viewsCount: 1,
    likesCount: 0,
    viewers: [status.userId],
    likers: [],
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  // 1. Optimistic Local Cache Update
  const currentList = getCachedList<MatchCardStatus>(STATUS_CACHE_KEY, []);
  const updated = [fullStatus, ...currentList.filter(s => s.id !== statusId)];
  setCachedList(STATUS_CACHE_KEY, updated);

  try {
    window.dispatchEvent(new CustomEvent('mtl_status_updated', { detail: fullStatus }));
  } catch {}

  // 2. PRIMARY: Save directly to Supabase Database (public.user_statuses)
  try {
    const supabaseRecord = toSupabaseStatusRecord(fullStatus);
    const { error: sbErr } = await supabase
      .from('user_statuses')
      .upsert(supabaseRecord);
    if (sbErr) {
      console.warn('Supabase user status write notice:', sbErr.message || sbErr);
    }
  } catch (sbEx) {
    console.warn('Supabase user status write exception:', sbEx);
  }

  // 3. Persistent Firestore Save as secondary synchronization
  try {
    const statusDocRef = doc(db, 'user_statuses', statusId);
    await setDoc(statusDocRef, fullStatus);
  } catch (fsErr) {
    console.warn('Firestore user status write notice:', fsErr);
  }

  // 4. Central Persistent Database Save
  try {
    await fetch('/api/statuses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fullStatus),
    });
  } catch (serverErr) {
    console.warn('Central database status save notice:', serverErr);
  }

  // 5. Log User Activity to Firebase & LocalStore
  await logUserActivity(status.userId, {
    type: 'status_post',
    title: `Published ${fullStatus.statusType === 'reel' ? 'Match Reel' : fullStatus.statusType === 'image' ? 'Image Status' : 'Match Prediction Card'}`,
    description: `${status.matchFixture}: ${status.predictionPick} (Score: ${status.predictedScore || 'N/A'})`,
  });

  return fullStatus;
}

export async function fetchUserStatuses(): Promise<MatchCardStatus[]> {
  const mergedMap = new Map<string, MatchCardStatus>();

  // 1. PRIMARY: Query Supabase public.user_statuses table
  try {
    const { data: sbData, error: sbErr } = await supabase
      .from('user_statuses')
      .select('*')
      .order('created_at', { ascending: false });

    if (!sbErr && Array.isArray(sbData) && sbData.length > 0) {
      sbData.forEach((row) => {
        if (row && row.id) {
          const item = fromSupabaseStatusRecord(row);
          mergedMap.set(item.id, item);
        }
      });
    }
  } catch (sbErr) {
    console.warn('Supabase fetchUserStatuses notice:', sbErr);
  }

  // 2. Query Firestore collection as secondary source
  try {
    const snap = await getDocs(collection(db, 'user_statuses'));
    snap.forEach((docSnap) => {
      const item = docSnap.data() as MatchCardStatus;
      if (item && item.id && !mergedMap.has(item.id)) {
        mergedMap.set(item.id, item);
      }
    });
  } catch (fsErr) {}

  // 3. Query Central Server Database
  try {
    const res = await fetch('/api/statuses', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.statuses)) {
        data.statuses.forEach((s: MatchCardStatus) => {
          if (s && s.id && !mergedMap.has(s.id)) {
            mergedMap.set(s.id, s);
          }
        });
      }
    }
  } catch (e) {}

  // 4. Fallback to cached statuses if still empty
  if (mergedMap.size === 0) {
    const cached = getCachedList<MatchCardStatus>(STATUS_CACHE_KEY, []);
    cached.forEach(s => {
      if (s && s.id) mergedMap.set(s.id, s);
    });
  }

  // Filter out expired (> 24 hours)
  const nowMs = Date.now();
  const validList = Array.from(mergedMap.values()).filter(s => {
    if (!s.expiresAt) return true;
    return new Date(s.expiresAt).getTime() > nowMs - 2 * 3600 * 1000;
  });

  validList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  setCachedList(STATUS_CACHE_KEY, validList);
  return validList;
}

export function subscribeUserStatuses(onUpdate: (statuses: MatchCardStatus[]) => void) {
  const initial = getCachedList<MatchCardStatus>(STATUS_CACHE_KEY, []);
  if (initial.length > 0) onUpdate(initial);

  fetchUserStatuses().then(st => {
    if (Array.isArray(st) && st.length > 0) onUpdate(st);
  });

  const handleLocalUpdate = () => {
    const cached = getCachedList<MatchCardStatus>(STATUS_CACHE_KEY, []);
    onUpdate(cached);
  };
  window.addEventListener('mtl_status_updated', handleLocalUpdate);

  // 1. Supabase Realtime Subscription on public.user_statuses
  let supabaseChannel: any = null;
  try {
    supabaseChannel = supabase
      .channel('public:user_statuses')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_statuses' },
        async () => {
          const refreshed = await fetchUserStatuses();
          onUpdate(refreshed);
        }
      )
      .subscribe();
  } catch (sbSubErr) {
    console.warn('Supabase status subscription notice:', sbSubErr);
  }

  // 2. Firestore Snapshot Listener
  let unsubscribeFirestore = () => {};
  try {
    unsubscribeFirestore = onSnapshot(collection(db, 'user_statuses'), (snapshot) => {
      const fsList: MatchCardStatus[] = [];
      snapshot.forEach(docSnap => {
        const item = docSnap.data() as MatchCardStatus;
        if (item && item.id) fsList.push(item);
      });
      if (fsList.length > 0) {
        const cached = getCachedList<MatchCardStatus>(STATUS_CACHE_KEY, []);
        const map = new Map<string, MatchCardStatus>();
        [...cached, ...fsList].forEach(s => {
          if (s && s.id) map.set(s.id, s);
        });
        const sorted = Array.from(map.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setCachedList(STATUS_CACHE_KEY, sorted);
        onUpdate(sorted);
      }
    }, () => {});
  } catch {}

  // 3. Fallback polling interval
  const intervalId = setInterval(async () => {
    try {
      const res = await fetch('/api/statuses', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.statuses)) {
          setCachedList(STATUS_CACHE_KEY, data.statuses);
          onUpdate(data.statuses);
        }
      }
    } catch {}
  }, 4000);

  return () => {
    clearInterval(intervalId);
    window.removeEventListener('mtl_status_updated', handleLocalUpdate);
    try { unsubscribeFirestore(); } catch {}
    try {
      if (supabaseChannel) {
        supabase.removeChannel(supabaseChannel);
      }
    } catch {}
  };
}

export async function recordStatusView(statusId: string, viewerId: string) {
  const current = getCachedList<MatchCardStatus>(STATUS_CACHE_KEY, []);
  const target = current.find(s => s.id === statusId);
  if (!target) return;

  if (!target.viewers) target.viewers = [];
  if (!target.viewers.includes(viewerId)) {
    target.viewers.push(viewerId);
    target.viewsCount = (target.viewsCount || 0) + 1;
    setCachedList(STATUS_CACHE_KEY, current);

    // 1. Save to Supabase
    try {
      await supabase
        .from('user_statuses')
        .update({
          viewers: target.viewers,
          views_count: target.viewsCount
        })
        .eq('id', statusId);
    } catch (sbErr) {
      console.warn('Supabase recordStatusView notice:', sbErr);
    }

    // 2. Save to Firestore
    try {
      const statusRef = doc(db, 'user_statuses', statusId);
      await updateDoc(statusRef, {
        viewers: target.viewers,
        viewsCount: target.viewsCount
      });
    } catch {}

    // 3. Save to backend
    try {
      await fetch(`/api/statuses/${statusId}/view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ viewerId }),
      });
    } catch {}
  }
}

export async function toggleStatusLike(statusId: string, userId: string): Promise<boolean> {
  const current = getCachedList<MatchCardStatus>(STATUS_CACHE_KEY, []);
  const target = current.find(s => s.id === statusId);
  if (!target) return false;

  if (!target.likers) target.likers = [];
  const hasLiked = target.likers.includes(userId);
  let newLikedState = false;

  if (hasLiked) {
    target.likers = target.likers.filter(id => id !== userId);
    target.likesCount = Math.max(0, (target.likesCount || 1) - 1);
    newLikedState = false;
  } else {
    target.likers.push(userId);
    target.likesCount = (target.likesCount || 0) + 1;
    newLikedState = true;
  }

  setCachedList(STATUS_CACHE_KEY, current);

  // 1. Save to Supabase (user_statuses & status_likes audit table)
  try {
    await supabase
      .from('user_statuses')
      .update({
        likers: target.likers,
        likes_count: target.likesCount
      })
      .eq('id', statusId);

    if (newLikedState) {
      await supabase
        .from('status_likes')
        .upsert({
          id: `like_${statusId}_${userId}`,
          status_id: statusId,
          user_id: userId,
          created_at: new Date().toISOString()
        });
    } else {
      await supabase
        .from('status_likes')
        .delete()
        .match({ status_id: statusId, user_id: userId });
    }
  } catch (sbErr) {
    console.warn('Supabase toggleStatusLike notice:', sbErr);
  }

  // 2. Save to Firebase Firestore /user_statuses/{statusId}
  try {
    const statusRef = doc(db, 'user_statuses', statusId);
    await updateDoc(statusRef, {
      likers: target.likers,
      likesCount: target.likesCount
    });
  } catch (fsErr) {
    console.warn('Firestore toggleStatusLike update notice:', fsErr);
  }

  // 3. Save like audit record to Firestore /status_likes/{likeId}
  const likeDocId = `like_${statusId}_${userId}`;
  try {
    if (newLikedState) {
      await setDoc(doc(db, 'status_likes', likeDocId), {
        id: likeDocId,
        statusId,
        userId,
        timestamp: new Date().toISOString()
      });
    } else {
      const { deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'status_likes', likeDocId));
    }
  } catch {}

  // 4. Save to backend database
  try {
    await fetch(`/api/statuses/${statusId}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
  } catch {}

  return newLikedState;
}

// ============================================================================
// 3. MESSAGE REACTIONS SAVED TO FIREBASE FIRESTORE & DATABASE
// ============================================================================

export async function saveMessageReaction(
  messageId: string | number,
  emoji: string,
  userId: string,
  username?: string
): Promise<Record<string, number>> {
  const reactionId = `mreact_${messageId}_${userId}_${Date.now()}`;
  const nowIso = new Date().toISOString();

  // 1. Save to Firebase Firestore /message_reactions/{reactionId}
  try {
    const reactionRecord: MessageReactionRecord = {
      id: reactionId,
      messageId: String(messageId),
      emoji,
      userId,
      username: username || 'User',
      timestamp: nowIso
    };
    await setDoc(doc(db, 'message_reactions', reactionId), reactionRecord);
  } catch (fsErr) {
    console.warn('Firebase saveMessageReaction record notice:', fsErr);
  }

  // 2. Update Firestore /messages/{messageId} reactions map if document exists
  try {
    const msgRef = doc(db, 'messages', String(messageId));
    const msgSnap = await getDoc(msgRef);
    if (msgSnap.exists()) {
      const existing = msgSnap.data();
      const currentReactions = { ...(existing?.reactions || {}) };
      currentReactions[emoji] = (currentReactions[emoji] || 0) + 1;
      await updateDoc(msgRef, { reactions: currentReactions });
    }
  } catch (fsErr) {
    console.warn('Firebase update message reactions notice:', fsErr);
  }

  // 3. Save to Supabase reactions table safely
  try {
    const isValidUuid = typeof userId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
    await supabase.from('reactions').insert([{
      message_id: String(messageId),
      user_id: isValidUuid ? userId : null,
      username: username || 'Fan',
      emoji,
      reaction_type: 'emoji'
    }]);
  } catch {}

  // 4. Save to backend database endpoint
  let updatedReactions: Record<string, number> = {};
  try {
    const res = await fetch(`/api/messages/${messageId}/reaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji, userId, username }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.reactions) updatedReactions = data.reactions;
    }
  } catch {}

  // 5. Dispatch local event for real-time reactive UI
  try {
    window.dispatchEvent(new CustomEvent('mtl_message_reacted', {
      detail: { messageId, emoji, userId, reactions: updatedReactions }
    }));
  } catch {}

  return updatedReactions;
}

// ============================================================================
// 4. MATCH CARD REACTIONS (🔥, ❤️, 👎) SAVED TO FIREBASE FIRESTORE & DATABASE
// ============================================================================

export async function saveMatchReaction(
  matchId: string,
  reactionType: 'fire' | 'heart' | 'dislike' | string,
  userId: string
): Promise<{ reactions: Record<string, number>; userReaction: string | null }> {
  const reactionId = `matchreact_${matchId}_${userId}`;
  const nowIso = new Date().toISOString();

  // 1. Save to Firebase Firestore /match_reactions/{reactionId}
  try {
    const reactionRecord: MatchReactionRecord = {
      id: reactionId,
      matchId,
      reactionType,
      userId,
      timestamp: nowIso
    };
    await setDoc(doc(db, 'match_reactions', reactionId), reactionRecord);
  } catch (fsErr) {
    console.warn('Firebase saveMatchReaction notice:', fsErr);
  }

  // 2. Update Firestore /matches/{matchId} document if present
  try {
    const matchRef = doc(db, 'matches', matchId);
    const snap = await getDoc(matchRef);
    if (snap.exists()) {
      const data = snap.data();
      const currentReactions = { ...(data?.reactions || { fire: 0, heart: 0, dislike: 0 }) };
      currentReactions[reactionType] = (currentReactions[reactionType] || 0) + 1;
      await updateDoc(matchRef, { reactions: currentReactions });
    }
  } catch {}

  // 3. Save to Supabase reactions table safely
  try {
    const isValidUuid = typeof userId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
    await supabase.from('reactions').insert([{
      match_id: String(matchId),
      user_id: isValidUuid ? userId : null,
      reaction_type: reactionType,
      type: reactionType
    }]);
  } catch {}

  // 4. Save to backend database endpoint
  let result = { reactions: {} as Record<string, number>, userReaction: reactionType as string | null };
  try {
    const res = await fetch(`/api/matches/${matchId}/reaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reactionType, userId }),
    });
    if (res.ok) {
      const json = await res.json();
      result = {
        reactions: json.reactions || {},
        userReaction: json.userReaction
      };
    }
  } catch {}

  // 5. Dispatch local event
  try {
    window.dispatchEvent(new CustomEvent('mtl_match_reacted', {
      detail: { matchId, reactionType, userId, result }
    }));
  } catch {}

  return result;
}

// ============================================================================
// PROFILE DETAILS PERSISTENCE (FIREBASE FIRESTORE, SUPABASE & CENTRAL DB)
// ============================================================================

export async function saveUserProfileDetails(userId: string, profileData: any): Promise<void> {
  const nowIso = new Date().toISOString();

  // 1. Save to Firebase Firestore /users/{userId}
  try {
    const userDocRef = doc(db, 'users', userId);
    await setDoc(userDocRef, {
      id: userId,
      ...profileData,
      updatedAt: nowIso
    }, { merge: true });
  } catch (fsErr) {
    console.warn('Firestore profile save notice:', fsErr);
  }

  // 2. Save to backend database endpoint
  try {
    await fetch(`/api/profile/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...profileData, userId, updatedAt: nowIso }),
    });
  } catch {}

  // 3. Save to Supabase profiles table
  try {
    const supaPayload: any = {
      id: userId,
      username: profileData.username || profileData.full_name,
      name: profileData.username || profileData.full_name,
      full_name: profileData.username || profileData.full_name,
      avatar_url: profileData.avatar_url || null,
      bio: profileData.bio || null,
      info: profileData.info || null,
      location: profileData.location || null,
      phone: profileData.phone || null,
      favorite_club: profileData.favorite_teams?.[0] || profileData.favorite_club || 'Arsenal',
      favorite_teams: profileData.favorite_teams || [],
      updated_at: nowIso
    };
    await supabase.from('profiles').upsert(supaPayload);
  } catch (supaErr) {
    console.warn('Supabase profile save notice:', supaErr);
  }

  // 4. Update Supabase Auth metadata
  try {
    await supabase.auth.updateUser({
      data: {
        username: profileData.username,
        full_name: profileData.username || profileData.full_name,
        avatar_url: profileData.avatar_url,
        bio: profileData.bio,
        location: profileData.location,
        phone: profileData.phone,
        favorite_teams: profileData.favorite_teams
      }
    });
  } catch {}

  // 5. Update local cache and dispatch event
  try {
    StorageCache.set('profile', { id: userId, ...profileData });
    window.dispatchEvent(new CustomEvent('mtl_profile_updated', {
      detail: { userId, profile: profileData }
    }));
  } catch {}
}

// ============================================================================
// 5. CHAT MESSAGES PERSISTED TO FIREBASE FIRESTORE & BACKEND
// ============================================================================

export async function saveChatMessage(msg: any): Promise<any> {
  const id = msg.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const cleanMsg = {
    ...msg,
    id,
    reactions: msg.reactions || {},
    created_at: msg.created_at || new Date().toISOString()
  };

  // 1. Save to Firebase Firestore /messages/{id}
  try {
    await setDoc(doc(db, 'messages', String(id)), cleanMsg);
  } catch (fsErr) {
    console.warn('Firestore chat message save notice:', fsErr);
  }

  // 2. Save to backend database
  try {
    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cleanMsg),
    });
  } catch {}

  return cleanMsg;
}

export function subscribeChatMessages(
  groupId: string | undefined,
  onUpdate: (messages: any[]) => void
) {
  if (!groupId) return () => {};

  let unsubscribe = () => {};
  try {
    const q = query(collection(db, 'messages'), where('group_id', '==', groupId));
    unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: any[] = [];
      snapshot.forEach(d => {
        const data = d.data();
        if (data && data.id) msgs.push(data);
      });
      if (msgs.length > 0) {
        msgs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        onUpdate(msgs);
      }
    }, () => {});
  } catch {}

  return unsubscribe;
}

// ============================================================================
// 6. REAL DATA FETCHERS: MATCHES, FIXTURES, NEWS, TRENDING (NO MOCK DATA)
// ============================================================================

export async function fetchRealMatches(): Promise<any[]> {
  const matchesMap = new Map<string, any>();

  // 1. Fetch from Firestore /matches
  try {
    const snap = await getDocs(collection(db, 'matches'));
    snap.forEach(d => {
      const data = d.data();
      if (data && data.id) matchesMap.set(data.id, data);
    });
  } catch {}

  // 2. Fetch from backend /api/matches
  try {
    const res = await fetch('/api/matches', { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json.matches)) {
        json.matches.forEach((m: any) => {
          if (m && m.id && !matchesMap.has(m.id)) {
            matchesMap.set(m.id, m);
            // Seed to Firestore
            setDoc(doc(db, 'matches', m.id), m).catch(() => {});
          }
        });
      }
    }
  } catch {}

  const result = Array.from(matchesMap.values());
  if (result.length > 0) {
    setCachedList(MATCHES_CACHE_KEY, result);
    return result;
  }
  return getCachedList(MATCHES_CACHE_KEY, []);
}

export async function fetchRealFixtures(): Promise<any[]> {
  const map = new Map<string, any>();

  try {
    const snap = await getDocs(collection(db, 'fixtures'));
    snap.forEach(d => {
      const data = d.data();
      if (data && data.id) map.set(data.id, data);
    });
  } catch {}

  try {
    const res = await fetch('/api/fixtures', { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json.fixtures)) {
        json.fixtures.forEach((f: any) => {
          if (f && f.id && !map.has(f.id)) {
            map.set(f.id, f);
            setDoc(doc(db, 'fixtures', f.id), f).catch(() => {});
          }
        });
      }
    }
  } catch {}

  const result = Array.from(map.values());
  if (result.length > 0) {
    setCachedList(FIXTURES_CACHE_KEY, result);
    return result;
  }
  return getCachedList(FIXTURES_CACHE_KEY, []);
}

export async function fetchRealNews(): Promise<any[]> {
  const map = new Map<string, any>();

  try {
    const snap = await getDocs(collection(db, 'news'));
    snap.forEach(d => {
      const data = d.data();
      if (data && data.id) map.set(data.id, data);
    });
  } catch {}

  try {
    const res = await fetch('/api/news', { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json.news)) {
        json.news.forEach((n: any) => {
          if (n && n.id && !map.has(n.id)) {
            map.set(n.id, n);
            setDoc(doc(db, 'news', n.id), n).catch(() => {});
          }
        });
      }
    }
  } catch {}

  const result = Array.from(map.values());
  if (result.length > 0) {
    setCachedList(NEWS_CACHE_KEY, result);
    return result;
  }
  return getCachedList(NEWS_CACHE_KEY, []);
}

export async function fetchRealTrending(): Promise<any[]> {
  const map = new Map<string, any>();

  try {
    const snap = await getDocs(collection(db, 'trending'));
    snap.forEach(d => {
      const data = d.data();
      if (data && data.id) map.set(data.id, data);
    });
  } catch {}

  try {
    const res = await fetch('/api/trending', { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json.trending)) {
        json.trending.forEach((t: any) => {
          if (t && t.id && !map.has(t.id)) {
            map.set(t.id, t);
            setDoc(doc(db, 'trending', t.id), t).catch(() => {});
          }
        });
      }
    }
  } catch {}

  const result = Array.from(map.values());
  if (result.length > 0) {
    setCachedList(TRENDING_CACHE_KEY, result);
    return result;
  }
  return getCachedList(TRENDING_CACHE_KEY, []);
}

// ============================================================================
// 7. REAL USER ACTIVITIES & AUDIT TIMELINE (SAVED TO FIREBASE)
// ============================================================================

export async function logUserActivity(
  userId: string, 
  activity: { type: UserActivityItem['type']; title: string; description: string; badge?: string }
): Promise<UserActivityItem> {
  const item: UserActivityItem = {
    id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userId,
    type: activity.type,
    title: activity.title,
    description: activity.description,
    timestamp: new Date().toISOString(),
    badge: activity.badge,
  };

  // 1. Save to Firebase Firestore /user_activities/{id}
  try {
    await setDoc(doc(db, 'user_activities', item.id), item);
  } catch (fsErr) {
    console.warn('Firestore log activity notice:', fsErr);
  }

  // 2. Save locally and backend
  const key = `${ACTIVITY_CACHE_KEY}_${userId}`;
  const list = getCachedList<UserActivityItem>(key, []);
  const updated = [item, ...list].slice(0, 50);
  setCachedList(key, updated);

  try {
    await fetch(`/api/activities/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
  } catch {}

  return item;
}

export async function fetchUserActivities(userId: string): Promise<UserActivityItem[]> {
  const key = `${ACTIVITY_CACHE_KEY}_${userId}`;

  // 1. Fetch from Firestore
  try {
    const q = query(collection(db, 'user_activities'), where('userId', '==', userId));
    const snap = await getDocs(q);
    const list: UserActivityItem[] = [];
    snap.forEach(d => {
      const data = d.data() as UserActivityItem;
      if (data && data.id) list.push(data);
    });
    if (list.length > 0) {
      list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setCachedList(key, list);
      return list;
    }
  } catch {}

  // 2. Fetch from backend
  try {
    const res = await fetch(`/api/activities/${userId}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.activities)) {
        setCachedList(key, data.activities);
        return data.activities;
      }
    }
  } catch {}

  return getCachedList<UserActivityItem>(key, []);
}

// ============================================================================
// 8. REAL USER PERSONAL PREDICTIONS (SAVED TO FIREBASE)
// ============================================================================

export async function saveUserPersonalPrediction(
  prediction: Omit<UserPredictionItem, 'id' | 'createdAt'>
): Promise<UserPredictionItem> {
  const id = `pred_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const item: UserPredictionItem = {
    ...prediction,
    id,
    createdAt: new Date().toISOString(),
  };

  // 1. Save to Firebase Firestore /user_predictions/{id}
  try {
    await setDoc(doc(db, 'user_predictions', id), item);
  } catch (fsErr) {
    console.warn('Firestore save prediction notice:', fsErr);
  }

  // 2. Local cache and backend
  const key = `${PREDICTION_CACHE_KEY}_${prediction.userId}`;
  const list = getCachedList<UserPredictionItem>(key, []);
  const updated = [item, ...list];
  setCachedList(key, updated);

  try {
    await fetch(`/api/predictions/${prediction.userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
  } catch {}

  // Log activity
  await logUserActivity(prediction.userId, {
    type: 'prediction_added',
    title: `Logged Match Prediction: ${prediction.fixture}`,
    description: `Pick: ${prediction.pick} @ ${prediction.odds.toFixed(2)}x odds`,
  });

  return item;
}

export async function fetchUserPersonalPredictions(userId: string): Promise<UserPredictionItem[]> {
  const key = `${PREDICTION_CACHE_KEY}_${userId}`;

  try {
    const q = query(collection(db, 'user_predictions'), where('userId', '==', userId));
    const snap = await getDocs(q);
    const list: UserPredictionItem[] = [];
    snap.forEach(d => {
      const data = d.data() as UserPredictionItem;
      if (data && data.id) list.push(data);
    });
    if (list.length > 0) {
      setCachedList(key, list);
      return list;
    }
  } catch {}

  try {
    const res = await fetch(`/api/predictions/${userId}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.predictions)) {
        setCachedList(key, data.predictions);
        return data.predictions;
      }
    }
  } catch {}

  return getCachedList<UserPredictionItem>(key, []);
}

// ============================================================================
// 9. PLAYER STATS, COMPARISON TOOL & PITCH FORM ALIGNMENT (SAVED TO FIREBASE)
// ============================================================================

export interface PlayerStats {
  id: string;
  name: string;
  club: string;
  league: string;
  nationality: string;
  position: 'Forward' | 'Midfielder' | 'Defender' | 'Goalkeeper';
  photoUrl: string;
  age: number;
  matchesPlayed: number;
  careerGoals: number;
  careerAssists: number;
  goalsPerMatch: number;
  assistsPerMatch: number;
  minutesPerGoal: number;
  passAccuracy: number; // percentage 0-100
  keyPasses: number;
  defensiveRating: number; // 0-100
  tacklesWon: number;
  interceptions: number;
  cleanSheets: number;
  aerialDuelsWonRate: number; // 0-100
  dribbleSuccessRate: number; // 0-100
  shotConversionRate: number; // 0-100
  formRating: number; // 0-10
  overallRating: number; // 0-99
  pitchZones: {
    attackingThird: number;
    midfieldControl: number;
    defensiveSolidity: number;
    pressingIntensity: number;
    creativity: number;
    physicality: number;
  };
  updatedAt?: string;
}

export interface PlayerComparisonRecord {
  id: string;
  userId: string;
  userName: string;
  player1Id: string;
  player2Id: string;
  player1Name: string;
  player2Name: string;
  comparisonNote?: string;
  verdict: string;
  savedAt: string;
}

export interface PitchFormAlignmentRecord {
  id: string;
  formation: string;
  alignmentIndex: number; // 0-100
  pitchStatus: 'OPTIMAL' | 'COMPACT' | 'OVERLOADED' | 'DISRUPTED';
  zoneRatings: {
    attackingThird: number; // 0-100
    midfieldPivot: number; // 0-100
    defensiveBlock: number; // 0-100
    flankWidth: number; // 0-100
    pressIntensity: number; // 0-100
    transitionSpeed: number; // 0-100
  };
  tacticalNotes: string;
  updatedBy: string;
  updatedAt: string;
}

export const DEFAULT_PITCH_FORM_ALIGNMENT: PitchFormAlignmentRecord = {
  id: 'current',
  formation: '4-3-3 Dynamic Overload',
  alignmentIndex: 88,
  pitchStatus: 'OPTIMAL',
  zoneRatings: {
    attackingThird: 92,
    midfieldPivot: 86,
    defensiveBlock: 84,
    flankWidth: 89,
    pressIntensity: 91,
    transitionSpeed: 87,
  },
  tacticalNotes: 'High-block tactical synchronization active. Dual inverted wingers generating superior half-space penetration with immediate counter-pressing triggers upon ball turnover.',
  updatedBy: 'Chief Tactical Admin (Verified)',
  updatedAt: new Date().toISOString(),
};

export const INITIAL_PREMIER_PLAYERS: PlayerStats[] = [
  {
    id: 'haaland-erling',
    name: 'Erling Haaland',
    club: 'Manchester City',
    league: 'Premier League',
    nationality: 'Norway',
    position: 'Forward',
    photoUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=500&q=80',
    age: 24,
    matchesPlayed: 328,
    careerGoals: 278,
    careerAssists: 56,
    goalsPerMatch: 0.85,
    assistsPerMatch: 0.17,
    minutesPerGoal: 93,
    passAccuracy: 76,
    keyPasses: 312,
    defensiveRating: 44,
    tacklesWon: 98,
    interceptions: 42,
    cleanSheets: 0,
    aerialDuelsWonRate: 64,
    dribbleSuccessRate: 58,
    shotConversionRate: 31,
    formRating: 9.4,
    overallRating: 92,
    pitchZones: {
      attackingThird: 98,
      midfieldControl: 62,
      defensiveSolidity: 42,
      pressingIntensity: 78,
      creativity: 66,
      physicality: 96,
    },
    updatedAt: new Date().toISOString()
  },
  {
    id: 'mbappe-kylian',
    name: 'Kylian Mbappé',
    club: 'Real Madrid',
    league: 'La Liga',
    nationality: 'France',
    position: 'Forward',
    photoUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=500&q=80',
    age: 25,
    matchesPlayed: 442,
    careerGoals: 334,
    careerAssists: 158,
    goalsPerMatch: 0.76,
    assistsPerMatch: 0.36,
    minutesPerGoal: 104,
    passAccuracy: 83,
    keyPasses: 580,
    defensiveRating: 38,
    tacklesWon: 112,
    interceptions: 54,
    cleanSheets: 0,
    aerialDuelsWonRate: 46,
    dribbleSuccessRate: 68,
    shotConversionRate: 26,
    formRating: 9.2,
    overallRating: 93,
    pitchZones: {
      attackingThird: 97,
      midfieldControl: 74,
      defensiveSolidity: 36,
      pressingIntensity: 68,
      creativity: 88,
      physicality: 89,
    },
    updatedAt: new Date().toISOString()
  },
  {
    id: 'debruyne-kevin',
    name: 'Kevin De Bruyne',
    club: 'Manchester City',
    league: 'Premier League',
    nationality: 'Belgium',
    position: 'Midfielder',
    photoUrl: 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&w=500&q=80',
    age: 33,
    matchesPlayed: 620,
    careerGoals: 154,
    careerAssists: 298,
    goalsPerMatch: 0.25,
    assistsPerMatch: 0.48,
    minutesPerGoal: 312,
    passAccuracy: 88,
    keyPasses: 1240,
    defensiveRating: 68,
    tacklesWon: 410,
    interceptions: 295,
    cleanSheets: 0,
    aerialDuelsWonRate: 51,
    dribbleSuccessRate: 72,
    shotConversionRate: 17,
    formRating: 8.9,
    overallRating: 91,
    pitchZones: {
      attackingThird: 92,
      midfieldControl: 98,
      defensiveSolidity: 65,
      pressingIntensity: 82,
      creativity: 99,
      physicality: 78,
    },
    updatedAt: new Date().toISOString()
  },
  {
    id: 'salah-mohamed',
    name: 'Mohamed Salah',
    club: 'Liverpool FC',
    league: 'Premier League',
    nationality: 'Egypt',
    position: 'Forward',
    photoUrl: 'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?auto=format&fit=crop&w=500&q=80',
    age: 32,
    matchesPlayed: 610,
    careerGoals: 326,
    careerAssists: 162,
    goalsPerMatch: 0.53,
    assistsPerMatch: 0.27,
    minutesPerGoal: 142,
    passAccuracy: 81,
    keyPasses: 790,
    defensiveRating: 48,
    tacklesWon: 230,
    interceptions: 118,
    cleanSheets: 0,
    aerialDuelsWonRate: 39,
    dribbleSuccessRate: 64,
    shotConversionRate: 22,
    formRating: 9.1,
    overallRating: 90,
    pitchZones: {
      attackingThird: 94,
      midfieldControl: 78,
      defensiveSolidity: 46,
      pressingIntensity: 80,
      creativity: 89,
      physicality: 82,
    },
    updatedAt: new Date().toISOString()
  },
  {
    id: 'rodri-hernandez',
    name: 'Rodri Cascante',
    club: 'Manchester City',
    league: 'Premier League',
    nationality: 'Spain',
    position: 'Midfielder',
    photoUrl: 'https://images.unsplash.com/photo-1543326727-cf6c39e8f84c?auto=format&fit=crop&w=500&q=80',
    age: 28,
    matchesPlayed: 450,
    careerGoals: 48,
    careerAssists: 42,
    goalsPerMatch: 0.11,
    assistsPerMatch: 0.09,
    minutesPerGoal: 780,
    passAccuracy: 93,
    keyPasses: 490,
    defensiveRating: 94,
    tacklesWon: 780,
    interceptions: 620,
    cleanSheets: 142,
    aerialDuelsWonRate: 74,
    dribbleSuccessRate: 76,
    shotConversionRate: 14,
    formRating: 9.5,
    overallRating: 92,
    pitchZones: {
      attackingThird: 76,
      midfieldControl: 99,
      defensiveSolidity: 95,
      pressingIntensity: 92,
      creativity: 87,
      physicality: 93,
    },
    updatedAt: new Date().toISOString()
  },
  {
    id: 'saliba-william',
    name: 'William Saliba',
    club: 'Arsenal FC',
    league: 'Premier League',
    nationality: 'France',
    position: 'Defender',
    photoUrl: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=500&q=80',
    age: 23,
    matchesPlayed: 240,
    careerGoals: 12,
    careerAssists: 6,
    goalsPerMatch: 0.05,
    assistsPerMatch: 0.03,
    minutesPerGoal: 1720,
    passAccuracy: 92,
    keyPasses: 85,
    defensiveRating: 95,
    tacklesWon: 460,
    interceptions: 410,
    cleanSheets: 98,
    aerialDuelsWonRate: 69,
    dribbleSuccessRate: 66,
    shotConversionRate: 11,
    formRating: 9.1,
    overallRating: 89,
    pitchZones: {
      attackingThird: 42,
      midfieldControl: 81,
      defensiveSolidity: 98,
      pressingIntensity: 88,
      creativity: 62,
      physicality: 94,
    },
    updatedAt: new Date().toISOString()
  },
  {
    id: 'vandijk-virgil',
    name: 'Virgil van Dijk',
    club: 'Liverpool FC',
    league: 'Premier League',
    nationality: 'Netherlands',
    position: 'Defender',
    photoUrl: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=500&q=80',
    age: 33,
    matchesPlayed: 580,
    careerGoals: 54,
    careerAssists: 24,
    goalsPerMatch: 0.09,
    assistsPerMatch: 0.04,
    minutesPerGoal: 920,
    passAccuracy: 90,
    keyPasses: 140,
    defensiveRating: 96,
    tacklesWon: 740,
    interceptions: 680,
    cleanSheets: 215,
    aerialDuelsWonRate: 78,
    dribbleSuccessRate: 59,
    shotConversionRate: 12,
    formRating: 9.0,
    overallRating: 90,
    pitchZones: {
      attackingThird: 51,
      midfieldControl: 84,
      defensiveSolidity: 99,
      pressingIntensity: 84,
      creativity: 68,
      physicality: 97,
    },
    updatedAt: new Date().toISOString()
  },
  {
    id: 'saka-bukayo',
    name: 'Bukayo Saka',
    club: 'Arsenal FC',
    league: 'Premier League',
    nationality: 'England',
    position: 'Forward',
    photoUrl: 'https://images.unsplash.com/photo-1518091043644-c1d4457512c6?auto=format&fit=crop&w=500&q=80',
    age: 23,
    matchesPlayed: 295,
    careerGoals: 82,
    careerAssists: 74,
    goalsPerMatch: 0.28,
    assistsPerMatch: 0.25,
    minutesPerGoal: 280,
    passAccuracy: 84,
    keyPasses: 460,
    defensiveRating: 64,
    tacklesWon: 340,
    interceptions: 195,
    cleanSheets: 0,
    aerialDuelsWonRate: 48,
    dribbleSuccessRate: 71,
    shotConversionRate: 19,
    formRating: 9.0,
    overallRating: 89,
    pitchZones: {
      attackingThird: 91,
      midfieldControl: 86,
      defensiveSolidity: 62,
      pressingIntensity: 88,
      creativity: 92,
      physicality: 79,
    },
    updatedAt: new Date().toISOString()
  },
  {
    id: 'martinez-josef',
    name: 'Josef Martínez',
    club: 'CF Montréal',
    league: 'Major League Soccer (MLS)',
    nationality: 'Venezuela',
    position: 'Forward',
    photoUrl: 'https://images.unsplash.com/photo-1544698310-74ea9d1c8258?auto=format&fit=crop&w=500&q=80',
    age: 31,
    matchesPlayed: 360,
    careerGoals: 172,
    careerAssists: 38,
    goalsPerMatch: 0.48,
    assistsPerMatch: 0.11,
    minutesPerGoal: 155,
    passAccuracy: 78,
    keyPasses: 290,
    defensiveRating: 40,
    tacklesWon: 95,
    interceptions: 44,
    cleanSheets: 0,
    aerialDuelsWonRate: 52,
    dribbleSuccessRate: 61,
    shotConversionRate: 24,
    formRating: 8.6,
    overallRating: 83,
    pitchZones: {
      attackingThird: 90,
      midfieldControl: 68,
      defensiveSolidity: 38,
      pressingIntensity: 76,
      creativity: 72,
      physicality: 84,
    },
    updatedAt: new Date().toISOString()
  },
  {
    id: 'piette-samuel',
    name: 'Samuel Piette',
    club: 'CF Montréal',
    league: 'Major League Soccer (MLS)',
    nationality: 'Canada',
    position: 'Midfielder',
    photoUrl: 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&w=500&q=80',
    age: 30,
    matchesPlayed: 320,
    careerGoals: 8,
    careerAssists: 22,
    goalsPerMatch: 0.03,
    assistsPerMatch: 0.07,
    minutesPerGoal: 3100,
    passAccuracy: 89,
    keyPasses: 240,
    defensiveRating: 86,
    tacklesWon: 590,
    interceptions: 480,
    cleanSheets: 62,
    aerialDuelsWonRate: 67,
    dribbleSuccessRate: 62,
    shotConversionRate: 8,
    formRating: 8.4,
    overallRating: 81,
    pitchZones: {
      attackingThird: 55,
      midfieldControl: 88,
      defensiveSolidity: 91,
      pressingIntensity: 90,
      creativity: 70,
      physicality: 89,
    },
    updatedAt: new Date().toISOString()
  }
];

const PLAYERS_CACHE_KEY = 'mtl_real_players_v4';
const COMPARISONS_CACHE_KEY = 'mtl_saved_comparisons_v4';
const PITCH_ALIGNMENT_CACHE_KEY = 'mtl_pitch_alignment_v4';

export async function fetchRealPlayers(): Promise<PlayerStats[]> {
  const playersMap = new Map<string, PlayerStats>();

  // 1. Seed defaults first
  INITIAL_PREMIER_PLAYERS.forEach(p => playersMap.set(p.id, p));

  // 2. Fetch from Firestore /players
  try {
    const snap = await getDocs(collection(db, 'players'));
    snap.forEach(d => {
      const data = d.data() as PlayerStats;
      if (data && data.id) {
        playersMap.set(data.id, data);
      }
    });
  } catch (fsErr) {
    console.warn('Firestore fetch players notice:', fsErr);
  }

  // 3. Fallback to server API /api/players
  try {
    const res = await fetch('/api/players', { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json.players)) {
        json.players.forEach((p: PlayerStats) => {
          if (p && p.id && !playersMap.has(p.id)) {
            playersMap.set(p.id, p);
          }
        });
      }
    }
  } catch {}

  const list = Array.from(playersMap.values());
  setCachedList(PLAYERS_CACHE_KEY, list);
  return list;
}

export async function savePlayerToFirebase(player: PlayerStats): Promise<PlayerStats> {
  const item: PlayerStats = {
    ...player,
    updatedAt: new Date().toISOString(),
  };

  // 1. Save to Firebase Firestore /players/{id}
  try {
    await setDoc(doc(db, 'players', item.id), item);
  } catch (fsErr) {
    console.warn('Firestore save player notice:', fsErr);
  }

  // 2. Update local cache
  const list = getCachedList<PlayerStats>(PLAYERS_CACHE_KEY, INITIAL_PREMIER_PLAYERS);
  const updated = [item, ...list.filter(p => p.id !== item.id)];
  setCachedList(PLAYERS_CACHE_KEY, updated);

  // 3. Sync to server fallback
  try {
    await fetch('/api/players', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
  } catch {}

  return item;
}

export async function savePlayerComparisonToFirebase(
  comparison: Omit<PlayerComparisonRecord, 'id' | 'savedAt'>
): Promise<PlayerComparisonRecord> {
  const id = `cmp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const item: PlayerComparisonRecord = {
    ...comparison,
    id,
    savedAt: new Date().toISOString(),
  };

  // 1. Save to Firebase Firestore /player_comparisons/{id}
  try {
    await setDoc(doc(db, 'player_comparisons', id), item);
  } catch (fsErr) {
    console.warn('Firestore save comparison notice:', fsErr);
  }

  // 2. Cache
  const list = getCachedList<PlayerComparisonRecord>(COMPARISONS_CACHE_KEY, []);
  const updated = [item, ...list.filter(c => c.id !== id)];
  setCachedList(COMPARISONS_CACHE_KEY, updated);

  // 3. Fallback server
  try {
    await fetch('/api/comparisons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
  } catch {}

  // 4. Log User Activity
  await logUserActivity(comparison.userId || 'anon_scout', {
    type: 'prediction_added',
    title: `Saved Player Comparison: ${comparison.player1Name} vs ${comparison.player2Name}`,
    description: comparison.verdict ? comparison.verdict.slice(0, 120) : 'Analyzed career statistics side-by-side',
    badge: 'SCOUT'
  });

  return item;
}

export async function fetchSavedPlayerComparisons(): Promise<PlayerComparisonRecord[]> {
  try {
    const snap = await getDocs(collection(db, 'player_comparisons'));
    const list: PlayerComparisonRecord[] = [];
    snap.forEach(d => {
      const data = d.data() as PlayerComparisonRecord;
      if (data && data.id) list.push(data);
    });
    if (list.length > 0) {
      list.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
      setCachedList(COMPARISONS_CACHE_KEY, list);
      return list;
    }
  } catch (fsErr) {
    console.warn('Firestore fetch comparisons notice:', fsErr);
  }

  try {
    const res = await fetch('/api/comparisons');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.comparisons)) {
        setCachedList(COMPARISONS_CACHE_KEY, data.comparisons);
        return data.comparisons;
      }
    }
  } catch {}

  return getCachedList<PlayerComparisonRecord>(COMPARISONS_CACHE_KEY, []);
}

export async function deletePlayerComparisonFromFirebase(id: string): Promise<boolean> {
  try {
    await setDoc(doc(db, 'player_comparisons', id), { _deleted: true }, { merge: true });
  } catch {}

  const list = getCachedList<PlayerComparisonRecord>(COMPARISONS_CACHE_KEY, []);
  setCachedList(COMPARISONS_CACHE_KEY, list.filter(c => c.id !== id));
  return true;
}

// ----------------------------------------------------------------------------
// PITCH FORM ALIGNMENT INDEX (EDITABLE ONLY BY ADMINS)
// ----------------------------------------------------------------------------

export async function fetchPitchFormAlignment(): Promise<PitchFormAlignmentRecord> {
  try {
    const docRef = doc(db, 'pitch_form_alignment', 'current');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as PitchFormAlignmentRecord;
      if (data && typeof data.alignmentIndex === 'number') {
        localStorage.setItem(PITCH_ALIGNMENT_CACHE_KEY, JSON.stringify(data));
        return data;
      }
    }
  } catch (fsErr) {
    console.warn('Firestore fetch pitch alignment notice:', fsErr);
  }

  try {
    const res = await fetch('/api/pitch-alignment');
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data.alignmentIndex === 'number') {
        localStorage.setItem(PITCH_ALIGNMENT_CACHE_KEY, JSON.stringify(data));
        return data;
      }
    }
  } catch {}

  const cached = localStorage.getItem(PITCH_ALIGNMENT_CACHE_KEY);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {}
  }

  return DEFAULT_PITCH_FORM_ALIGNMENT;
}

export async function updatePitchFormAlignmentInFirebase(
  alignment: Partial<PitchFormAlignmentRecord>,
  adminIdentifier: string = 'Admin'
): Promise<PitchFormAlignmentRecord> {
  const current = await fetchPitchFormAlignment();
  const updated: PitchFormAlignmentRecord = {
    ...current,
    ...alignment,
    id: 'current',
    updatedBy: adminIdentifier,
    updatedAt: new Date().toISOString(),
  };

  // 1. Save to Firebase Firestore /pitch_form_alignment/current
  // Notice: Security rules enforce `allow write: if isAdmin();`
  try {
    await setDoc(doc(db, 'pitch_form_alignment', 'current'), updated);
  } catch (fsErr: any) {
    console.warn('Firestore admin pitch alignment update notice:', fsErr);
    // If permission denied or offline, bubble error so admin sees rule enforcement
    if (fsErr?.code === 'permission-denied') {
      throw new Error('PERMISSION_DENIED: Pitch Form Alignment Index updates are strictly restricted to verified administrators.');
    }
  }

  // 2. Cache
  localStorage.setItem(PITCH_ALIGNMENT_CACHE_KEY, JSON.stringify(updated));

  // 3. Fallback server route
  try {
    await fetch('/api/pitch-alignment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
  } catch {}

  // 4. Log User Activity for audit trail
  await logUserActivity('admin_action', {
    type: 'profile_update',
    title: `Admin Updated Pitch Form Alignment Index: ${updated.alignmentIndex}/100`,
    description: `Tactical formation set to "${updated.formation}" (${updated.pitchStatus})`,
    badge: 'ADMIN_AUDIT'
  });

  return updated;
}

