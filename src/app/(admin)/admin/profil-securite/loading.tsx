export default function Loading() {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6 animate-pulse">
      <div className="h-7 w-56 bg-zinc-200 rounded-lg" />
      <div className="h-4 w-64 bg-zinc-100 rounded" />
      <div className="bg-white rounded-xl border border-zinc-200 p-6 space-y-4">
        <div className="w-16 h-16 rounded-full bg-zinc-100" />
        <div className="h-4 w-1/2 bg-zinc-100 rounded" />
        <div className="h-4 w-1/3 bg-zinc-100 rounded" />
      </div>
      <div className="bg-white rounded-xl border border-zinc-200 p-6 space-y-3">
        <div className="h-10 bg-zinc-100 rounded-lg" />
        <div className="h-10 bg-zinc-100 rounded-lg" />
      </div>
    </div>
  )
}
