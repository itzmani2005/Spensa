function AllocationSelector({ mode, income, onSetAllocation, onBack }) {
  try {
    const [selectionMode, setSelectionMode] = React.useState(null);

    const getDefaultAllocation = React.useCallback(() => {
      if (mode === 'professional') {
        return { needs: 50, wants: 20, others: 10, savings: 20 };
      }
      return { needs: 40, wants: 20, others: 20, savings: 20 };
    }, [mode]);

    const [customAllocation, setCustomAllocation] = React.useState(getDefaultAllocation);

    React.useEffect(() => {
      setCustomAllocation(getDefaultAllocation());
    }, [mode, getDefaultAllocation]);

    const buildAllocationWithAmounts = (alloc) => ({
      ...alloc,
      needsAmount:   (alloc.needs   / 100) * income,
      wantsAmount:   (alloc.wants   / 100) * income,
      othersAmount:  (alloc.others  / 100) * income,
      savingsAmount: (alloc.savings / 100) * income,
    });

    const handleUseDefault = () => {
      onSetAllocation(buildAllocationWithAmounts(getDefaultAllocation()));
    };

    const handleCustomChange = (key, value) => {
      const num = Math.floor(Number(value));
      if (!isNaN(num) && num >= 0 && num <= 100) {
        setCustomAllocation(prev => ({ ...prev, [key]: num }));
      }
    };

    const getTotalPercentage = () =>
      Object.values(customAllocation).reduce((sum, val) => sum + val, 0);

    const handleConfirmCustom = () => {
      if (getTotalPercentage() === 100) {
        onSetAllocation(buildAllocationWithAmounts(customAllocation));
      }
    };

    const handleResetToDefault = () => {
      setCustomAllocation(getDefaultAllocation());
    };

    const totalPercentage = getTotalPercentage();
    const isValid  = totalPercentage === 100;
    const remaining = 100 - totalPercentage;

    const categoryMeta = {
      needs:   { label: 'Needs',   desc: 'Rent, groceries, bills',    icon: 'icon-home' },
      wants:   { label: 'Wants',   desc: 'Dining, entertainment',     icon: 'icon-heart' },
      others:  { label: 'Others',  desc: 'Education, miscellaneous',  icon: 'icon-package' },
      savings: { label: 'Savings', desc: 'Emergency fund, goals',     icon: 'icon-piggy-bank' },
    };

    // ── Selection screen ──────────────────────────────────────────────────────
    if (!selectionMode) {
      const defaultAlloc = getDefaultAllocation();
      return (
        <div
          className="min-h-screen flex items-center justify-center bg-white p-4"
          data-name="allocation-selector"
          data-file="components/AllocationSelector.js"
        >
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
                <div className="icon-chart-pie text-2xl text-[var(--primary-color)]"></div>
              </div>

              <h2 className="text-3xl font-bold text-center mb-2">Budget Allocation</h2>
              <p className="text-center text-gray-600 mb-8">
                Choose how to allocate your income of{' '}
                <span className="font-semibold text-[var(--primary-color)]">
                  {formatCurrency(income)}
                </span>
              </p>

              <div className="space-y-4">
                <button onClick={handleUseDefault} className="btn-primary w-full">
                  <div className="flex items-center justify-center gap-2">
                    <div className="icon-zap text-lg"></div>
                    <span>Use Default Allocation</span>
                  </div>
                </button>

                <button onClick={() => setSelectionMode('custom')} className="btn-secondary w-full">
                  <div className="flex items-center justify-center gap-2">
                    <div className="icon-settings text-lg"></div>
                    <span>Customize Allocation</span>
                  </div>
                </button>
              </div>

              {/* FIX 5 — Show amounts alongside percentages in the preview */}
              <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                <div className="text-sm font-medium text-gray-700 mb-3">
                  Default Allocation for {formatCurrency(income)}:
                </div>
                <div className="space-y-2">
                  {Object.entries(defaultAlloc).map(([key, pct]) => (
                    <div key={key} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <div className={`${categoryMeta[key].icon} text-sm text-[var(--primary-color)]`}></div>
                        <span className="capitalize">{categoryMeta[key].label}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold text-gray-800">{pct}%</span>
                        {/* FIX 3 — show computed amount */}
                        <span className="text-gray-400 ml-2 text-xs">
                          {formatCurrency((pct / 100) * income)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

   
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-white p-4"
        data-name="custom-allocation"
        data-file="components/AllocationSelector.js"
      >
        <div className="max-w-md w-full animate-fade-in">
          <button
            onClick={() => setSelectionMode(null)}
            className="mb-6 flex items-center gap-2 text-gray-600 hover:text-[var(--primary-color)] transition-colors"
          >
            <div className="icon-arrow-left"></div>
            <span>Back</span>
          </button>

          <div className="card">
            <h2 className="text-2xl font-bold mb-2">Customize Your Allocation</h2>
            <p className="text-sm text-gray-500 mb-6">
              Total must equal exactly 100%. Income: {formatCurrency(income)}
            </p>

            <div className="space-y-4 mb-6">
              {Object.entries(customAllocation).map(([key, value]) => {
                const meta   = categoryMeta[key];
                const amount = ((value / 100) * income);
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-medium flex items-center gap-1.5">
                        <div className={`${meta.icon} text-sm text-[var(--primary-color)]`}></div>
                        {meta.label}
                      </label>
                      {/* FIX 3 — show live currency amount per category */}
                      <span className="text-xs text-gray-400">
                        {formatCurrency(amount)}
                      </span>
                    </div>
                    {/* FIX 5 — show category description */}
                    <p className="text-xs text-gray-400 mb-1">{meta.desc}</p>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={value}
                        onChange={(e) => handleCustomChange(key, e.target.value)}
                        className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-all ${
                          totalPercentage > 100
                            ? 'border-red-300 focus:border-red-500'
                            : 'border-gray-200 focus:border-[var(--primary-color)]'
                        }`}
                      />
                      <span className="absolute right-4 top-3.5 text-gray-400 pointer-events-none">%</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* FIX 6 — Total bar and status */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Total Allocation</span>
                <span className={`text-lg font-bold ${
                  isValid ? 'text-green-600' : totalPercentage > 100 ? 'text-red-600' : 'text-yellow-600'
                }`}>
                  {totalPercentage}%
                </span>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isValid ? 'bg-green-500' : totalPercentage > 100 ? 'bg-red-500' : 'bg-yellow-500'
                  }`}
                  style={{ width: `${Math.min(totalPercentage, 100)}%` }}
                ></div>
              </div>

              {totalPercentage > 100 && (
                <div className="text-sm text-red-600 mt-2 flex items-center gap-1">
                  <div className="icon-circle-alert text-sm"></div>
                  <span>Over by {totalPercentage - 100}% — reduce one or more categories</span>
                </div>
              )}
              {!isValid && totalPercentage < 100 && (
                <div className="text-sm text-yellow-600 mt-2 flex items-center gap-1">
                  <div className="icon-info text-sm"></div>
                  {/* FIX 7 — show both percentage and currency remaining */}
                  <span>
                    {remaining}% unallocated ({formatCurrency((remaining / 100) * income)})
                  </span>
                </div>
              )}
              {isValid && (
                <div className="text-sm text-green-600 mt-2 flex items-center gap-1">
                  <div className="icon-circle-check text-sm"></div>
                  <span>Perfect — all income is allocated</span>
                </div>
              )}
            </div>

            {/* FIX 8 — Quick-fill button to auto-assign remaining % to savings.
                Saves the user from manually adjusting values to hit exactly 100. */}
            {!isValid && remaining > 0 && remaining < 100 && (
              <button
                onClick={() =>
                  setCustomAllocation(prev => ({
                    ...prev,
                    savings: Math.min(prev.savings + remaining, 100),
                  }))
                }
                className="w-full text-sm text-[var(--primary-color)] border border-[var(--primary-color)] rounded-xl py-2 mb-4 hover:bg-red-50 transition-colors"
              >
                Add remaining {remaining}% to Savings
              </button>
            )}

            <div className="space-y-3">
              <button
                onClick={handleConfirmCustom}
                disabled={!isValid}
                className={`btn-primary w-full ${!isValid ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Continue with Custom Allocation
              </button>
              <button onClick={handleResetToDefault} className="btn-secondary w-full text-sm">
                Reset to Default
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('AllocationSelector component error:', error);
    return null;
  }
}