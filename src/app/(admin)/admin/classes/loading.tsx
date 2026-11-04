export default function ClassesLoading() {
  return (
    <div className="min-h-full bg-[#e8ecf4]">
      <div className="w-full bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6 space-y-4">
          <div className="h-3 w-32 bg-white/10 rounded animate-pulse" />
          <div className="h-9 w-48 bg-white/10 rounded-lg animate-pulse" />
          <div className="flex gap-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-9 w-28 bg-white/10 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
        <div className="border-t border-white/10 grid grid-cols-2 lg:grid-cols-4 gap-4 px-6 py-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-20 bg-white/10 rounded animate-pulse" />
              <div className="h-9 w-12 bg-white/10 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6 space-y-4">
        <div className="h-14 bg-white rounded-xl border border-zinc-200 animate-pulse" />
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden p-4 space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-12 bg-zinc-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}
