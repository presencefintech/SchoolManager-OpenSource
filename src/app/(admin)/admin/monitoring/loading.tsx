export default function Loading() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-pulse">
      <div className="h-7 w-36 bg-zinc-200 rounded-lg" />
      <div className="h-4 w-64 bg-zinc-100 rounded" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-zinc-100 rounded-xl" />
        ))}
      </div>
      <div className="h-64 bg-zinc-100 rounded-xl" />
    </div>
  )
}
