function Modal({ isOpen, onClose, title, children, type = 'default' }) {
  try {
    React.useEffect(() => {
      const handleEscape = (e) => {
        if (e.key === 'Escape' && isOpen) {
          onClose();
        }
      };
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
        onClick={onClose}
        data-name="modal"
        data-file="components/Modal.js"
      >
        <div className="absolute inset-0 bg-black bg-opacity-50"></div>
        <div 
          className="relative bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl transform transition-all"
          onClick={(e) => e.stopPropagation()}
        >
          {title && (
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold">{title}</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                <div className="icon-x text-2xl"></div>
              </button>
            </div>
          )}
          <div>{children}</div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Modal component error:', error);
    return null;
  }
}