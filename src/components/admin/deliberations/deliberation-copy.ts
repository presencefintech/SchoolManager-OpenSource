import type {
  DeliberationBulletinRow,
  DeliberationDecision,
  GradeAnomalyFlag,
} from '@/lib/admin/api/deliberations.api'

/** Lexique pédagogique — aucun jargon technique exposé à l’utilisateur. */

export function placeLabelFor(row: DeliberationBulletinRow): string {
  if (row.deliberation.placeLabel) return row.deliberation.placeLabel
  if (row.deliberation.anomaly?.placeLabel) {
    return row.deliberation.anomaly.placeLabel
  }
  const pos = row.rank.position
  const n = row.rank.classSize
  if (pos == null) return '—'
  if (n != null && n > 0) return `${pos} / ${n}`
  return String(pos)
}

export function pedagogicalAnomalyMessage(
  flag: GradeAnomalyFlag,
  classMean: number | null,
): string {
  const meanPart =
    classMean != null
      ? ` (moyenne de classe : ${classMean.toFixed(1)} %)`
      : ''
  const direction =
    classMean != null && flag.percentage < classMean
      ? 'inférieur'
      : 'supérieur'
  return (
    `Élève présentant un écart de notation significatif par rapport à la moyenne de la classe` +
    `${meanPart}. Résultat ${direction} à la tendance générale — vérification pédagogique recommandée avant validation.`
  )
}

export function decisionMotivation(row: DeliberationBulletinRow): string {
  const pct = row.totals.percentage
  const decision = row.deliberation.decision
  const thresholds = row.deliberation.thresholds
  const pass = thresholds?.passThreshold
  const repechage = thresholds?.repechageMin

  if (pct == null) {
    return 'Aucune moyenne exploitable pour motiver la décision sur ce trimestre.'
  }

  const pctLabel = `${pct.toFixed(1)} %`

  switch (decision as DeliberationDecision) {
    case 'PASSE':
      return pass != null
        ? `Avec ${pctLabel}, l’élève atteint ou dépasse le seuil de passage (${pass} %). Décision proposée : Passe.`
        : `Avec ${pctLabel}, l’élève atteint le niveau requis pour le passage de classe.`
    case 'REPECHAGE':
      return pass != null && repechage != null
        ? `Avec ${pctLabel}, le résultat se situe entre le seuil de repêchage (${repechage} %) et le seuil de passage (${pass} %). Décision proposée : Répêchage.`
        : `Avec ${pctLabel}, le conseil de classe propose un repêchage.`
    case 'DOUBLE':
      return repechage != null
        ? `Avec ${pctLabel}, le résultat est inférieur au seuil de repêchage (${repechage} %). Décision proposée : Double.`
        : `Avec ${pctLabel}, le conseil de classe propose le redoublement.`
    default:
      return `Situation en attente de décision officielle (moyenne : ${pctLabel}).`
  }
}

export function progressStatusLabel(
  status: string | undefined,
  done: boolean,
  failed: boolean,
): string {
  if (failed) return 'Traitement interrompu'
  if (done) return 'Traitement achevé'
  if (status === 'active' || status === 'progress') {
    return 'Traitement de la classe en cours…'
  }
  return 'Préparation du traitement…'
}

export function humanProgressDetail(processed: number, total: number): string {
  if (!total) return 'Calcul des moyennes et des rangs…'
  return `${processed} élève(s) traité(s) sur ${total}`
}
