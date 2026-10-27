import { useNavigate } from 'react-router'

export interface ContinueContext {
  advocateId: number
  advocateName: string
  appointmentId: number
}

export default function ContinueAdvocateDialog({
  ctx,
  onClose,
}: {
  ctx: ContinueContext
  onClose: () => void
}) {
  const navigate = useNavigate()

  const yes = () => {
    onClose()
    navigate(
      `/dashboard/cases?shareAdvocate=${ctx.advocateId}&appointmentId=${ctx.appointmentId}`,
      { replace: true },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-gray-950 p-6 text-white shadow-2xl">
        <h2 className="text-xl font-semibold">Would you like to continue with this advocate?</h2>
        <p className="mt-3 text-sm text-gray-400">
          Your consultation has ended. Would you like to continue working with this advocate on your legal matter?
        </p>
        <p className="mt-2 text-sm text-gray-300">Advocate: {ctx.advocateName}</p>
        <div className="mt-6 flex gap-3">
          <button onClick={yes} className="btn-primary flex-1 rounded-lg px-4 py-2.5 text-sm font-medium">
            Yes, Continue
          </button>
          <button onClick={onClose} className="flex-1 rounded-lg border border-white/15 px-4 py-2.5 text-sm text-gray-300">
            No, Maybe Later
          </button>
        </div>
      </div>
    </div>
  )
}
