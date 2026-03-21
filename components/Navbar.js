function Navbar({ currentSection, onNavigate }) {
  try {
    const sections = [
      { id: 'home', label: 'Home', icon: 'home' },
      { id: 'budget', label: 'Budget Breakdown', icon: 'pie-chart' },
      { id: 'expenses', label: 'Expense Tracker', icon: 'receipt' },
      { id: 'goals', label: 'Saving Goal', icon: 'target' },
      { id: 'summary', label: 'Financial Summary', icon: 'bar-chart' },
      { id: 'insights', label: 'Insights', icon: 'lightbulb' }
    ];

    return (
      <nav className="bg-white shadow-md sticky top-0 z-50" data-name="navbar" data-file="components/Navbar.js">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <SpensaLogo size="sm" showText={true} />
            
            <div className="hidden md:flex items-center gap-1">
              {sections.map(section => (
                <button
                  key={section.id}
                  onClick={() => onNavigate(section.id)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    currentSection === section.id
                      ? 'bg-[var(--primary-color)] text-white'
                      : 'text-[var(--text-color)] hover:bg-red-50 hover:text-[var(--primary-color)]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`icon-${section.icon} text-sm`}></div>
                    <span>{section.label}</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <button onClick={() => window.handleLogout && window.handleLogout()} className="hidden md:flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-[var(--primary-color)] font-medium transition-colors">
                <div className="icon-log-out text-sm"></div>
                <span>Logout</span>
              </button>
              <button className="md:hidden text-gray-600">
                <div className="icon-menu text-2xl"></div>
              </button>
            </div>
          </div>
        </div>
      </nav>
    );
  } catch (error) {
    console.error('Navbar component error:', error);
    return null;
  }
}