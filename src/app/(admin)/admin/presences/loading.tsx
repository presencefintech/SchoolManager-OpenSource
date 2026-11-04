export default function Loading() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="bg-white border-b border-zinc-200">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-8 py-6">
          <div>
            <div className="h-8 w-32 bg-zinc-200 rounded-lg animate-pulse" />
            <div className="h-4 w-44 bg-zinc-100 rounded mt-2 animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-28 bg-zinc-100 rounded-xl animate-pulse" />
            <div className="h-9 w-32 bg-zinc-100 rounded-xl animate-pulse" />
            <div className="h-9 w-44 bg-emerald-100 rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-8 py-8 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-white rounded-xl border border-zinc-200 animate-pulse" />
          ))}
        </div>
        <div className="h-12 bg-white rounded-xl border border-zinc-200 animate-pulse" />
        <div className="h-10 w-72 bg-white rounded-xl border border-zinc-200 animate-pulse" />
        <div className="bg-white rounded-xl border border-zinc-200">
          <div className="h-14 border-b border-zinc-100 animate-pulse" />
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-14 border-b border-zinc-50 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}
