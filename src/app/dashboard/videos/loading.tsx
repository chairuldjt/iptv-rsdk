export default function VideosLoading() {
  return (
    <div className="mx-auto flex w-full max-w-[1660px] flex-col gap-6 animate-fade-in">
      <section className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(17,24,39,0.96),rgba(8,12,24,0.98))] p-6">
        <div className="space-y-4">
          <div className="skeleton h-4 w-40 rounded-full" />
          <div className="skeleton h-10 w-72 rounded-2xl" />
          <div className="skeleton h-4 w-full max-w-2xl rounded-xl" />
          <div className="flex flex-wrap gap-2">
            <div className="skeleton h-9 w-40 rounded-full" />
            <div className="skeleton h-9 w-44 rounded-full" />
            <div className="skeleton h-9 w-48 rounded-full" />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,26,43,0.98),rgba(10,14,24,0.98))] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-3">
                <div className="skeleton h-3 w-20 rounded-full" />
                <div className="skeleton h-8 w-16 rounded-xl" />
                <div className="skeleton h-3 w-full max-w-[160px] rounded-xl" />
              </div>
              <div className="skeleton h-11 w-11 rounded-2xl" />
            </div>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[280px_minmax(0,1fr)_390px]">
        <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,23,39,0.98),rgba(10,14,24,0.98))] p-4">
          <div className="space-y-3">
            <div className="skeleton h-4 w-24 rounded-full" />
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="skeleton h-16 rounded-2xl" />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,23,39,0.98),rgba(10,14,24,0.98))] p-5">
            <div className="space-y-4">
              <div className="skeleton h-7 w-56 rounded-2xl" />
              <div className="skeleton h-4 w-64 rounded-xl" />
              <div className="flex gap-2">
                <div className="skeleton h-11 flex-1 rounded-2xl" />
                <div className="skeleton h-11 w-28 rounded-2xl" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,25,42,0.98),rgba(10,14,24,0.98))]">
                <div className="skeleton aspect-video w-full rounded-none" />
                <div className="space-y-3 p-4">
                  <div className="skeleton h-6 w-3/4 rounded-xl" />
                  <div className="skeleton h-4 w-1/2 rounded-xl" />
                  <div className="skeleton h-24 rounded-[24px]" />
                  <div className="grid grid-cols-3 gap-2">
                    <div className="skeleton h-10 rounded-2xl" />
                    <div className="skeleton h-10 rounded-2xl" />
                    <div className="skeleton h-10 rounded-2xl" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,25,42,0.98),rgba(10,14,24,0.98))] p-5">
          <div className="space-y-4">
            <div className="skeleton h-7 w-40 rounded-2xl" />
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="skeleton h-28 rounded-[24px]" />
            ))}
            <div className="skeleton h-12 rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  )
}
