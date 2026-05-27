export default function BackBreadcrumb({
  href,
  backLabel,
  currentLabel,
}: {
  href: string
  backLabel: string
  currentLabel: string
}) {
  return (
    <div className="flex items-center gap-3">
      <a
        href={href}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        {backLabel}
      </a>
      <span className="text-border">/</span>
      <span className="text-xs text-foreground font-semibold">{currentLabel}</span>
    </div>
  )
}
