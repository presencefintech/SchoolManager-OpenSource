export default function Loading() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="bg-white border-b border-zinc-200">
        <div className="max-w-6xl mx-auto px-8 py-6">
          <div className="h-7 w-20 bg-zinc-200 rounded-lg animate-pulse" />
          <div className="h-4 w-28 bg-zinc-100 rounded mt-2 animate-pulse" />
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-8 py-8 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-white rounded-xl border border-zinc-200 animate-pulse" />
          ))}
        </div>
        <div className="h-10 w-40 bg-white rounded-xl border border-zinc-200 animate-pulse" />
        <div className="h-10 w-64 bg-white rounded-lg border border-zinc-200 animate-pulse" />
        <div className="bg-white rounded-xl border border-zinc-200">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-14 border-b border-zinc-50 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}
