'use client';

interface ConfirmDialogProps {
  message: string;
  subMessage?: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * In-game confirmation dialog styled with the app's dark theme and lilac primary color.
 * Use CSS variables --color-primary / --color-primary-dark for the accent color.
 */
export default function ConfirmDialog({
  message,
  subMessage,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0, 0, 0, 0.75)' }}
      onClick={onCancel}
    >
      {/* Dialog card */}
      <div
        className="relative mx-4 w-full max-w-sm rounded-2xl p-6 shadow-2xl"
        style={{
          background: 'var(--color-bg-surface)',
          border: '2px solid var(--color-primary)',
          boxShadow: '0 0 40px rgba(167, 139, 250, 0.25)',
          color: 'var(--color-text)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title */}
        <p
          className="mb-2 text-lg font-bold"
          style={{ color: 'var(--color-text)' }}
        >
          {message}
        </p>

        {/* Sub-message */}
        {subMessage && (
          <p className="mb-6 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {subMessage}
          </p>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          {/* Cancel */}
          <button
            className="flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-80 active:opacity-60"
            style={{
              border: '1.5px solid var(--color-primary)',
              color: 'var(--color-primary)',
              background: 'transparent',
            }}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>

          {/* Confirm (destructive) */}
          <button
            className="flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-80 active:opacity-60"
            style={{
              background: 'rgba(248, 113, 113, 0.15)',
              border: '1.5px solid #f87171',
              color: '#f87171',
            }}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
