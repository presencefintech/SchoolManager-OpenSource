'use client'

import { useState } from 'react'
import { QrCode } from 'lucide-react'
import { useGenerateSessionQR, useClasses } from '@/lib/hooks/use-admin'
import { AdminModal } from '@/components/admin/presences/AdminModal'

const selectCls =
  'w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:bg-zinc-50'

export function QRKioskModal({ onClose }: { onClose: () => void }) {
  const [classId, setClassId] = useState(0)
  const generate = useGenerateSessionQR()
  const { data: classesData, isFetching } = useClasses()
  const classes = classesData ?? []

  return (
    <AdminModal
      title="QR Code Kiosque"
      subtitle="Générez un QR temporaire pour le pointage en classe"
      icon={QrCode}
      iconClassName="text-violet-600"
      size="md"
      onClose={onClose}
      closeDisabled={generate.isPending}
      footer={
        !generate.data ? (
          <button
            type="button"
            onClick={() => classId > 0 && generate.mutate(classId)}
            disabled={!classId || generate.isPending}
            className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
          >
            {generate.isPending ? 'Génération…' : 'Générer le QR'}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => generate.reset()}
            className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
          >
            Générer un nouveau QR
          </button>
        )
      }
    >
      <div className="space-y-4 p-6">
        {!generate.data ? (
          <>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-600">Classe</label>
              {isFetching ? (
                <div className="h-10 animate-pulse rounded-lg bg-zinc-100" />
              ) : (
                <select
                  value={classId || ''}
                  onChange={(e) => setClassId(Number(e.target.value))}
                  className={selectCls}
                >
                  <option value="">— Choisir une classe —</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name ?? `Classe #${c.id}`}
                    </option>
                  ))}
                </select>
              )}
            </div>
            {generate.isError && (
              <p className="text-center text-xs text-red-600">Erreur lors de la génération</p>
            )}
          </>
        ) : (
          <div className="space-y-4 text-center">
            <div className="mx-auto inline-block rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <img
                src={generate.data.qrCode}
                alt="QR Code Kiosque"
                className="mx-auto h-52 w-52 rounded-xl"
              />
            </div>
            <p className="text-xs text-zinc-500">
              Valide environ {Math.round(generate.data.expiresAt / 60)} minutes — affichez en plein écran sur tablette ou écran classe.
            </p>
          </div>
        )}
      </div>
    </AdminModal>
  )
}
