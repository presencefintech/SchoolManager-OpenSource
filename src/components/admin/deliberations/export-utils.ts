import type { DeliberationBulletinRow } from '@/lib/admin/api/deliberations.api'
import { triggerBlobDownload } from '@/lib/download-blob'
import { decisionMotivation, placeLabelFor } from './deliberation-copy'

export type ExportContext = {
  className: string
  academicYear: string
  termLabel: string
  schoolLabel?: string
}

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function sortedRows(rows: DeliberationBulletinRow[]) {
  return [...rows].sort((a, b) => {
    const ra = a.rank.position ?? 9999
    const rb = b.rank.position ?? 9999
    if (ra !== rb) return ra - rb
    return a.student.fullName.localeCompare(b.student.fullName, 'fr')
  })
}

export function buildProcesVerbalHtml(
  rows: DeliberationBulletinRow[],
  ctx: ExportContext,
): string {
  const list = sortedRows(rows)
  const generatedAt = new Date().toLocaleString('fr-FR')

  const bodyRows = list
    .map((r, i) => {
      const pct =
        r.totals.percentage != null ? `${r.totals.percentage.toFixed(1)} %` : '—'
      return `<tr>
        <td>${i + 1}</td>
        <td>${esc(r.student.fullName)}</td>
        <td>${esc(r.student.matricule ?? '—')}</td>
        <td class="num">${esc(pct)}</td>
        <td class="num">${esc(placeLabelFor(r))}</td>
        <td>${esc(r.deliberation.decisionLabel || r.deliberation.decision)}</td>
      </tr>`
    })
    .join('')

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Procès-verbal de délibération — ${esc(ctx.className)}</title>
  <style>
    body { font-family: Georgia, 'Times New Roman', serif; color: #0f172a; margin: 32px; line-height: 1.45; }
    h1 { font-size: 20px; margin: 0 0 4px; letter-spacing: 0.02em; }
    .meta { color: #475569; font-size: 13px; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
    th { background: #f1f5f9; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
    td.num { text-align: right; font-variant-numeric: tabular-nums; }
    .sign { margin-top: 48px; display: flex; justify-content: space-between; gap: 24px; }
    .sign div { width: 45%; border-top: 1px solid #94a3b8; padding-top: 8px; font-size: 12px; color: #334155; }
    @media print { body { margin: 16mm; } }
  </style>
</head>
<body>
  <h1>Procès-verbal de délibération</h1>
  <div class="meta">
    <div><strong>Classe :</strong> ${esc(ctx.className)}</div>
    <div><strong>Année académique :</strong> ${esc(ctx.academicYear)}</div>
    <div><strong>Période :</strong> ${esc(ctx.termLabel)}</div>
    ${ctx.schoolLabel ? `<div><strong>Établissement :</strong> ${esc(ctx.schoolLabel)}</div>` : ''}
    <div><strong>Document établi le :</strong> ${esc(generatedAt)}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th>N°</th>
        <th>Élève</th>
        <th>Matricule</th>
        <th>%</th>
        <th>Rang</th>
        <th>Décision</th>
      </tr>
    </thead>
    <tbody>${bodyRows}</tbody>
  </table>
  <div class="sign">
    <div>Le titulaire de classe</div>
    <div>Le Préfet des études</div>
  </div>
</body>
</html>`
}

export function downloadProcesVerbal(
  rows: DeliberationBulletinRow[],
  ctx: ExportContext,
): void {
  const html = buildProcesVerbalHtml(rows, ctx)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const safeClass = ctx.className.replace(/[^\w\-]+/g, '_')
  triggerBlobDownload(
    blob,
    `proces-verbal-deliberation_${safeClass}_${ctx.academicYear}.html`,
  )
}

export function downloadSingleBulletinHtml(
  row: DeliberationBulletinRow,
  ctx: ExportContext,
): void {
  const domains = (row.domains ?? [])
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(
      (d) =>
        `<tr><td>${esc(d.name)}</td><td class="num">${
          d.percentage != null ? `${d.percentage.toFixed(1)} %` : '—'
        }</td></tr>`,
    )
    .join('')

  const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8" />
<title>Bulletin — ${esc(row.student.fullName)}</title>
<style>
  body{font-family:Georgia,serif;color:#0f172a;margin:24px;font-size:13px}
  table{width:100%;border-collapse:collapse;margin-top:12px}
  th,td{border:1px solid #cbd5e1;padding:6px 8px} th{background:#f1f5f9;text-align:left}
  td.num{text-align:right} h1{font-size:18px;margin:0}
</style></head><body>
<h1>Bulletin scolaire officiel — EPST</h1>
<p>${esc(ctx.className)} · ${esc(ctx.academicYear)} · ${esc(ctx.termLabel)}</p>
<h2>${esc(row.student.fullName)}</h2>
<p>Matricule : ${esc(row.student.matricule ?? '—')} · Rang : ${esc(placeLabelFor(row))}</p>
<p>Moyenne : <strong>${
  row.totals.percentage != null ? `${row.totals.percentage.toFixed(1)} %` : '—'
}</strong></p>
<table><thead><tr><th>Domaine</th><th>%</th></tr></thead>
<tbody>${domains || '<tr><td colspan="2">Répartition non disponible</td></tr>'}</tbody></table>
<p><strong>Décision :</strong> ${esc(row.deliberation.decisionLabel)}</p>
<p>${esc(decisionMotivation(row))}</p>
<p style="font-size:11px;color:#64748b">Empreinte : ${esc(row.deliberation.securityHash)}</p>
</body></html>`

  const slug = row.student.fullName.replace(/[^\w\-]+/g, '_').slice(0, 40)
  triggerBlobDownload(
    new Blob([html], { type: 'text/html;charset=utf-8' }),
    `bulletin_${slug}_${ctx.academicYear}.html`,
  )
}

export function printCertifiedBulletins(
  rows: DeliberationBulletinRow[],
  ctx: ExportContext,
): void {
  const list = sortedRows(rows)
  const pages = list
    .map((r) => {
      const domains = (r.domains ?? [])
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(
          (d) =>
            `<tr><td>${esc(d.name)}</td><td class="num">${
              d.percentage != null ? `${d.percentage.toFixed(1)} %` : '—'
            }</td></tr>`,
        )
        .join('')

      const validated = r.deliberation.validatedAt
        ? `Validé le ${new Date(r.deliberation.validatedAt).toLocaleDateString('fr-FR')}`
        : 'En attente de validation officielle'

      return `<section class="page">
        <header>
          <h1>Bulletin de délibération</h1>
          <p>${esc(ctx.className)} · ${esc(ctx.academicYear)} · ${esc(ctx.termLabel)}</p>
        </header>
        <h2>${esc(r.student.fullName)}</h2>
        <p class="sub">Matricule : ${esc(r.student.matricule ?? '—')} · Rang : ${esc(placeLabelFor(r))}</p>
        <p class="pct">Moyenne générale : <strong>${
          r.totals.percentage != null ? `${r.totals.percentage.toFixed(1)} %` : '—'
        }</strong></p>
        <table>
          <thead><tr><th>Domaine d’apprentissage</th><th>%</th></tr></thead>
          <tbody>${domains || '<tr><td colspan="2">Répartition non disponible</td></tr>'}</tbody>
        </table>
        <p class="decision"><strong>Décision :</strong> ${esc(
          r.deliberation.decisionLabel || r.deliberation.decision,
        )}</p>
        <p class="motive">${esc(decisionMotivation(r))}</p>
        <p class="seal">${esc(validated)}${
          r.deliberation.securityHash
            ? ` · Document certifié`
            : ''
        }</p>
      </section>`
    })
    .join('')

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Bulletins certifiés — ${esc(ctx.className)}</title>
  <style>
    body { font-family: Georgia, 'Times New Roman', serif; color: #0f172a; margin: 0; }
    .page { padding: 18mm; page-break-after: always; }
    .page:last-child { page-break-after: auto; }
    h1 { font-size: 18px; margin: 0 0 4px; }
    h2 { font-size: 16px; margin: 16px 0 4px; }
    header p, .sub, .seal, .motive { color: #475569; font-size: 12px; }
    .pct { font-size: 14px; margin: 12px 0; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 12px; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 8px; }
    th { background: #f8fafc; text-align: left; }
    td.num { text-align: right; }
    .decision { margin-top: 16px; font-size: 13px; }
  </style>
</head>
<body>${pages}</body>
</html>`

  const win = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700')
  if (!win) {
    throw new Error(
      'Impossible d’ouvrir la fenêtre d’impression. Autorisez les pop-ups pour ce site.',
    )
  }
  win.document.open()
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => {
    win.print()
  }, 250)
}
