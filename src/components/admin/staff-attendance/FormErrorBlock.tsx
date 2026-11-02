'use client'

export function FormErrorBlock({ message, details }: { message: string; details?: string[] }) {
  if (!message) return null
  return (
    <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 space-y-1">
      <p>{message}</p>
      {details && details.length > 0 && (
        <ul className="list-disc list-inside space-y-0.5 text-red-500">
          {details.map((d) => <li key={d}>{d}</li>)}
        </ul>
      )}
    </div>
  )
}
