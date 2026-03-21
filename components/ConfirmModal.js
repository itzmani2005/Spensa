function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText = 'Delete', cancelText = 'Cancel' }) {
  try {
    const handleConfirm = () => {
      onConfirm();
      onClose();
    };

    return (
      <Modal isOpen={isOpen} onClose={onClose} title={title}>
        <div className="space-y-6">
          <p className="text-gray-600">{message}</p>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1">
              {cancelText}
            </button>
            <button onClick={handleConfirm} className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-medium shadow-lg hover:bg-red-700 transition-all duration-300">
              {confirmText}
            </button>
          </div>
        </div>
      </Modal>
    );
  } catch (error) {
    console.error('ConfirmModal component error:', error);
    return null;
  }
}