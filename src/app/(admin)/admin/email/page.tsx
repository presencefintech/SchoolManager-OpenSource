'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, Send, Plus, X, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { adminEmailApi } from '@/lib/admin/api'
import { getApiErrorMessage } from '@/lib/api/client'
import { getAuthSchoolId, getAuthToken } from '@/lib/api/auth-storage'

function resolveSchoolId(): number | null {
  const stored = getAuthSchoolId()
  if (stored) return Number(stored)
  const token = getAuthToken()
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return typeof payload.schoolId === 'number' ? payload.schoolId : null
  } catch { return null }
}

const fadeUp = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.22 } } }

const TEMPLATES = [
  { name: 'welcome',         label: 'Bienvenue' },
  { name: 'payment_receipt', label: 'Reçu de paiement' },
  { name: 'absence_alert',   label: 'Alerte absence' },
  { name: 'fee_reminder',    label: 'Rappel frais scolaires' },
  { name: 'report_card',     label: 'Bulletins de notes' },
  { name: 'event_invite',    label: 'Invitation événement' },
]

const CATEGORIES = [
  { value: 'TRANSACTIONAL', label: 'Transactionnel' },
  { value: 'SYSTEM',        label: 'Système' },
  { value: 'SECURITY',      label: 'Sécurité' },
  { value: 'MARKETING',     label: 'Marketing' },
]

export default function EmailPage() {
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [templateName, setTemplateName] = useState('')
  const [category, setCategory] = useState<'TRANSACTIONAL' | 'SYSTEM' | 'SECURITY' | 'MARKETING'>('SYSTEM')
  const [templateData, setTemplateData] = useState<{ key: string; value: string }[]>([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const inputCls = 'w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 bg-white'

  function addVar() {
    setTemplateData(prev => [...prev, { key: '', value: '' }])
  }

  function updateVar(i: number, field: 'key' | 'value', val: string) {
    setTemplateData(prev => prev.map((v, idx) => idx === i ? { ...v, [field]: val } : v))
  }

  function removeVar(i: number) {
    setTemplateData(prev => prev.filter((_, idx) => idx !== i))
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!to) { setError('Entrez une adresse email destinataire'); return }
    if (!subject) { setError('Le sujet est requis'); return }
    if (!templateName) { setError('Choisissez un template'); return }
    const schoolId = resolveSchoolId()
    if (!schoolId) { setError('Impossible de récupérer l\'établissement'); return }
    setError('')
    setSuccess(false)
    setSending(true)
    try {
      const data = templateData.reduce((acc, v) => {
        if (v.key) acc[v.key] = v.value
        return acc
      }, {} as Record<string, unknown>)

      await adminEmailApi.sendTemplate({
        to,
        subject,
        templateName,
        category,
        schoolId: Number(schoolId),
        templateData: Object.keys(data).length > 0 ? data : undefined,
      })
      setSuccess(true)
      setTo('')
      setSubject('')
      setTemplateName('')
      setTemplateData([])
    } catch (err) { setError(getApiErrorMessage(err)) }
    finally { setSending(false) }
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb]">
      <div className="bg-white border-b border-zinc-200">
        <div className="max-w-5xl mx-auto px-8 py-5">
          <h1 className="text-2xl font-semibold text-zinc-900">Emails</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Envoyez des emails basés sur des templates</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-8">
        <motion.div variants={fadeUp} initial="hidden" animate="show"
          className="bg-white rounded-2xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-6 max-w-2xl">

          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
              <Mail size={14} className="text-blue-600" />
            </div>
            <h2 className="text-sm font-semibold text-zinc-900">Composer un email</h2>
          </div>

          <form onSubmit={handleSend} className="space-y-4">
            {/* Destinataire */}
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">Destinataire</label>
              <input
                type="email"
                value={to}
                onChange={e => setTo(e.target.value)}
                placeholder="parent@exemple.com"
                className={inputCls}
                required
              />
            </div>

            {/* Sujet */}
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">Sujet</label>
              <input
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Objet de l'email"
                className={inputCls}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Template */}
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1.5">Template</label>
                <select value={templateName} onChange={e => setTemplateName(e.target.value)} className={inputCls} required>
                  <option value="">— Choisir —</option>
                  {TEMPLATES.map(t => (
                    <option key={t.name} value={t.name}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* Catégorie */}
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1.5">Catégorie</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as typeof category)}
                  className={inputCls}
                >
                  {CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Variables du template */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-zinc-500">Variables du template</label>
                <button type="button" onClick={addVar}
                  className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium">
                  <Plus size={12} /> Ajouter
                </button>
              </div>
              {templateData.length > 0 && (
                <div className="space-y-2">
                  {templateData.map((v, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input value={v.key} onChange={e => updateVar(i, 'key', e.target.value)}
                        placeholder="Clé (ex: nom_eleve)" className={cn(inputCls, 'flex-1')} />
                      <input value={v.value} onChange={e => updateVar(i, 'value', e.target.value)}
                        placeholder="Valeur" className={cn(inputCls, 'flex-1')} />
                      <button type="button" onClick={() => removeVar(i)}
                        className="text-zinc-300 hover:text-red-500 transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-100">
                <X size={13} className="text-red-500 flex-shrink-0" />
                <p className="text-xs text-red-700">{error}</p>
              </div>
            )}

            {success && (
              <div className="flex items-start gap-2 px-3 py-3 rounded-lg bg-emerald-50 border border-emerald-100">
                <CheckCircle size={14} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-emerald-700">Email envoyé avec succès</p>
                </div>
              </div>
            )}

            <div className="pt-1">
              <button type="submit" disabled={sending}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors">
                <Send size={14} />
                {sending ? 'Envoi…' : 'Envoyer'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  )
}
