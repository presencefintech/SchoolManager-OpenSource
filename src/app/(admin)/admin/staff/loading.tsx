export default function Loading() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="bg-white border-b border-zinc-200">
        <div className="max-w-5xl mx-auto px-8 py-6">
          <div className="h-7 w-28 bg-zinc-200 rounded-lg animate-pulse" />
          <div className="h-4 w-24 bg-zinc-100 rounded mt-2 animate-pulse" />
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-8 py-8">
        <div className="bg-white rounded-xl border border-zinc-200">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-14 border-b border-zinc-50 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}
