'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Contact, CreditCard, Loader2, Plus, Printer, ShieldAlert, Trash2, Upload,
} from 'lucide-react'
import { pickupApi, type PickupAdult, type PickupAdultPayload } from '@/lib/admin/api/pickup.api'
import { getApiErrorMessage } from '@/lib/api/client'
import { triggerBlobDownload } from '@/lib/download-blob'
import { useToast } from '@/providers/toast-provider'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

const RELATIONS = ['Mère', 'Père', 'Tuteur', 'Tante', 'Oncle', 'Grand-parent', 'Frère / Sœur', 'Neveu / Nièce', 'Chauffeur', 'Autre'] as const
const ID_TYPES = ['CNI', 'Passeport', 'Permis', 'Carte d’électeur', 'Autre'] as const

type FormState = {
  lastName: string
  firstName: string
  postnom: string
  phone: string
  relationship: string
  idDocumentType: string
  idDocumentNumber: string
  studentIds: number[]
}

function emptyForm(currentStudentId: number): FormState {
  return {
    lastName: '',
    firstName: '',
    postnom: '',
    phone: '',
    relationship: 'Mère',
    idDocumentType: 'CNI',
    idDocumentNumber: '',
    studentIds: [currentStudentId],
  }
}

export function PickupAdultsPanel({ studentId }: { studentId: number }) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const queryKey = ['admin', 'pickup', studentId] as const
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => pickupApi.getHousehold(studentId),
    enabled: Number.isInteger(studentId) && studentId > 0,
  })

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(() => emptyForm(studentId))
  const [revokeId, setRevokeId] = useState<number | null>(null)
  const [printingId, setPrintingId] = useState<number | 'all' | null>(null)
  const [uploadingId, setUploadingId] = useState<number | null>(null)
  const [editingChildrenId, setEditingChildrenId] = useState<number | null>(null)
  const [editChildIds, setEditChildIds] = useState<number[]>([])

  const household = data?.household ?? []
  const adults = data?.adults ?? []
  const printableCount = adults.filter((a) => a.canPrint).length

  const createMutation = useMutation({
    mutationFn: (payload: PickupAdultPayload) => pickupApi.createAdult(studentId, payload),
    onSuccess: () => {
      toast.success('Personne autorisée enregistrée. Ajoutez la photo avant d’imprimer.')
      void queryClient.invalidateQueries({ queryKey })
      setForm(emptyForm(studentId))
      setShowForm(false)
    },
    onError: (err) => toast.error('Enregistrement impossible', getApiErrorMessage(err)),
  })

  const revokeMutation = useMutation({
    mutationFn: (adultId: number) => pickupApi.revokeAdult(adultId),
    onSuccess: () => {
      toast.success('Autorisation révoquée — la carte ne fonctionne plus')
      void queryClient.invalidateQueries({ queryKey })
      setRevokeId(null)
    },
    onError: (err) => toast.error('Révocation impossible', getApiErrorMessage(err)),
  })

  const setChildrenMutation = useMutation({
    mutationFn: ({ adultId, studentIds }: { adultId: number; studentIds: number[] }) =>
      pickupApi.setChildren(adultId, studentIds),
    onSuccess: () => {
      toast.success('Enfants autorisés mis à jour')
      void queryClient.invalidateQueries({ queryKey })
      setEditingChildrenId(null)
    },
    onError: (err) => toast.error('Mise à jour impossible', getApiErrorMessage(err)),
  })

  const childrenToggle = useMemo(
    () => household.length > 0 ? household : (data?.student ? [data.student] : []),
    [household, data?.student],
  )

  function submitForm(e: React.FormEvent) {
    e.preventDefault()
    if (form.studentIds.length === 0) {
      toast.error('Cochez au moins un enfant')
      return
    }
    createMutation.mutate({
      lastName: form.lastName.trim(),
      firstName: form.firstName.trim(),
      postnom: form.postnom.trim() || undefined,
      phone: form.phone.trim(),
      relationship: form.relationship,
      idDocumentType: form.idDocumentType,
      idDocumentNumber: form.idDocumentNumber.trim(),
      studentIds: form.studentIds,
    })
  }

  async function printAdult(adult: PickupAdult, reissue = false) {
    setPrintingId(adult.id)
    try {
      const { blob, filename } = await pickupApi.downloadAdultCardPdf(adult.id, reissue)
      triggerBlobDownload(blob, filename)
      toast.success(reissue ? 'Nouvelle carte (l’ancienne n’est plus valable)' : 'Carte parent imprimée')
      void queryClient.invalidateQueries({ queryKey })
    } catch (err) {
      toast.error('Impression impossible', getApiErrorMessage(err))
    } finally {
      setPrintingId(null)
    }
  }

  async function printAll() {
    setPrintingId('all')
    try {
      const { blob, filename } = await pickupApi.downloadStudentCardsPdf(studentId)
      triggerBlobDownload(blob, filename)
      toast.success('Feuille de cartes parent imprimée')
      void queryClient.invalidateQueries({ queryKey })
    } catch (err) {
      toast.error('Impression impossible', getApiErrorMessage(err))
    } finally {
      setPrintingId(null)
    }
  }

  async function onPhoto(adultId: number, file: File | undefined) {
    if (!file) return
    setUploadingId(adultId)
    try {
      await pickupApi.uploadPhoto(adultId, file)
      toast.success('Photo enregistrée')
      void queryClient.invalidateQueries({ queryKey })
    } catch (err) {
      toast.error('Photo impossible', getApiErrorMessage(err))
    } finally {
      setUploadingId(null)
    }
  }

  return (
    <div id="pickup-adults" className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
            <Contact size={14} /> Cartes parent — personnes autorisées
          </h2>
          <p className="text-[11px] text-zinc-400 mt-1 max-w-xl">
            Déclarez les personnes autorisées à récupérer l’enfant, puis imprimez
            <strong className="font-medium text-zinc-500"> une carte par adulte</strong> (photo + QR).
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="h-8 inline-flex items-center gap-1.5 px-2.5 rounded-lg text-[11px] font-semibold border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
          >
            <Plus size={12} />
            Déclarer
          </button>
          <button
            type="button"
            onClick={() => void printAll()}
            disabled={printableCount === 0 || printingId === 'all'}
            className="h-8 inline-flex items-center gap-1.5 px-2.5 rounded-lg text-[11px] font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {printingId === 'all' ? <Loader2 size={12} className="animate-spin" /> : <Printer size={12} />}
            Imprimer ({printableCount})
          </button>
        </div>
      </div>

      {adults.length === 0 && !isLoading && (
        <p className="text-xs rounded-xl bg-amber-50 text-amber-800 px-3 py-2 mb-3">
          Déclarez d’abord les personnes autorisées. Sinon utilisez une autorisation de sortie du jour (appel au parent + pièce d’identité).
        </p>
      )}

      {isLoading && <div className="h-16 rounded-xl bg-zinc-100 animate-pulse" />}

      <div className="space-y-2">
        {adults.map((adult) => (
          <div key={adult.id} className="flex gap-3 rounded-xl border border-zinc-100 p-3">
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-zinc-100 flex-shrink-0 flex items-center justify-center text-xs font-semibold text-zinc-500">
              {adult.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={adult.photoUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                adult.name.slice(0, 2)
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-zinc-800">{adult.name}</p>
              <p className="text-[11px] text-zinc-400">
                {adult.relationship} · {adult.phone}
                {adult.idDocumentNumber ? ` · ${adult.idDocumentType ?? 'Pièce'} ${adult.idDocumentNumber}` : ''}
              </p>
              {editingChildrenId === adult.id ? (
                <div className="mt-1.5 space-y-1">
                  {childrenToggle.map((child) => {
                    const checked = editChildIds.includes(child.id)
                    return (
                      <label key={child.id} className="flex items-center gap-2 text-[11px] text-zinc-700">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setEditChildIds((prev) =>
                              checked ? prev.filter((id) => id !== child.id) : [...prev, child.id],
                            )
                          }}
                        />
                        {child.name}
                        <span className="text-zinc-400">{child.className}</span>
                      </label>
                    )
                  })}
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      disabled={editChildIds.length === 0 || setChildrenMutation.isPending}
                      onClick={() => setChildrenMutation.mutate({ adultId: adult.id, studentIds: editChildIds })}
                      className="h-7 px-2 rounded-lg text-[10px] font-semibold bg-emerald-600 text-white disabled:opacity-50"
                    >
                      {setChildrenMutation.isPending ? '…' : 'Enregistrer'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingChildrenId(null)}
                      className="h-7 px-2 rounded-lg text-[10px] border border-zinc-200 text-zinc-600"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {adult.children.map((child) => (
                    <span key={child.id} className="text-[10px] px-1.5 py-0.5 rounded-md bg-zinc-100 text-zinc-600">
                      {child.name.split(' ').pop()} — {child.className}
                    </span>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setEditingChildrenId(adult.id)
                      setEditChildIds(adult.children.map((c) => c.id))
                    }}
                    className="text-[10px] text-emerald-700 hover:text-emerald-900"
                  >
                    Modifier
                  </button>
                </div>
              )}
              {!adult.canPrint && (
                <p className="text-[11px] text-amber-700 mt-1">Photo et au moins un enfant requis pour imprimer.</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <label className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-zinc-200 text-[10px] text-zinc-600 hover:bg-zinc-50 cursor-pointer">
                {uploadingId === adult.id ? <Loader2 size={10} className="animate-spin" /> : <Upload size={10} />}
                Photo
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  disabled={uploadingId === adult.id}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    e.target.value = ''
                    void onPhoto(adult.id, file)
                  }}
                />
              </label>
              <button
                type="button"
                disabled={!adult.canPrint || printingId === adult.id}
                onClick={() => void printAdult(adult)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold bg-emerald-600 text-white disabled:opacity-50"
              >
                {printingId === adult.id ? <Loader2 size={10} className="animate-spin" /> : <CreditCard size={10} />}
                Carte
              </button>
              {adult.card && (
                <button
                  type="button"
                  disabled={printingId === adult.id}
                  onClick={() => void printAdult(adult, true)}
                  className="text-[10px] text-zinc-400 hover:text-zinc-600"
                >
                  Perdue ? Rééditer
                </button>
              )}
              <button
                type="button"
                onClick={() => setRevokeId(adult.id)}
                className="inline-flex items-center gap-1 text-[10px] text-red-600 hover:text-red-700"
              >
                <Trash2 size={10} /> Révoquer
              </button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <form onSubmit={submitForm} className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 space-y-3">
          <p className="text-xs font-semibold text-zinc-700">Nouvelle personne autorisée</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input required placeholder="Nom" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm" />
            <input placeholder="Postnom" value={form.postnom} onChange={(e) => setForm({ ...form, postnom: e.target.value })} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm" />
            <input required placeholder="Prénom" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm" />
            <input required placeholder="Téléphone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm" />
            <select value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm">
              {RELATIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <div className="flex gap-2">
              <select value={form.idDocumentType} onChange={(e) => setForm({ ...form, idDocumentType: e.target.value })} className="w-28 rounded-lg border border-zinc-200 px-2 py-2 text-sm">
                {ID_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <input required placeholder="N° de pièce" value={form.idDocumentNumber} onChange={(e) => setForm({ ...form, idDocumentNumber: e.target.value })} className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm" />
            </div>
          </div>
          <fieldset>
            <legend className="text-[11px] font-medium text-zinc-500 mb-1">Enfants qu’elle a le droit de prendre</legend>
            <div className="space-y-1">
              {childrenToggle.map((child) => {
                const checked = form.studentIds.includes(child.id)
                return (
                  <label key={child.id} className="flex items-center gap-2 text-sm text-zinc-700">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        setForm((prev) => ({
                          ...prev,
                          studentIds: checked
                            ? prev.studentIds.filter((id) => id !== child.id)
                            : [...prev.studentIds, child.id],
                        }))
                      }}
                    />
                    {child.name}
                    <span className="text-[11px] text-zinc-400">{child.className}</span>
                    {child.id === studentId && <span className="text-[10px] text-emerald-700">cette fiche</span>}
                  </label>
                )
              })}
            </div>
          </fieldset>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="h-8 px-3 rounded-lg text-xs border border-zinc-200">Annuler</button>
            <button type="submit" disabled={createMutation.isPending} className="h-8 px-3 rounded-lg text-xs font-semibold bg-emerald-600 text-white disabled:opacity-50">
              {createMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      )}

      <p className="mt-3 text-[11px] text-zinc-400 flex items-start gap-1.5">
        <ShieldAlert size={12} className="mt-0.5 flex-shrink-0" />
        La carte parent ne sert pas au pointage du matin. Pour une personne non déclarée, créez une autorisation de sortie.
      </p>

      <ConfirmDialog
        open={revokeId != null}
        title="Révoquer cette personne ?"
        description="Sa carte ne pourra plus être utilisée pour récupérer les enfants. Vous pourrez en déclarer une autre ensuite."
        confirmLabel="Révoquer"
        variant="danger"
        loading={revokeMutation.isPending}
        onConfirm={() => revokeId != null && revokeMutation.mutate(revokeId)}
        onCancel={() => setRevokeId(null)}
      />
    </div>
  )
}
