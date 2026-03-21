function BudgetBreakdown({ mode, income, expenses, allocation, onAlert }) {
  try {
    const baseBreakdown = allocation ? calculateBudgetWithAllocation(income, allocation) : calculateBudget(mode, income);
    const balancedBreakdown = allocation ? calculateBalancedBudgetWithAllocation(income, allocation, expenses) : calculateBalancedBudget(mode, income, expenses);
    const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const isBalanced = JSON.stringify(baseBreakdown) !== JSON.stringify(balancedBreakdown);
    
    React.useEffect(() => {
      if (isBalanced) {
        const balancingMessage = getBalancingMessage(mode, income, expenses);
        if (balancingMessage && onAlert) {
          onAlert(balancingMessage, 'info');
        }
      }
    }, [expenses, isBalanced]);

    const getCategorySpent = (category) => {
      if (category === 'Food') {
        return expenses
          .filter(exp => exp.category === 'Food')
          .reduce((sum, exp) => sum + exp.amount, 0);
      }
      if (category === 'Others') {
        return expenses
          .filter(exp => exp.category === 'Others')
          .reduce((sum, exp) => sum + exp.amount, 0);
      }
      return expenses
        .filter(exp => exp.category === category)
        .reduce((sum, exp) => sum + exp.amount, 0);
    };

    const renderCategory = (label, amount, icon, spent, color) => {
      const safeAmount = amount || 0;
      const safeSpent = spent || 0;
      const percentage = safeAmount > 0 ? Math.min((safeSpent / safeAmount) * 100, 100) : 0;
      const remaining = Math.max(safeAmount - safeSpent, 0);
      
      React.useEffect(() => {
        if (percentage >= 70 && percentage < 100 && onAlert) {
          onAlert(`You're nearing your spending limit for ${label}! (${percentage.toFixed(0)}% used)`, 'warning');
        }
      }, [percentage]);
      
      return (
        <div className="bg-white rounded-xl p-4 shadow-md">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 ${color} rounded-lg flex items-center justify-center`}>
                <div className={`icon-${icon} text-xl text-white`}></div>
              </div>
              <div>
                <p className="font-semibold text-gray-800">{label}</p>
                <p className="text-sm text-gray-500">${safeAmount.toFixed(2)}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-[var(--primary-color)]">${safeSpent.toFixed(2)}</p>
              <p className="text-xs text-gray-500">{percentage.toFixed(0)}% used</p>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden mb-2">
            <div className="progress-bar" style={{ width: `${percentage}%` }}></div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Remaining:</span>
            <span className="font-semibold text-green-600">${remaining.toFixed(2)}</span>
          </div>
        </div>
      );
    };

    return (
      <div className="space-y-4" data-name="budget-breakdown" data-file="components/BudgetBreakdown.js">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Budget Breakdown</h2>
          <div className="text-right">
            <p className="text-sm text-gray-600">Total Income</p>
            <p className="text-2xl font-bold text-[var(--primary-color)]">${income.toFixed(2)}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {mode === 'professional' ? (
            <>
              {renderCategory('Needs', balancedBreakdown.needs || 0, 'home', getCategorySpent('Needs'), 'bg-red-500')}
              {renderCategory('Wants', balancedBreakdown.wants || 0, 'shopping-bag', getCategorySpent('Wants'), 'bg-red-600')}
              {renderCategory('Savings', balancedBreakdown.savings || 0, 'piggy-bank', getCategorySpent('Savings'), 'bg-red-700')}
            </>
          ) : (
            <>
              {renderCategory('Travel', balancedBreakdown.travel || 0, 'plane', getCategorySpent('Travel'), 'bg-red-500')}
              {renderCategory('Food', balancedBreakdown.food || 0, 'utensils', getCategorySpent('Food'), 'bg-red-600')}
              {renderCategory('Others', balancedBreakdown.others || 0, 'shopping-bag', getCategorySpent('Others'), 'bg-red-700')}
              {renderCategory('Savings', balancedBreakdown.savings || 0, 'piggy-bank', getCategorySpent('Savings'), 'bg-red-800')}
            </>
          )}
        </div>
      </div>
    );
  } catch (error) {
    console.error('BudgetBreakdown component error:', error);
    return null;
  }
}