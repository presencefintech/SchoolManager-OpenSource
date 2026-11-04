'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Megaphone,
  RefreshCw,
  Send,
  Archive,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Eye,
  X,
} from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/api/client'
import { useClasses } from '@/lib/hooks/use-admin'
import {
  announcementsApi,
  type AnnouncementAudience,
  type AnnouncementListItem,
  type AnnouncementStatus,
} from '@/lib/admin/api/announcements.api'
import { useAuth } from '@/providers/auth-provider'
import { isItDesk } from '@/types/auth'

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
}

function StatusBadge({ status }: { status: AnnouncementStatus }) {
  const styles: Record<AnnouncementStatus, string> = {
    DRAFT: 'bg-zinc-100 text-zinc-700',
    PUBLISHED: 'bg-emerald-50 text-emerald-700',
    ARCHIVED: 'bg-amber-50 text-amber-800',
  }
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-semibold', styles[status])}>
      {status}
    </span>
  )
}

function AnnouncementDetailModal({
  item,
  onClose,
  onPublish,
  onArchive,
  busy,
  canManage = true,
}: {
  item: AnnouncementListItem
  onClose: () => void
  onPublish: () => void
  onArchive: () => void
  busy: boolean
  canManage?: boolean
}) {
  const recipients = item._count?.recipients ?? item.recipientCount ?? 0
  const sectionLabel =
    item.sectionId == null
      ? item.classId
        ? `Classe #${item.classId}`
        : 'Globale (école)'
      : item.section?.name
        ? `Section · ${item.section.name}`
        : `Section #${item.sectionId}`
  const authorLabel = item.createdBy
    ? `${item.createdBy.role === 'DIRECTOR' ? 'Directeur' : item.createdBy.role} · ${item.createdBy.firstName} ${item.createdBy.lastName}`
    : null

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col"
      >
        <div className="flex items-start justify-between gap-3 px-6 py-5 border-b border-zinc-100">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <StatusBadge status={item.status} />
              <span className="text-[11px] text-zinc-400">#{item.id}</span>
              {item.requiresAgreement && (
                <span className="text-[11px] font-medium text-amber-700">Accord requis</span>
              )}
            </div>
            <h2 className="text-base font-semibold text-zinc-900 leading-snug">{item.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 transition-colors flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-4 overflow-y-auto flex-1 space-y-4">
          <div className="flex flex-wrap gap-2 text-[11px] text-zinc-500">
            {authorLabel && (
              <span className="px-2 py-1 rounded-lg bg-sky-50 border border-sky-100 text-sky-800">
                {authorLabel}
              </span>
            )}
            <span className="px-2 py-1 rounded-lg bg-zinc-50 border border-zinc-100">{sectionLabel}</span>
            <span className="px-2 py-1 rounded-lg bg-zinc-50 border border-zinc-100">
              {item.audience}
            </span>
            <span className="px-2 py-1 rounded-lg bg-zinc-50 border border-zinc-100">
              {recipients} destinataire{recipients !== 1 ? 's' : ''}
            </span>
            {item.publishedAt && (
              <span className="px-2 py-1 rounded-lg bg-zinc-50 border border-zinc-100">
                Publié{' '}
                {new Date(item.publishedAt).toLocaleString('fr-FR', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            )}
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 mb-2">
              Message
            </p>
            <div className="rounded-xl border border-zinc-100 bg-zinc-50/60 px-4 py-3">
              <p className="text-sm text-zinc-800 whitespace-pre-wrap leading-relaxed">
                {item.body}
              </p>
            </div>
          </div>

          {item.engagement && (
            <p className="text-[11px] text-zinc-400">
              Health {Math.round(item.engagement.healthScore)}% ·{' '}
              {item.engagement.pendingReads} lectures pending
            </p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-zinc-100 flex flex-wrap gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50"
          >
            Fermer
          </button>
          {canManage && item.status === 'DRAFT' && (
            <button
              type="button"
              disabled={busy}
              onClick={onPublish}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
            >
              <Send size={13} /> Publier
            </button>
          )}
          {canManage && item.status !== 'ARCHIVED' && (
            <button
              type="button"
              disabled={busy}
              onClick={onArchive}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-zinc-200 text-sm text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
            >
              <Archive size={13} /> Archiver
            </button>
          )}
        </div>
      </motion.div>
    </div>
  )
}

export default function AnnouncementsPage() {
  const { user } = useAuth()
  const deskOnly = isItDesk(user?.role)
  const canManage = !deskOnly
  const canDraft = true
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<AnnouncementStatus | ''>('')
  const [authorFilter, setAuthorFilter] = useState<'' | 'DIRECTOR' | 'ADMIN'>('')
  const [selected, setSelected] = useState<AnnouncementListItem | null>(null)
  const [form, setForm] = useState({
    title: '',
    body: '',
    audience: 'ALL_PARENTS' as AnnouncementAudience,
    classId: '',
    requiresAgreement: false,
    publish: !deskOnly,
  })
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')
  const [previewCount, setPreviewCount] = useState<number | null>(null)

  const { data: classes = [] } = useClasses({ isActive: true })

  const listQuery = useQuery({
    queryKey: ['admin', 'announcements', statusFilter, authorFilter],
    queryFn: () =>
      announcementsApi.list({
        page: 1,
        limit: 50,
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(authorFilter ? { createdByRole: authorFilter } : {}),
      }),
    staleTime: 20_000,
  })

  const insightsQuery = useQuery({
    queryKey: ['admin', 'announcements', 'insights'],
    queryFn: () => announcementsApi.insights(),
    staleTime: 30_000,
  })

  const createMut = useMutation({
    mutationFn: announcementsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'announcements'] })
    },
  })

  const publishMut = useMutation({
    mutationFn: announcementsApi.publish,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'announcements'] }),
  })

  const archiveMut = useMutation({
    mutationFn: announcementsApi.archive,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'announcements'] }),
  })

  const items = listQuery.data?.items ?? []
  const insights = insightsQuery.data

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    setOk('')
    if (form.title.trim().length < 3 || form.body.trim().length < 1) {
      setErr('Titre (≥3) et corps sont requis.')
      return
    }
    if (form.audience === 'BY_CLASS' && !form.classId) {
      setErr('Sélectionnez une classe pour l’audience BY_CLASS.')
      return
    }
    try {
      const created = await createMut.mutateAsync({
        title: form.title.trim(),
        body: form.body.trim(),
        audience: form.audience,
        requiresAgreement: form.requiresAgreement,
        publish: deskOnly ? false : form.publish,
        ...(form.audience === 'BY_CLASS' && form.classId
          ? { classId: Number(form.classId) }
          : {}),
      })
      setOk(
        form.publish
          ? `Publié (#${created.id})${created.recipientCount != null ? ` · ${created.recipientCount} parents` : ''}`
          : `Brouillon enregistré (#${created.id})`
      )
      setForm({
        title: '',
        body: '',
        audience: 'ALL_PARENTS',
        classId: '',
        requiresAgreement: false,
        publish: !deskOnly,
      })
      setPreviewCount(null)
    } catch (error) {
      setErr(getApiErrorMessage(error))
    }
  }

  async function onPreview() {
    setErr('')
    try {
      if (form.audience === 'BY_CLASS' && !form.classId) {
        setErr('Sélectionnez une classe pour prévisualiser.')
        return
      }
      const result = await announcementsApi.preview({
        audience: form.audience,
        ...(form.audience === 'BY_CLASS' && form.classId
          ? { classId: Number(form.classId) }
          : {}),
      })
      setPreviewCount(result.recipientCount)
    } catch (error) {
      setErr(getApiErrorMessage(error))
    }
  }

  async function onPublish(item: AnnouncementListItem) {
    try {
      await publishMut.mutateAsync(item.id)
    } catch (error) {
      setErr(getApiErrorMessage(error))
    }
  }

  async function onArchive(item: AnnouncementListItem) {
    try {
      await archiveMut.mutateAsync(item.id)
    } catch (error) {
      setErr(getApiErrorMessage(error))
    }
  }

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <motion.div variants={fadeUp} initial="hidden" animate="show" className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
            <Megaphone className="text-orange-600" size={24} />
            Communiqués scolaires
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            {canManage
              ? 'Publiez des annonces parents · lecture + accord électronique · insights engagement'
              : 'Préparez un brouillon pour l’admin / le directeur · consultation des communiqués'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            listQuery.refetch()
            insightsQuery.refetch()
          }}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50"
        >
          <RefreshCw size={14} />
          Actualiser
        </button>
      </motion.div>

      {insights && (
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 md:grid-cols-4 gap-3"
        >
          {[
            { label: 'Annonces', value: insights.announcementCount, icon: Megaphone },
            { label: 'Health moyen', value: `${Math.round(insights.avgHealthScore)}%`, icon: BarChart3 },
            { label: 'Lectures pending', value: insights.totalPendingReads, icon: AlertTriangle },
            { label: 'Accords pending', value: insights.totalPendingAgreements, icon: CheckCircle },
          ].map((card) => (
            <div key={card.label} className="rounded-xl border border-zinc-200 bg-white p-4">
              <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
                <card.icon size={14} />
                {card.label}
              </div>
              <div className="text-xl font-semibold text-zinc-900">{card.value}</div>
            </div>
          ))}
        </motion.div>
      )}

      <div className={cn('grid gap-6', canDraft ? 'lg:grid-cols-5' : 'lg:grid-cols-1')}>
        {canDraft && (
        <motion.form
          onSubmit={onSubmit}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="lg:col-span-2 rounded-xl border border-zinc-200 bg-white p-5 space-y-4"
        >
          <h2 className="text-sm font-semibold text-zinc-800">
            {deskOnly ? 'Brouillon secrétariat' : 'Nouveau communiqué'}
          </h2>
          <div>
            <label className="text-xs font-medium text-zinc-600">Titre</label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="mt-1 w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Réunion parents…"
              maxLength={200}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-600">Message</label>
            <textarea
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              rows={5}
              className="mt-1 w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Contenu du communiqué…"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-600">Audience</label>
            <select
              value={form.audience}
              onChange={(e) => {
                setPreviewCount(null)
                setForm((f) => ({
                  ...f,
                  audience: e.target.value as AnnouncementAudience,
                  classId: '',
                }))
              }}
              className="mt-1 w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white"
            >
              <option value="ALL_PARENTS">Tous les parents de l&apos;école</option>
              <option value="BY_CLASS">Parents d&apos;une classe</option>
            </select>
          </div>
          {form.audience === 'BY_CLASS' && (
            <div>
              <label className="text-xs font-medium text-zinc-600">Classe</label>
              <select
                value={form.classId}
                onChange={(e) => {
                  setPreviewCount(null)
                  setForm((f) => ({ ...f, classId: e.target.value }))
                }}
                className="mt-1 w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white"
              >
                <option value="">— Sélectionner —</option>
                {classes.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onPreview}
              className="text-xs font-medium text-orange-700 hover:underline"
            >
              Estimer destinataires
            </button>
            {previewCount != null && (
              <span className="text-xs font-semibold text-zinc-700">
                {previewCount} parent{previewCount > 1 ? 's' : ''} actif{previewCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={form.requiresAgreement}
              onChange={(e) => setForm((f) => ({ ...f, requiresAgreement: e.target.checked }))}
            />
            Accord électronique requis
          </label>
          {canManage && (
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={form.publish}
              onChange={(e) => setForm((f) => ({ ...f, publish: e.target.checked }))}
            />
            Publier immédiatement (+ push)
          </label>
          )}
          {deskOnly && (
            <p className="text-xs text-zinc-500 bg-zinc-50 rounded-lg px-3 py-2">
              Le guichet enregistre un brouillon. Un administrateur ou un directeur publie ensuite.
            </p>
          )}
          {err && <p className="text-xs text-red-600">{err}</p>}
          {ok && <p className="text-xs text-emerald-600">{ok}</p>}
          <button
            type="submit"
            disabled={createMut.isPending}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
          >
            <Send size={14} />
            {createMut.isPending ? 'Envoi…' : deskOnly || !form.publish ? 'Enregistrer brouillon' : 'Publier'}
          </button>
        </motion.form>
        )}

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className={cn(
            'rounded-xl border border-zinc-200 bg-white overflow-hidden',
            canDraft ? 'lg:col-span-3' : 'lg:col-span-1',
          )}
        >
          <div className="px-4 py-3 border-b border-zinc-100 space-y-2">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-sm font-semibold text-zinc-800">
                Historique ({listQuery.data?.total ?? items.length})
              </h2>
              <div className="flex gap-1 flex-wrap">
                {(['', 'DRAFT', 'PUBLISHED', 'ARCHIVED'] as const).map((s) => (
                  <button
                    key={s || 'ALL'}
                    type="button"
                    onClick={() => setStatusFilter(s)}
                    className={cn(
                      'px-2.5 py-1 rounded-full text-[11px] font-medium border',
                      statusFilter === s
                        ? 'bg-zinc-900 text-white border-zinc-900'
                        : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
                    )}
                  >
                    {s || 'Tous'}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-1 flex-wrap">
              {(
                [
                  { value: '' as const, label: 'Tous auteurs' },
                  { value: 'DIRECTOR' as const, label: 'Directeurs' },
                  { value: 'ADMIN' as const, label: 'Admin' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value || 'ALL_AUTHOR'}
                  type="button"
                  onClick={() => setAuthorFilter(opt.value)}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-[11px] font-medium border',
                    authorFilter === opt.value
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {listQuery.isLoading ? (
            <div className="p-8 text-center text-sm text-zinc-400">Chargement…</div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-sm text-zinc-400">Aucun communiqué</div>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {items.map((item) => {
                const recipients = item._count?.recipients ?? item.recipientCount ?? 0
                const health = item.engagement?.healthScore
                return (
                  <li key={item.id} className="px-4 py-3 hover:bg-zinc-50/80">
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setSelected(item)}
                        className="min-w-0 text-left flex-1 group"
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <StatusBadge status={item.status} />
                          <span className="text-[11px] text-zinc-400">#{item.id}</span>
                          {item.createdBy && (
                            <span
                              className={cn(
                                'text-[11px] font-medium px-1.5 py-0.5 rounded-md',
                                item.createdBy.role === 'DIRECTOR'
                                  ? 'bg-sky-50 text-sky-700'
                                  : 'bg-zinc-100 text-zinc-600'
                              )}
                            >
                              {item.createdBy.role === 'DIRECTOR' ? 'Directeur' : item.createdBy.role}
                              {' · '}
                              {item.createdBy.firstName} {item.createdBy.lastName}
                            </span>
                          )}
                          {item.section?.name && (
                            <span className="text-[11px] text-zinc-500">
                              Section · {item.section.name}
                            </span>
                          )}
                          {item.requiresAgreement && (
                            <span className="text-[11px] font-medium text-amber-700">Accord requis</span>
                          )}
                        </div>
                        <p className="mt-1 text-sm font-semibold text-zinc-900 group-hover:text-emerald-700 truncate">
                          {item.title}
                        </p>
                        <p className="text-xs text-zinc-500 line-clamp-2 mt-0.5">{item.body}</p>
                        <p className="text-[11px] text-emerald-700 mt-1.5 inline-flex items-center gap-1 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                          <Eye size={12} /> Lire la suite
                        </p>
                        <p className="text-[11px] text-zinc-400 mt-1">
                          {recipients} destinataire{recipients > 1 ? 's' : ''}
                          {health != null ? ` · health ${Math.round(health)}%` : ''}
                          {item.engagement
                            ? ` · ${item.engagement.pendingReads} lectures pending`
                            : ''}
                        </p>
                      </button>
                      <div className="flex flex-col gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setSelected(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-100"
                        >
                          <Eye size={12} /> Lire
                        </button>
                        {canManage && item.status === 'DRAFT' && (
                          <button
                            type="button"
                            onClick={() => onPublish(item)}
                            disabled={publishMut.isPending}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            <Send size={12} /> Publier
                          </button>
                        )}
                        {canManage && item.status !== 'ARCHIVED' && (
                          <button
                            type="button"
                            onClick={() => onArchive(item)}
                            disabled={archiveMut.isPending}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
                          >
                            <Archive size={12} /> Archiver
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}

          {selected && (
            <AnnouncementDetailModal
              item={selected}
              onClose={() => setSelected(null)}
              canManage={canManage}
              busy={publishMut.isPending || archiveMut.isPending}
              onPublish={async () => {
                await onPublish(selected)
                setSelected(null)
              }}
              onArchive={async () => {
                await onArchive(selected)
                setSelected(null)
              }}
            />
          )}

          {insights?.underperforming && insights.underperforming.length > 0 && (
            <div className="border-t border-zinc-100 px-4 py-3 bg-zinc-50/50">
              <p className="text-xs font-semibold text-zinc-600 mb-2">À risque (health bas)</p>
              <ul className="space-y-1">
                {insights.underperforming.map((u) => (
                  <li key={u.id} className="text-xs text-zinc-600 flex justify-between gap-2">
                    <span className="truncate">#{u.id} {u.title}</span>
                    <span className="font-medium text-orange-700">{Math.round(u.healthScore)}%</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
