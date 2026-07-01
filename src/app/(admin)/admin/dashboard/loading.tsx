export default function Loading() {
  return (
    <div className="min-h-full bg-[#e8ecf4]">
      <div className="w-full bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6 space-y-4">
          <div className="h-3 w-40 bg-white/10 rounded animate-pulse" />
          <div className="h-9 w-72 bg-white/10 rounded-lg animate-pulse" />
          <div className="h-4 w-48 bg-white/10 rounded animate-pulse" />
          <div className="flex gap-2 pt-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-8 w-24 bg-white/10 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
        <div className="border-t border-white/10 grid grid-cols-2 lg:grid-cols-5 gap-4 px-6 py-5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-16 bg-white/10 rounded animate-pulse" />
              <div className="h-9 w-12 bg-white/10 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 bg-white rounded-xl border border-slate-200 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}
