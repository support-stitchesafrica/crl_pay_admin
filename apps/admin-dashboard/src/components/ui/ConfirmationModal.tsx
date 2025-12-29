import { AlertTriangle, X } from 'lucide-react';
import Button from './Button';

export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'danger' | 'success';
  loading?: boolean;
  icon?: React.ReactNode;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'primary',
  loading = false,
  icon,
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const variantStyles = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    success: 'bg-green-600 hover:bg-green-700 text-white',
  };

  const iconBgStyles = {
    primary: 'bg-blue-100',
    danger: 'bg-red-100',
    success: 'bg-green-100',
  };

  const iconColorStyles = {
    primary: 'text-blue-600',
    danger: 'text-red-600',
    success: 'text-green-600',
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 transform transition-all">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>

          {/* Icon */}
          <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-4 ${iconBgStyles[confirmVariant]}`}>
            {icon || <AlertTriangle className={`w-6 h-6 ${iconColorStyles[confirmVariant]}`} />}
          </div>

          {/* Title */}
          <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>

          {/* Message */}
          <p className="text-gray-600 mb-6 leading-relaxed">{message}</p>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={onClose}
              variant="secondary"
              fullWidth
              disabled={loading}
            >
              {cancelText}
            </Button>
            <Button
              onClick={onConfirm}
              fullWidth
              loading={loading}
              className={variantStyles[confirmVariant]}
            >
              {confirmText}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
