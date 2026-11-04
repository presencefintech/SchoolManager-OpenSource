export default function Loading() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="bg-white border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="h-8 w-36 bg-zinc-200 rounded-lg animate-pulse" />
          <div className="h-4 w-48 bg-zinc-100 rounded mt-2 animate-pulse" />
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-8 py-8 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 h-72 bg-white rounded-2xl border border-zinc-200 animate-pulse" />
          <div className="h-72 bg-white rounded-2xl border border-zinc-200 animate-pulse" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-white rounded-xl border border-zinc-200 animate-pulse" />
          ))}
        </div>
        <div className="h-48 bg-white rounded-xl border border-zinc-200 animate-pulse" />
      </div>
    </div>
  )
}
