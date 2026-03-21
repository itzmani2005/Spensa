// ============================================================
// budgetBalancer.js — Fixed & Enhanced
// ============================================================

// ── Shared helpers ────────────────────────────────────────────────────────────

// FIX 1 — safeAmount: both functions used expenses.reduce directly with no
// guard against corrupt amounts (NaN, negative, string). A single bad expense
// made the entire balancer return NaN for every category, silently breaking
// BudgetBreakdownSimple and SmartInsights.
function _safeAmount(val) {
  const n = parseFloat(val);
  return isNaN(n) || n < 0 ? 0 : n;
}

// FIX 2 — getCategorySpent was duplicated identically inside EVERY function
// (3 copies). Any fix or change had to be applied in three places. Extracted
// once here and shared across all three functions.
function _getCategorySpent(expenses, category) {
  if (!Array.isArray(expenses)) return 0;
  return expenses
    .filter(exp => exp && exp.category === category)
    .reduce((sum, exp) => sum + _safeAmount(exp.amount), 0);
}

// FIX 3 — _buildCategoryData was also duplicated across both calculateBalanced
// functions. Extracted once.
function _buildCategoryData(categories, baseBreakdown, expenses) {
  return categories.map(cat => {
    const key       = cat.toLowerCase();
    // FIX 4 — baseBreakdown[key] could be undefined if calculateBudget /
    // calculateBudgetWithAllocation returned an incomplete object. Guard with || 0.
    const allocated = _safeAmount(baseBreakdown[key] || 0);
    const spent     = _getCategorySpent(expenses, cat);
    const excess    = Math.max(0, spent - allocated);
    const available = Math.max(0, allocated - spent);

    return {
      name:         cat,
      key,
      baseAllocated: allocated,
      spent,
      excess,
      available,
      hasExcess:    excess    > 0,
      hasAvailable: available > 0,
    };
  });
}

// ── FIX 5 — Core redistribution math was wrong ───────────────────────────────
// The original calculated:
//   toRedistribute = Math.min(totalExcess, cat.available)   ← per-category cap
//   balancedBreakdown[key] = baseAllocated - (toRedistribute * proportion)
//
// This is wrong for two reasons:
//   (a) `proportion` = cat.available / totalAvailable, a number between 0 and 1.
//       Multiplying toRedistribute (potentially large) by proportion gives
//       a very small number — categories were barely reduced at all.
//   (b) `toRedistribute` used Math.min(totalExcess, cat.available) but then
//       multiplied by proportion — double-counting the per-category cap.
//
// Correct formula:
//   Each under-budget category absorbs: proportion * totalExcess
//   But capped at its own available amount so it never goes negative.
//   reducedBy = Math.min(proportion * totalExcess, cat.available)
//   balancedBreakdown[key] = baseAllocated - reducedBy
function _applyRedistribution(balancedBreakdown, categoryData) {
  const totalExcess              = categoryData.reduce((s, c) => s + c.excess, 0);
  const categoriesWithAvailable  = categoryData.filter(c => c.hasAvailable);
  const totalAvailable           = categoriesWithAvailable.reduce((s, c) => s + c.available, 0);

  categoryData.forEach(cat => {
    if (cat.hasExcess) {
      // Over-budget categories show their actual spent as the new "budget"
      balancedBreakdown[cat.key] = cat.spent;
    } else if (cat.hasAvailable && totalAvailable > 0) {
      // FIX 5 — correct proportion-based reduction, capped per category
      const proportion  = cat.available / totalAvailable;
      const reducedBy   = Math.min(proportion * totalExcess, cat.available);
      balancedBreakdown[cat.key] = Math.max(0, cat.baseAllocated - reducedBy);
    }
  });
}

// ── calculateBalancedBudgetWithAllocation ────────────────────────────────────

function calculateBalancedBudgetWithAllocation(income, allocation, expenses) {
  // FIX 6 — Guard against missing/null arguments that caused uncaught
  // TypeErrors when the component rendered before Firestore loaded.
  if (!income || !allocation) return { needs: 0, wants: 0, others: 0, savings: 0 };
  if (!Array.isArray(expenses)) expenses = [];

  let baseBreakdown;
  try {
    baseBreakdown = calculateBudgetWithAllocation(income, allocation);
  } catch (e) {
    console.error('calculateBudgetWithAllocation error:', e);
    // FIX 6 — safe fallback using raw percentages
    const safeIncome = parseFloat(income) || 0;
    baseBreakdown = {
      needs:   ((_safeAmount(allocation.needs))   / 100) * safeIncome,
      wants:   ((_safeAmount(allocation.wants))   / 100) * safeIncome,
      others:  ((_safeAmount(allocation.others))  / 100) * safeIncome,
      savings: ((_safeAmount(allocation.savings)) / 100) * safeIncome,
    };
  }

  // FIX 7 — Original used Object.keys(allocation) to derive categories.
  // This included the new amount fields added by AllocationSelector fix
  // (needsAmount, wantsAmount, etc.) producing keys like "NeedsAmount"
  // that don't match any expense category — silently corrupting the result.
  // Use a fixed canonical list instead.
  const categories = ['Needs', 'Wants', 'Others', 'Savings'];
  const categoryData = _buildCategoryData(categories, baseBreakdown, expenses);

  const totalExcess = categoryData.reduce((s, c) => s + c.excess, 0);
  if (totalExcess === 0) return baseBreakdown;

  const categoriesWithAvailable = categoryData.filter(c => c.hasAvailable);
  const balancedBreakdown       = { ...baseBreakdown };

  if (categoriesWithAvailable.length === 0) {
    // All categories are over budget — just show spent amounts
    categoryData.forEach(cat => {
      balancedBreakdown[cat.key] = cat.spent;
    });
    return balancedBreakdown;
  }

  // FIX 5 — Use corrected redistribution math
  _applyRedistribution(balancedBreakdown, categoryData);

  // FIX 8 — Preserve the extra allocation fields (needsAmount, etc.) added
  // by AllocationSelector so downstream components don't lose them after
  // a balancing pass.
  if (allocation.needsAmount   !== undefined) balancedBreakdown.needsAmount   = allocation.needsAmount;
  if (allocation.wantsAmount   !== undefined) balancedBreakdown.wantsAmount   = allocation.wantsAmount;
  if (allocation.othersAmount  !== undefined) balancedBreakdown.othersAmount  = allocation.othersAmount;
  if (allocation.savingsAmount !== undefined) balancedBreakdown.savingsAmount = allocation.savingsAmount;

  return balancedBreakdown;
}

// ── calculateBalancedBudget ──────────────────────────────────────────────────

function calculateBalancedBudget(mode, income, expenses) {
  // FIX 6 — Guard against missing arguments
  if (!mode || !income) return { needs: 0, wants: 0, others: 0, savings: 0 };
  if (!Array.isArray(expenses)) expenses = [];

  let baseBreakdown;
  try {
    baseBreakdown = calculateBudget(mode, income);
  } catch (e) {
    console.error('calculateBudget error:', e);
    return { needs: 0, wants: 0, others: 0, savings: 0 };
  }

  const categories   = ['Needs', 'Wants', 'Others', 'Savings'];
  const categoryData = _buildCategoryData(categories, baseBreakdown, expenses);

  const totalExcess = categoryData.reduce((s, c) => s + c.excess, 0);
  if (totalExcess === 0) return baseBreakdown;

  const categoriesWithAvailable = categoryData.filter(c => c.hasAvailable);
  const balancedBreakdown       = { ...baseBreakdown };

  if (categoriesWithAvailable.length === 0) {
    categoryData.forEach(cat => {
      balancedBreakdown[cat.key] = cat.spent;
    });
    return balancedBreakdown;
  }

  // FIX 5 — Use corrected redistribution math
  _applyRedistribution(balancedBreakdown, categoryData);

  return balancedBreakdown;
}

// ── getBalancingMessage ──────────────────────────────────────────────────────

function getBalancingMessage(mode, income, expenses) {
  // FIX 9 — No guards: if income was 0 or expenses was null this threw.
  if (!mode || !income) return null;
  if (!Array.isArray(expenses) || expenses.length === 0) return null;

  let baseBreakdown;
  try {
    baseBreakdown = calculateBudget(mode, income);
  } catch (e) {
    return null;
  }

  const categories          = ['Needs', 'Wants', 'Others', 'Savings'];
  const exceededCategories  = [];
  const atLimitCategories   = [];
  // FIX 10 — Also track categories approaching the limit (80–99%) so users
  // get a warning before they actually exceed, not after.
  const approachingCategories = [];

  categories.forEach(cat => {
    const key        = cat.toLowerCase();
    const allocated  = _safeAmount(baseBreakdown[key] || 0);
    const spent      = _getCategorySpent(expenses, cat);
    // FIX 9 — allocated could be 0, making percentage Infinity
    const percentage = allocated > 0 ? (spent / allocated) * 100 : 0;

    if (spent > allocated) {
      exceededCategories.push(cat);
    } else if (percentage >= 100) {
      // FIX 11 — Original had a logical dead branch: percentage >= 100 can
      // never be true after `spent > allocated` is false, because
      // spent > allocated is equivalent to percentage > 100.
      // "At limit" means exactly 100%, i.e. spent === allocated.
      atLimitCategories.push(cat);
    } else if (percentage >= 80) {
      approachingCategories.push(cat);
    }
  });

  if (exceededCategories.length > 0) {
    return `Budget auto-balanced: ${exceededCategories.join(', ')} exceeded limit. Available funds redistributed from other categories.`;
  }
  if (atLimitCategories.length > 0) {
    return `${atLimitCategories.join(', ')} ${atLimitCategories.length > 1 ? 'have' : 'has'} reached the spending limit.`;
  }
  // FIX 10 — New: approaching-limit warning
  if (approachingCategories.length > 0) {
    return `Heads up: ${approachingCategories.join(', ')} ${approachingCategories.length > 1 ? 'are' : 'is'} approaching the budget limit.`;
  }

  return null;
}

// ── Expose globals ────────────────────────────────────────────────────────────

window.calculateBalancedBudgetWithAllocation = calculateBalancedBudgetWithAllocation;
window.calculateBalancedBudget               = calculateBalancedBudget;
window.getBalancingMessage                   = getBalancingMessage;

console.log('budgetBalancer.js loaded ✅');