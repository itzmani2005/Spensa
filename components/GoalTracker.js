function GoalTracker({ goals, setGoals, onAddSavingExpense }) {
  try {
    const [showModal, setShowModal] = React.useState(false);
    const [editGoal, setEditGoal] = React.useState(null);
    const [addMoneyModal, setAddMoneyModal] = React.useState({ isOpen: false, goal: null });
    const [deleteModal, setDeleteModal] = React.useState({ isOpen: false, id: null, name: '' });

    const handleSaveGoal = (goalData) => {
      const existing = goals.find(g => g.id === goalData.id);
      if (existing) {
        
        const updatedGoals = goals.map(g =>
          g.id === goalData.id
            ? {
                ...g,
                name:     goalData.goalName,
                target:   goalData.targetAmount,
                deadline: goalData.deadline || null,
                
                current:  goalData.savedAmount ?? g.current,
              }
            : g
        );
        setGoals(updatedGoals);
      } else {
        
        const newGoal = {
          id:       goalData.id || Date.now(),
          name:     goalData.goalName,
          target:   goalData.targetAmount,
          current:  0,
          deadline: goalData.deadline || null,
          createdAt: goalData.createdAt || new Date().toISOString(),
        };
        setGoals([...goals, newGoal]);
      }
      setShowModal(false);
      setEditGoal(null);
    };

  
    const handleEditClick = (goal) => {
      
      setEditGoal({
        id:           goal.id,
        goalName:     goal.name,
        targetAmount: goal.target,
        deadline:     goal.deadline || '',
        savedAmount:  goal.current,
        createdAt:    goal.createdAt,
      });
      setShowModal(true);
    };

    const handleOpenAddMoney = (goal) => {
      setAddMoneyModal({ isOpen: true, goal });
    };

    const handleAddMoney = (amount, recordAsExpense) => {
      if (!addMoneyModal.goal) return;

      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) return;

      const updatedGoals = goals.map(goal =>
        goal.id === addMoneyModal.goal.id
          ? { ...goal, current: Math.min(goal.current + parsedAmount, goal.target) }
          : goal
      );
      setGoals(updatedGoals);

      if (recordAsExpense && onAddSavingExpense) {
        
        onAddSavingExpense(parsedAmount, addMoneyModal.goal.name);
      }

      
      setAddMoneyModal({ isOpen: false, goal: null });
    };

    const handleDeleteClick = (id, name) => {
      setDeleteModal({ isOpen: true, id, name });
    };

    const handleDeleteConfirm = () => {
      setGoals(goals.filter(goal => goal.id !== deleteModal.id));
      setDeleteModal({ isOpen: false, id: null, name: '' });
    };

   
    const getDeadlineLabel = (goal) => {
      if (!goal.deadline) return null;
      if (goal.current >= goal.target) return { text: 'Completed!', color: 'text-green-600' };
      const diff = Math.ceil(
        (new Date(goal.deadline) - new Date()) / (1000 * 60 * 60 * 24)
      );
      if (diff < 0)  return { text: 'Deadline passed', color: 'text-red-500' };
      if (diff === 0) return { text: 'Due today',      color: 'text-orange-500' };
      if (diff <= 7)  return { text: `${diff}d left`,  color: 'text-orange-500' };
      return { text: `${diff}d left`, color: 'text-gray-500' };
    };

    return (
      <div className="card" data-name="goal-tracker" data-file="components/GoalTracker.js">

        {/* FIX 2 — Pass editGoal prop so GoalModal can pre-fill for editing */}
        <GoalModal
          isOpen={showModal}
          onClose={() => { setShowModal(false); setEditGoal(null); }}
          onSave={handleSaveGoal}
          editGoal={editGoal}
        />

        <AddMoneyModal
          isOpen={addMoneyModal.isOpen}
          onClose={() => setAddMoneyModal({ isOpen: false, goal: null })}
          onSave={handleAddMoney}
          goalName={addMoneyModal.goal?.name || ''}
          currentAmount={addMoneyModal.goal?.current || 0}
          targetAmount={addMoneyModal.goal?.target || 0}
        />

        <ConfirmModal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal({ isOpen: false, id: null, name: '' })}
          onConfirm={handleDeleteConfirm}
          title="Delete Goal"
          message={`Are you sure you want to delete "${deleteModal.name}"? All progress will be lost and this cannot be undone.`}
        />

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">Savings Goals</h2>
            {/* FIX 8 — Show count of completed goals in heading */}
            {goals.length > 0 && (
              <p className="text-sm text-gray-500 mt-0.5">
                {goals.filter(g => g.current >= g.target).length} of {goals.length} completed
              </p>
            )}
          </div>
          <button onClick={() => { setEditGoal(null); setShowModal(true); }} className="btn-primary">
            <div className="flex items-center gap-2">
              <div className="icon-plus text-sm"></div>
              <span>Add New Goal</span>
            </div>
          </button>
        </div>

        {/* Goal list */}
        <div className="space-y-4">
          {goals.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No goals yet. Create one to start saving!</p>
          ) : (
            goals.map(goal => {
              // FIX 5 — guard against divide-by-zero when target is 0
              const percentage = goal.target > 0
                ? Math.min((goal.current / goal.target) * 100, 100)
                : 0;
              const isCompleted = goal.current >= goal.target;
              const deadlineLabel = getDeadlineLabel(goal);

              return (
                <div
                  key={goal.id}
                  className={`rounded-xl p-4 transition-colors ${
                    isCompleted ? 'bg-green-50 border border-green-100' : 'bg-gray-50'
                  }`}
                >
                  {/* Goal header row */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="font-semibold text-lg truncate">{goal.name}</div>
                      {/* FIX 6 — deadline label */}
                      {deadlineLabel && (
                        <span className={`text-xs font-medium ${deadlineLabel.color}`}>
                          {deadlineLabel.text}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      {/* FIX 2 — Edit button */}
                      <button
                        onClick={() => handleEditClick(goal)}
                        className="text-gray-400 hover:text-blue-500 transition-colors p-1"
                        title="Edit goal"
                      >
                        <div className="icon-pencil text-sm"></div>
                      </button>

                      <button
                        onClick={() => handleDeleteClick(goal.id, goal.name)}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                        title="Delete goal"
                      >
                        <div className="icon-trash-2 text-sm"></div>
                      </button>

                      {/* FIX 9 — "Add Money" button hidden when goal is complete */}
                      {!isCompleted && (
                        <button
                          onClick={() => handleOpenAddMoney(goal)}
                          
                          className="text-[var(--primary-color)] hover:text-red-700 font-medium text-sm transition-colors ml-1 px-2 py-1 border border-[var(--primary-color)] rounded-lg"
                        >
                          + Add Money
                        </button>
                      )}

                      {/* FIX 9 — Show completion badge instead of Add Money when done */}
                      {isCompleted && (
                        <span className="text-xs font-semibold text-green-600 bg-green-100 px-2 py-1 rounded-lg ml-1">
                          Done!
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Progress amounts */}
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600">
                      {formatCurrency(goal.current)} / {formatCurrency(goal.target)}
                    </span>
                    <span className={`font-semibold ${isCompleted ? 'text-green-600' : 'text-[var(--primary-color)]'}`}>
                      {percentage.toFixed(0)}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className={`progress-bar ${isCompleted ? 'glow' : ''}`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>

                  {/* FIX 11 — Show remaining amount needed */}
                  {!isCompleted && goal.target > goal.current && (
                    <p className="text-xs text-gray-400 mt-1">
                      {formatCurrency(goal.target - goal.current)} remaining
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  } catch (error) {
    console.error('GoalTracker component error:', error);
    return null;
  }
}