function ModeSelector({ onSelectMode }) {
  try {
    const handleLogout = () => {
      if (window.handleLogout) {
        window.handleLogout();
      }
    };

    const scrollToModes = () => {
      const element = document.getElementById('mode-selection-section');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };

    return (
      <div className="min-h-screen bg-white" data-name="mode-selector" data-file="components/ModeSelector.js">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between py-6">
            <SpensaLogo size="md" showText={true} />
            <button 
              onClick={handleLogout}
              className="px-4 py-2 bg-white border-2 border-[var(--primary-color)] text-[var(--primary-color)] rounded-lg font-medium hover:bg-[var(--primary-color)] hover:text-white transition-all duration-300 flex items-center gap-2"
            >
              <div className="icon-log-out text-sm"></div>
              <span>Logout</span>
            </button>
          </div>
        </div>

        <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
          <div className="max-w-3xl mx-auto text-center animate-fade-in">
            <div className="mb-8 flex justify-center">
              <img 
                src="https://app.trickle.so/storage/public/images/usr_173f09e758000001/227f35e7-5ab9-4689-9b04-01b138000659.png" 
                alt="Spensa Logo" 
                className="w-30 h-30 object-contain"
                style={{ width: '120px', height: '120px' }}
              />
            </div>
            
            <h1 className="text-6xl font-bold text-[var(--text-color)] mb-6">Spensa</h1>
            
            <p className="text-2xl text-gray-700 font-medium mb-6">
              Your smart companion for tracking spending, managing budgets, and building better financial habits.
            </p>
            
            <p className="text-lg text-gray-600 leading-relaxed mb-12 max-w-2xl mx-auto">
              Spensa is a personal finance dashboard designed to help you understand where your money goes every month. 
              Track expenses, manage your income, analyze spending patterns, and build a balanced financial lifestyle with clear visual insights and smart budgeting tools.
            </p>

            <button 
              onClick={scrollToModes}
              className="inline-flex flex-col items-center gap-2 text-[var(--primary-color)] hover:text-[var(--accent-color)] transition-all duration-300 animate-bounce cursor-pointer"
            >
              <span className="font-semibold text-lg">Scroll Down to Get Started</span>
              <div className="icon-chevron-down text-3xl"></div>
            </button>
          </div>
        </div>

        <div id="mode-selection-section" className="min-h-screen flex items-center justify-center px-4 py-12">
          <div className="max-w-4xl mx-auto w-full animate-fade-in">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-[var(--text-color)] mb-3">Choose Your Mode</h2>
              <p className="text-lg text-gray-600">Select the budgeting mode that best fits your financial lifestyle</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div onClick={() => onSelectMode('expected')} className="card cursor-pointer hover:scale-105 group hover:border-2 hover:border-[var(--primary-color)]">
                <div className="flex items-center justify-center w-16 h-16 bg-red-50 rounded-xl mb-4 group-hover:bg-white transition-all">
                  <div className="icon-calendar-check text-2xl text-[var(--primary-color)]"></div>
                </div>
                <h2 className="text-2xl font-bold mb-2">Expected Budget</h2>
                <p className="text-gray-600 mb-4">Plan your upcoming month by listing and prioritizing all expected expenses before spending begins.</p>
              </div>

              <div onClick={() => onSelectMode('student')} className="card cursor-pointer hover:scale-105 group hover:border-2 hover:border-[var(--primary-color)]">
                <div className="flex items-center justify-center w-16 h-16 bg-red-50 rounded-xl mb-4 group-hover:bg-white transition-all">
                  <div className="icon-graduation-cap text-2xl text-[var(--primary-color)]"></div>
                </div>
                <h2 className="text-2xl font-bold mb-2">Student Mode</h2>
                <p className="text-gray-600 mb-4">For students to manage pocket money, daily expenses, and small savings effectively.</p>
              </div>

              <div onClick={() => onSelectMode('professional')} className="card cursor-pointer hover:scale-105 group hover:border-2 hover:border-[var(--primary-color)]">
                <div className="flex items-center justify-center w-16 h-16 bg-red-50 rounded-xl mb-4 group-hover:bg-white transition-all">
                  <div className="icon-briefcase text-2xl text-[var(--primary-color)]"></div>
                </div>
                <h2 className="text-2xl font-bold mb-2">Professional Mode</h2>
                <p className="text-gray-600 mb-4">For working professionals to handle income, bills, investments, and monthly budgets efficiently.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('ModeSelector component error:', error);
    return null;
  }
}