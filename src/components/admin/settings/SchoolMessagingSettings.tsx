'use client'

import { Loader2 } from 'lucide-react'
import { useSchoolMessaging, useUpdateSchoolMessaging } from '@/lib/hooks/use-admin'

function ChannelToggle({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string
  hint: string
  checked: boolean
  disabled?: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <label className="flex items-start justify-between gap-4 py-2 cursor-pointer">
      <div>
        <p className="text-sm font-medium text-zinc-700">{label}</p>
        <p className="text-xs text-zinc-400 mt-0.5">{hint}</p>
      </div>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
      />
    </label>
  )
}

export function SchoolMessagingSettings() {
  const { data, isLoading } = useSchoolMessaging()
  const update = useUpdateSchoolMessaging()

  if (isLoading || !data) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-6 text-center">
        <Loader2 className="mx-auto h-5 w-5 animate-spin text-zinc-400" />
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-zinc-900">Canaux de notification</h3>
        <p className="mt-1 text-xs text-zinc-500">
          Désactiver un canal évite tout appel API (WhatsApp / SMS) et donc tout frais.
          Le quota SMS est géré par le super-admin.
        </p>
      </div>

      <ChannelToggle
        label="WhatsApp"
        hint="Canal payant — off par défaut"
        checked={data.enableWhatsapp}
        disabled={update.isPending}
        onChange={(enableWhatsapp) => void update.mutateAsync({ enableWhatsapp })}
      />
      <ChannelToggle
        label="SMS"
        hint="Repli si WhatsApp est indisponible ou désactivé"
        checked={data.enableSms}
        disabled={update.isPending}
        onChange={(enableSms) => void update.mutateAsync({ enableSms })}
      />
      <ChannelToggle
        label="Push"
        hint="Notifications application (sans frais SMS/WA)"
        checked={data.enablePush}
        disabled={update.isPending}
        onChange={(enablePush) => void update.mutateAsync({ enablePush })}
      />

      <p className="text-[11px] text-zinc-400 pt-1">
        Crédit SMS : {data.smsBalance == null ? 'illimité' : data.smsBalance}
        {data.allowSmsOverdraft ? ' · découvert autorisé' : ''}
      </p>
    </div>
  )
}
