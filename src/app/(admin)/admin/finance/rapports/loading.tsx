export default function Loading() {
  return (
    <div className="min-h-screen bg-zinc-50/50">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className="space-y-2">
          <div className="h-7 w-32 bg-zinc-200 rounded-lg animate-pulse" />
          <div className="h-4 w-64 bg-zinc-100 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-zinc-100 p-5 h-28 animate-pulse" />
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-zinc-100 h-64 animate-pulse" />
      </div>
    </div>
  )
}
