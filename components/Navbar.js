function Navbar({ currentSection, onNavigate, onGoHome }) {
  try {
    const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

    const sections = [
      { id: 'budget',   label: 'Budget',    icon: 'pie-chart' },
      { id: 'expenses', label: 'Expenses',   icon: 'receipt'   },
      { id: 'goals',    label: 'Goals',      icon: 'target'    },
      { id: 'summary',  label: 'Summary',    icon: 'bar-chart' },
      { id: 'insights', label: 'Insights',   icon: 'lightbulb' },
    ];

    // Home click — goes all the way back to ModeSelector landing page
    const handleHomeClick = () => {
      setMobileMenuOpen(false);
      if (typeof onGoHome === 'function') {
        onGoHome();
      }
    };

    const handleNavClick = (sectionId) => {
      setMobileMenuOpen(false);
      onNavigate(sectionId);
    };

    return (
      <nav
        className="bg-white shadow-md sticky top-0 z-50"
        data-name="navbar"
        data-file="components/Navbar.js"
      >
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">

            {/* Logo — clicking goes back to ModeSelector */}
            <button
              onClick={handleHomeClick}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity focus:outline-none"
              title="Go to home"
            >
              <SpensaLogo size="sm" showText={true} />
            </button>

            {/* Desktop nav links */}
            <div className="hidden md:flex items-center gap-1">
              {/* Home button — goes to ModeSelector */}
              <button
                onClick={handleHomeClick}
                className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                  !currentSection || currentSection === 'home'
                    ? 'bg-[var(--primary-color)] text-white'
                    : 'text-[var(--text-color)] hover:bg-red-50 hover:text-[var(--primary-color)]'
                }`}
                title="Back to mode selection"
              >
                <div className="icon-home text-sm"></div>
                <span>Home</span>
              </button>

              {/* Section scroll links */}
              {sections.map(section => (
                <button
                  key={section.id}
                  onClick={() => handleNavClick(section.id)}
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

            {/* Right side — logout + mobile menu toggle */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.handleLogout && window.handleLogout()}
                className="hidden md:flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-[var(--primary-color)] font-medium transition-colors"
              >
                <div className="icon-log-out text-sm"></div>
                <span>Logout</span>
              </button>

              {/* Mobile hamburger */}
              <button
                className="md:hidden text-gray-600 hover:text-[var(--primary-color)] transition-colors"
                onClick={() => setMobileMenuOpen(prev => !prev)}
                aria-label="Toggle menu"
              >
                <div className={`text-2xl ${mobileMenuOpen ? 'icon-x' : 'icon-menu'}`}></div>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 shadow-lg animate-fade-in">
            <div className="max-w-7xl mx-auto px-4 py-3 space-y-1">

              {/* Home — goes to ModeSelector */}
              <button
                onClick={handleHomeClick}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all bg-[var(--primary-color)] text-white"
              >
                <div className="icon-home text-sm"></div>
                <span>Home</span>
              </button>

              {/* Section scroll links */}
              {sections.map(section => (
                <button
                  key={section.id}
                  onClick={() => handleNavClick(section.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                    currentSection === section.id
                      ? 'bg-red-50 text-[var(--primary-color)]'
                      : 'text-gray-700 hover:bg-red-50 hover:text-[var(--primary-color)]'
                  }`}
                >
                  <div className={`icon-${section.icon} text-sm`}></div>
                  <span>{section.label}</span>
                </button>
              ))}

              {/* Logout */}
              <button
                onClick={() => { setMobileMenuOpen(false); window.handleLogout && window.handleLogout(); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-gray-600 hover:bg-red-50 hover:text-[var(--primary-color)] transition-all"
              >
                <div className="icon-log-out text-sm"></div>
                <span>Logout</span>
              </button>
            </div>
          </div>
        )}
      </nav>
    );
  } catch (error) {
    console.error('Navbar component error:', error);
    return null;
  }
}
