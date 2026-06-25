export default function ClassesLoading() {
  return (
    <div className="min-h-screen bg-zinc-50/50">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-7 w-32 bg-zinc-200 rounded-lg animate-pulse" />
            <div className="h-4 w-48 bg-zinc-100 rounded animate-pulse" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-36 bg-zinc-100 rounded-xl animate-pulse" />
            <div className="h-9 w-36 bg-zinc-200 rounded-xl animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-zinc-100 p-5 h-20 animate-pulse" />
          ))}
        </div>
        <div className="h-10 bg-white border border-zinc-200 rounded-xl animate-pulse" />
        <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-4 px-5 py-4 border-b border-zinc-50">
              <div className="h-4 w-24 bg-zinc-100 rounded animate-pulse" />
              <div className="h-4 w-16 bg-zinc-100 rounded animate-pulse" />
              <div className="h-4 w-10 bg-zinc-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
