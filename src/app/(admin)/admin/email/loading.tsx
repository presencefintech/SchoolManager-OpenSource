export default function Loading() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-pulse">
      <div className="h-7 w-32 bg-zinc-200 rounded-lg" />
      <div className="h-4 w-64 bg-zinc-100 rounded" />
      <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-3">
        <div className="h-4 w-32 bg-zinc-100 rounded" />
        <div className="h-10 bg-zinc-100 rounded-lg" />
        <div className="h-4 w-24 bg-zinc-100 rounded" />
        <div className="h-32 bg-zinc-100 rounded-lg" />
      </div>
    </div>
  )
}
