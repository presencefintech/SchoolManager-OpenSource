'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertCircle, ImagePlus, Loader2, Save } from 'lucide-react'
import { useSchoolBranding, useUpdateSchoolBranding } from '@/lib/hooks/use-admin'
import { adminFilesApi } from '@/lib/admin/api/files.api'
import { getApiErrorMessage } from '@/lib/api/client'
import type { SchoolBranding } from '@/types/admin'

function resolveLogoPreviewUrl(logoUrl: string | null | undefined): string | null {
  if (!logoUrl?.trim()) return null
  if (logoUrl.startsWith('data:') || /^https?:\/\//i.test(logoUrl)) return logoUrl
  if (logoUrl.startsWith('/uploads/')) return `/api${logoUrl}`
  return logoUrl
}

export function SchoolBrandingSettings() {
  const { data: branding, isLoading, isError, error, refetch } = useSchoolBranding()
  const updateBranding = useUpdateSchoolBranding()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState<Partial<SchoolBranding>>({})
  const [dirty, setDirty] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  useEffect(() => {
    if (branding && !dirty) {
      setForm(branding)
    }
  }, [branding, dirty])

  const previewUrl = resolveLogoPreviewUrl(form.logoUrl)
  const loadError = isError ? getApiErrorMessage(error) : null

  async function handleLogoChange(file: File | null) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setUploadError('Format non supporté — utilisez PNG ou JPG.')
      return
    }

    setUploading(true)
    setUploadError(null)
    try {
      const uploaded = await adminFilesApi.upload(file, { folder: 'branding' })
      if (!uploaded.url) {
        throw new Error('URL du logo introuvable après upload.')
      }
      setDirty(true)
      setForm((current) => ({ ...current, logoUrl: uploaded.url }))
    } catch (err) {
      setUploadError(getApiErrorMessage(err))
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function handleSave() {
    updateBranding.mutate(
      {
        address: form.address?.trim() || null,
        phone: form.phone?.trim() || null,
        city: form.city?.trim() || null,
        logoUrl: form.logoUrl ?? null,
      },
      { onSuccess: () => setDirty(false) },
    )
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-zinc-200 p-6 text-center">
        <Loader2 size={20} className="mx-auto text-zinc-300 animate-spin mb-2" />
        <p className="text-sm text-zinc-400">Chargement de l&apos;identité…</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-zinc-200 divide-y divide-zinc-100">
      <div className="p-5">
        <h3 className="text-sm font-semibold text-zinc-700 mb-1">Identité de l&apos;établissement</h3>
        <p className="text-xs text-zinc-500 mb-4">
          Logo et adresse affichés sur les reçus de caisse et documents officiels.
        </p>

        {loadError ? (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-800">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p>Impossible de charger l&apos;identité : {loadError}</p>
              <button
                type="button"
                onClick={() => void refetch()}
                className="font-medium text-red-900 underline underline-offset-2"
              >
                Réessayer
              </button>
            </div>
          </div>
        ) : null}

        <div className="flex flex-col sm:flex-row gap-5">
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || updateBranding.isPending || !!loadError}
              className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-xl border border-dashed border-zinc-300 bg-zinc-50 hover:bg-zinc-100 transition-colors disabled:opacity-50"
            >
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="Logo école" className="max-h-full max-w-full object-contain p-2" />
              ) : uploading ? (
                <Loader2 size={22} className="animate-spin text-zinc-400" />
              ) : (
                <div className="flex flex-col items-center gap-1 text-zinc-400">
                  <ImagePlus size={22} />
                  <span className="text-[10px] font-medium">Logo</span>
                </div>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              className="hidden"
              onChange={(e) => void handleLogoChange(e.target.files?.[0] ?? null)}
            />
            <p className="mt-2 text-[10px] text-zinc-400 max-w-[7rem]">PNG ou JPG, max 5 Mo</p>
            {uploadError ? (
              <p className="mt-1 text-[10px] text-red-600 max-w-[9rem]">{uploadError}</p>
            ) : null}
          </div>

          <div className="flex-1 space-y-3">
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Nom de l&apos;école</label>
              <input
                type="text"
                value={form.name ?? ''}
                readOnly
                placeholder={loadError ? '—' : 'Chargement…'}
                className="w-full px-3 py-2 text-sm border border-zinc-100 rounded-lg bg-zinc-50 text-zinc-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Adresse</label>
              <textarea
                value={form.address ?? ''}
                onChange={(e) => {
                  setDirty(true)
                  setForm((current) => ({ ...current, address: e.target.value }))
                }}
                rows={2}
                placeholder="Avenue ..., Commune, Ville"
                disabled={!!loadError}
                className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none disabled:opacity-50"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Ville</label>
                <input
                  type="text"
                  value={form.city ?? ''}
                  onChange={(e) => {
                    setDirty(true)
                    setForm((current) => ({ ...current, city: e.target.value }))
                  }}
                  disabled={!!loadError}
                  className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Téléphone</label>
                <input
                  type="text"
                  value={form.phone ?? ''}
                  onChange={(e) => {
                    setDirty(true)
                    setForm((current) => ({ ...current, phone: e.target.value }))
                  }}
                  disabled={!!loadError}
                  className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 py-3 flex justify-end">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={!dirty || updateBranding.isPending || uploading || !!loadError}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {updateBranding.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Enregistrer l&apos;identité
        </button>
      </div>
    </div>
  )
}
