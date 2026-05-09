class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Something went wrong</h1>
            <p className="text-gray-600 mb-4">We're sorry, but something unexpected happened.</p>
            <button onClick={() => window.location.reload()} className="btn-primary">
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Session persistence helpers ───────────────────────────────────────────────
// We store a lightweight session record in localStorage so the app can restore
// the last active mode + month on startup without asking the user again.

const SESSION_KEY = 'spensa_last_session';

function saveSession(mode, month) {
  try {
    if (mode && month) {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ mode, month }));
    }
  } catch (e) {}
}

function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function clearSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch (e) {}
}
// ─────────────────────────────────────────────────────────────────────────────

function App() {
  try {
    const [mode, setMode]                     = React.useState(null);
    const [currentMonth, setCurrentMonth]     = React.useState(null);
    const [income, setIncome]                 = React.useState(0);
    const [allocation, setAllocation]         = React.useState(null);
    const [expenses, setExpenses]             = React.useState([]);
    const [goals, setGoals]                   = React.useState([]);
    const [alert, setAlert]                   = React.useState(null);
    const [currentSection, setCurrentSection] = React.useState('home');
    const [loading, setLoading]               = React.useState(false);
    // sessionRestoring: true while we check for a saved session on startup.
    // Keeps a blank screen from flashing before the session is restored.
    const [sessionRestoring, setSessionRestoring] = React.useState(true);
    const [editIncomeModal, setEditIncomeModal] = React.useState(false);
    const [editIncomeValue, setEditIncomeValue] = React.useState('');
    const [editIncomeError, setEditIncomeError] = React.useState('');

    // ── STARTUP: restore last session ─────────────────────────────────────────
    // On mount, wait for Firebase auth to resolve then check if there is a
    // saved session. If yes, restore mode + month + Firestore data automatically
    // so the user lands back on their dashboard instead of the setup flow.
    React.useEffect(() => {
      let cancelled = false;

      const restore = async () => {
        // Wait up to 8 seconds for auth to resolve
        const waitForUser = () => new Promise((resolve) => {
          if (window.currentUser !== undefined && window.currentUser !== null) {
            return resolve(window.currentUser);
          }
          const start = Date.now();
          const iv = setInterval(() => {
            if (window.currentUser) {
              clearInterval(iv);
              resolve(window.currentUser);
            } else if (Date.now() - start > 8000) {
              clearInterval(iv);
              resolve(null);
            }
          }, 100);
        });

        const user = await waitForUser();

        if (cancelled) return;

        if (!user) {
          // Not signed in — start fresh
          setSessionRestoring(false);
          return;
        }

        const session = loadSession();
        if (!session || !session.mode || !session.month) {
          // No previous session — show ModeSelector
          setSessionRestoring(false);
          return;
        }

        // We have a saved session — try to restore data from Firestore
        try {
          const data = await loadMonthFromFirestore(session.mode, session.month);
          if (cancelled) return;

          if (data && data.income > 0 && data.allocation) {
            // Full session found — restore everything silently
            setMode(session.mode);
            setCurrentMonth(session.month);
            setIncome(data.income);
            setAllocation(data.allocation);
            setExpenses(data.expenses || []);
            setGoals(data.goals || []);
            console.log(`Session restored: [${session.mode}] ${session.month}`);
          } else {
            // Session key exists but no valid Firestore data — start fresh
            clearSession();
          }
        } catch (err) {
          console.error('Session restore error:', err);
          clearSession();
        }

        if (!cancelled) setSessionRestoring(false);
      };

      restore();
      return () => { cancelled = true; };
    }, []); // run once on mount only

    // ── Load month data when mode + month are selected ────────────────────────
    const loadMonthDataFromFirestore = React.useCallback(async () => {
      setLoading(true);
      try {
        const data = await loadMonthFromFirestore(mode, currentMonth);
        if (data) {
          setIncome(data.income || 0);
          setAllocation(data.allocation || null);
          setExpenses(data.expenses || []);
          setGoals(data.goals || []);
        } else {
          setIncome(0);
          setAllocation(null);
          setExpenses([]);
          setGoals([]);
        }
      } catch (error) {
        console.error('Error loading month data:', error);
      }
      setLoading(false);
    }, [currentMonth, mode]);

    React.useEffect(() => {
      if (currentMonth && mode && window.currentUser && !sessionRestoring) {
        loadMonthDataFromFirestore();
      }
    }, [currentMonth, mode, loadMonthDataFromFirestore, sessionRestoring]);

    // ── Save session key whenever mode + month are confirmed ──────────────────
    React.useEffect(() => {
      if (mode && currentMonth) {
        saveSession(mode, currentMonth);
      }
    }, [mode, currentMonth]);

    // ── Auto-save when expenses or goals change ───────────────────────────────
    const isReadyToAutoSave =
      !loading &&
      !sessionRestoring &&
      mode &&
      currentMonth &&
      income > 0 &&
      allocation &&
      window.currentUser;

    React.useEffect(() => {
      if (!isReadyToAutoSave) return;
      saveMonthToFirestore(mode, currentMonth, income, allocation, expenses, goals)
        .catch(err => console.error('Auto-save failed:', err));
    }, [expenses, goals]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Helpers ───────────────────────────────────────────────────────────────
    const showAlert = (message, type = 'warning') => {
      setAlert({ message, type });
      setTimeout(() => setAlert(null), 5000);
    };

    const handleNavigate = (sectionId) => {
      setCurrentSection(sectionId);
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };

    const handleAddSavingExpense = async (amount, goalName) => {
      const newExpense = {
        id:       Date.now(),
        name:     `Savings for ${goalName}`,
        category: 'Savings',
        amount:   parseFloat(amount),
        date:     new Date().toISOString(),
      };
      const updatedExpenses = [newExpense, ...expenses];
      setExpenses(updatedExpenses);
      saveToStorage({ mode, currentMonth, income, allocation, expenses: updatedExpenses, goals });
      if (window.currentUser) {
        try {
          await saveMonthToFirestore(mode, currentMonth, income, allocation, updatedExpenses, goals);
        } catch (err) {
          console.error('Failed to sync saving expense:', err);
        }
      }
    };

    const handleManualSave = async () => {
      if (income > 0 && window.currentUser) {
        try {
          await saveMonthToFirestore(mode, currentMonth, income, allocation, expenses, goals);
          showAlert('All data saved successfully!', 'success');
        } catch (error) {
          console.error('Save error:', error);
          showAlert('Failed to save data', 'danger');
        }
      } else if (!window.currentUser) {
        showAlert('Please sign in to save your data to the cloud.', 'warning');
      }
    };

    // ── EDIT INCOME ───────────────────────────────────────────────────────────
    const handleOpenEditIncome = () => {
      setEditIncomeValue(String(income));
      setEditIncomeError('');
      setEditIncomeModal(true);
    };

    const handleConfirmEditIncome = async () => {
      const parsed = parseFloat(editIncomeValue);
      if (!editIncomeValue || isNaN(parsed) || parsed <= 0) {
        setEditIncomeError('Please enter a valid income amount greater than 0.');
        return;
      }
      if (parsed === income) {
        setEditIncomeModal(false);
        return;
      }
      // Update income in state — allocation percentages stay the same,
      // the amounts will recompute automatically via AllocationSelector logic.
      const newAllocation = allocation ? {
        ...allocation,
        needsAmount:   (allocation.needs   / 100) * parsed,
        wantsAmount:   (allocation.wants   / 100) * parsed,
        othersAmount:  (allocation.others  / 100) * parsed,
        savingsAmount: (allocation.savings / 100) * parsed,
      } : allocation;

      setIncome(parsed);
      if (newAllocation) setAllocation(newAllocation);
      setEditIncomeModal(false);
      setEditIncomeError('');

      // Save updated income to Firestore immediately
      if (window.currentUser) {
        try {
          await saveMonthToFirestore(mode, currentMonth, parsed, newAllocation, expenses, goals);
          showAlert('Income updated and saved!', 'success');
        } catch (err) {
          console.error('Failed to save updated income:', err);
          showAlert('Income updated locally but failed to sync.', 'warning');
        }
      }
    };
    // ─────────────────────────────────────────────────────────────────────────

    // Goes back to ModeSelector and clears the saved session
    const handleGoToHome = async () => {
      if (income > 0 && window.currentUser && mode && currentMonth) {
        try {
          await saveMonthToFirestore(mode, currentMonth, income, allocation, expenses, goals);
        } catch (err) {
          console.error('Save on home navigation failed:', err);
        }
      }
      // Clear session so next load starts from ModeSelector
      clearSession();
      setMode(null);
      setCurrentMonth(null);
      setIncome(0);
      setAllocation(null);
      setExpenses([]);
      setGoals([]);
      setCurrentSection('home');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleChangeMode = () => {
      clearSession();
      setMode(null);
      setCurrentMonth(null);
      setIncome(0);
      setAllocation(null);
      setExpenses([]);
      setGoals([]);
      setCurrentSection('home');
    };

    const handleChangeMonth = () => {
      // Keep mode but clear month and data
      const savedMode = mode;
      clearSession();
      setCurrentMonth(null);
      setIncome(0);
      setAllocation(null);
      setExpenses([]);
      setGoals([]);
      setCurrentSection('home');
      // Restore mode so MonthSelector shows immediately
      setMode(savedMode);
    };

    // ── Routing ───────────────────────────────────────────────────────────────

    // Show full-screen spinner while checking for a saved session on startup
    if (sessionRestoring) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div
              style={{
                width: '48px', height: '48px', margin: '0 auto 16px',
                border: '4px solid #f3f3f3',
                borderTop: '4px solid #e63946',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            ></div>
            <p className="text-gray-500 text-sm">Loading your session...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      );
    }

    if (!mode) {
      return <ModeSelector onSelectMode={setMode} />;
    }

    if (mode === 'expected') {
      return <ExpectedBudget onBack={() => { clearSession(); setMode(null); }} />;
    }

    if (!currentMonth) {
      return (
        <MonthSelector
          onSelectMonth={setCurrentMonth}
          onBack={() => { clearSession(); setMode(null); }}
          mode={mode}
        />
      );
    }

    if (income === 0) {
      return (
        <IncomeInput
          mode={mode}
          onSetIncome={setIncome}
          onBack={() => setCurrentMonth(null)}
        />
      );
    }

    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="icon-loader animate-spin text-5xl text-[var(--primary-color)] mb-4"></div>
            <p className="text-gray-600">Loading your data...</p>
          </div>
        </div>
      );
    }

    if (!allocation) {
      return (
        <AllocationSelector
          mode={mode}
          income={income}
          onSetAllocation={setAllocation}
          onBack={() => setIncome(0)}
        />
      );
    }

    return (
      <div className="min-h-screen bg-gray-50" data-name="app" data-file="app.js">
        {alert && <Alert message={alert.message} type={alert.type} onClose={() => setAlert(null)} />}

        {/* Edit Income Modal */}
        {editIncomeModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            onClick={() => setEditIncomeModal(false)}
          >
            <div
              className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Edit Monthly Income</h3>
                <button
                  onClick={() => setEditIncomeModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <div className="icon-x text-xl"></div>
                </button>
              </div>

              <p className="text-sm text-gray-500 mb-1">Current income</p>
              <p className="text-2xl font-bold mb-4" style={{ color: 'var(--primary-color)' }}>
                {formatCurrency(income)}
              </p>

              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Income Amount
              </label>

              {editIncomeError && (
                <div className="text-sm bg-red-50 text-red-600 rounded-lg px-3 py-2 mb-3 flex items-center gap-2">
                  <div className="icon-circle-alert text-xs flex-shrink-0"></div>
                  <span>{editIncomeError}</span>
                </div>
              )}

              <input
                type="number"
                value={editIncomeValue}
                onChange={e => { setEditIncomeValue(e.target.value); setEditIncomeError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleConfirmEditIncome()}
                placeholder="Enter new income"
                min="1"
                step="0.01"
                autoFocus
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none transition-colors mb-2"
                style={{ borderColor: editIncomeError ? '#e63946' : '' }}
                onFocus={e => e.target.style.borderColor = '#e63946'}
                onBlur={e => e.target.style.borderColor = editIncomeError ? '#e63946' : '#e5e7eb'}
              />

              <p className="text-xs text-gray-400 mb-4">
                Budget percentages stay the same — only the amounts will update.
              </p>

              <div className="flex gap-3">
                <button onClick={handleConfirmEditIncome} className="btn-primary flex-1">
                  <div className="flex items-center justify-center gap-2">
                    <div className="icon-check text-sm"></div>
                    <span>Update Income</span>
                  </div>
                </button>
                <button
                  onClick={() => { setEditIncomeModal(false); setEditIncomeError(''); }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <Navbar
          currentSection={currentSection}
          onNavigate={handleNavigate}
          onGoHome={handleGoToHome}
        />

        <div className="bg-white shadow-sm py-3 sticky top-16 z-40">
          <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              <span className="font-semibold">{currentMonth}</span>
              {' • '}
              <span className="capitalize">{mode} Mode</span>
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={handleOpenEditIncome}
                className="text-sm font-medium transition-colors flex items-center gap-1"
                style={{ color: 'var(--primary-color)' }}
                title="Edit monthly income"
              >
                <div className="icon-pencil text-xs"></div>
                <span>Edit Income</span>
              </button>
              <button
                onClick={handleChangeMonth}
                className="text-sm text-gray-600 hover:text-[var(--primary-color)] font-medium transition-colors"
              >
                Change Month
              </button>
              <button
                onClick={handleChangeMode}
                className="text-sm text-gray-600 hover:text-[var(--primary-color)] font-medium transition-colors"
              >
                Change Mode
              </button>
            </div>
          </div>
        </div>

        <main className="max-w-7xl mx-auto px-4 py-6 space-y-8 animate-fade-in pb-20">
          <div id="budget">
            <BudgetBreakdownSimple mode={mode} income={income} expenses={expenses} allocation={allocation} onAlert={showAlert} />
          </div>
          <div id="expenses">
            <ExpenseTracker expenses={expenses} setExpenses={setExpenses} />
          </div>
          <div id="goals">
            <GoalTracker goals={goals} setGoals={setGoals} onAddSavingExpense={handleAddSavingExpense} />
          </div>
          <div id="summary">
            <Summary mode={mode} income={income} expenses={expenses} goals={goals} allocation={allocation} />
          </div>
          <div id="insights">
            <SmartInsights mode={mode} income={income} expenses={expenses} allocation={allocation} onAlert={showAlert} />
          </div>
          <BudgetChart mode={mode} income={income} expenses={expenses} allocation={allocation} />
          <MonthlyOverview expenses={expenses} />

          <div className="card text-center">
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={handleManualSave} className="btn-primary">
                <div className="flex items-center gap-2">
                  <div className="icon-save text-xl"></div>
                  <span>Save All Changes</span>
                </div>
              </button>
              <button onClick={handleGoToHome} className="btn-secondary">
                <div className="flex items-center gap-2">
                  <div className="icon-home text-xl"></div>
                  <span>Back to Home</span>
                </div>
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-3">Save your data or go back to the home page</p>
          </div>
        </main>
      </div>
    );
  } catch (error) {
    console.error('App component error:', error);
    return null;
  }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
