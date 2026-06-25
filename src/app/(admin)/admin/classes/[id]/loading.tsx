export default function ClassDetailLoading() {
  return (
    <div className="min-h-screen bg-zinc-50/50">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-start gap-4">
          <div className="w-9 h-9 bg-zinc-100 rounded-xl animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-7 w-40 bg-zinc-200 rounded-lg animate-pulse" />
            <div className="h-4 w-20 bg-zinc-100 rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-zinc-100 p-4 h-16 animate-pulse" />
          ))}
        </div>
        <div className="h-10 w-64 bg-zinc-100 rounded-xl animate-pulse" />
        <div className="bg-white rounded-2xl border border-zinc-100 h-64 animate-pulse" />
      </div>
    </div>
  )
}
