
function _monthKey(userId, mode, month) {
  return `spensa_${userId}_${mode}_${month.replace(/\s+/g, '_')}`;
}

function _indexKey(userId, mode) {
  
  return `spensa_months_${userId}_${mode}`;
}


function _requireAuth(fnName) {
  if (!window.currentUser) {
    console.warn(`[storage] ${fnName}: no authenticated user — skipping`);
    return null;
  }
  return window.currentUser.uid;
}


function saveToStorage(data) {
  try {
    
    if (!data.currentMonth || !data.mode) {
      console.error('[storage] saveToStorage: month and mode are required');
      return false;
    }

    const userId = _requireAuth('saveToStorage');
    if (!userId) return false;

    const monthData = {
      userId,
      mode:         data.mode,
      currentMonth: data.currentMonth,
      income:       data.income       ?? 0,
      allocation:   data.allocation   ?? null,   // FIX 4
      expenses:     data.expenses     || [],
      goals:        data.goals        || [],
      savedAt:      new Date().toISOString(),
    };

    const key = _monthKey(userId, data.mode, data.currentMonth);
    localStorage.setItem(key, JSON.stringify(monthData));


    const allMonths = _getAllMonthsRaw(userId, data.mode);
    if (!allMonths.includes(data.currentMonth)) {
      allMonths.push(data.currentMonth);
      localStorage.setItem(_indexKey(userId, data.mode), JSON.stringify(allMonths));
    }

    return true;
  } catch (error) {
    
    if (error.name === 'QuotaExceededError') {
      console.error('[storage] saveToStorage: localStorage quota exceeded');
    } else {
      console.error('[storage] saveToStorage error:', error);
    }
    return false;
  }
}


function loadMonthData(month, mode) {
  try {
    if (!month || !mode) {
      console.error('[storage] loadMonthData: month and mode are required');
      return null;
    }

    const userId = _requireAuth('loadMonthData');
    if (!userId) return null;

    const key  = _monthKey(userId, mode, month);
    const raw  = localStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw);

    if (parsed.userId !== userId) {
      console.warn('[storage] loadMonthData: userId mismatch — discarding');
      localStorage.removeItem(key);   
      return null;
    }

    return {
      userId:       parsed.userId,
      mode:         parsed.mode         ?? mode,
      currentMonth: parsed.currentMonth ?? month,
      income:       parsed.income       ?? 0,
      allocation:   parsed.allocation   ?? null,
      expenses:     parsed.expenses     || [],
      goals:        parsed.goals        || [],
      savedAt:      parsed.savedAt      ?? null,
    };
  } catch (error) {
    console.error('[storage] loadMonthData error:', error);
    return null;
  }
}

function _getAllMonthsRaw(userId, mode) {
  try {
    const raw = localStorage.getItem(_indexKey(userId, mode));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function getAllMonths(mode) {
  try {
    if (!mode) return [];
    const userId = _requireAuth('getAllMonths');
    if (!userId) return [];
    return _getAllMonthsRaw(userId, mode);
  } catch (error) {
    console.error('[storage] getAllMonths error:', error);
    return [];
  }
}


function deleteMonthData(month, mode) {
  try {
    if (!month || !mode) {
      console.error('[storage] deleteMonthData: month and mode are required');
      return false;
    }

    const userId = _requireAuth('deleteMonthData');
    if (!userId) return false;

    // Remove the month document
    localStorage.removeItem(_monthKey(userId, mode, month));

    // Update the months index
    const updated = _getAllMonthsRaw(userId, mode).filter(m => m !== month);
    localStorage.setItem(_indexKey(userId, mode), JSON.stringify(updated));

    return true;
  } catch (error) {
    console.error('[storage] deleteMonthData error:', error);
    return false;
  }
}


function clearAllDataForUser() {
  try {
    const userId = _requireAuth('clearAllDataForUser');
    if (!userId) return;

    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.includes(userId)) keysToRemove.push(k);
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    console.log(`[storage] Cleared ${keysToRemove.length} localStorage entries for user`);
  } catch (error) {
    console.error('[storage] clearAllDataForUser error:', error);
  }
}


window.saveToStorage       = saveToStorage;
window.loadMonthData       = loadMonthData;
window.getAllMonths         = getAllMonths;
window.deleteMonthData     = deleteMonthData;
window.clearAllDataForUser = clearAllDataForUser;

console.log('storage.js loaded ✅');