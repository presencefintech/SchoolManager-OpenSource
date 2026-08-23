export default function Loading() {
  return (
    <div className="min-h-full px-8 py-8">
      <div className="mx-auto max-w-[1440px] space-y-6">
        <div className="h-24 animate-pulse rounded-2xl bg-zinc-100" />
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-zinc-100" />
          ))}
        </div>
        <div className="h-80 animate-pulse rounded-2xl bg-zinc-100" />
      </div>
    </div>
  )
}
