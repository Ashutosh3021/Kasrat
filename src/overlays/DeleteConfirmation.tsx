interface Props {
  target: { type: string; id: number; name: string }
  onConfirm: () => void
  onCancel: () => void
}

export default function DeleteConfirmation({ target, onConfirm, onCancel }: Props) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 bg-ground/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-sm bg-surface border border-line overflow-hidden" style={{ borderRadius: '16px' }}>
        <div className="p-3 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h3 className="text-[24px] font-medium text-ink">Delete {target.type === 'plan' ? 'Plan' : 'Exercise'}?</h3>
            <p className="text-[13px] font-medium text-danger">This action cannot be undone.</p>
          </div>
          <p className="text-[16px] text-muted">
            All data for <span className="text-ink font-medium">{target.name}</span> will be permanently removed.
          </p>
          <div className="flex flex-col gap-3 mt-4">
            <button
              onClick={onConfirm}
              className="w-full h-12 flex items-center justify-center bg-danger-fill font-medium text-[15px] text-ink active:opacity-70 transition-opacity"
              style={{ borderRadius: '10px' }}
            >
              Delete
            </button>
            <button
              onClick={onCancel}
              className="w-full h-12 flex items-center justify-center border border-ink font-medium text-[15px] text-ink active:bg-ink/10 transition-colors"
              style={{ borderRadius: '10px' }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
