function generateSuggestions(mode, income, expenses, allocation) {
  const suggestions = [];
  
  const breakdown = allocation ? calculateBudgetWithAllocation(income, allocation) : calculateBudget(mode, income);
  
  const getCategorySpent = (category) => {
    return expenses.filter(exp => exp.category === category).reduce((sum, exp) => sum + exp.amount, 0);
  };
  
  const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const savingsSpent = getCategorySpent('Savings');
  const wantsSpent = getCategorySpent('Wants');
  const remaining = income - totalSpent;
  
  const categories = ['Needs', 'Wants', 'Others', 'Savings'];
  let overspendingCount = 0;
  
  categories.forEach(cat => {
    const allocated = breakdown[cat.toLowerCase()] || 0;
    const spent = getCategorySpent(cat);
    const excess = spent - allocated;
    
    if (excess > 0) {
      overspendingCount++;
      suggestions.push({
        type: 'danger',
        icon: 'triangle-alert',
        message: `You have exceeded your ${cat} budget by ${formatCurrency(excess)}. Consider reducing discretionary spending.`,
        category: cat
      });
    }
  });
  
  if (wantsSpent > 0 && totalSpent > 0) {
    const wantsPercentage = (wantsSpent / totalSpent) * 100;
    if (wantsPercentage > 40) {
      suggestions.push({
        type: 'warning',
        icon: 'alert-circle',
        message: `Your discretionary spending is ${wantsPercentage.toFixed(0)}% of total expenses. Try reallocating more toward savings.`,
        category: 'Wants'
      });
    }
  }
  
  const savingsRate = (savingsSpent / income) * 100;
  if (savingsRate < 10 && income > 0) {
    suggestions.push({
      type: 'warning',
      icon: 'piggy-bank',
      message: `Your savings rate is ${savingsRate.toFixed(1)}% (below recommended 20%). Aim to save at least 20% of income.`,
      category: 'Savings'
    });
  }
  
  if (overspendingCount === 0 && totalSpent > 0 && totalSpent < income) {
    suggestions.push({
      type: 'success',
      icon: 'circle-check',
      message: 'Great job! You are maintaining a balanced spending pattern this month.',
      category: 'General'
    });
  }
  
  const remainingPercentage = (remaining / income) * 100;
  if (remainingPercentage > 30 && totalSpent > 0) {
    suggestions.push({
      type: 'info',
      icon: 'info',
      message: `You still have ${formatCurrency(remaining)} (${remainingPercentage.toFixed(0)}%) unspent. Consider allocating surplus to savings.`,
      category: 'General'
    });
  }
  
  if (suggestions.length === 0 && totalSpent === 0) {
    suggestions.push({
      type: 'info',
      icon: 'lightbulb',
      message: 'Start tracking your expenses to get personalized insights and recommendations.',
      category: 'General'
    });
  }
  
  return suggestions;
}