interface Props {
  target: { type: string; id: number; name: string }
  onConfirm: () => void
  onCancel: () => void
}

export default function DeleteConfirmation({ target, onConfirm, onCancel }: Props) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 bg-[#151515]/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-sm bg-[#1C1C1E] border border-[#2C2C2E] overflow-hidden" style={{ borderRadius: '4px' }}>
        <div className="p-3 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h3 className="text-[22px] font-medium text-white">Delete {target.type === 'plan' ? 'Plan' : 'Exercise'}?</h3>
            <p className="text-[13px] font-medium text-[#FF453A]">This action cannot be undone.</p>
          </div>
          <p className="text-[17px] text-[#A1A1A6]">
            All data for <span className="text-white font-medium">{target.name}</span> will be permanently removed.
          </p>
          <div className="flex flex-col gap-3 mt-4">
            <button
              onClick={onConfirm}
              className="w-full h-12 flex items-center justify-center bg-[#FF453A] font-medium text-[15px] text-white active:opacity-70 transition-opacity"
              style={{ borderRadius: '2px' }}
            >
              Delete
            </button>
            <button
              onClick={onCancel}
              className="w-full h-12 flex items-center justify-center border border-white font-medium text-[15px] text-white active:bg-white/10 transition-colors"
              style={{ borderRadius: '2px' }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
