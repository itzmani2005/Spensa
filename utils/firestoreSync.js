// ============================================================
// firestoreSync.js — Fixed
// KEY FIX: mode is now included in the Firestore document key
// so Student and Professional data are stored separately.
// Document path: users/{uid}/months/{mode}_{monthKey}
// e.g. student_March-2026  vs  professional_March-2026
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
        'Make sure index.html imports all Firestore functions in its ' +
        '<script type="module"> block and assigns them to window.firestoreFns.'
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
      console.warn(`Firestore attempt ${attempt} failed, retrying in ${RETRY_DELAY_MS}ms...`, err.code);
      await new Promise(r => setTimeout(r, RETRY_DELAY_MS * attempt));
    }
  }
}

// ── THE CORE FIX ──────────────────────────────────────────────────────────────
// Before: key = "March-2026"  (same for ALL modes — data was shared)
// After:  key = "student_March-2026"  OR  "professional_March-2026"
// Each mode now has its own completely separate Firestore document.
function buildDocKey(mode, month) {
  const safeMode  = (mode  || 'unknown').toLowerCase().replace(/\s+/g, '-');
  const safeMonth = (month || '').replace(/\s+/g, '-');
  return `${safeMode}_${safeMonth}`;
}
// ─────────────────────────────────────────────────────────────────────────────

async function getMonthRef(mode, month) {
  const [user, db, { doc }] = await Promise.all([
    waitForAuth(),
    waitForDb(),
    getFirestoreFns(),
  ]);
  const docKey = buildDocKey(mode, month);
  return { ref: doc(db, 'users', user.uid, 'months', docKey), user };
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

    console.log(`Saved to Firestore: [${mode}] ${month}`);
  } catch (error) {
    console.error('Error saving to Firestore:', error);
    throw error;
  }
}

async function loadMonthFromFirestore(mode, month) {
  try {
    const { ref, user } = await getMonthRef(mode, month);
    const { getDoc } = await getFirestoreFns();

    const snap = await withRetry(() => getDoc(ref));
    if (!snap.exists()) return null;

    const data = snap.data();
    if (data.userId !== user.uid) {
      console.error('userId mismatch - discarding document');
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error loading from Firestore:', error);
    return null;
  }
}

// Returns only months that belong to the given mode
async function getAllMonthsFromFirestore(mode) {
  try {
    const [user, db, fns] = await Promise.all([
      waitForAuth(),
      waitForDb(),
      getFirestoreFns(),
    ]);
    const { collection, getDocs, query, orderBy, where } = fns;

    const monthsRef = collection(db, 'users', user.uid, 'months');
    // Filter by mode field so Student months never appear in Professional list
    const q = query(
      monthsRef,
      where('mode', '==', mode || ''),
      orderBy('updatedAt', 'desc')
    );
    const snapshot = await withRetry(() => getDocs(q));

    const months = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (data.userId === user.uid && data.month && data.mode === mode) {
        months.push(data.month);
      }
    });

    return months;
  } catch (error) {
    console.error('Error getting months from Firestore:', error);
    return [];
  }
}

async function deleteMonthFromFirestore(mode, month) {
  try {
    const { ref } = await getMonthRef(mode, month);
    const { deleteDoc } = await getFirestoreFns();

    await withRetry(() => deleteDoc(ref));
    console.log(`Deleted from Firestore: [${mode}] ${month}`);
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
      (error) => {
        console.error('Real-time sync error:', error);
      }
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
}

async function syncAllOnLogin(mode, onMonthLoaded) {
  try {
    console.log(`Starting full sync for mode: ${mode}...`);
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
