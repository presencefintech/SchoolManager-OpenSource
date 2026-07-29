export default function Loading() {
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 animate-pulse">
      <div className="h-7 w-48 bg-zinc-200 rounded-lg" />
      <div className="h-4 w-64 bg-zinc-100 rounded" />
      <div className="grid grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-72 bg-zinc-100 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
