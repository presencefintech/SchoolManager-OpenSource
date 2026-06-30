'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, Send, Users, Plus, X, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { adminEmailApi } from '@/lib/admin/api'
import { getApiErrorMessage } from '@/lib/api/client'
import { StudentSearchField } from '@/components/admin/shared/student-search-field'

const fadeUp = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.22 } } }

const TEMPLATES = [
  { id: 'welcome',         label: 'Bienvenue' },
  { id: 'payment_receipt', label: 'Reçu de paiement' },
  { id: 'absence_alert',   label: 'Alerte absence' },
  { id: 'fee_reminder',    label: 'Rappel frais scolaires' },
  { id: 'report_card',     label: 'Bulletins de notes' },
  { id: 'event_invite',    label: 'Invitation événement' },
]

export default function EmailPage() {
  const [templateId, setTemplateId] = useState('')
  const [subject, setSubject] = useState('')
  const [recipientIds, setRecipientIds] = useState<number[]>([])
  const [variables, setVariables] = useState<{ key: string; value: string }[]>([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null)

  const inputCls = 'w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 bg-white'

  function addRecipient(id: number) {
    if (id > 0 && !recipientIds.includes(id)) setRecipientIds(prev => [...prev, id])
  }

  function removeRecipient(id: number) {
    setRecipientIds(prev => prev.filter(r => r !== id))
  }

  function addVariable() {
    setVariables(prev => [...prev, { key: '', value: '' }])
  }

  function updateVar(i: number, field: 'key' | 'value', val: string) {
    setVariables(prev => prev.map((v, idx) => idx === i ? { ...v, [field]: val } : v))
  }

  function removeVar(i: number) {
    setVariables(prev => prev.filter((_, idx) => idx !== i))
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!templateId) { setError('Choisissez un template'); return }
    if (recipientIds.length === 0) { setError('Ajoutez au moins un destinataire'); return }
    setError('')
    setResult(null)
    setSending(true)
    try {
      const vars = variables.reduce((acc, v) => {
        if (v.key) acc[v.key] = v.value
        return acc
      }, {} as Record<string, string>)

      const res = await adminEmailApi.sendTemplate({
        templateId,
        recipientIds,
        subject: subject || undefined,
        variables: Object.keys(vars).length > 0 ? vars : undefined,
      })
      setResult(res)
      setRecipientIds([])
      setVariables([])
      setSubject('')
      setTemplateId('')
    } catch (err) { setError(getApiErrorMessage(err)) }
    finally { setSending(false) }
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb]">
      <div className="bg-white border-b border-zinc-200">
        <div className="max-w-5xl mx-auto px-8 py-5">
          <h1 className="text-2xl font-semibold text-zinc-900">Emails</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Envoyez des emails basés sur des templates à vos élèves et familles</p>
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

          <form onSubmit={handleSend} className="space-y-5">
            {/* Template */}
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">Template</label>
              <select value={templateId} onChange={e => setTemplateId(e.target.value)} className={inputCls}>
                <option value="">— Choisir un template —</option>
                {TEMPLATES.map(t => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Sujet */}
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">Sujet (optionnel)</label>
              <input value={subject} onChange={e => setSubject(e.target.value)}
                placeholder="Laissez vide pour utiliser le sujet du template" className={inputCls} />
            </div>

            {/* Destinataires */}
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">Destinataires</label>
              <StudentSearchField
                studentId={0}
                onSelect={addRecipient}
                label=""
                placeholder="Rechercher un élève…"
              />
              {recipientIds.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {recipientIds.map(id => (
                    <span key={id}
                      className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 font-medium">
                      Élève #{id}
                      <button type="button" onClick={() => removeRecipient(id)} className="hover:text-red-600 transition-colors">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Variables */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-zinc-500">Variables du template</label>
                <button type="button" onClick={addVariable}
                  className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium">
                  <Plus size={12} /> Ajouter
                </button>
              </div>
              {variables.length > 0 && (
                <div className="space-y-2">
                  {variables.map((v, i) => (
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

            {result && (
              <div className="flex items-start gap-2 px-3 py-3 rounded-lg bg-emerald-50 border border-emerald-100">
                <CheckCircle size={14} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-emerald-700">Emails envoyés</p>
                  <p className="text-xs text-emerald-600 mt-0.5">
                    {result.sent} envoyé{result.sent !== 1 ? 's' : ''}
                    {result.failed > 0 && ` · ${result.failed} échec${result.failed !== 1 ? 's' : ''}`}
                  </p>
                </div>
              </div>
            )}

            <div className="pt-1">
              <button type="submit" disabled={sending}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors">
                <Send size={14} />
                {sending ? 'Envoi…' : `Envoyer${recipientIds.length > 0 ? ` à ${recipientIds.length} destinataire${recipientIds.length > 1 ? 's' : ''}` : ''}`}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  )
}
