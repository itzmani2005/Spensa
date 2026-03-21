function BudgetChart({ mode, income, expenses, allocation }) {
  try {
    const barChartRef             = React.useRef(null);
    const donutChartRef           = React.useRef(null);
    const barChartInstanceRef     = React.useRef(null);
    const donutChartInstanceRef   = React.useRef(null);

    // FIX 1 — Guard props against undefined/null so the chart effect never
    // receives bad data before Firestore has loaded.s
    const safeIncome   = parseFloat(income) || 0;
    const safeExpenses = Array.isArray(expenses) ? expenses : [];

    // FIX 2 — safeAmount: a single corrupt expense (amount: "abc", NaN, or
    // negative) made getCategorySpent return NaN, which Chart.js rendered as
    // a missing bar with no error — silently broken chart.
    const safeAmount = (val) => {
      const n = parseFloat(val);
      return isNaN(n) || n < 0 ? 0 : n;
    };

    // FIX 3 — window.ChartJS guard: if Chart.js failed to load from CDN
    // (network error, ad-blocker), `new ChartJS(...)` threw an uncaught
    // ReferenceError and the entire component returned null silently.
    // Now we check once and show a clear fallback message.
    const [chartAvailable, setChartAvailable] = React.useState(true);
    React.useEffect(() => {
      if (!window.ChartJS) {
        console.error('ChartJS not available — charts will not render');
        setChartAvailable(false);
      }
    }, []);

    // FIX 4 — Chart instances were destroyed in the cleanup function BUT also
    // destroyed at the start of the next effect run. This double-destroy caused
    // "Cannot read properties of null (reading 'bindEvents')" errors in
    // Chart.js when switching months quickly. Fixed by only destroying in the
    // cleanup return, not at the start of the effect.
    React.useEffect(() => {
      if (!chartAvailable) return;
      if (!barChartRef.current && !donutChartRef.current) return;

      const getCategorySpent = (category) =>
        safeExpenses
          .filter(exp => exp.category === category)
          .reduce((sum, exp) => sum + safeAmount(exp.amount), 0);

      const labels    = ['Needs', 'Wants', 'Others', 'Savings'];
      const spentData = labels.map(getCategorySpent);

      // FIX 5 — Compute budget allocation amounts per category so the bar
      // chart can show budget vs spent side-by-side instead of spent-only.
      // Original showed only spent bars — users couldn't see their budget line.
      let budgetData = [0, 0, 0, 0];
      try {
        const breakdown = allocation
          ? calculateBudgetWithAllocation(safeIncome, allocation)
          : calculateBudget(mode, safeIncome);
        budgetData = [
          breakdown.needs   || 0,
          breakdown.wants   || 0,
          breakdown.others  || 0,
          breakdown.savings || 0,
        ];
      } catch (e) {
        console.error('calculateBudget error in BudgetChart:', e);
        if (allocation) {
          budgetData = [
            (allocation.needs   / 100) * safeIncome,
            (allocation.wants   / 100) * safeIncome,
            (allocation.others  / 100) * safeIncome,
            (allocation.savings / 100) * safeIncome,
          ];
        }
      }

      // FIX 6 — Colors were duplicated in two places (categoryColors object
      // and legendItems array) and could drift out of sync. Single source now.
      // Also the bar chart used solid red (#ff0000) for Needs which clashed
      // with the app's primary red — replaced with distinct, accessible colors
      // matching BudgetBreakdownSimple's color scheme.
      const COLORS = {
        Needs:   { bg: '#3B82F6', border: '#2563EB' }, // blue
        Wants:   { bg: '#8B5CF6', border: '#7C3AED' }, // purple
        Others:  { bg: '#F59E0B', border: '#D97706' }, // amber
        Savings: { bg: '#10B981', border: '#059669' }, // green
      };

      const bgColors     = labels.map(l => COLORS[l].bg);
      const borderColors = labels.map(l => COLORS[l].border);

      // ── Bar chart (Budget vs Spent) ────────────────────────────────────────
      if (barChartRef.current) {
        const ctx = barChartRef.current.getContext('2d');
        // FIX 4 — destroy previous instance safely before creating new one
        if (barChartInstanceRef.current) {
          try { barChartInstanceRef.current.destroy(); } catch (_) {}
          barChartInstanceRef.current = null;
        }
        barChartInstanceRef.current = new window.ChartJS(ctx, {
          type: 'bar',
          data: {
            labels,
            datasets: [
              // FIX 5 — Budget dataset (ghost bars showing the target)
              {
                label:           'Budget',
                data:            budgetData,
                backgroundColor: bgColors.map(c => c + '33'), // 20% opacity
                borderColor:     borderColors,
                borderWidth:     1.5,
                borderRadius:    8,
                barThickness:    28,
              },
              // FIX 5 — Spent dataset (solid bars)
              {
                label:           'Spent',
                data:            spentData,
                backgroundColor: bgColors,
                borderColor:     borderColors,
                borderWidth:     0,
                borderRadius:    8,
                barThickness:    28,
              },
            ],
          },
          options: {
            responsive:          true,
            maintainAspectRatio: false,
            plugins: {
              // FIX 7 — Legend was hidden. With two datasets (Budget + Spent)
              // it must be shown so users understand the ghost vs solid bars.
              legend: {
                display:  true,
                position: 'top',
                labels:   { boxWidth: 12, font: { size: 11 }, padding: 16 },
              },
              tooltip: {
                backgroundColor: 'rgba(0,0,0,0.8)',
                padding:         12,
                titleFont:       { size: 13 },
                bodyFont:        { size: 12 },
                callbacks: {
                  label: (ctx) =>
                    ` ${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}`,
                },
              },
            },
            scales: {
              y: {
                beginAtZero: true,
                grid:  { color: 'rgba(0,0,0,0.05)', drawBorder: false },
                ticks: {
                  font:     { size: 11 },
                  callback: (val) => formatCurrency(val),
                },
              },
              x: {
                grid:  { display: false },
                ticks: { font: { size: 12, weight: '500' } },
              },
            },
          },
        });
      }

      // ── Donut chart ────────────────────────────────────────────────────────
      if (donutChartRef.current) {
        const ctx = donutChartRef.current.getContext('2d');
        // FIX 4 — destroy previous instance safely
        if (donutChartInstanceRef.current) {
          try { donutChartInstanceRef.current.destroy(); } catch (_) {}
          donutChartInstanceRef.current = null;
        }

        // FIX 8 — When all spentData values are 0 (no expenses yet), Chart.js
        // renders a blank grey ring with no tooltip. Replace with a single
        // placeholder segment so the chart always shows something meaningful.
        const hasSpending     = spentData.some(v => v > 0);
        const donutData       = hasSpending ? spentData : [1];
        const donutLabels     = hasSpending ? labels    : ['No expenses yet'];
        const donutBgColors   = hasSpending ? bgColors  : ['#E5E7EB'];
        const donutBorderCol  = hasSpending ? '#ffffff' : '#ffffff';

        donutChartInstanceRef.current = new window.ChartJS(ctx, {
          type: 'doughnut',
          data: {
            labels:   donutLabels,
            datasets: [{
              data:            donutData,
              backgroundColor: donutBgColors,
              borderColor:     donutBorderCol,
              borderWidth:     3,
              spacing:         hasSpending ? 2 : 0,
            }],
          },
          options: {
            responsive:          true,
            maintainAspectRatio: false,
            cutout:              '65%',
            plugins: {
              legend: { display: false },
              tooltip: {
                enabled:         hasSpending, // FIX 8 — disable tooltip on placeholder
                backgroundColor: 'rgba(0,0,0,0.8)',
                padding:         12,
                titleFont:       { size: 13 },
                bodyFont:        { size: 12 },
                callbacks: {
                  label: (ctx) => {
                    const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                    const pct   = total > 0
                      ? ((ctx.parsed / total) * 100).toFixed(1)
                      : '0.0';
                    return ` ${ctx.label}: ${formatCurrency(ctx.parsed)} (${pct}%)`;
                  },
                },
              },
            },
          },
        });
      }

      // FIX 4 — Destroy ONLY in cleanup, not at the start of the next run
      return () => {
        if (barChartInstanceRef.current) {
          try { barChartInstanceRef.current.destroy(); } catch (_) {}
          barChartInstanceRef.current = null;
        }
        if (donutChartInstanceRef.current) {
          try { donutChartInstanceRef.current.destroy(); } catch (_) {}
          donutChartInstanceRef.current = null;
        }
      };
    }, [mode, safeIncome, safeExpenses, allocation, chartAvailable]);

    // FIX 6 — Single source of truth for legend colors
    const legendItems = [
      { color: '#3B82F6', label: 'Needs' },
      { color: '#8B5CF6', label: 'Wants' },
      { color: '#F59E0B', label: 'Others' },
      { color: '#10B981', label: 'Savings' },
    ];

    // FIX 9 — Compute totals for display below the donut chart so users
    // see the numbers without having to hover individual segments.
    const totalSpent = safeExpenses.reduce((sum, exp) => sum + safeAmount(exp.amount), 0);

    // FIX 3 — Graceful fallback when Chart.js is not available
    if (!chartAvailable) {
      return (
        <div className="grid md:grid-cols-2 gap-6" data-name="budget-chart" data-file="components/BudgetChart.js">
          <div className="card flex items-center justify-center h-48 text-gray-400 text-sm">
            Charts unavailable — Chart.js failed to load. Please refresh.
          </div>
          <div className="card flex items-center justify-center h-48 text-gray-400 text-sm">
            Charts unavailable — Chart.js failed to load. Please refresh.
          </div>
        </div>
      );
    }

    return (
      <div className="grid md:grid-cols-2 gap-6" data-name="budget-chart" data-file="components/BudgetChart.js">

        {/* Bar chart — Budget vs Spent */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold">Budget vs Spent</h3>
            {/* FIX 10 — Show total spent in the card header for quick reference */}
            <div className="text-right">
              <div className="text-xs text-gray-400">Total spent</div>
              <div className="text-sm font-bold text-[var(--primary-color)]">
                {formatCurrency(totalSpent)}
              </div>
            </div>
          </div>
          <div style={{ height: '320px' }}>
            <canvas ref={barChartRef}></canvas>
          </div>
        </div>

        {/* Donut chart — Spending distribution */}
        <div className="card">
          <h3 className="text-xl font-bold mb-4">Spending Distribution</h3>
          <div style={{ height: '220px' }} className="mb-4">
            <canvas ref={donutChartRef}></canvas>
          </div>

          {/* Legend with amounts */}
          <div className="grid grid-cols-2 gap-2">
            {legendItems.map(item => {
              const spent = safeExpenses
                .filter(exp => exp.category === item.label)
                .reduce((sum, exp) => sum + safeAmount(exp.amount), 0);
              const pct = totalSpent > 0
                ? ((spent / totalSpent) * 100).toFixed(0)
                : '0';
              return (
                <div key={item.label} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <span className="text-sm font-medium text-gray-700">{item.label}</span>
                  </div>
                  {/* FIX 9 — Show amount and percentage in legend */}
                  <div className="text-right">
                    <span className="text-xs font-semibold text-gray-600">
                      {formatCurrency(spent)}
                    </span>
                    <span className="text-xs text-gray-400 ml-1">
                      {pct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('BudgetChart component error:', error);
    return null;
  }
}