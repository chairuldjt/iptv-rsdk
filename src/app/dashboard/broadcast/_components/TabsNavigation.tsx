import PageHeader from '@/components/PageHeader'

export default function TabsNavigation({ activeTab }: { activeTab: string }) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Live Broadcast"
        description="Buat profile siaran Video Broadcast dan Running Text Ticker secara mandiri, lalu tautkan ke masing-masing group atau device."
        badge="DSA & GPMC Mode"
      />
      <div className="flex items-center gap-1 p-1 rounded-xl bg-accent/30 border border-border w-fit">
        <a
          href="/dashboard/broadcast?tab=video"
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'video'
              ? 'bg-primary/15 text-primary border border-primary/20'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          📹 Video Broadcast Profiles
        </a>
        <a
          href="/dashboard/broadcast?tab=ticker"
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'ticker'
              ? 'bg-primary/15 text-primary border border-primary/20'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          📢 Running Text Profiles
        </a>
      </div>
    </div>
  )
}
