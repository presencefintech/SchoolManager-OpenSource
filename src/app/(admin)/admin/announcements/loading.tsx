export default function Loading() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-pulse">
      <div className="h-7 w-44 bg-zinc-200 rounded-lg" />
      <div className="h-4 w-64 bg-zinc-100 rounded" />
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="px-5 py-4 border-b border-zinc-50 space-y-2">
            <div className="h-4 w-2/3 bg-zinc-100 rounded" />
            <div className="h-3 w-1/3 bg-zinc-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
