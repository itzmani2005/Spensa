function calculateBudget(mode, income) {
  if (mode === 'professional') {
    return {
      needs: income * 0.5,
      wants: income * 0.2,
      others: income * 0.1,
      savings: income * 0.2
    };
  } else if (mode === 'student') {
    return {
      needs: income * 0.4,
      wants: income * 0.2,
      others: income * 0.2,
      savings: income * 0.2
    };
  }
  return {
    needs: 0,
    wants: 0,
    others: 0,
    savings: 0
  };
}

function calculateBudgetWithAllocation(income, allocation) {
  const result = {};
  Object.entries(allocation).forEach(([key, percentage]) => {
    result[key] = income * (percentage / 100);
  });
  return result;
}
