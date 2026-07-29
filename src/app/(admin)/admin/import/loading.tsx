export default function Loading() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-pulse">
      <div className="h-7 w-40 bg-zinc-200 rounded-lg" />
      <div className="h-4 w-64 bg-zinc-100 rounded" />
      <div className="bg-white rounded-xl border border-zinc-200 p-6 space-y-4">
        <div className="h-32 bg-zinc-100 rounded-lg border-2 border-dashed border-zinc-200" />
        <div className="h-9 w-32 bg-zinc-100 rounded-lg" />
      </div>
    </div>
  )
}
