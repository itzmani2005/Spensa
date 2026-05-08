// ============================================================
// firestoreSync.js
// Handles both old-format keys (March-2026) and new-format
// keys (student_March-2026) so past data is never lost.
// Migrates old docs to new format automatically on first load.
// Data is always scoped to the signed-in user's uid.
// ============================================================

const MAX_RETRIES    = 3;
const RETRY_DELAY_MS = 1000;

function waitForAuth(timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    if (window.currentUser) return resolve(window.currentUser);
    const start = Date.now();
    const interval = setInterval(() => {
      if (window.currentUser) {
        clearInterval(interval);
        resolve(window.currentUser);
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(interval);
        reject(new Error('Auth timeout: user not signed in within ' + timeoutMs + 'ms'));
      }
    }, 100);
  });
}

function waitForDb(timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    if (window.firebaseDb) return resolve(window.firebaseDb);
    const start = Date.now();
    const interval = setInterval(() => {
      if (window.firebaseDb) {
        clearInterval(interval);
        resolve(window.firebaseDb);
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(interval);
        reject(new Error('Firestore not initialized within ' + timeoutMs + 'ms'));
      }
    }, 100);
  });
}

async function getFirestoreFns() {
  const start = Date.now();
  while (!window.firestoreFns) {
    if (Date.now() - start > 5000) {
      throw new Error(
        'Firestore functions not found on window.firestoreFns. ' +
        'Make sure index.html imports Firestore functions and assigns them to window.firestoreFns.'
      );
    }
    await new Promise(r => setTimeout(r, 50));
  }
  return window.firestoreFns;
}

async function withRetry(fn, retries = MAX_RETRIES) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isLast      = attempt === retries;
      const isTransient =
        err.code === 'unavailable' ||
        err.code === 'deadline-exceeded' ||
        err.message?.includes('network');
      if (isLast || !isTransient) throw err;
      console.warn(`Firestore attempt ${attempt} failed, retrying...`, err.code);
      await new Promise(r => setTimeout(r, RETRY_DELAY_MS * attempt));
    }
  }
}

// ── Key helpers ───────────────────────────────────────────────────────────────

// New format: "student_March-2026"
function buildDocKey(mode, month) {
  const safeMode  = (mode  || 'unknown').toLowerCase().replace(/\s+/g, '-');
  const safeMonth = (month || '').replace(/\s+/g, '-');
  return `${safeMode}_${safeMonth}`;
}

// Old format (saved before mode isolation): "March-2026"
function buildOldDocKey(month) {
  return (month || '').replace(/\s+/g, '-');
}

// ── Ref helpers ───────────────────────────────────────────────────────────────

async function getMonthRef(mode, month) {
  const [user, db, { doc }] = await Promise.all([
    waitForAuth(),
    waitForDb(),
    getFirestoreFns(),
  ]);
  return { ref: doc(db, 'users', user.uid, 'months', buildDocKey(mode, month)), user, db };
}

async function getOldMonthRef(month) {
  const [user, db, { doc }] = await Promise.all([
    waitForAuth(),
    waitForDb(),
    getFirestoreFns(),
  ]);
  return { ref: doc(db, 'users', user.uid, 'months', buildOldDocKey(month)), user, db };
}

// ── Migration ─────────────────────────────────────────────────────────────────
// Copies an old-format document to the new mode-prefixed key,
// then deletes the old document. Called automatically when old data is found.

async function migrateOldDoc(oldData, mode, month) {
  try {
    const [user, db, { doc, setDoc, deleteDoc, serverTimestamp }] = await Promise.all([
      waitForAuth(),
      waitForDb(),
      getFirestoreFns(),
    ]);

    const newKey = buildDocKey(mode, month);
    const oldKey = buildOldDocKey(month);

    // Don't migrate if already using new key
    if (newKey === oldKey) return;

    const newRef = doc(db, 'users', user.uid, 'months', newKey);
    const oldRef = doc(db, 'users', user.uid, 'months', oldKey);

    // Write to new key with mode field added
    await setDoc(newRef, {
      ...oldData,
      mode,
      userId:       user.uid,
      updatedAt:    serverTimestamp(),
      updatedAtISO: new Date().toISOString(),
    }, { merge: false });

    // Remove old key
    await deleteDoc(oldRef);
    console.log(`Migrated: ${oldKey} → ${newKey}`);
  } catch (err) {
    // Migration is non-fatal — old data stays accessible
    console.warn('Migration skipped:', err.message);
  }
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

async function saveMonthToFirestore(mode, month, income, allocation, expenses, goals) {
  try {
    const { ref, user } = await getMonthRef(mode, month);
    const { setDoc, serverTimestamp } = await getFirestoreFns();

    await withRetry(() =>
      setDoc(ref, {
        userId:       user.uid,
        mode,
        month,
        income,
        allocation,
        expenses:     expenses || [],
        goals:        goals    || [],
        updatedAt:    serverTimestamp(),
        updatedAtISO: new Date().toISOString(),
      }, { merge: true })
    );

    console.log(`Saved: [${mode}] ${month}`);
  } catch (error) {
    console.error('Error saving to Firestore:', error);
    throw error;
  }
}

async function loadMonthFromFirestore(mode, month) {
  try {
    const { ref, user } = await getMonthRef(mode, month);
    const { getDoc }    = await getFirestoreFns();

    // 1. Try new key first: "student_March-2026"
    const newSnap = await withRetry(() => getDoc(ref));
    if (newSnap.exists()) {
      const data = newSnap.data();
      if (data.userId === user.uid) return data;
    }

    // 2. Fallback: try old key "March-2026" (data saved before mode isolation)
    const { ref: oldRef } = await getOldMonthRef(month);
    const oldSnap = await withRetry(() => getDoc(oldRef));

    if (oldSnap.exists()) {
      const oldData = oldSnap.data();
      if (oldData.userId === user.uid) {
        console.log(`Found old-format data for ${month} — migrating...`);
        // Migrate in background so load isn't blocked
        migrateOldDoc(oldData, mode, month);
        return { ...oldData, mode };
      }
    }

    return null;
  } catch (error) {
    console.error('Error loading from Firestore:', error);
    return null;
  }
}

// Gets all months for the current user+mode.
// Strategy:
//   1. Try compound query (requires Firestore index) — fast and mode-filtered
//   2. If index missing, fall back to full collection scan + filter in JS
//   3. Also scan for old-format docs (no mode prefix) and include them
async function getAllMonthsFromFirestore(mode) {
  try {
    const [user, db, fns] = await Promise.all([
      waitForAuth(),
      waitForDb(),
      getFirestoreFns(),
    ]);
    const { collection, getDocs, query, orderBy, where } = fns;

    const monthsRef  = collection(db, 'users', user.uid, 'months');
    const monthSet   = new Map(); // month name → updatedAt (for dedup + sort)

    // ── Strategy 1: compound query (needs composite index) ──────────────────
    let compoundOk = false;
    try {
      const q        = query(monthsRef, where('mode', '==', mode || ''), orderBy('updatedAt', 'desc'));
      const snapshot = await withRetry(() => getDocs(q));
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.userId === user.uid && data.month) {
          monthSet.set(data.month, data.updatedAtISO || '');
        }
      });
      compoundOk = true;
      console.log(`Compound query found ${monthSet.size} months for [${mode}]`);
    } catch (indexErr) {
      // Index not ready yet — fall through to full scan
      console.warn('Compound query failed (index may not exist yet), using full scan:', indexErr.message);
    }

    // ── Strategy 2: full collection scan (no index needed) ──────────────────
    // Always run this to catch old-format docs that have no mode field.
    try {
      const allSnap = await withRetry(() => getDocs(query(monthsRef, orderBy('updatedAtISO', 'desc'))));
      allSnap.forEach(docSnap => {
        const data   = docSnap.data();
        const docId  = docSnap.id;
        if (data.userId !== user.uid || !data.month) return;

        // Include if:
        // (a) doc has matching mode field  OR
        // (b) doc has no mode field (old format) — belongs to this user and we show it
        const docMode     = data.mode || null;
        const isNewFormat = docId.startsWith(mode.toLowerCase() + '_');
        const isOldFormat = !docMode && !docId.includes('_');
        const isSameMode  = docMode === mode;

        if (isNewFormat || isSameMode || isOldFormat) {
          if (!monthSet.has(data.month)) {
            monthSet.set(data.month, data.updatedAtISO || '');
          }
        }
      });
    } catch (scanErr) {
      console.warn('Full scan fallback also failed:', scanErr.message);
      // If both strategies fail, return empty — do not crash
      if (!compoundOk) return [];
    }

    // Sort newest first
    const months = [...monthSet.keys()].sort((a, b) => {
      const MONTHS = ['January','February','March','April','May','June',
                      'July','August','September','October','November','December'];
      const parse  = str => {
        const [m, y] = (str || '').split(' ');
        return new Date(parseInt(y) || 0, MONTHS.indexOf(m));
      };
      return parse(b) - parse(a);
    });

    console.log(`getAllMonthsFromFirestore [${mode}]: found ${months.length} months`);
    return months;

  } catch (error) {
    console.error('Error getting months from Firestore:', error);
    return [];
  }
}

async function deleteMonthFromFirestore(mode, month) {
  try {
    const [user, db, { doc, deleteDoc, getDoc }] = await Promise.all([
      waitForAuth(),
      waitForDb(),
      getFirestoreFns(),
    ]);

    const newKey = buildDocKey(mode, month);
    const oldKey = buildOldDocKey(month);

    const newRef = doc(db, 'users', user.uid, 'months', newKey);
    const oldRef = doc(db, 'users', user.uid, 'months', oldKey);

    // Delete both new and old format keys so nothing is left behind
    const [newSnap, oldSnap] = await Promise.all([
      getDoc(newRef).catch(() => null),
      getDoc(oldRef).catch(() => null),
    ]);

    const deletes = [];
    if (newSnap?.exists()) deletes.push(deleteDoc(newRef));
    if (oldSnap?.exists() && oldKey !== newKey) deletes.push(deleteDoc(oldRef));

    await Promise.all(deletes);
    console.log(`Deleted: [${mode}] ${month}`);
    return true;
  } catch (error) {
    console.error('Error deleting from Firestore:', error);
    return false;
  }
}

// ── Real-time sync ────────────────────────────────────────────────────────────

let _unsubscribeListeners = {};

async function startRealtimeSync(mode, month, onUpdate) {
  try {
    const listenerKey = buildDocKey(mode, month);
    stopRealtimeSync(mode, month);

    const { ref, user } = await getMonthRef(mode, month);
    const { onSnapshot } = await getFirestoreFns();

    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        if (data.userId !== user.uid) return;
        onUpdate(data);
      },
      (err) => console.error('Real-time sync error:', err)
    );

    _unsubscribeListeners[listenerKey] = unsubscribe;
  } catch (error) {
    console.error('Could not start real-time sync:', error);
  }
}

function stopRealtimeSync(mode, month) {
  const listenerKey = buildDocKey(mode, month);
  if (_unsubscribeListeners[listenerKey]) {
    _unsubscribeListeners[listenerKey]();
    delete _unsubscribeListeners[listenerKey];
  }
}

function stopAllRealtimeSync() {
  Object.keys(_unsubscribeListeners).forEach(key => {
    _unsubscribeListeners[key]();
    delete _unsubscribeListeners[key];
  });
  _unsubscribeListeners = {};
}

async function syncAllOnLogin(mode, onMonthLoaded) {
  try {
    console.log(`Starting sync for [${mode}]...`);
    const months = await getAllMonthsFromFirestore(mode);

    for (const month of months) {
      const data = await loadMonthFromFirestore(mode, month);
      if (data && typeof onMonthLoaded === 'function') {
        onMonthLoaded(month, data);
      }
    }

    console.log(`Synced ${months.length} month(s) for [${mode}]`);
    return months;
  } catch (error) {
    console.error('Error during login sync:', error);
    return [];
  }
}

// ── Expose to window ──────────────────────────────────────────────────────────

window.firestoreSync = {
  saveMonthToFirestore,
  loadMonthFromFirestore,
  getAllMonthsFromFirestore,
  deleteMonthFromFirestore,
  startRealtimeSync,
  stopRealtimeSync,
  stopAllRealtimeSync,
  syncAllOnLogin,
};

window.saveMonthToFirestore     = saveMonthToFirestore;
window.loadMonthFromFirestore   = loadMonthFromFirestore;
window.getAllMonthsFromFirestore = getAllMonthsFromFirestore;
window.deleteMonthFromFirestore = deleteMonthFromFirestore;
window.startRealtimeSync        = startRealtimeSync;
window.stopRealtimeSync         = stopRealtimeSync;
window.stopAllRealtimeSync      = stopAllRealtimeSync;
window.syncAllOnLogin           = syncAllOnLogin;

console.log('firestoreSync.js loaded');
