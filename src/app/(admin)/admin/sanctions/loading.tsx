export default function Loading() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-pulse">
      <div className="h-7 w-32 bg-zinc-200 rounded-lg" />
      <div className="h-4 w-64 bg-zinc-100 rounded" />
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-14 border-b border-zinc-50" />
        ))}
      </div>
    </div>
  )
}
