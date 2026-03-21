function BudgetBreakdownHierarchical({ mode, income, expenses, allocation, onAlert }) {
  try {
    const baseBreakdown = allocation ? calculateBudgetWithAllocation(income, allocation) : calculateBudget(mode, income);
    const balancedBreakdown = allocation ? calculateBalancedBudgetWithAllocation(income, allocation, expenses) : calculateBalancedBudget(mode, income, expenses);
    
    const getCategorySpent = (mainCategory) => {
      return expenses
        .filter(exp => getMainCategory(exp.category) === mainCategory)
        .reduce((sum, exp) => sum + exp.amount, 0);
    };

    const getSubcategorySpent = (subcategory) => {
      return expenses
        .filter(exp => exp.category === subcategory)
        .reduce((sum, exp) => sum + exp.amount, 0);
    };

    const renderMainCategory = (label, amount, icon, mainCategory, color) => {
      const spent = getCategorySpent(mainCategory);
      const percentage = amount > 0 ? Math.min((spent / amount) * 100, 100) : 0;
      const remaining = Math.max(amount - spent, 0);
      const subcategories = getSubcategories(mainCategory);
      
      return (
        <div className="bg-white rounded-xl p-4 shadow-md">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 ${color} rounded-lg flex items-center justify-center`}>
                <div className={`icon-${icon} text-xl text-white`}></div>
              </div>
              <div>
                <div className="font-semibold text-gray-800">{label}</div>
                <div className="text-sm text-gray-500">${amount.toFixed(2)}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-[var(--primary-color)]">${spent.toFixed(2)}</div>
              <div className="text-xs text-gray-500">{percentage.toFixed(0)}% used</div>
            </div>
          </div>
          
          {subcategories.length > 0 && (
            <div className="ml-4 mb-3 space-y-2 border-l-2 border-gray-200 pl-3">
              {subcategories.map(sub => {
                const subSpent = getSubcategorySpent(sub);
                return subSpent > 0 ? (
                  <div key={sub} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{sub}</span>
                    <span className="font-medium text-gray-700">${subSpent.toFixed(2)}</span>
                  </div>
                ) : null;
              })}
            </div>
          )}
          
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
      <div className="space-y-4" data-name="budget-breakdown-hierarchical" data-file="components/BudgetBreakdownHierarchical.js">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Budget Breakdown</h2>
          <div className="text-right">
            <div className="text-sm text-gray-600">Total Income</div>
            <div className="text-2xl font-bold text-[var(--primary-color)]">${income.toFixed(2)}</div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {renderMainCategory('Needs', balancedBreakdown.needs || 0, 'home', 'Needs', 'bg-red-500')}
          {renderMainCategory('Food', balancedBreakdown.food || 0, 'utensils', 'Food', 'bg-red-600')}
          {renderMainCategory('Others', balancedBreakdown.others || 0, 'shopping-bag', 'Others', 'bg-red-700')}
          {renderMainCategory('Savings', balancedBreakdown.savings || 0, 'piggy-bank', 'Savings', 'bg-red-800')}
        </div>
      </div>
    );
  } catch (error) {
    console.error('BudgetBreakdownHierarchical component error:', error);
    return null;
  }
}