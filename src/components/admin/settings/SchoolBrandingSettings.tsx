'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertCircle, ImagePlus, Loader2, Save } from 'lucide-react'
import { useSchoolBranding, useUpdateSchoolBranding } from '@/lib/hooks/use-admin'
import { adminFilesApi } from '@/lib/admin/api/files.api'
import { getApiErrorMessage } from '@/lib/api/client'
import type { SchoolBranding } from '@/types/admin'
import {
  SCHOOL_CARD_THEME_PRESETS,
  themeFromPreset,
  resolveCardTheme,
  type SchoolCardTheme,
  type SchoolCardThemePreset,
} from '@/lib/student-card/card-theme'
import { cn } from '@/lib/utils'

function resolveLogoPreviewUrl(logoUrl: string | null | undefined): string | null {
  if (!logoUrl?.trim()) return null
  if (logoUrl.startsWith('data:') || /^https?:\/\//i.test(logoUrl)) return logoUrl
  if (logoUrl.startsWith('/uploads/')) return `/api${logoUrl}`
  return logoUrl
}

const PRESET_KEYS = Object.keys(SCHOOL_CARD_THEME_PRESETS) as SchoolCardThemePreset[]

export function SchoolBrandingSettings() {
  const { data: branding, isLoading, isError, error, refetch } = useSchoolBranding()
  const updateBranding = useUpdateSchoolBranding()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState<Partial<SchoolBranding>>({})
  const [cardTheme, setCardTheme] = useState<SchoolCardTheme>(themeFromPreset('teal'))
  const [dirty, setDirty] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  useEffect(() => {
    if (branding && !dirty) {
      setForm({
        ...branding,
        documentAccentColorOverride: branding.documentAccentColorOverride,
      })
      setCardTheme(resolveCardTheme(branding.cardTheme))
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
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Fichier trop volumineux — max 5 Mo.')
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

  function applyPreset(preset: SchoolCardThemePreset) {
    setDirty(true)
    setCardTheme(themeFromPreset(preset))
  }

  function handleSave() {
    updateBranding.mutate(
      {
        address: form.address?.trim() || null,
        phone: form.phone?.trim() || null,
        email: form.email?.trim() || null,
        slogan: form.slogan?.trim() || null,
        devise: form.devise?.trim() || null,
        documentAccentColor: form.documentAccentColorOverride?.trim() || null,
        legalFooter: form.legalFooter?.trim() || null,
        city: form.city?.trim() || null,
        logoUrl: form.logoUrl ?? null,
        cardTheme,
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
    <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-2">
      <div className="p-5 border-b lg:border-b-0 lg:border-r border-zinc-100">
        <h3 className="text-sm font-semibold text-zinc-700 mb-1">Identité de l&apos;établissement</h3>
        <p className="text-xs text-zinc-500 mb-4">
          Logo, adresse et couleurs — appliqués aux cartes élèves, reçus, rapports PDF, fiches d&apos;inscription, attestations et e-mails.
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
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Email de contact</label>
              <input
                type="email"
                value={form.email ?? ''}
                onChange={(e) => {
                  setDirty(true)
                  setForm((current) => ({ ...current, email: e.target.value }))
                }}
                placeholder="contact@ecole.cd"
                disabled={!!loadError}
                className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Slogan</label>
              <input
                type="text"
                value={form.slogan ?? ''}
                onChange={(e) => {
                  setDirty(true)
                  setForm((current) => ({ ...current, slogan: e.target.value }))
                }}
                placeholder="Excellence et discipline"
                maxLength={120}
                disabled={!!loadError}
                className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
              />
              <p className="mt-1 text-[10px] text-zinc-400">Phrase courte — reçus, e-mails, rapports.</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Devise scolaire</label>
              <input
                type="text"
                value={form.devise ?? ''}
                onChange={(e) => {
                  setDirty(true)
                  setForm((current) => ({ ...current, devise: e.target.value }))
                }}
                placeholder="Savoir — Travail — Progrès"
                maxLength={160}
                disabled={!!loadError}
                className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
              />
              <p className="mt-1 text-[10px] text-zinc-400">Valeur ou devise de l&apos;école — cartes élèves et en-têtes.</p>
            </div>
            {([form.address, form.city].some((v) => v?.trim()) || branding?.addressLine) ? (
              <p className="text-[11px] text-zinc-500">
                En-tête documents :{' '}
                <span className="font-medium text-zinc-700">
                  {[form.address?.trim(), form.city?.trim()].filter(Boolean).join(', ') ||
                    branding?.addressLine}
                </span>
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="divide-y divide-zinc-100">
      <div className="p-5">
        <h3 className="text-sm font-semibold text-zinc-700 mb-1">Documents PDF &amp; reçus</h3>
        <p className="text-xs text-zinc-500 mb-4">
          Couleur d&apos;accent sur les reçus, rapports, fiches d&apos;inscription et attestations (hors carte CR80). Laissez vide pour utiliser la couleur du thème carte (
          <span className="font-mono text-zinc-600">{branding?.documentAccentColor ?? cardTheme.headerTo}</span>
          ).
        </p>
        <div className="space-y-3">
          <label className="block text-xs font-medium text-zinc-600">
            Couleur accent documents
            <div className="mt-1 flex items-center gap-2">
              <input
                type="color"
                value={form.documentAccentColorOverride ?? branding?.documentAccentColor ?? cardTheme.headerTo}
                disabled={!!loadError}
                onChange={(e) => {
                  setDirty(true)
                  setForm((current) => ({
                    ...current,
                    documentAccentColorOverride: e.target.value.toLowerCase(),
                  }))
                }}
                className="h-9 w-12 cursor-pointer rounded border border-zinc-200 bg-white disabled:opacity-50"
              />
              <input
                type="text"
                value={form.documentAccentColorOverride ?? ''}
                placeholder={`Défaut : ${cardTheme.headerTo}`}
                disabled={!!loadError}
                onChange={(e) => {
                  setDirty(true)
                  setForm((current) => ({
                    ...current,
                    documentAccentColorOverride: e.target.value,
                  }))
                }}
                className="flex-1 px-2 py-1.5 text-xs font-mono border border-zinc-200 rounded-lg disabled:opacity-50"
              />
              <button
                type="button"
                disabled={!!loadError}
                onClick={() => {
                  setDirty(true)
                  setForm((current) => ({ ...current, documentAccentColorOverride: null }))
                }}
                className="text-[10px] text-zinc-500 underline disabled:opacity-50"
              >
                Réinitialiser
              </button>
            </div>
          </label>
          <label className="block text-xs font-medium text-zinc-600">
            Pied de page légal
            <textarea
              value={form.legalFooter ?? ''}
              onChange={(e) => {
                setDirty(true)
                setForm((current) => ({ ...current, legalFooter: e.target.value }))
              }}
              rows={3}
              maxLength={500}
              placeholder="Ex. École X — RCCM… · document officiel · ne pas modifier."
              disabled={!!loadError}
              className="mt-1 w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none disabled:opacity-50"
            />
          </label>
          <p className="text-[10px] text-zinc-400">
            Affiché en bas des reçus, rapports Z, synthèses, registres d&apos;appel, fiches d&apos;inscription et attestations.
          </p>
        </div>
      </div>

      <div className="p-5">
        <h3 className="text-sm font-semibold text-zinc-700 mb-1">Style de la carte élève</h3>
        <p className="text-xs text-zinc-500 mb-4">
          Choisissez un thème — appliqué à l&apos;aperçu, au PDF téléchargé et aux feuilles A4.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-4">
          {PRESET_KEYS.map((key) => {
            const preset = SCHOOL_CARD_THEME_PRESETS[key]
            const selected = cardTheme.preset === key
            return (
              <button
                key={key}
                type="button"
                disabled={!!loadError}
                onClick={() => applyPreset(key)}
                className={cn(
                  'rounded-xl border p-2.5 text-left transition-all disabled:opacity-50',
                  selected
                    ? 'border-emerald-500 ring-2 ring-emerald-200 bg-emerald-50/40'
                    : 'border-zinc-200 hover:border-zinc-300 bg-white',
                )}
              >
                <div
                  className="h-8 rounded-md mb-2"
                  style={{
                    background: `linear-gradient(115deg, ${preset.headerFrom}, ${preset.headerTo})`,
                  }}
                />
                <p className="text-xs font-semibold text-zinc-800">{preset.label}</p>
                <div className="mt-1.5 flex gap-1">
                  {[preset.headerFrom, preset.headerTo, preset.accent].map((c) => (
                    <span
                      key={c}
                      className="h-3 w-3 rounded-full border border-black/10"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </button>
            )
          })}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {(
            [
              ['headerFrom', 'En-tête (début)'],
              ['headerTo', 'En-tête (fin)'],
              ['accent', 'Accent'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block text-xs font-medium text-zinc-600">
              {label}
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="color"
                  value={cardTheme[key]}
                  disabled={!!loadError}
                  onChange={(e) => {
                    setDirty(true)
                    setCardTheme((t) => ({ ...t, [key]: e.target.value }))
                  }}
                  className="h-9 w-12 cursor-pointer rounded border border-zinc-200 bg-white disabled:opacity-50"
                />
                <input
                  type="text"
                  value={cardTheme[key]}
                  disabled={!!loadError}
                  onChange={(e) => {
                    const v = e.target.value.trim()
                    if (/^#[0-9a-fA-F]{6}$/.test(v)) {
                      setDirty(true)
                      setCardTheme((t) => ({ ...t, [key]: v.toLowerCase() }))
                    }
                  }}
                  className="flex-1 px-2 py-1.5 text-xs font-mono border border-zinc-200 rounded-lg disabled:opacity-50"
                />
              </div>
            </label>
          ))}
        </div>

        <div
          className="mt-4 rounded-lg overflow-hidden border border-zinc-200"
          style={{
            background: `linear-gradient(115deg, ${cardTheme.headerFrom}, ${cardTheme.headerTo})`,
          }}
        >
          <div className="px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-white uppercase tracking-wide">
                {form.name || 'Votre établissement'}
              </p>
              {form.devise ? (
                <p className="text-[9px] mt-0.5 text-white/90 italic">« {form.devise} »</p>
              ) : null}
              {form.slogan ? (
                <p className="text-[9px] mt-0.5" style={{ color: cardTheme.accent }}>
                  {form.slogan}
                </p>
              ) : (
                <p className="text-[10px] mt-0.5" style={{ color: cardTheme.accent }}>
                  Aperçu carte élève
                </p>
              )}
            </div>
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded"
              style={{ backgroundColor: cardTheme.accentSoft, color: cardTheme.ink }}
            >
              CR80
            </span>
          </div>
        </div>
      </div>
      </div>
      </div>

      <div className="px-5 py-3 flex justify-end border-t border-zinc-100">
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
