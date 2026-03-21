function Alert({ message, type, onClose }) {
  try {
    const typeStyles = {
      warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      success: 'bg-green-50 border-green-200 text-green-800',
      danger: 'bg-red-50 border-red-200 text-red-800',
      info: 'bg-blue-50 border-blue-200 text-blue-800'
    };

    const icons = {
      warning: 'alert-triangle',
      success: 'check-circle',
      danger: 'alert-circle',
      info: 'info'
    };

    return (
      <div className="fixed top-20 right-4 z-50 animate-fade-in" data-name="alert" data-file="components/Alert.js">
        <div className={`${typeStyles[type]} border-2 rounded-xl p-4 shadow-lg max-w-md flex items-start gap-3`}>
          <div className={`icon-${icons[type]} text-xl flex-shrink-0 mt-0.5`}></div>
          <div className="flex-1">
            <div className="font-medium">{message}</div>
          </div>
          <button onClick={onClose} className="flex-shrink-0 hover:opacity-70">
            <div className="icon-x text-lg"></div>
          </button>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Alert component error:', error);
    return null;
  }
}