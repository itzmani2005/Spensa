function MonthSelector({ onSelectMonth, onBack, mode }) {
  try {
    const [customMonth, setCustomMonth] = React.useState('');
    const [showCustom, setShowCustom] = React.useState(false);
    const [savedMonths, setSavedMonths] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [deleteModal, setDeleteModal] = React.useState({ isOpen: false, month: '' });
    const [error, setError] = React.useState('');
    const [customError, setCustomError] = React.useState('');

    React.useEffect(() => {
      if (mode && window.currentUser) {
        loadMonthsList();
      } else if (mode && !window.currentUser) {
       
        const timer = setTimeout(() => {
          if (window.currentUser) loadMonthsList();
          else setLoading(false); 
        }, 2000);
        return () => clearTimeout(timer);
      }
    }, [mode]);

    const loadMonthsList = async () => {
      setLoading(true);
      setError('');
      try {
        
        const [firestoreMonths, localMonths] = await Promise.all([
          getAllMonthsFromFirestore().catch(() => []),
          Promise.resolve(getAllMonths(mode)),
        ]);
        const merged = [...new Set([...firestoreMonths, ...localMonths])];

        
        const sorted = merged.sort((a, b) => {
          const parse = (str) => {
            const [month, year] = str.split(' ');
            const months = ['January','February','March','April','May','June',
                            'July','August','September','October','November','December'];
            return new Date(parseInt(year), months.indexOf(month));
          };
          return parse(b) - parse(a); // descending — newest first
        });

        setSavedMonths(sorted);
      } catch (err) {
        console.error('Error loading months:', err);
        setError('Could not load saved months. Showing local data only.');
        setSavedMonths(getAllMonths(mode));
      } finally {
        setLoading(false);
      }
    };

    const getCurrentMonth = () => {
      const date   = new Date();
      const months = ['January','February','March','April','May','June',
                      'July','August','September','October','November','December'];
      return `${months[date.getMonth()]} ${date.getFullYear()}`;
    };

    
    const VALID_MONTHS = ['January','February','March','April','May','June',
                          'July','August','September','October','November','December'];

    const validateCustomMonth = (value) => {
      const trimmed = value.trim();
      if (!trimmed) return 'Please enter a month name.';
      const parts = trimmed.split(' ');
      if (parts.length !== 2) return 'Format must be "Month Year" e.g. December 2025';
      const [monthName, year] = parts;
      if (!VALID_MONTHS.includes(monthName))
        return `"${monthName}" is not a valid month name.`;
      const yearNum = parseInt(year);
      if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100)
        return 'Please enter a valid year between 2000 and 2100.';
      return null; // valid
    };

    const handleSelect = (month) => {
      onSelectMonth(month);
    };

    const handleCustomConfirm = () => {
      const validationError = validateCustomMonth(customMonth);
      if (validationError) {
        setCustomError(validationError);
        return;
      }
     
      const [m, y] = customMonth.trim().split(' ');
      const normalised = `${m.charAt(0).toUpperCase()}${m.slice(1).toLowerCase()} ${y}`;
      setCustomError('');
      handleSelect(normalised);
    };

    const handleDeleteClick = (month, e) => {
      e.stopPropagation();
      setDeleteModal({ isOpen: true, month });
    };

    
    const handleDeleteConfirm = async () => {
      try {
        await Promise.all([
          deleteMonthFromFirestore(deleteModal.month).catch(err =>
            console.error('Firestore delete error:', err)
          ),
          Promise.resolve(deleteMonthData(deleteModal.month, mode)),
        ]);
        
        setSavedMonths(prev => prev.filter(m => m !== deleteModal.month));
      } catch (err) {
        console.error('Delete error:', err);
        setError('Failed to delete month. Please try again.');
      } finally {
        setDeleteModal({ isOpen: false, month: '' });
      }
    };

    
    const currentMonth      = getCurrentMonth();
    const filteredSavedMonths = savedMonths.filter(m => m !== currentMonth);

    return (
      <div
        className="min-h-screen flex items-center justify-center bg-white p-4"
        data-name="month-selector"
        data-file="components/MonthSelector.js"
      >
        <ConfirmModal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal({ isOpen: false, month: '' })}
          onConfirm={handleDeleteConfirm}
          title="Delete Month Data"
          message={`Delete all data for ${deleteModal.month}? This will remove it from all your devices and cannot be undone.`}
        />

        <div className="max-w-md w-full animate-fade-in">
          <button
            onClick={onBack}
            className="mb-6 flex items-center gap-2 text-gray-600 hover:text-[var(--primary-color)] transition-colors"
          >
            <div className="icon-arrow-left"></div>
            <span>Back</span>
          </button>

          <div className="card">
            <div className="flex items-center justify-center w-16 h-16 bg-red-50 rounded-xl mb-4 mx-auto border-2 border-red-100">
              <div className="icon-calendar text-2xl text-[var(--primary-color)]"></div>
            </div>
            <h2 className="text-3xl font-bold text-center mb-2">Select Month</h2>
            <p className="text-center text-gray-600 mb-8">Choose a month to track your budget</p>

            {/* FIX 1 — Error banner */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2 text-sm mb-4 flex items-center gap-2">
                <div className="icon-circle-alert text-sm flex-shrink-0"></div>
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-3">
              {/* Current month — always at the top */}
              <button
                onClick={() => handleSelect(currentMonth)}
                className="btn-primary w-full"
              >
                <div className="flex items-center justify-center gap-2">
                  <div className="icon-calendar-check text-sm"></div>
                  <span>{currentMonth} (Current)</span>
                </div>
              </button>

              {/* Saved months */}
              {/* FIX 1 — Show loading spinner while fetching */}
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-6 text-gray-400 text-sm">
                  <div
                    style={{
                      width: '18px', height: '18px',
                      border: '2px solid #f3f3f3',
                      borderTop: '2px solid #e63946',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite',
                    }}
                  ></div>
                  <span>Loading saved months…</span>
                </div>
              ) : filteredSavedMonths.length > 0 ? (
                <div className="space-y-2 mt-2">
                  <p className="text-sm font-medium text-gray-500">
                    Saved Months
                    <span className="ml-1 text-gray-400 font-normal">
                      ({filteredSavedMonths.length})
                    </span>
                  </p>
                  {filteredSavedMonths.map(month => (
                    <div key={month} className="flex items-center gap-2">
                      <button
                        onClick={() => handleSelect(month)}
                        className="btn-secondary flex-1 text-left"
                      >
                        {month}
                      </button>
                      <button
                        onClick={(e) => handleDeleteClick(month, e)}
                        className="px-3 py-3 bg-red-50 text-red-400 hover:text-red-600 rounded-xl hover:bg-red-100 transition-colors flex-shrink-0"
                        title={`Delete ${month}`}
                      >
                        <div className="icon-trash-2 text-sm"></div>
                      </button>
                    </div>
                  ))}
                </div>
              ) : !loading && (
                <p className="text-center text-sm text-gray-400 py-2">
                  No saved months yet
                </p>
              )}

              {/* Custom month entry */}
              {!showCustom ? (
                <button
                  onClick={() => { setShowCustom(true); setCustomError(''); }}
                  className="btn-secondary w-full mt-2"
                >
                  <div className="flex items-center justify-center gap-2">
                    <div className="icon-plus text-sm"></div>
                    <span>Enter a Different Month</span>
                  </div>
                </button>
              ) : (
                <div className="space-y-2 mt-2 p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm font-medium text-gray-600">Enter month manually</p>
                  <p className="text-xs text-gray-400">Format: Month Year — e.g. December 2025</p>

                  {/* FIX 5 — Validation error for custom input */}
                  {customError && (
                    <div className="text-sm text-red-600 flex items-center gap-1">
                      <div className="icon-circle-alert text-xs"></div>
                      <span>{customError}</span>
                    </div>
                  )}

                  <input
                    type="text"
                    value={customMonth}
                    onChange={(e) => { setCustomMonth(e.target.value); setCustomError(''); }}
                    // FIX 10 — Enter key confirms the custom month
                    onKeyDown={(e) => e.key === 'Enter' && handleCustomConfirm()}
                    placeholder="e.g. December 2025"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[var(--primary-color)] focus:outline-none transition-colors"
                    autoFocus
                  />

                  <div className="flex gap-2">
                    <button onClick={handleCustomConfirm} className="btn-primary flex-1">
                      Confirm
                    </button>
                    <button
                      onClick={() => { setShowCustom(false); setCustomMonth(''); setCustomError(''); }}
                      className="btn-secondary flex-1"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* FIX 1 — Spinner keyframe (inline since this file has no <style> tag) */}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  } catch (error) {
    console.error('MonthSelector component error:', error);
    return null;
  }
}