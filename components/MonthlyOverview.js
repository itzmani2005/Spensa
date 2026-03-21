function MonthlyOverview({ expenses }) {
  try {
    const getMonthlyData = () => {
      const monthlyExpenses = {};
      expenses.forEach(exp => {
        const date = new Date(exp.date);
        const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
        if (!monthlyExpenses[monthYear]) {
          monthlyExpenses[monthYear] = 0;
        }
        monthlyExpenses[monthYear] += exp.amount;
      });
      return monthlyExpenses;
    };

    const monthlyData = getMonthlyData();
    const months = Object.keys(monthlyData).sort();

    return (
      <div className="card" data-name="monthly-overview" data-file="components/MonthlyOverview.js">
        <h2 className="text-2xl font-bold mb-6">Monthly Overview</h2>

        {months.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No expense data available yet</p>
        ) : (
          <div className="space-y-3">
            {months.map(month => (
              <div key={month} className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                    <div className="icon-calendar text-[var(--primary-color)]"></div>
                  </div>
                  <div className="font-medium">{month}</div>
                </div>
                <div className="text-xl font-bold text-[var(--text-color)]">{formatCurrency(monthlyData[month])}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  } catch (error) {
    console.error('MonthlyOverview component error:', error);
    return null;
  }
}