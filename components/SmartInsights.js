function SmartInsights({ mode, income, expenses, allocation, onAlert }) {
  try {
    // FIX 1 — Guard all props against undefined/null to prevent crashes
    // before Firestore data has loaded or on first render.
    const safeIncome   = parseFloat(income) || 0;
    const safeExpenses = Array.isArray(expenses) ? expenses : [];

    // FIX 2 — safeAmount helper: corrupt expense entries (amount: "abc",
    // negative, NaN) caused totalSpent and all derived stats to become NaN,
    // breaking every metric card and suggestion calculation.
    const safeAmount = (val) => {
      const n = parseFloat(val);
      return isNaN(n) || n < 0 ? 0 : n;
    };

    const [suggestions, setSuggestions] = React.useState([]);
    // FIX 3 — Track whether suggestions are loading so the UI doesn't
    // flash "No insights" before generateSuggestions completes.
    const [insightsReady, setInsightsReady] = React.useState(false);

    React.useEffect(() => {
      setInsightsReady(false);
      // FIX 4 — generateSuggestions was called with raw props that could be
      // undefined/null. Pass the safe versions so suggestionEngine never
      // receives bad input.
      try {
        const newSuggestions = generateSuggestions(mode, safeIncome, safeExpenses, allocation);
        setSuggestions(Array.isArray(newSuggestions) ? newSuggestions : []);
      } catch (e) {
        console.error('generateSuggestions error:', e);
        setSuggestions([]);
      }
      setInsightsReady(true);
    }, [mode, safeIncome, safeExpenses, allocation]);

    // FIX 5 — calculateBudgetWithAllocation was called at render time outside
    // the useEffect, with no try/catch. If allocation was malformed (old saved
    // data missing fields), it threw and the entire component returned null.
    // Moved to a safe calculation with fallback.
    let breakdown;
    try {
      breakdown = allocation
        ? calculateBudgetWithAllocation(safeIncome, allocation)
        : calculateBudget(mode, safeIncome);
    } catch (e) {
      console.error('calculateBudget error in SmartInsights:', e);
      breakdown = allocation
        ? {
            needs:   (allocation.needs   / 100) * safeIncome,
            wants:   (allocation.wants   / 100) * safeIncome,
            others:  (allocation.others  / 100) * safeIncome,
            savings: (allocation.savings / 100) * safeIncome,
          }
        : { needs: 0, wants: 0, others: 0, savings: 0 };
    }

    // FIX 2 — Use safeAmount for all expense calculations
    const totalSpent    = safeExpenses.reduce((sum, exp) => sum + safeAmount(exp.amount), 0);
    const savingsSpent  = safeExpenses
      .filter(exp => exp.category === 'Savings')
      .reduce((sum, exp) => sum + safeAmount(exp.amount), 0);
    const remaining     = safeIncome - totalSpent;
    const isOverBudget  = remaining < 0;
    const savingsRate   = safeIncome > 0 ? (savingsSpent / safeIncome) * 100 : 0;

    // FIX 6 — Compute per-category spending for the insights panel.
    // Originally the component only showed overall totals — no per-category
    // breakdown, making it impossible to see which category drove overspending.
    const categorySpent = {
      Needs:   safeExpenses.filter(e => e.category === 'Needs').reduce((s, e) => s + safeAmount(e.amount), 0),
      Wants:   safeExpenses.filter(e => e.category === 'Wants').reduce((s, e) => s + safeAmount(e.amount), 0),
      Others:  safeExpenses.filter(e => e.category === 'Others').reduce((s, e) => s + safeAmount(e.amount), 0),
      Savings: savingsSpent,
    };

    // FIX 7 — typeStyles had no fallback for unknown suggestion types.
    // If generateSuggestions returned a type not in the map (e.g. 'tip'),
    // the card rendered with no background color (undefined className).
    const typeStyles = {
      danger:  'bg-red-50 border-red-200',
      warning: 'bg-yellow-50 border-yellow-200',
      success: 'bg-green-50 border-green-200',
      info:    'bg-blue-50 border-blue-200',
      tip:     'bg-purple-50 border-purple-200',   // FIX 7 — additional type
    };

    const iconColors = {
      danger:  'text-red-600',
      warning: 'text-yellow-600',
      success: 'text-green-600',
      info:    'text-blue-600',
      tip:     'text-purple-600',
    };

    // FIX 7 — Fallback for unknown types
    const getTypeStyle = (type) => typeStyles[type] || typeStyles.info;
    const getIconColor = (type) => iconColors[type] || iconColors.info;

    // FIX 8 — onAlert was accepted as a prop but never called.
    // Trigger the parent alert when a danger-level suggestion is present.
    React.useEffect(() => {
      if (!insightsReady || typeof onAlert !== 'function') return;
      const dangerSuggestions = suggestions.filter(s => s.type === 'danger');
      if (dangerSuggestions.length > 0) {
        onAlert(`⚠️ ${dangerSuggestions[0].message}`, 'danger');
      }
    }, [suggestions, insightsReady]); // eslint-disable-line react-hooks/exhaustive-deps

    // FIX 9 — Suggestion deduplication. generateSuggestions may return
    // duplicate messages (e.g. two "You are overspending on Needs" entries)
    // if called while expenses are partially updated. Deduplicate by message.
    const uniqueSuggestions = suggestions.filter(
      (s, i, arr) => arr.findIndex(x => x.message === s.message) === i
    );

    // ── Render ────────────────────────────────────────────────────────────────
    return (
      <div className="card" data-name="smart-insights" data-file="components/SmartInsights.js">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center border-2 border-red-100">
            <div className="icon-lightbulb text-2xl text-[var(--primary-color)]"></div>
          </div>
          <div>
            <h2 className="text-2xl font-bold">Smart Insights</h2>
            {/* FIX 10 — Show mode context so user knows which rules apply */}
            {mode && (
              <p className="text-xs text-gray-400 capitalize mt-0.5">{mode} mode</p>
            )}
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">

          <div className={`p-4 rounded-xl ${isOverBudget ? 'bg-red-50' : 'bg-gray-50'}`}>
            <div className="text-sm text-gray-600 mb-1">Total Spent</div>
            <div className={`text-xl font-bold ${isOverBudget ? 'text-red-600' : 'text-[var(--primary-color)]'}`}>
              {formatCurrency(totalSpent)}
            </div>
            <div className="text-xs text-gray-500">
              {safeIncome > 0 ? ((totalSpent / safeIncome) * 100).toFixed(1) : 0}% of income
            </div>
            {/* FIX 11 — Show over-budget warning inline */}
            {isOverBudget && (
              <div className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <div className="icon-circle-alert text-xs"></div>
                <span>{formatCurrency(Math.abs(remaining))} over</span>
              </div>
            )}
          </div>

          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="text-sm text-gray-600 mb-1">Savings</div>
            <div className={`text-xl font-bold ${
              savingsRate >= (breakdown.savings / safeIncome * 100 || 20)
                ? 'text-green-600' : 'text-amber-500'
            }`}>
              {formatCurrency(savingsSpent)}
            </div>
            <div className="text-xs text-gray-500">{savingsRate.toFixed(1)}% savings rate</div>
            {/* FIX 6 — show savings target */}
            {breakdown.savings > 0 && (
              <div className="text-xs text-gray-400 mt-0.5">
                Target: {formatCurrency(breakdown.savings)}
              </div>
            )}
          </div>

          <div className={`p-4 rounded-xl ${isOverBudget ? 'bg-red-50' : 'bg-gray-50'}`}>
            <div className="text-sm text-gray-600 mb-1">Remaining</div>
            <div className={`text-xl font-bold ${isOverBudget ? 'text-red-600' : 'text-blue-600'}`}>
              {formatCurrency(Math.abs(remaining))}
            </div>
            <div className="text-xs text-gray-500">
              {isOverBudget
                ? 'over budget'
                : `${safeIncome > 0 ? ((remaining / safeIncome) * 100).toFixed(1) : 0}% available`
              }
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="text-sm text-gray-600 mb-1">Insights</div>
            <div className="text-xl font-bold text-purple-600">{uniqueSuggestions.length}</div>
            <div className="text-xs text-gray-500">
              {uniqueSuggestions.filter(s => s.type === 'danger').length > 0
                ? `${uniqueSuggestions.filter(s => s.type === 'danger').length} urgent`
                : 'recommendations'
              }
            </div>
          </div>
        </div>

        {/* FIX 6 — Per-category spending mini-breakdown */}
        {safeExpenses.length > 0 && (
          <div className="grid grid-cols-4 gap-2 mb-5">
            {Object.entries(categorySpent).map(([cat, spent]) => {
              const budget = breakdown[cat.toLowerCase()] || 0;
              const pct    = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
              const over   = spent > budget && budget > 0;
              return (
                <div key={cat} className="bg-gray-50 rounded-lg p-2 text-center">
                  <div className="text-xs font-medium text-gray-600 mb-1">{cat}</div>
                  <div className={`text-sm font-bold ${over ? 'text-red-500' : 'text-gray-800'}`}>
                    {formatCurrency(spent)}
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${over ? 'bg-red-500' : 'bg-[var(--primary-color)]'}`}
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">{pct.toFixed(0)}%</div>
                </div>
              );
            })}
          </div>
        )}

        {/* Suggestions list */}
        <div className="space-y-3">
          {/* FIX 3 — Show loading state instead of "no insights" flash */}
          {!insightsReady ? (
            <div className="text-center py-6 text-gray-400 text-sm">
              Analysing your spending…
            </div>
          ) : uniqueSuggestions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="icon-check-circle text-3xl text-green-400 mb-2 mx-auto"></div>
              <p className="font-medium">All looking good!</p>
              <p className="text-sm text-gray-400 mt-1">Add more expenses to get personalised recommendations.</p>
            </div>
          ) : (
            // FIX 12 — Sort suggestions: danger first, then warning, info, success.
            // Original showed them in generation order — urgent warnings could be
            // buried below green success messages.
            [...uniqueSuggestions]
              .sort((a, b) => {
                const order = { danger: 0, warning: 1, tip: 2, info: 3, success: 4 };
                return (order[a.type] ?? 3) - (order[b.type] ?? 3);
              })
              .map((suggestion, index) => (
                <div
                  key={index}
                  className={`${getTypeStyle(suggestion.type)} border-2 rounded-xl p-4 flex items-start gap-3`}
                >
                  <div className={`icon-${suggestion.icon || 'info'} text-xl ${getIconColor(suggestion.type)} flex-shrink-0 mt-0.5`}></div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-800">{suggestion.message}</div>
                    {/* FIX 13 — Show category only if it's meaningful */}
                    {suggestion.category && suggestion.category !== 'General' && (
                      <div className="text-xs text-gray-500 mt-1">
                        Category: {suggestion.category}
                      </div>
                    )}
                    {/* FIX 14 — Show action tip if provided by suggestionEngine */}
                    {suggestion.tip && (
                      <div className="text-xs text-gray-500 mt-1 italic">
                        Tip: {suggestion.tip}
                      </div>
                    )}
                  </div>
                </div>
              ))
          )}
        </div>
      </div>
    );
  } catch (error) {
    console.error('SmartInsights component error:', error);
    return null;
  }
}