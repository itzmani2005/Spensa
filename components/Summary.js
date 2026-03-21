function Summary({ mode, income, expenses, goals, allocation }) {
  try {
    
    const safeIncome   = parseFloat(income) || 0;
    const safeExpenses = Array.isArray(expenses) ? expenses : [];
    const safeGoals    = Array.isArray(goals)    ? goals    : [];

  
    const safeAmount = (val) => {
      const n = parseFloat(val);
      return isNaN(n) || n < 0 ? 0 : n;
    };

    const totalSpent       = safeExpenses.reduce((sum, exp) => sum + safeAmount(exp.amount), 0);
    const savingsExpenses  = safeExpenses
      .filter(exp => exp.category === 'Savings')
      .reduce((sum, exp) => sum + safeAmount(exp.amount), 0);
    const remaining        = safeIncome - totalSpent;
    const isOverBudget     = remaining < 0;

   
    let breakdown;
    try {
      breakdown = allocation
        ? calculateBudgetWithAllocation(safeIncome, allocation)
        : calculateBudget(mode, safeIncome);
    } catch (e) {
      console.error('calculateBudget error in Summary:', e);
      breakdown = allocation
        ? {
            needs:   (allocation.needs   / 100) * safeIncome,
            wants:   (allocation.wants   / 100) * safeIncome,
            others:  (allocation.others  / 100) * safeIncome,
            savings: (allocation.savings / 100) * safeIncome,
          }
        : { needs: 0, wants: 0, others: 0, savings: 0 };
    }

   
    const allocatedSavings = breakdown.savings || 0;

   
    const totalGoalTarget  = safeGoals.reduce((sum, g) => sum + safeAmount(g.target),  0);
    const totalGoalCurrent = safeGoals.reduce((sum, g) => sum + safeAmount(g.current), 0);
    const completedGoals   = safeGoals.filter(g => safeAmount(g.current) >= safeAmount(g.target)).length;

    // FIX 6 — Spending rate: what % of income has been spent.
    const spendingRate = safeIncome > 0
      ? Math.min((totalSpent / safeIncome) * 100, 100)
      : 0;

    // ── Export handlers ───────────────────────────────────────────────────────

    const handleExportJSON = () => {
      const data = {
        exportedAt: new Date().toISOString(),
        summary: {
          mode,
          totalIncome:     safeIncome,
          totalSpent,
          totalSavings:    savingsExpenses,
          remaining,
          spendingRate:    `${spendingRate.toFixed(1)}%`,
        },
        allocation: allocation || null,
        expenses:   safeExpenses,
        goals:      safeGoals,
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href     = url;
      link.download = `spensa-export-${new Date().toISOString().split('T')[0]}.json`;
      // FIX 8 — link.click() without appending to DOM fails silently in
      // Firefox and some mobile browsers.
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    };

    const handleExportPDF = () => {
     
      if (!window.jspdf) {
        console.error('jsPDF not loaded');
        alert('PDF export is not available. Please check your connection and reload.');
        return;
      }

      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();

      const monthLabel = ''; // passed via props if needed — graceful fallback

      doc.setFontSize(20);
      doc.text('Spensa — Spending Report', 20, 20);

      doc.setFontSize(11);
      doc.setTextColor(120, 120, 120);
      doc.text(`Mode: ${mode ? mode.charAt(0).toUpperCase() + mode.slice(1) : 'N/A'}`, 20, 30);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 37);
      doc.setTextColor(0, 0, 0);

      // Summary section
      doc.setFontSize(14);
      doc.text('Financial Summary', 20, 50);
      doc.setFontSize(11);
      doc.text(`Total Income:  ${formatCurrency(safeIncome)}`,   25, 60);
      doc.text(`Total Spent:   ${formatCurrency(totalSpent)}`,   25, 67);
      doc.text(`Total Savings: ${formatCurrency(savingsExpenses)}`, 25, 74);
      doc.text(`Remaining:     ${formatCurrency(remaining)}`,    25, 81);
      doc.text(`Spending Rate: ${spendingRate.toFixed(1)}%`,     25, 88);

      // Allocation section
      if (allocation) {
        doc.setFontSize(14);
        doc.text('Budget Allocation', 20, 102);
        doc.setFontSize(11);
        doc.text(`Needs: ${allocation.needs}% — ${formatCurrency(breakdown.needs || 0)}`,     25, 112);
        doc.text(`Wants: ${allocation.wants}% — ${formatCurrency(breakdown.wants || 0)}`,     25, 119);
        doc.text(`Others: ${allocation.others}% — ${formatCurrency(breakdown.others || 0)}`,  25, 126);
        doc.text(`Savings: ${allocation.savings}% — ${formatCurrency(breakdown.savings || 0)}`, 25, 133);
      }

      // Expenses section
      let yPos = allocation ? 148 : 102;
      if (safeExpenses.length > 0) {
        if (yPos > 250) { doc.addPage(); yPos = 20; }
        doc.setFontSize(14);
        doc.text('Expenses', 20, yPos); yPos += 10;
        doc.setFontSize(10);

        safeExpenses.forEach((exp, i) => {
          if (yPos > 270) { doc.addPage(); yPos = 20; }
          const dateStr = exp.date
            ? new Date(exp.date).toLocaleDateString()
            : '';
          
          const name = exp.name && exp.name.length > 35
            ? exp.name.substring(0, 35) + '…'
            : (exp.name || 'Unnamed');
          doc.text(
            `${i + 1}. ${name} — ${formatCurrency(safeAmount(exp.amount))} (${exp.category || ''}) ${dateStr}`,
            25, yPos
          );
          yPos += 7;
        });
      }

      // Goals section
      if (safeGoals.length > 0) {
        if (yPos > 250) { doc.addPage(); yPos = 20; }
        doc.setFontSize(14);
        doc.text('Savings Goals', 20, yPos); yPos += 10;
        doc.setFontSize(10);

        safeGoals.forEach((goal) => {
          if (yPos > 270) { doc.addPage(); yPos = 20; }
          // FIX 12 — goal.target could be 0 making progress% show Infinity.
          const target   = safeAmount(goal.target);
          const current  = safeAmount(goal.current);
          const progress = target > 0 ? ((current / target) * 100).toFixed(1) : '0.0';
          const name     = goal.name && goal.name.length > 30
            ? goal.name.substring(0, 30) + '…'
            : (goal.name || 'Unnamed');
          doc.text(
            `• ${name}: ${formatCurrency(current)} / ${formatCurrency(target)} (${progress}%)`,
            25, yPos
          );
          yPos += 7;
        });
      }

      doc.save(`spensa-report-${new Date().toISOString().split('T')[0]}.pdf`);
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
      <div className="card" data-name="summary" data-file="components/Summary.js">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Financial Summary</h2>
          <div className="flex gap-2">
            <button onClick={handleExportJSON} className="btn-secondary text-sm">
              <div className="flex items-center gap-2">
                <div className="icon-file-json text-sm"></div>
                <span>JSON</span>
              </div>
            </button>
            <button onClick={handleExportPDF} className="btn-primary text-sm">
              <div className="flex items-center gap-2">
                <div className="icon-file-text text-sm"></div>
                <span>PDF Report</span>
              </div>
            </button>
          </div>
        </div>

        {/* FIX 6 — Overall spending rate bar */}
        <div className={`rounded-xl p-3 mb-5 ${isOverBudget ? 'bg-red-50 border border-red-100' : 'bg-gray-50'}`}>
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="font-medium text-gray-600">Spending Rate</span>
            <span className={`font-semibold ${isOverBudget ? 'text-red-600' : spendingRate > 80 ? 'text-amber-600' : 'text-green-600'}`}>
              {spendingRate.toFixed(1)}%
              {isOverBudget && ' — Over Budget'}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isOverBudget ? 'bg-red-500' : spendingRate > 80 ? 'bg-amber-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(spendingRate, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-5">
          {/* Income */}
          <div className="bg-emerald-50 rounded-xl p-4 border-2 border-emerald-100">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
                <div className="icon-trending-up text-xl text-white"></div>
              </div>
              <div className="text-sm font-medium text-gray-700">Total Income</div>
            </div>
            <div className="text-2xl font-bold text-emerald-600">{formatCurrency(safeIncome)}</div>
          </div>

          {/* Spent */}
          <div className={`rounded-xl p-4 border-2 ${isOverBudget ? 'bg-red-50 border-red-200' : 'bg-rose-50 border-rose-100'}`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isOverBudget ? 'bg-red-500' : 'bg-rose-500'}`}>
                <div className="icon-trending-down text-xl text-white"></div>
              </div>
              <div className="text-sm font-medium text-gray-700">Total Spent</div>
            </div>
            <div className={`text-2xl font-bold ${isOverBudget ? 'text-red-600' : 'text-rose-600'}`}>
              {formatCurrency(totalSpent)}
            </div>
            {isOverBudget && (
              <div className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <div className="icon-circle-alert text-xs"></div>
                <span>{formatCurrency(Math.abs(remaining))} over budget</span>
              </div>
            )}
          </div>

          {/* Savings — FIX 4: show target vs actual */}
          <div className="bg-amber-50 rounded-xl p-4 border-2 border-amber-100">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center">
                <div className="icon-piggy-bank text-xl text-white"></div>
              </div>
              <div className="text-sm font-medium text-gray-700">Savings</div>
            </div>
            <div className="text-2xl font-bold text-amber-600">{formatCurrency(savingsExpenses)}</div>
            {allocatedSavings > 0 && (
              <div className="text-xs text-amber-500 mt-1">
                Target: {formatCurrency(allocatedSavings)}
              </div>
            )}
          </div>

          {/* Remaining */}
          <div className={`rounded-xl p-4 border-2 ${isOverBudget ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100'}`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isOverBudget ? 'bg-red-500' : 'bg-blue-500'}`}>
                <div className="icon-wallet text-xl text-white"></div>
              </div>
              <div className="text-sm font-medium text-gray-700">Remaining</div>
            </div>
            <div className={`text-2xl font-bold ${isOverBudget ? 'text-red-600' : 'text-blue-600'}`}>
              {formatCurrency(Math.abs(remaining))}
            </div>
            {isOverBudget && (
              <div className="text-xs text-red-400 mt-1">over budget</div>
            )}
          </div>
        </div>

        {/* FIX 5 — Goals summary section (was completely missing from UI) */}
        {safeGoals.length > 0 && (
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-700">Goals Progress</h3>
              <span className="text-xs text-gray-500">
                {completedGoals} of {safeGoals.length} completed
              </span>
            </div>
            <div className="space-y-2">
              {safeGoals.map(goal => {
                const target   = safeAmount(goal.target);
                const current  = safeAmount(goal.current);
                const pct      = target > 0 ? Math.min((current / target) * 100, 100) : 0;
                const isDone   = current >= target && target > 0;
                return (
                  <div key={goal.id || goal.name}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700 truncate max-w-[55%]">
                        {goal.name}
                      </span>
                      <span className={`text-xs font-semibold ${isDone ? 'text-green-600' : 'text-gray-500'}`}>
                        {isDone ? 'Done!' : `${pct.toFixed(0)}%`}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${isDone ? 'bg-green-500' : 'bg-[var(--primary-color)]'}`}
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                      <span>{formatCurrency(current)}</span>
                      <span>{formatCurrency(target)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            {totalGoalTarget > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between text-sm">
                <span className="text-gray-600">Total goal progress</span>
                <span className="font-semibold text-[var(--primary-color)]">
                  {formatCurrency(totalGoalCurrent)} / {formatCurrency(totalGoalTarget)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  } catch (error) {
    console.error('Summary component error:', error);
    return null;
  }
}