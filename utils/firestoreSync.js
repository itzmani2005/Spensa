
const MAX_RETRIES = 3;
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
  if (window.firestoreFns) return window.firestoreFns;

  // Fallback: dynamic import (works on most hosts including localhost)
  try {
    const mod = await import('https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js');
    window.firestoreFns = mod;
    return mod;
  } catch (e) {
    throw new Error(
      'Firestore SDK not available. Add this to index.html before firestoreSync.js:\n' +
      '<script type="module" src="https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js"><\/script>'
    );
  }
}
async function withRetry(fn, retries = MAX_RETRIES) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isLast = attempt === retries;
      const isTransient =
        err.code === 'unavailable' ||
        err.code === 'deadline-exceeded' ||
        err.message?.includes('network');

      if (isLast || !isTransient) throw err;

      console.warn(`Firestore attempt ${attempt} failed, retrying in ${RETRY_DELAY_MS}ms…`, err.code);
      await new Promise(r => setTimeout(r, RETRY_DELAY_MS * attempt));
    }
  }
}


async function getMonthRef(month) {
  const [user, db, { doc }] = await Promise.all([
    waitForAuth(),
    waitForDb(),
    getFirestoreFns(),
  ]);
  const monthKey = month.replace(/\s+/g, '-');
  return { ref: doc(db, 'users', user.uid, 'months', monthKey), user };
}

async function saveMonthToFirestore(mode, month, income, allocation, expenses, goals) {
  try {
    const { ref, user } = await getMonthRef(month);
    const { setDoc, serverTimestamp } = await getFirestoreFns();

    await withRetry(() =>
      setDoc(ref, {
        userId: user.uid,
        mode,
        month,
        income,
        allocation,
        expenses: expenses || [],
        goals: goals || [],
        updatedAt: serverTimestamp(),
        updatedAtISO: new Date().toISOString(),
      }, { merge: true }) 
    );
    console.log('✅ Saved to Firestore:', month);
  } catch (error) {
    console.error('❌ Error saving to Firestore:', error);
    throw error;
  }
}

async function loadMonthFromFirestore(month) {
  try {
    const { ref, user } = await getMonthRef(month);
    const { getDoc } = await getFirestoreFns();

    const snap = await withRetry(() => getDoc(ref));

    if (!snap.exists()) return null;

    const data = snap.data();

    if (data.userId !== user.uid) {
      console.error('userId mismatch — discarding document');
      return null;
    }

    return data;
  } catch (error) {
    console.error('❌ Error loading from Firestore:', error);
    return null;
  }
}

async function getAllMonthsFromFirestore() {
  try {
    const [user, db, { collection, getDocs, query, orderBy }] = await Promise.all([
      waitForAuth(),
      waitForDb(),
      getFirestoreFns(),
    ]);

    const monthsRef = collection(db, 'users', user.uid, 'months');
    const q = query(monthsRef, orderBy('updatedAt', 'desc'));
    const snapshot = await withRetry(() => getDocs(q));

    const months = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (data.userId === user.uid && data.month) {
        months.push(data.month);
      }
    });

    return months;
  } catch (error) {
    console.error('❌ Error getting months from Firestore:', error);
    return [];
  }
}

async function deleteMonthFromFirestore(month) {
  try {
    const { ref } = await getMonthRef(month);
    const { deleteDoc } = await getFirestoreFns();

    await withRetry(() => deleteDoc(ref));
    console.log('🗑️ Deleted from Firestore:', month);
    return true;
  } catch (error) {
    console.error('❌ Error deleting from Firestore:', error);
    return false;
  }
}


let _unsubscribeListeners = {}; 

async function startRealtimeSync(month, onUpdate) {
  try {
  
    stopRealtimeSync(month);

    const { ref, user } = await getMonthRef(month);
    const { onSnapshot } = await getFirestoreFns();

    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        if (data.userId !== user.uid) return;
        console.log('🔄 Real-time update received for:', month);
        onUpdate(data);
      },
      (error) => {
        console.error('❌ Real-time sync error:', error);
      }
    );

    _unsubscribeListeners[month] = unsubscribe;
    console.log('📡 Real-time sync started for:', month);
  } catch (error) {
    console.error('❌ Could not start real-time sync:', error);
  }
}

function stopRealtimeSync(month) {
  if (_unsubscribeListeners[month]) {
    _unsubscribeListeners[month]();
    delete _unsubscribeListeners[month];
    console.log('⏹️ Real-time sync stopped for:', month);
  }
}

function stopAllRealtimeSync() {
  Object.keys(_unsubscribeListeners).forEach(stopRealtimeSync);
}

// ── 5. Auto-sync on login ─────────────────────────────────────────────────────

/**
 * Call this right after Google sign-in succeeds.
 * It loads all months from Firestore and merges them into local state.
 * This is what makes data appear automatically on a new device.
 *
 * @param {function} onMonthLoaded  - called for each month: (monthName, data) => {}
 */
async function syncAllOnLogin(onMonthLoaded) {
  try {
    console.log('🔃 Starting full sync after login…');
    const months = await getAllMonthsFromFirestore();

    for (const month of months) {
      const data = await loadMonthFromFirestore(month);
      if (data && typeof onMonthLoaded === 'function') {
        onMonthLoaded(month, data);
      }
    }

    console.log(`✅ Synced ${months.length} month(s) from Firestore`);
    return months;
  } catch (error) {
    console.error('❌ Error during login sync:', error);
    return [];
  }
}
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

console.log('firestoreSync.js loaded ✅');