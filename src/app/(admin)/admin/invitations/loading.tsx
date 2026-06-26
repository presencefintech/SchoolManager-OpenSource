export default function Loading() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-pulse">
      <div className="h-7 w-40 bg-zinc-200 rounded-lg" />
      <div className="h-4 w-64 bg-zinc-100 rounded" />
      <div className="flex gap-1">
        <div className="h-9 w-28 bg-zinc-200 rounded-xl" />
        <div className="h-9 w-20 bg-zinc-100 rounded-xl" />
      </div>
      <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-3">
        <div className="h-4 w-32 bg-zinc-100 rounded" />
        <div className="h-10 bg-zinc-100 rounded-lg" />
      </div>
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-100 h-10 bg-zinc-50" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="px-4 py-3 border-b border-zinc-100 flex gap-4">
            <div className="h-4 flex-1 bg-zinc-100 rounded" />
            <div className="h-4 w-24 bg-zinc-100 rounded" />
            <div className="h-4 w-20 bg-zinc-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
