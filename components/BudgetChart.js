function BudgetChart({ mode, income, expenses, allocation }) {
  try {
    const barChartRef           = React.useRef(null);
    const donutChartRef         = React.useRef(null);
    const barChartInstanceRef   = React.useRef(null);
    const donutChartInstanceRef = React.useRef(null);

    const safeIncome   = parseFloat(income) || 0;
    const safeExpenses = Array.isArray(expenses) ? expenses : [];

    const safeAmount = (val) => {
      const n = parseFloat(val);
      return isNaN(n) || n < 0 ? 0 : n;
    };

    const [chartAvailable, setChartAvailable] = React.useState(true);
    React.useEffect(() => {
      if (!window.ChartJS) {
        console.error('ChartJS not available — charts will not render');
        setChartAvailable(false);
      }
    }, []);

    React.useEffect(() => {
      if (!chartAvailable) return;
      if (!barChartRef.current && !donutChartRef.current) return;

      const getCategorySpent = (category) =>
        safeExpenses
          .filter(exp => exp.category === category)
          .reduce((sum, exp) => sum + safeAmount(exp.amount), 0);

      const labels    = ['Needs', 'Wants', 'Others', 'Savings'];
      const spentData = labels.map(getCategorySpent);

      const COLORS = {
        Needs:   { bg: '#e63946', border: '#c1121f' },
        Wants:   { bg: '#8B5CF6', border: '#7C3AED' },
        Others:  { bg: '#F59E0B', border: '#D97706' },
        Savings: { bg: '#10B981', border: '#059669' },
      };

      const bgColors     = labels.map(l => COLORS[l].bg);
      const borderColors = labels.map(l => COLORS[l].border);

      // ── Bar chart ──────────────────────────────────────────────────────────
      if (barChartRef.current) {
        const ctx = barChartRef.current.getContext('2d');
        if (barChartInstanceRef.current) {
          try { barChartInstanceRef.current.destroy(); } catch (_) {}
          barChartInstanceRef.current = null;
        }
        barChartInstanceRef.current = new window.ChartJS(ctx, {
          type: 'bar',
          data: {
            labels,
            datasets: [
              {
                label:           'Spent',
                data:            spentData,
                backgroundColor: bgColors,
                borderColor:     borderColors,
                borderWidth:     0,
                borderRadius:    8,
                barThickness:    40,
              },
            ],
          },
          options: {
            responsive:          true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: 'rgba(0,0,0,0.8)',
                padding:         12,
                titleFont:       { size: 13 },
                bodyFont:        { size: 12 },
                callbacks: {
                  label: (ctx) => ` Spent: ${formatCurrency(ctx.parsed.y)}`,
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
        if (donutChartInstanceRef.current) {
          try { donutChartInstanceRef.current.destroy(); } catch (_) {}
          donutChartInstanceRef.current = null;
        }

        const hasSpending   = spentData.some(v => v > 0);
        const donutData     = hasSpending ? spentData : [1];
        const donutLabels   = hasSpending ? labels    : ['No expenses yet'];
        const donutBgColors = hasSpending ? bgColors  : ['#E5E7EB'];

        donutChartInstanceRef.current = new window.ChartJS(ctx, {
          type: 'doughnut',
          data: {
            labels:   donutLabels,
            datasets: [{
              data:            donutData,
              backgroundColor: donutBgColors,
              borderColor:     '#ffffff',
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
                enabled: hasSpending,
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

    const legendItems = [
      { color: '#e63946', label: 'Needs'   },
      { color: '#8B5CF6', label: 'Wants'   },
      { color: '#F59E0B', label: 'Others'  },
      { color: '#10B981', label: 'Savings' },
    ];

    const totalSpent = safeExpenses.reduce((sum, exp) => sum + safeAmount(exp.amount), 0);

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

        {/* Bar chart */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold">Category-wise Spending</h3>
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

        {/* Donut chart */}
        <div className="card">
          <h3 className="text-xl font-bold mb-4">Spending Distribution</h3>
          <div style={{ height: '220px' }} className="mb-4">
            <canvas ref={donutChartRef}></canvas>
          </div>

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
                  <div className="text-right">
                    <span className="text-xs font-semibold text-gray-600">
                      {formatCurrency(spent)}
                    </span>
                    <span className="text-xs text-gray-400 ml-1">{pct}%</span>
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
