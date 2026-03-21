function formatCurrency(amount) {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  } catch (error) {
    console.error('Currency formatting error:', error);
    return `₹${amount.toFixed(2)}`;
  }
}

function formatCurrencyCompact(amount) {
  try {
    if (amount >= 10000000) {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        notation: 'compact',
        compactDisplay: 'short',
        maximumFractionDigits: 2
      }).format(amount);
    }
    return formatCurrency(amount);
  } catch (error) {
    console.error('Currency formatting error:', error);
    return `₹${amount.toFixed(2)}`;
  }
}