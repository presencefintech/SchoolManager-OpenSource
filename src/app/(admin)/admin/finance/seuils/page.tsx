'use client'

import { useEffect } from 'react'
import { useForm, type UseFormRegisterReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertTriangle, BellRing, Loader2, Save, ShieldCheck } from 'lucide-react'
import { useManagerControls, useUpdateManagerControls } from '@/lib/hooks/use-admin'
import { getApiErrorMessage } from '@/lib/api/client'
import { useAuth } from '@/providers/auth-provider'
import { useToast } from '@/providers/toast-provider'
import { isPromoterRole } from '@/types/auth'
import {
  RefundActionButton,
  RefundDetailBlock,
  RefundPageShell,
  RefundPanel,
  RefundPanelHeader,
} from '@/components/finance/refund-page-ui'
import type { CurrencyThreshold, ManagerControls } from '@/types/finance'

/** Champ vide = pas de seuil (null) ; sinon montant ≥ 0. */
const amountField = z
  .string()
  .trim()
  .refine((v) => v === '' || (Number.isFinite(Number(v)) && Number(v) >= 0), {
    message: 'Montant positif, ou vide',
  })

const thresholdsSchema = z.object({
  approvalUsd: amountField,
  approvalCdf: amountField,
  alertUsd: amountField,
  alertCdf: amountField,
})

type ThresholdsForm = z.infer<typeof thresholdsSchema>

const toField = (v: number | null): string => (v == null ? '' : String(v))
const toAmount = (v: string): number | null => (v.trim() === '' ? null : Number(v))

function toForm(c: ManagerControls): ThresholdsForm {
  return {
    approvalUsd: toField(c.promoterApprovalThreshold.USD),
    approvalCdf: toField(c.promoterApprovalThreshold.CDF),
    alertUsd: toField(c.paymentAlertThreshold.USD),
    alertCdf: toField(c.paymentAlertThreshold.CDF),
  }
}

function toThreshold(usd: string, cdf: string): CurrencyThreshold {
  return { USD: toAmount(usd), CDF: toAmount(cdf) }
}

/**
 * Seuils du Promoteur (GET/PUT /admin/settings/manager-controls) :
 * - validation des paiements manuels sur preuve : au-dessus, le Promoteur valide ;
 * - alerte des encaissements du Gérant.
 */
export default function AdminThresholdsPage() {
  const toast = useToast()
  const { user } = useAuth()
  const canEdit = isPromoterRole(user?.role)
  const query = useManagerControls()
  const update = useUpdateManagerControls()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ThresholdsForm>({
    resolver: zodResolver(thresholdsSchema),
    mode: 'onChange',
    defaultValues: { approvalUsd: '', approvalCdf: '', alertUsd: '', alertCdf: '' },
  })

  // Valeurs du serveur → formulaire (au chargement et après enregistrement).
  useEffect(() => {
    if (query.data) reset(toForm(query.data))
  }, [query.data, reset])

  async function onSubmit(values: ThresholdsForm) {
    try {
      await update.mutateAsync({
        promoterApprovalThreshold: toThreshold(values.approvalUsd, values.approvalCdf),
        paymentAlertThreshold: toThreshold(values.alertUsd, values.alertCdf),
      })
      toast.success('Seuils enregistrés', 'La file de vérification applique les nouveaux seuils.')
    } catch (err) {
      toast.error('Enregistrement impossible', getApiErrorMessage(err))
    }
  }

  return (
    <RefundPageShell>
      <div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 via-indigo-800 to-violet-800 bg-clip-text text-transparent">
          Seuils de validation
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Ce que le guichet valide seul, et ce qui vous revient. Les espèces au guichet ne sont jamais concernées :
          le reçu est remis tout de suite, le contrôle se fait à la clôture.
        </p>
      </div>

      {query.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 size={14} className="animate-spin" /> Chargement...
        </div>
      ) : query.isError ? (
        <RefundPanel accent="violet">
          <div className="p-8 text-center">
            <AlertTriangle size={24} className="mx-auto text-rose-400 mb-2" />
            <p className="text-sm text-slate-700">Impossible de charger les seuils.</p>
            <p className="text-xs text-slate-500 mt-1">{getApiErrorMessage(query.error)}</p>
            <button
              type="button"
              onClick={() => void query.refetch()}
              className="mt-3 text-sm font-medium text-indigo-700 hover:underline"
            >
              Réessayer
            </button>
          </div>
        </RefundPanel>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <fieldset disabled={!canEdit || update.isPending} className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <RefundPanel accent="indigo">
              <RefundPanelHeader
                title="Paiements manuels sur preuve"
                subtitle="Virements et mobile money déclarés"
                icon={ShieldCheck}
              />
              <div className="space-y-3 p-5">
                <div className="grid grid-cols-2 gap-3">
                  <AmountInput label="Seuil USD" field={register('approvalUsd')} error={errors.approvalUsd?.message} />
                  <AmountInput label="Seuil CDF" field={register('approvalCdf')} error={errors.approvalCdf?.message} />
                </div>
                <RefundDetailBlock tone="sky">
                  <p className="text-slate-700">
                    <strong>Sous le seuil</strong> : une validation du guichet (comptable ou Gérant, jamais l’auteur de
                    la saisie) confirme le paiement.
                  </p>
                  <p className="mt-1 text-slate-700">
                    <strong>À partir du seuil</strong> : le guichet contrôle, vous validez.
                  </p>
                  <p className="mt-1 font-medium text-slate-800">
                    Champ vide : tous les paiements de cette devise vous reviennent.
                  </p>
                </RefundDetailBlock>
              </div>
            </RefundPanel>

            <RefundPanel accent="violet">
              <RefundPanelHeader
                title="Alerte des encaissements du Gérant"
                subtitle="Notification immédiate au Promoteur"
                icon={BellRing}
              />
              <div className="space-y-3 p-5">
                <div className="grid grid-cols-2 gap-3">
                  <AmountInput label="Seuil USD" field={register('alertUsd')} error={errors.alertUsd?.message} />
                  <AmountInput label="Seuil CDF" field={register('alertCdf')} error={errors.alertCdf?.message} />
                </div>
                <RefundDetailBlock tone="amber">
                  <p className="text-slate-700">
                    Un encaissement du Gérant à partir de ce montant vous est signalé tout de suite. Il n’est pas
                    bloqué.
                  </p>
                  <p className="mt-1 font-medium text-slate-800">Champ vide : pas d’alerte dans cette devise.</p>
                </RefundDetailBlock>
              </div>
            </RefundPanel>
          </fieldset>

          {canEdit ? (
            <div className="flex items-center gap-3">
              <RefundActionButton onClick={handleSubmit(onSubmit)} disabled={!isDirty || update.isPending}>
                {update.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Enregistrer
              </RefundActionButton>
              {isDirty && !update.isPending && (
                <button
                  type="button"
                  onClick={() => query.data && reset(toForm(query.data))}
                  className="text-sm text-slate-600 hover:underline"
                >
                  Annuler les modifications
                </button>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Seul le Promoteur peut modifier ces seuils.</p>
          )}
        </form>
      )}
    </RefundPageShell>
  )
}

function AmountInput({
  label,
  field,
  error,
}: {
  label: string
  field: UseFormRegisterReturn
  error?: string
}) {
  return (
    <label className="block text-xs font-medium text-slate-600">
      {label}
      <input
        type="text"
        inputMode="decimal"
        placeholder="Vide"
        aria-invalid={error ? true : undefined}
        {...field}
        className="mt-1 w-full rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-400/50 aria-[invalid=true]:border-rose-300"
      />
      {error && <span className="mt-1 block text-[11px] text-rose-600">{error}</span>}
    </label>
  )
}
