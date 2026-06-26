export default function Loading() {
  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6 animate-pulse">
      <div className="h-7 w-44 bg-zinc-200 rounded-lg" />
      <div className="h-4 w-56 bg-zinc-100 rounded" />
      <div className="bg-white rounded-xl border border-zinc-200 divide-y divide-zinc-100">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-5 space-y-3">
            <div className="h-4 w-36 bg-zinc-100 rounded" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-10 bg-zinc-100 rounded-lg" />
              <div className="h-10 bg-zinc-100 rounded-lg" />
            </div>
          </div>
        ))}
        <div className="px-5 py-4 bg-zinc-50 flex justify-end">
          <div className="h-8 w-28 bg-zinc-200 rounded-lg" />
        </div>
      </div>
    </div>
  )
}
