'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Wrench, RefreshCw, Search, QrCode, Upload, Loader2,
  CheckCircle2, AlertCircle, FileText, ScanLine, Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { bankApi } from '@/lib/superAdmin/api/bank.api'
import { qrcodeApi } from '@/lib/superAdmin/api/qrcode.api'
import { pdfApi } from '@/lib/superAdmin/api/pdf.api'
import { filesApi } from '@/lib/superAdmin/api/files.api'
import type { BankSyncResult, BankInspectResult, QRTestResult, QRSupportResult } from '@/types/super-admin'

type Feedback = { type: 'success' | 'error'; message: string } | null

const CARD = 'bg-white rounded-2xl border border-zinc-200 shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-7'
const INPUT = 'w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 placeholder:text-zinc-300'
const LABEL = 'block text-xs font-medium text-zinc-500 mb-1.5'
const BTN = 'flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl disabled:opacity-40 transition-colors'

function CardTitle({ icon: Icon, title, desc }: { icon: React.ElementType; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <div className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center flex-shrink-0">
        <Icon size={16} className="text-zinc-500" />
      </div>
      <div>
        <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
        <p className="text-xs text-zinc-400 mt-0.5">{desc}</p>
      </div>
    </div>
  )
}

function FeedbackBanner({ state }: { state: Feedback }) {
  if (!state) return null
  return (
    <div className={cn(
      'flex items-start gap-2 rounded-xl px-4 py-3 text-sm mt-3',
      state.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
    )}>
      {state.type === 'success' ? <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0" /> : <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />}
      {state.message}
    </div>
  )
}

export default function OutilsPage() {

  /* ── Bank force-sync ────────────────────────────────────────────── */
  const [syncPaymentId, setSyncPaymentId] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<BankSyncResult | null>(null)
  const [syncFeedback, setSyncFeedback] = useState<Feedback>(null)

  /* ── Bank inspect ───────────────────────────────────────────────── */
  const [inspectRef, setInspectRef] = useState('')
  const [inspecting, setInspecting] = useState(false)
  const [inspectResult, setInspectResult] = useState<BankInspectResult | null>(null)
  const [inspectFeedback, setInspectFeedback] = useState<Feedback>(null)

  /* ── QR test ────────────────────────────────────────────────────── */
  const [qrPayload, setQrPayload] = useState('')
  const [testingQr, setTestingQr] = useState(false)
  const [qrTestResult, setQrTestResult] = useState<QRTestResult | null>(null)
  const [qrFeedback, setQrFeedback] = useState<Feedback>(null)

  /* ── QR support ─────────────────────────────────────────────────── */
  const [supportStudentId, setSupportStudentId] = useState('')
  const [generatingQr, setGeneratingQr] = useState(false)
  const [supportResult, setSupportResult] = useState<QRSupportResult | null>(null)
  const [supportFeedback, setSupportFeedback] = useState<Feedback>(null)

  /* ── PDF receipt ────────────────────────────────────────────────── */
  const [receiptPaymentId, setReceiptPaymentId] = useState('')
  const [downloadingReceipt, setDownloadingReceipt] = useState(false)
  const [receiptFeedback, setReceiptFeedback] = useState<Feedback>(null)

  /* ── File upload ────────────────────────────────────────────────── */
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadFeedback, setUploadFeedback] = useState<Feedback>(null)
  const [uploadedPublicId, setUploadedPublicId] = useState('')

  /* ── File delete ────────────────────────────────────────────────── */
  const [deletePublicId, setDeletePublicId] = useState('')
  const [deletingFile, setDeletingFile] = useState(false)
  const [deleteFeedback, setDeleteFeedback] = useState<Feedback>(null)

  /* ── Audit PDF global ───────────────────────────────────────────── */
  const [downloadingAuditPdf, setDownloadingAuditPdf] = useState(false)
  const [auditPdfFeedback, setAuditPdfFeedback] = useState<Feedback>(null)

  /* ── handlers ───────────────────────────────────────────────────── */

  const handleForceSync = async () => {
    if (!syncPaymentId) return
    setSyncing(true); setSyncFeedback(null); setSyncResult(null)
    try {
      const r = await bankApi.forceSync(Number(syncPaymentId))
      setSyncResult(r)
      setSyncFeedback({ type: 'success', message: r.message ?? 'Synchronisation forcée' })
    } catch {
      setSyncFeedback({ type: 'error', message: 'Erreur lors de la synchronisation' })
    } finally { setSyncing(false) }
  }

  const handleInspect = async () => {
    if (!inspectRef) return
    setInspecting(true); setInspectFeedback(null); setInspectResult(null)
    try {
      const r = await bankApi.inspect(inspectRef)
      setInspectResult(r)
      setSyncFeedback(null)
    } catch {
      setInspectFeedback({ type: 'error', message: 'Référence introuvable' })
    } finally { setInspecting(false) }
  }

  const handleQrTest = async () => {
    if (!qrPayload) return
    setTestingQr(true); setQrFeedback(null); setQrTestResult(null)
    try {
      const r = await qrcodeApi.test(qrPayload)
      setQrTestResult(r)
    } catch {
      setQrFeedback({ type: 'error', message: 'Erreur lors du test QR' })
    } finally { setTestingQr(false) }
  }

  const handleQrSupport = async () => {
    if (!supportStudentId) return
    setGeneratingQr(true); setSupportFeedback(null); setSupportResult(null)
    try {
      const r = await qrcodeApi.generateSupport(Number(supportStudentId))
      setSupportResult(r)
      setSupportFeedback({ type: 'success', message: 'QR de support généré' })
    } catch {
      setSupportFeedback({ type: 'error', message: 'Erreur lors de la génération' })
    } finally { setGeneratingQr(false) }
  }

  const handleReceiptDownload = async () => {
    if (!receiptPaymentId) return
    setDownloadingReceipt(true); setReceiptFeedback(null)
    try {
      const blob = await pdfApi.getPaymentReceipt(Number(receiptPaymentId))
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `recu_paiement_${receiptPaymentId}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      setReceiptFeedback({ type: 'success', message: 'PDF téléchargé' })
    } catch {
      setReceiptFeedback({ type: 'error', message: 'Erreur lors du téléchargement' })
    } finally { setDownloadingReceipt(false) }
  }

  const handleUpload = async () => {
    if (!uploadFile) return
    setUploading(true); setUploadFeedback(null)
    try {
      const fd = new FormData()
      fd.append('file', uploadFile)
      const r = await filesApi.upload(fd)
      setUploadFeedback({ type: 'success', message: `Fichier uploadé : ${r.url ?? r.secure_url ?? '✓'}` })
      setUploadFile(null)
      if (r.publicId) setUploadedPublicId(r.publicId)
    } catch {
      setUploadFeedback({ type: 'error', message: 'Erreur lors de l\'upload' })
    } finally { setUploading(false) }
  }

  const handleDeleteFile = async () => {
    if (!deletePublicId) return
    setDeletingFile(true); setDeleteFeedback(null)
    try {
      const r = await filesApi.deleteFile(deletePublicId)
      setDeleteFeedback({ type: 'success', message: r.message ?? 'Fichier supprimé' })
      setDeletePublicId('')
    } catch {
      setDeleteFeedback({ type: 'error', message: 'Erreur lors de la suppression' })
    } finally { setDeletingFile(false) }
  }

  const handleAuditPdfDownload = async () => {
    setDownloadingAuditPdf(true); setAuditPdfFeedback(null)
    try {
      const blob = await pdfApi.getGlobalAuditPdf()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'audit_global.pdf'
      a.click()
      URL.revokeObjectURL(url)
      setAuditPdfFeedback({ type: 'success', message: 'PDF téléchargé' })
    } catch {
      setAuditPdfFeedback({ type: 'error', message: 'Erreur lors du téléchargement' })
    } finally { setDownloadingAuditPdf(false) }
  }

  return (
    <div className="min-h-screen bg-zinc-50">

      {/* Header */}
      <motion.div className="bg-white border-b border-zinc-200" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <div className="max-w-6xl mx-auto px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center">
              <Wrench size={17} className="text-zinc-500" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold text-zinc-900 tracking-tight">Outils SA</h1>
              <p className="text-sm text-zinc-400 mt-0.5">Banque, QR, PDF et fichiers — outils techniques super-admin</p>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="max-w-6xl mx-auto px-8 py-8 grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* ── Bank force-sync ───────────────────────────────────────────── */}
        <div className={CARD}>
          <CardTitle icon={RefreshCw} title="Force Sync bancaire" desc="Forcer la synchronisation d'un paiement" />
          <div className="space-y-3">
            <div>
              <label className={LABEL}>ID du paiement</label>
              <input type="number" placeholder="Ex: 247" value={syncPaymentId}
                onChange={e => setSyncPaymentId(e.target.value)} className={INPUT} />
            </div>
            <button
              onClick={handleForceSync}
              disabled={syncing || !syncPaymentId}
              className={cn(BTN, 'bg-zinc-900 text-white hover:bg-zinc-700')}
            >
              {syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Forcer la sync
            </button>
            <FeedbackBanner state={syncFeedback} />
            {syncResult && (
              <div className="text-xs text-zinc-500 bg-zinc-50 border border-zinc-100 rounded-xl px-3 py-2 space-y-0.5">
                {syncResult.status && <p>Statut : <span className="font-mono">{syncResult.status}</span></p>}
                {syncResult.updatedAt && <p>Mis à jour : {new Date(syncResult.updatedAt).toLocaleString('fr-FR')}</p>}
              </div>
            )}
          </div>
        </div>

        {/* ── Bank inspect ─────────────────────────────────────────────── */}
        <div className={CARD}>
          <CardTitle icon={Search} title="Inspection référence bancaire" desc="Vérifier le statut d'une transaction provider" />
          <div className="space-y-3">
            <div>
              <label className={LABEL}>Référence provider</label>
              <input type="text" placeholder="Ex: TXN_ABC123" value={inspectRef}
                onChange={e => setInspectRef(e.target.value)} className={INPUT} />
            </div>
            <button
              onClick={handleInspect}
              disabled={inspecting || !inspectRef}
              className={cn(BTN, 'bg-zinc-900 text-white hover:bg-zinc-700')}
            >
              {inspecting ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              Inspecter
            </button>
            <FeedbackBanner state={inspectFeedback} />
            {inspectResult && (
              <div className="text-xs bg-zinc-50 border border-zinc-100 rounded-xl px-3 py-2.5 space-y-1.5">
                {Object.entries(inspectResult).filter(([, v]) => v !== undefined).map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-zinc-400 capitalize">{k}</span>
                    <span className="font-mono text-zinc-700 text-right">{String(v)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── QR Code test ─────────────────────────────────────────────── */}
        <div className={CARD}>
          <CardTitle icon={ScanLine} title="Test QR Code" desc="Décoder et valider un payload QR de présence" />
          <div className="space-y-3">
            <div>
              <label className={LABEL}>Payload QR (base64 ou JSON)</label>
              <textarea rows={3} placeholder="Collez le contenu QR ici…" value={qrPayload}
                onChange={e => setQrPayload(e.target.value)}
                className={cn(INPUT, 'resize-none')} />
            </div>
            <button
              onClick={handleQrTest}
              disabled={testingQr || !qrPayload}
              className={cn(BTN, 'bg-zinc-900 text-white hover:bg-zinc-700')}
            >
              {testingQr ? <Loader2 size={14} className="animate-spin" /> : <ScanLine size={14} />}
              Tester
            </button>
            <FeedbackBanner state={qrFeedback} />
            {qrTestResult && (
              <div className={cn(
                'text-xs rounded-xl px-3 py-2.5',
                qrTestResult.valid ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
              )}>
                <p className="font-semibold mb-1">{qrTestResult.valid ? '✓ QR valide' : '✗ QR invalide'}</p>
                {qrTestResult.error && <p>{qrTestResult.error}</p>}
                {qrTestResult.decoded && (
                  <pre className="mt-2 font-mono text-[10px] overflow-x-auto">
                    {JSON.stringify(qrTestResult.decoded, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── QR Code support ──────────────────────────────────────────── */}
        <div className={CARD}>
          <CardTitle icon={QrCode} title="QR de support" desc="Générer un QR de contournement pour un élève" />
          <div className="space-y-3">
            <div>
              <label className={LABEL}>ID élève</label>
              <input type="number" placeholder="Ex: 123" value={supportStudentId}
                onChange={e => setSupportStudentId(e.target.value)} className={INPUT} />
            </div>
            <button
              onClick={handleQrSupport}
              disabled={generatingQr || !supportStudentId}
              className={cn(BTN, 'bg-indigo-600 text-white hover:bg-indigo-700')}
            >
              {generatingQr ? <Loader2 size={14} className="animate-spin" /> : <QrCode size={14} />}
              Générer QR
            </button>
            <FeedbackBanner state={supportFeedback} />
            {supportResult?.qrCode && (
              <div className="text-xs bg-zinc-50 border border-zinc-100 rounded-xl px-3 py-2.5">
                <p className="text-zinc-400 mb-1">QR Code :</p>
                <pre className="font-mono text-zinc-700 break-all whitespace-pre-wrap text-[10px]">{supportResult.qrCode}</pre>
                {supportResult.expiresAt && (
                  <p className="text-zinc-300 mt-1.5">Expire : {new Date(supportResult.expiresAt).toLocaleString('fr-FR')}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── PDF Reçu ─────────────────────────────────────────────────── */}
        <div className={CARD}>
          <CardTitle icon={FileText} title="Reçu PDF paiement" desc="Télécharger le reçu PDF d'un paiement" />
          <div className="space-y-3">
            <div>
              <label className={LABEL}>ID paiement</label>
              <input type="number" placeholder="Ex: 312" value={receiptPaymentId}
                onChange={e => setReceiptPaymentId(e.target.value)} className={INPUT} />
            </div>
            <button
              onClick={handleReceiptDownload}
              disabled={downloadingReceipt || !receiptPaymentId}
              className={cn(BTN, 'bg-zinc-900 text-white hover:bg-zinc-700')}
            >
              {downloadingReceipt ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
              Télécharger PDF
            </button>
            <FeedbackBanner state={receiptFeedback} />
          </div>
        </div>

        {/* ── PDF Audit global ─────────────────────────────────────────── */}
        <div className={CARD}>
          <CardTitle icon={FileText} title="Audit PDF global" desc="Télécharger le rapport d'audit global (toutes écoles)" />
          <div className="space-y-3">
            <button
              onClick={handleAuditPdfDownload}
              disabled={downloadingAuditPdf}
              className={cn(BTN, 'bg-zinc-900 text-white hover:bg-zinc-700')}
            >
              {downloadingAuditPdf ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
              Télécharger l'audit global
            </button>
            <FeedbackBanner state={auditPdfFeedback} />
          </div>
        </div>

        {/* ── Upload fichier ────────────────────────────────────────────── */}
        <div className={CARD}>
          <CardTitle icon={Upload} title="Upload fichier Cloudinary" desc="Envoyer un fichier manuellement vers le stockage" />
          <div className="space-y-3">
            <div>
              <label className={LABEL}>Fichier</label>
              <input
                type="file"
                onChange={e => setUploadFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-zinc-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200 transition-all"
              />
              {uploadFile && <p className="text-xs text-zinc-400 mt-1 truncate">{uploadFile.name}</p>}
            </div>
            <button
              onClick={handleUpload}
              disabled={uploading || !uploadFile}
              className={cn(BTN, 'bg-zinc-900 text-white hover:bg-zinc-700')}
            >
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              Uploader
            </button>
            <FeedbackBanner state={uploadFeedback} />
          </div>
        </div>

        {/* ── Supprimer fichier ────────────────────────────────────────── */}
        <div className={CARD}>
          <CardTitle icon={Trash2} title="Supprimer fichier Cloudinary" desc="Supprimer un fichier par son Public ID" />
          <div className="space-y-3">
            <div>
              <label className={LABEL}>Public ID</label>
              <input type="text" placeholder="Ex: documents/abc123" value={deletePublicId}
                onChange={e => setDeletePublicId(e.target.value)} className={INPUT} />
              {uploadedPublicId && (
                <button
                  type="button"
                  onClick={() => setDeletePublicId(uploadedPublicId)}
                  className="text-xs text-indigo-600 hover:text-indigo-700 mt-1"
                >
                  Utiliser le dernier fichier uploadé ({uploadedPublicId})
                </button>
              )}
            </div>
            <button
              onClick={handleDeleteFile}
              disabled={deletingFile || !deletePublicId}
              className={cn(BTN, 'bg-red-600 text-white hover:bg-red-700')}
            >
              {deletingFile ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              Supprimer
            </button>
            <FeedbackBanner state={deleteFeedback} />
          </div>
        </div>

      </div>
    </div>
  )
}
