export default function Loading() {
  return (
    <div className="min-h-screen bg-zinc-50/50">
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <div className="space-y-2">
          <div className="h-7 w-56 bg-zinc-200 rounded-lg animate-pulse" />
          <div className="h-4 w-64 bg-zinc-100 rounded animate-pulse" />
        </div>
        <div className="bg-white rounded-2xl border border-zinc-100 p-6 space-y-4">
          <div className="h-10 bg-zinc-100 rounded-lg animate-pulse" />
          <div className="h-10 bg-zinc-100 rounded-lg animate-pulse" />
          <div className="h-10 bg-zinc-100 rounded-lg animate-pulse" />
        </div>
      </div>
    </div>
  )
}
