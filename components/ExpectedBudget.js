function ExpectedBudget({ onBack }) {
  try {
    const [selectedMonth, setSelectedMonth] = React.useState('');
    const [selectedYear, setSelectedYear] = React.useState('2026');
    const [showForm, setShowForm] = React.useState(false);
    const [expenses, setExpenses] = React.useState([]);
    const [expenseName, setExpenseName] = React.useState('');
    const [category, setCategory] = React.useState('Needs');
    const [amount, setAmount] = React.useState('');
    const [priority, setPriority] = React.useState('Medium');
    const [note, setNote] = React.useState('');
    const [editingId, setEditingId] = React.useState(null);
    const [monthSelected, setMonthSelected] = React.useState(false);

    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December'];

    const categories = ['Needs', 'Wants', 'Others', 'Savings', 'Utilities', 
                       'Entertainment', 'Courses', 'Subscriptions'];

    const priorityColors = {
      High: 'bg-red-100 text-red-700 border-red-300',
      Medium: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      Low: 'bg-green-100 text-green-700 border-green-300'
    };

    const handleAddExpense = () => {
      if (expenseName && amount > 0) {
        if (editingId) {
          setExpenses(expenses.map(exp => 
            exp.id === editingId 
              ? { ...exp, name: expenseName, category, amount: parseFloat(amount), priority, note }
              : exp
          ));
          setEditingId(null);
        } else {
          const newExpense = {
            id: Date.now(),
            name: expenseName,
            category,
            amount: parseFloat(amount),
            priority,
            note
          };
          setExpenses([...expenses, newExpense]);
        }
        resetForm();
      }
    };

    const resetForm = () => {
      setExpenseName('');
      setAmount('');
      setPriority('Medium');
      setNote('');
      setShowForm(false);
    };

    const handleEdit = (expense) => {
      setExpenseName(expense.name);
      setCategory(expense.category);
      setAmount(expense.amount);
      setPriority(expense.priority);
      setNote(expense.note);
      setEditingId(expense.id);
      setShowForm(true);
    };

    const handleDelete = (id) => {
      setExpenses(expenses.filter(exp => exp.id !== id));
    };

    const totalExpected = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    
    const categoryTotals = categories.reduce((acc, cat) => {
      acc[cat] = expenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0);
      return acc;
    }, {});

    const priorityGroups = {
      High: expenses.filter(e => e.priority === 'High'),
      Medium: expenses.filter(e => e.priority === 'Medium'),
      Low: expenses.filter(e => e.priority === 'Low')
    };

    if (!monthSelected) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4" data-name="expected-budget-month" data-file="components/ExpectedBudget.js">
          <div className="max-w-md w-full animate-fade-in">
            <button onClick={onBack} className="mb-6 flex items-center gap-2 text-gray-600 hover:text-[var(--primary-color)]">
              <div className="icon-arrow-left"></div>
              <span>Back</span>
            </button>

            <div className="card">
              <div className="flex items-center justify-center w-16 h-16 bg-red-50 rounded-xl mb-4 mx-auto border-2 border-red-100">
                <div className="icon-calendar-check text-2xl text-[var(--primary-color)]"></div>
              </div>
              <h2 className="text-3xl font-bold text-center mb-2">Select Planning Period</h2>
              <p className="text-center text-gray-600 mb-8">Choose the month and year to plan your expected budget</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Month *</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[var(--primary-color)] focus:outline-none"
                  >
                    <option value="">Select month</option>
                    {months.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Year *</label>
                  <input
                    type="number"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[var(--primary-color)] focus:outline-none"
                  />
                </div>

                <button 
                  onClick={() => selectedMonth && selectedYear && setMonthSelected(true)} 
                  className="btn-primary w-full mt-6"
                  disabled={!selectedMonth || !selectedYear}
                >
                  Continue to Planning
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gray-50" data-name="expected-budget" data-file="components/ExpectedBudget.js">
        <div className="bg-white shadow-md py-4">
          <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setMonthSelected(false)} className="text-gray-600 hover:text-[var(--primary-color)]">
                <div className="icon-arrow-left text-xl"></div>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-[var(--primary-color)]">Expected Monthly Budget</h1>
                <p className="text-sm text-gray-600">{selectedMonth} {selectedYear}</p>
              </div>
            </div>
          </div>
        </div>

        <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
          <div className="card bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-1">Minimum Amount Needed</h3>
                <p className="text-4xl font-bold text-[var(--primary-color)]">{formatCurrency(totalExpected)}</p>
              </div>
              <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center">
                <div className="icon-dollar-sign text-3xl text-[var(--primary-color)]"></div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Expected Expenses</h2>
              <button onClick={() => setShowForm(!showForm)} className="btn-primary">
                <div className="flex items-center gap-2">
                  <div className="icon-plus text-sm"></div>
                  <span>Add Expense</span>
                </div>
              </button>
            </div>

            {showForm && (
              <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-3">
                <input
                  type="text"
                  value={expenseName}
                  onChange={(e) => setExpenseName(e.target.value)}
                  placeholder="Expense name"
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[var(--primary-color)] focus:outline-none"
                />
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[var(--primary-color)] focus:outline-none"
                  >
                    {categories.map(c => <option key={c}>{c}</option>)}
                  </select>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Amount"
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[var(--primary-color)] focus:outline-none"
                  />
                </div>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[var(--primary-color)] focus:outline-none"
                >
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Note (optional)"
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[var(--primary-color)] focus:outline-none"
                />
                <div className="flex gap-2">
                  <button onClick={handleAddExpense} className="btn-primary flex-1">
                    {editingId ? 'Update' : 'Add'} Expense
                  </button>
                  {editingId && (
                    <button onClick={resetForm} className="btn-secondary">Cancel</button>
                  )}
                </div>
              </div>
            )}

            {expenses.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No expenses added yet. Start planning your month!</p>
            ) : (
              <div className="space-y-4">
                {['High', 'Medium', 'Low'].map(priorityLevel => (
                  priorityGroups[priorityLevel].length > 0 && (
                    <div key={priorityLevel}>
                      <div className="text-lg font-semibold mb-2 flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-sm ${priorityColors[priorityLevel]} border-2`}>
                          {priorityLevel} Priority
                        </span>
                        <span className="text-gray-600 text-sm">
                          ({formatCurrency(priorityGroups[priorityLevel].reduce((s, e) => s + e.amount, 0))})
                        </span>
                      </div>
                      <div className="space-y-2">
                        {priorityGroups[priorityLevel].map(exp => (
                          <div key={exp.id} className="flex items-center justify-between p-3 bg-white border-2 border-gray-100 rounded-lg hover:shadow-md transition-all">
                            <div className="flex-1">
                              <div className="font-medium">{exp.name}</div>
                              <div className="text-sm text-gray-500">{exp.category}</div>
                              {exp.note && <div className="text-xs text-gray-400 mt-1">{exp.note}</div>}
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="font-bold text-[var(--text-color)]">{formatCurrency(exp.amount)}</div>
                              <button onClick={() => handleEdit(exp)} className="text-blue-500 hover:text-blue-700">
                                <div className="icon-pencil text-sm"></div>
                              </button>
                              <button onClick={() => handleDelete(exp.id)} className="text-red-500 hover:text-red-700">
                                <div className="icon-trash-2 text-sm"></div>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                ))}
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="card">
              <div className="text-xl font-bold mb-4">Category Breakdown</div>
              <div className="space-y-2">
                {categories.filter(cat => categoryTotals[cat] > 0).map(cat => (
                  <div key={cat} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium">{cat}</span>
                    <span className="font-bold text-[var(--primary-color)]">{formatCurrency(categoryTotals[cat])}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="text-xl font-bold mb-4">Priority Distribution</div>
              <div className="space-y-3">
                {['High', 'Medium', 'Low'].map(p => {
                  const total = priorityGroups[p].reduce((s, e) => s + e.amount, 0);
                  const count = priorityGroups[p].length;
                  return (
                    <div key={p} className="flex items-center justify-between">
                      <span className={`px-3 py-1 rounded-full text-sm ${priorityColors[p]} border-2 font-medium`}>
                        {p} ({count})
                      </span>
                      <span className="font-bold text-[var(--text-color)]">{formatCurrency(total)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  } catch (error) {
    console.error('ExpectedBudget component error:', error);
    return null;
  }
}