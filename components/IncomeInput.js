function IncomeInput({ mode, onSetIncome, onBack }) {
  try {
    const [mainIncome, setMainIncome] = React.useState('');
    const [additionalIncome, setAdditionalIncome] = React.useState('');
    const [loading, setLoading] = React.useState(false);

    const handleSubmit = async () => {
      setLoading(true);
      const total = parseFloat(mainIncome || 0) + parseFloat(additionalIncome || 0);
      if (total > 0) {
        onSetIncome(total);
      }
      setLoading(false);
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-4" data-name="income-input" data-file="components/IncomeInput.js">
        <div className="max-w-md w-full animate-fade-in">
          <button onClick={onBack} className="mb-6 flex items-center gap-2 text-gray-600 hover:text-[var(--primary-color)]">
            <div className="icon-arrow-left"></div>
            <span>Back</span>
          </button>

          <div className="card">
            <div className="flex items-center justify-center w-16 h-16 bg-red-50 rounded-xl mb-4 mx-auto border-2 border-red-100">
              <div className="icon-dollar-sign text-2xl text-[var(--primary-color)]"></div>
            </div>
            <h2 className="text-3xl font-bold text-center mb-2">Enter Your Income (₹)</h2>
            <p className="text-center text-gray-600 mb-8">
              {mode === 'student' ? 'Student Mode: 40/20/20/20 Rule' : 'Professional Mode: 50/20/10/20 Rule'}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Main Income *</label>
                <input
                  type="number"
                  value={mainIncome}
                  onChange={(e) => setMainIncome(e.target.value)}
                  placeholder="Enter your main income"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[var(--primary-color)] focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Additional Income (Optional)</label>
                <input
                  type="number"
                  value={additionalIncome}
                  onChange={(e) => setAdditionalIncome(e.target.value)}
                  placeholder="Part-time jobs, freelance, etc."
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[var(--primary-color)] focus:outline-none transition-all"
                />
              </div>

              <button onClick={handleSubmit} className="btn-primary w-full mt-6">
                Continue
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('IncomeInput component error:', error);
    return null;
  }
}