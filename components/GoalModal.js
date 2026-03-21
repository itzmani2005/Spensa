function GoalModal({ isOpen, onClose, onSave, editGoal }) {
  try {
    const [goalName, setGoalName] = React.useState('');
    const [targetAmount, setTargetAmount] = React.useState('');
    const [deadline, setDeadline] = React.useState('');
    const [error, setError] = React.useState('');

    // FIX 1 — Reset form when modal opens/closes OR when editGoal changes.
    // Original never reset fields when closing — reopening the modal showed
    // stale values from the previous session. Also supports edit mode by
    // pre-filling fields when an existing goal is passed in via editGoal prop.
    React.useEffect(() => {
      if (isOpen) {
        if (editGoal) {
          // Edit mode — populate with existing goal data
          setGoalName(editGoal.goalName || '');
          setTargetAmount(editGoal.targetAmount ? String(editGoal.targetAmount) : '');
          setDeadline(editGoal.deadline || '');
        } else {
          // Add mode — start fresh
          setGoalName('');
          setTargetAmount('');
          setDeadline('');
        }
        setError('');
      }
    }, [isOpen, editGoal]);

    // FIX 2 — Escape key listener had a missing cleanup issue.
    // The original added a new listener on every render because onClose was
    // not stable (re-created on every parent render), causing multiple
    // listeners to stack up. Fixed by only depending on isOpen.
    React.useEffect(() => {
      if (!isOpen) return;
      const handleEscape = (e) => {
        if (e.key === 'Escape') onClose();
      };
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

    // FIX 3 — Body scroll lock: when the modal is open, the page behind it
    // should not scroll. Original had no scroll lock at all.
    React.useEffect(() => {
      if (isOpen) {
        document.body.style.overflow = 'hidden';
      }
      return () => {
        document.body.style.overflow = '';
      };
    }, [isOpen]);

    const handleSubmit = () => {
      // FIX 4 — Original compared targetAmount (a string) to 0 directly.
      // "100" > 0 evaluates to true by JS coercion but this is fragile and
      // fails for values like "  " or "abc". Parse and validate properly.
      const parsed = parseFloat(targetAmount);

      if (!goalName.trim()) {
        setError('Please enter a goal name.');
        return;
      }
      if (!targetAmount || isNaN(parsed) || parsed <= 0) {
        setError('Please enter a valid target amount greater than 0.');
        return;
      }
      // FIX 5 — Deadline validation: if a deadline is set, it must be in
      // the future. Original accepted any date including past dates.
      if (deadline) {
        const deadlineDate = new Date(deadline);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (deadlineDate < today) {
          setError('Deadline must be today or a future date.');
          return;
        }
      }

      setError('');

      // FIX 6 — Pass a stable unique id so GoalTracker can distinguish
      // between add and edit operations. Without an id, every saved goal
      // looked identical to GoalTracker and edits created duplicates.
      onSave({
        id:           editGoal ? editGoal.id : Date.now(),
        goalName:     goalName.trim(),
        targetAmount: parsed,
        deadline:     deadline || null,
        // FIX 7 — Preserve existing savedAmount when editing so progress
        // isn't reset to 0 just because the user renamed the goal.
        savedAmount:  editGoal ? (editGoal.savedAmount || 0) : 0,
        createdAt:    editGoal ? editGoal.createdAt : new Date().toISOString(),
      });

      // FIX 1 — Close after saving (form reset handled by the useEffect above)
      onClose();
    };

    // FIX 8 — Enter key submits the form so keyboard users don't have to
    // reach for the mouse after filling in the last field.
    const handleKeyDown = (e) => {
      if (e.key === 'Enter') handleSubmit();
    };

    if (!isOpen) return null;

    // FIX 9 — Today's date as the min value for the deadline picker so the
    // browser's native date picker also blocks past dates visually.
    const todayStr = new Date().toISOString().split('T')[0];

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
        onClick={onClose}
        data-name="goal-modal"
        data-file="components/GoalModal.js"
      >
        <div className="absolute inset-0 bg-black bg-opacity-50"></div>

        <div
          className="relative bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            {/* FIX 6 — Show correct title for add vs edit mode */}
            <h3 className="text-2xl font-bold">
              {editGoal ? 'Edit Goal' : 'Add New Goal'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close modal"
            >
              <div className="icon-x text-2xl"></div>
            </button>
          </div>

          {/* FIX 4 — Inline validation error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2 text-sm mb-4">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" htmlFor="goal-name">
                Goal Name <span className="text-red-500">*</span>
              </label>
              <input
                id="goal-name"
                type="text"
                value={goalName}
                onChange={(e) => { setGoalName(e.target.value); setError(''); }}
                onKeyDown={handleKeyDown}
                placeholder="e.g., New Laptop"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[var(--primary-color)] focus:outline-none transition-colors"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" htmlFor="goal-amount">
                Target Amount <span className="text-red-500">*</span>
              </label>
              <input
                id="goal-amount"
                type="number"
                value={targetAmount}
                onChange={(e) => { setTargetAmount(e.target.value); setError(''); }}
                onKeyDown={handleKeyDown}
                placeholder="Enter target amount"
                min="0.01"
                step="0.01"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[var(--primary-color)] focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" htmlFor="goal-deadline">
                Deadline
                <span className="text-gray-400 font-normal ml-1">(Optional)</span>
              </label>
              <input
                id="goal-deadline"
                type="date"
                value={deadline}
                onChange={(e) => { setDeadline(e.target.value); setError(''); }}
                // FIX 9 — Prevent selecting past dates in the native picker
                min={todayStr}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[var(--primary-color)] focus:outline-none transition-colors"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button onClick={handleSubmit} className="btn-primary flex-1">
                {editGoal ? 'Save Changes' : 'Save Goal'}
              </button>
              <button onClick={onClose} className="btn-secondary flex-1">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('GoalModal component error:', error);
    return null;
  }
}