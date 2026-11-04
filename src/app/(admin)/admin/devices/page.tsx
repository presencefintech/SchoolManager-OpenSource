'use client'

import { TabletDevicesTable } from '@/components/admin/dashboard/tablet-devices-table'
import { useAdminDevices } from '@/lib/hooks/use-admin'

export default function AdminDevicesPage() {
  const { data: devices = [], isPending, isError } = useAdminDevices()

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Tablettes de l’école</h1>
        <p className="text-sm text-slate-500 mt-1">
          État en ligne / hors-ligne, dernier horodatage de synchronisation et volume encore en file.
        </p>
      </div>
      <TabletDevicesTable
        devices={devices}
        loading={isPending}
        error={isError ? 'Impossible de charger l’état des tablettes. Réessayez.' : null}
      />
    </div>
  )
}
