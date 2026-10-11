import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
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

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = (firebaseConfig as any).firestoreDatabaseId ? getFirestore(app, (firebaseConfig as any).firestoreDatabaseId) : getFirestore(app);
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
// 2. REAL USER STATUSES (MATCH CARDS, REELS, IMAGES) SAVED TO FIREBASE
// ============================================================================

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

  // 2. Persistent Firestore Save (Broadcasts to all registered users via Firebase)
  try {
    const statusDocRef = doc(db, 'user_statuses', statusId);
    await setDoc(statusDocRef, fullStatus);
  } catch (fsErr) {
    console.warn('Firestore user status write notice:', fsErr);
  }

  // 3. Central Persistent Database Save
  try {
    await fetch('/api/statuses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fullStatus),
    });
  } catch (serverErr) {
    console.warn('Central database status save notice:', serverErr);
  }

  // 4. Log User Activity to Firebase
  await logUserActivity(status.userId, {
    type: 'status_post',
    title: `Published ${fullStatus.statusType === 'reel' ? 'Match Reel' : fullStatus.statusType === 'image' ? 'Image Status' : 'Match Prediction Card'}`,
    description: `${status.matchFixture}: ${status.predictionPick} (Score: ${status.predictedScore || 'N/A'})`,
  });

  return fullStatus;
}

export async function fetchUserStatuses(): Promise<MatchCardStatus[]> {
  const mergedMap = new Map<string, MatchCardStatus>();

  // 1. Primary: Query Firestore collection for real cross-user statuses
  try {
    const snap = await getDocs(collection(db, 'user_statuses'));
    snap.forEach((docSnap) => {
      const item = docSnap.data() as MatchCardStatus;
      if (item && item.id) {
        mergedMap.set(item.id, item);
      }
    });
  } catch (fsErr) {}

  // 2. Fetch from central server database
  try {
    const res = await fetch('/api/statuses', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.statuses)) {
        data.statuses.forEach((s: MatchCardStatus) => {
          if (s && s.id) mergedMap.set(s.id, s);
        });
      }
    }
  } catch (e) {}

  // 3. Fallback to cached statuses
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
  }, 3000);

  return () => {
    clearInterval(intervalId);
    window.removeEventListener('mtl_status_updated', handleLocalUpdate);
    try { unsubscribeFirestore(); } catch {}
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

    // Save to Firestore
    try {
      const statusRef = doc(db, 'user_statuses', statusId);
      await updateDoc(statusRef, {
        viewers: target.viewers,
        viewsCount: target.viewsCount
      });
    } catch {}

    // Save to backend
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

  // 1. Save to Firebase Firestore /user_statuses/{statusId}
  try {
    const statusRef = doc(db, 'user_statuses', statusId);
    await updateDoc(statusRef, {
      likers: target.likers,
      likesCount: target.likesCount
    });
  } catch (fsErr) {
    console.warn('Firestore toggleStatusLike update notice:', fsErr);
  }

  // 2. Save like audit record to Firestore /status_likes/{likeId}
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

  // 3. Save to backend database
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
