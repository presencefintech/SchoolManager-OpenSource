import { formatMoney } from '@/lib/finance/currency'
import type { StudentsFinancialPrintReport } from '@/types/finance'

/** Ouvre une vue imprimable du registre filtré (montants uniquement si le rôle y a droit). */
export function openStudentsFinancialPrintReport(report: StudentsFinancialPrintReport) {
  const w = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700')
  if (!w) return

  const hideAmounts = Boolean(report.amountsHidden)

  const rows = report.rows
    .map((r) => hideAmounts
      ? `<tr>
        <td>${r.matricule}</td>
        <td>${r.eleve}</td>
        <td>${r.classe}</td>
        <td>${r.section}</td>
        <td>${r.option}</td>
        <td>${r.statut}</td>
      </tr>`
      : `<tr>
        <td>${r.matricule}</td>
        <td>${r.eleve}</td>
        <td>${r.classe}</td>
        <td>${r.section}</td>
        <td>${r.option}</td>
        <td class="num">${formatMoney(r.fraisTotaux ?? 0)}</td>
        <td class="num">${formatMoney(r.dejaPaye ?? 0)}</td>
        <td class="num">${formatMoney(r.solde ?? 0)}</td>
        <td>${r.statut}</td>
      </tr>`)
    .join('')

  const contactBits = [
    report.schoolAddress,
    report.schoolPhone ? `Tél. ${report.schoolPhone}` : null,
    report.schoolEmail,
  ].filter(Boolean)

  const title = hideAmounts ? 'Liste en ordre / dette' : 'Situation financière'

  w.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>${title} — ${report.schoolName}</title>
<style>
  body{font-family:system-ui,sans-serif;padding:24px;color:#18181b;font-size:12px}
  h1{font-size:18px;margin:0 0 4px} .meta{color:#71717a;margin-bottom:16px}
  table{width:100%;border-collapse:collapse} th,td{border:1px solid #e4e4e7;padding:6px 8px;text-align:left}
  th{background:#f4f4f5;font-size:11px;text-transform:uppercase;letter-spacing:.03em}
  .num{text-align:right;font-variant-numeric:tabular-nums}
  .summary{display:flex;gap:16px;margin:16px 0 20px;flex-wrap:wrap}
  .summary div{padding:10px 14px;border:1px solid #e4e4e7;border-radius:8px;min-width:120px}
  .summary strong{display:block;font-size:16px;margin-top:2px}
  @media print{body{padding:12px}}
</style></head><body>
  <h1>${title} — ${report.schoolName}</h1>
  ${contactBits.length ? `<p class="meta">${contactBits.join(' · ')}</p>` : ''}
  <p class="meta">Généré le ${new Date(report.generatedAt).toLocaleString('fr-FR')}</p>
  <div class="summary">
    <div>Élèves<strong>${report.summary.total}</strong></div>
    <div>Débiteurs<strong>${report.summary.debtors}</strong></div>
    <div>En ordre<strong>${report.summary.paid}</strong></div>
    ${!hideAmounts ? `<div>Solde total<strong>${formatMoney(report.summary.totalBalance ?? 0)}</strong></div>` : ''}
    ${!hideAmounts && report.summary.totalExpectedLoss != null ? `<div>ECL<strong>${formatMoney(report.summary.totalExpectedLoss)}</strong></div>` : ''}
  </div>
  <table>
    <thead><tr>${report.columns.map((c) => `<th>${c}</th>`).join('')}</tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <script>window.onload=()=>window.print()</script>
</body></html>`)
  w.document.close()
}
