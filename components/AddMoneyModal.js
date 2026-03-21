function AddMoneyModal({ isOpen, onClose, onSave, goalName, currentAmount, targetAmount }) {
  try {
    const [amount, setAmount] = React.useState('');
    const [error, setError] = React.useState('');
    const [recordAsExpense, setRecordAsExpense] = React.useState(true);

    const maxAmount = targetAmount - currentAmount;

    const handleSave = () => {
      const numAmount = parseFloat(amount);
      
      if (!amount || numAmount <= 0) {
        setError('Please enter a valid amount');
        return;
      }
      
      if (numAmount > maxAmount) {
        setError(`Amount cannot exceed ${formatCurrency(maxAmount)}`);
        return;
      }

      onSave(numAmount, recordAsExpense);
      setAmount('');
      setError('');
      setRecordAsExpense(true);
      onClose();
    };

    const handleClose = () => {
      setAmount('');
      setError('');
      setRecordAsExpense(true);
      onClose();
    };

    return (
      <Modal isOpen={isOpen} onClose={handleClose} title={`Add Money to ${goalName}`}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Amount to Add *</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setError('');
              }}
              placeholder="Enter amount"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[var(--primary-color)] focus:outline-none"
            />
            {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
            <p className="text-sm text-gray-500 mt-2">
              Maximum: {formatCurrency(maxAmount)}
            </p>
          </div>

          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
            <input
              type="checkbox"
              id="recordExpense"
              checked={recordAsExpense}
              onChange={(e) => setRecordAsExpense(e.target.checked)}
              className="w-4 h-4 text-[var(--primary-color)] border-gray-300 rounded focus:ring-[var(--primary-color)]"
            />
            <label htmlFor="recordExpense" className="text-sm text-gray-700 cursor-pointer">
              Record as savings expense in this month
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={handleClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button onClick={handleSave} className="btn-primary flex-1">
              Add Money
            </button>
          </div>
        </div>
      </Modal>
    );
  } catch (error) {
    console.error('AddMoneyModal component error:', error);
    return null;
  }
}