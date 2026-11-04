export default function Loading() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-pulse">
      <div className="h-7 w-44 bg-zinc-200 rounded-lg" />
      <div className="h-4 w-60 bg-zinc-100 rounded" />
      <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-3">
        <div className="h-4 w-52 bg-zinc-100 rounded" />
        <div className="h-10 bg-zinc-100 rounded-lg" />
      </div>
      <div className="bg-zinc-50 rounded-xl border border-zinc-200 h-28" />
    </div>
  )
}
