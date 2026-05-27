type NotificationTone = 'success' | 'error' | 'info'

const toneClasses: Record<NotificationTone, string> = {
  success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  error: 'bg-rose-500/10 border-rose-500/20 text-rose-300',
  info: 'bg-sky-500/10 border-sky-500/20 text-sky-300',
}

export default function NotificationBar({
  message,
  tone = 'success',
}: {
  message: string
  tone?: NotificationTone
}) {
  return (
    <div className={`p-3.5 rounded-xl border text-xs font-semibold animate-fade-in ${toneClasses[tone]}`}>
      {message}
    </div>
  )
}
