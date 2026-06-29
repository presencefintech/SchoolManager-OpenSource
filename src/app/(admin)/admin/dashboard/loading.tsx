export default function Loading() {
  return (
    <div className="min-h-full bg-[#e8ecf4]">
      <div className="h-36 bg-gradient-to-br from-slate-800 to-indigo-950 animate-pulse" />
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6 space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-white/80 rounded-xl border border-slate-200/80 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-white/80 rounded-xl border border-slate-200/80 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-5 h-64 bg-white/80 rounded-xl border border-slate-200/80 animate-pulse" />
          <div className="lg:col-span-3 h-64 bg-white/80 rounded-xl border border-slate-200/80 animate-pulse" />
          <div className="lg:col-span-4 h-64 bg-white/80 rounded-xl border border-slate-200/80 animate-pulse" />
        </div>
      </div>
    </div>
  )
}
