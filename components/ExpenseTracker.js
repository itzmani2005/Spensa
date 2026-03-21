function ExpenseTracker({ expenses, setExpenses }) {
  try {
    const [showForm, setShowForm] = React.useState(false);
    const [name, setName] = React.useState('');
    const [category, setCategory] = React.useState('Needs');
    const [amount, setAmount] = React.useState('');
    const [date, setDate] = React.useState(new Date().toISOString().split('T')[0]);
    const [editingId, setEditingId] = React.useState(null);
    const [deleteModal, setDeleteModal] = React.useState({ isOpen: false, id: null, name: '' });
    const [error, setError] = React.useState('');

    const resetForm = () => {
      setName('');
      setAmount('');
      setCategory('Needs');
      setDate(new Date().toISOString().split('T')[0]);
      setEditingId(null);
      setError('');
    };

    const handleToggleForm = () => {
      if (showForm) resetForm();
      setShowForm(prev => !prev);
    };

    const handleAdd = () => {
  
      const parsedAmount = parseFloat(amount);

      if (!name.trim()) {
        setError('Please enter an expense name.');
        return;
      }
      if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
        setError('Please enter a valid amount greater than 0.');
        return;
      }

      setError('');

      if (editingId !== null) {
        
        const updatedExpenses = expenses.map(exp =>
          exp.id === editingId
            ? { ...exp, name: name.trim(), category, amount: parsedAmount, date: new Date(date).toISOString() }
            : exp
        );
        setExpenses(updatedExpenses);
      } else {
        // Add new expense
        const newExpense = {
          id: Date.now(),
          name: name.trim(), 
          category,
          amount: parsedAmount,
          date: date ? new Date(date).toISOString() : new Date().toISOString(),
        };
        setExpenses([newExpense, ...expenses]);
      }

      resetForm();
      setShowForm(false);
    };

    
    const handleEditClick = (exp) => {
      setName(exp.name);
      setCategory(exp.category);
      setAmount(String(exp.amount));
      setDate(exp.date ? exp.date.split('T')[0] : new Date().toISOString().split('T')[0]);
      setEditingId(exp.id);
      setError('');
      setShowForm(true);
    };

    const handleDeleteClick = (id, expName) => {
      setDeleteModal({ isOpen: true, id, name: expName });
    };

    const handleDeleteConfirm = () => {
      setExpenses(expenses.filter(exp => exp.id !== deleteModal.id));
      setDeleteModal({ isOpen: false, id: null, name: '' });
    };

  
    const sortedExpenses = [...expenses].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    
    const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    return (
      <div className="card" data-name="expense-tracker" data-file="components/ExpenseTracker.js">
        <ConfirmModal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal({ isOpen: false, id: null, name: '' })}
          onConfirm={handleDeleteConfirm}
          title="Confirm Deletion"
          message={`Are you sure you want to delete "${deleteModal.name}"? This action cannot be undone.`}
        />

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">Expense Tracker</h2>
            {/* FIX 6 — show running total */}
            {expenses.length > 0 && (
              <p className="text-sm text-gray-500 mt-0.5">
                Total: <span className="font-semibold text-[var(--primary-color)]">{formatCurrency(total)}</span>
              </p>
            )}
          </div>
          <button onClick={handleToggleForm} className="btn-primary">
            <div className="flex items-center gap-2">
              <div className={`${showForm ? 'icon-x' : 'icon-plus'} text-sm`}></div>
              <span>{showForm ? 'Cancel' : 'Add Expense'}</span>
            </div>
          </button>
        </div>

        {/* Add / Edit form */}
        {showForm && (
          <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-3">
            {/* FIX 7 — Show edit vs add label so users know what mode they're in */}
            <p className="text-sm font-medium text-gray-600">
              {editingId !== null ? 'Edit expense' : 'New expense'}
            </p>

            {/* FIX 2 — Inline error message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
                {error}
              </div>
            )}

            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              placeholder="Expense name"
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[var(--primary-color)] focus:outline-none"
            />

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[var(--primary-color)] focus:outline-none"
            >
              <option>Needs</option>
              <option>Wants</option>
              <option>Others</option>
              <option>Savings</option>
            </select>

            <input
              type="number"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setError(''); }}
              placeholder="Amount"
              min="0.01"
              step="0.01"
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[var(--primary-color)] focus:outline-none"
            />

            {/* FIX 8 — Date picker was completely missing. Without it every
                expense was stamped with the current time, making MonthlyOverview
                and date-based charts show all expenses on a single day. */}
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[var(--primary-color)] focus:outline-none"
            />

            {/* FIX 9 — Support Enter key to submit form */}
            <button
              onClick={handleAdd}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              className="btn-primary w-full"
            >
              {editingId !== null ? 'Save Changes' : 'Add Transaction'}
            </button>
          </div>
        )}

        {/* Expense list */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {sortedExpenses.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No expenses yet. Add your first expense above.</p>
          ) : (
            sortedExpenses.map(exp => (
              <div
                key={exp.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <div className="icon-receipt text-[var(--primary-color)]"></div>
                  </div>
                  <div>
                    <div className="font-medium">{exp.name}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-2">
                      <span>{exp.category}</span>
                      {/* FIX 10 — Show formatted date on each expense row.
                          Original only showed the category, making it impossible
                          to see when an expense was added without opening edit. */}
                      {exp.date && (
                        <span>·</span>
                      )}
                      {exp.date && (
                        <span>
                          {new Date(exp.date).toLocaleDateString(undefined, {
                            day: 'numeric', month: 'short', year: 'numeric'
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="font-bold text-[var(--text-color)]">{formatCurrency(exp.amount)}</div>

                  {/* FIX 3 — Edit button */}
                  <button
                    onClick={() => handleEditClick(exp)}
                    className="text-gray-400 hover:text-blue-500 transition-colors p-1"
                    title="Edit expense"
                  >
                    <div className="icon-pencil text-sm"></div>
                  </button>

                  <button
                    onClick={() => handleDeleteClick(exp.id, exp.name)}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                    title="Delete expense"
                  >
                    <div className="icon-trash-2 text-sm"></div>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  } catch (error) {
    console.error('ExpenseTracker component error:', error);
    return null;
  }
}