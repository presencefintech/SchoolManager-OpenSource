'use client'

import { Fragment } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { cn } from '@/lib/utils'
import { DrcCoatOfArms, DrcFlag } from './epst-emblems'
import type {
  DomainGroup,
  GradeItem,
  StudentBulletinProps,
} from '@/types/official-bulletin'

/** Nombre de colonnes de la matrice EPST (Branche → Sign. Prof.). */
const COLS = 14

const cell = 'border border-black px-[2px] py-[1px] text-center align-middle leading-tight'
const cellL = 'border border-black px-1 py-[1px] text-left align-middle leading-tight'
const head = 'border border-black px-[2px] py-[1px] text-center font-bold uppercase leading-tight'
const blackOut = 'border border-black bg-black'

function fmt(value: number | null | undefined, digits = 1): string {
  if (value == null || !Number.isFinite(value)) return ''
  return Number.isInteger(value) ? String(value) : value.toFixed(digits)
}

function IdBoxes({
  value,
  count,
  size = 'md',
}: {
  value?: string | null
  count: number
  size?: 'sm' | 'md'
}) {
  const chars = (value ?? '').replace(/\s/g, '').toUpperCase().split('')
  const box =
    size === 'sm'
      ? 'h-[9px] w-[9px] text-[6px]'
      : 'h-[11px] w-[11px] text-[7px]'
  return (
    <span className="inline-flex items-center gap-px align-middle">
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className={cn(
            'inline-flex items-center justify-center border border-black bg-white font-mono tabular-nums',
            box,
          )}
        >
          {chars[i] ?? ''}
        </span>
      ))}
    </span>
  )
}

function DottedField({
  label,
  value,
  className,
}: {
  label: string
  value?: string | null
  className?: string
}) {
  return (
    <div className={cn('flex items-baseline gap-1 min-w-0', className)}>
      <span className="shrink-0 font-bold uppercase">{label}</span>
      <span className="min-w-0 flex-1 border-b border-dotted border-black text-[8.5px] leading-none pb-px truncate">
        {value || '\u00a0'}
      </span>
    </div>
  )
}

function parseAcademicYears(academicYear: string): { start: string; end: string } {
  const m = academicYear.match(/(\d{2,4})\s*[-/]\s*(\d{2,4})/)
  if (!m) return { start: '', end: '' }
  const start = m[1].length === 2 ? `20${m[1]}` : m[1]
  const end = m[2].length === 2 ? `20${m[2]}` : m[2]
  return { start: start.slice(-2), end: end.slice(-2) }
}

/** Date affichée ou span vide souligné (aucun placeholder « .... »). */
function DateSlot({ value }: { value?: string | Date | null }) {
  let text = ''
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    text = value.toLocaleDateString('fr-FR')
  } else if (typeof value === 'string' && value.trim()) {
    const parsed = Date.parse(value)
    if (!Number.isNaN(parsed)) text = new Date(parsed).toLocaleDateString('fr-FR')
  }
  return (
    <span className="border-b border-dotted border-black px-0.5 min-w-[52px] inline-block text-center">
      {text || '\u00a0'}
    </span>
  )
}

type SemesterSide = 'first' | 'second' | 'both'

function resolveSemester(term: string | null | undefined): SemesterSide {
  if (term === 'FIRST_TERM') return 'first'
  if (term === 'SECOND_TERM' || term === 'THIRD_TERM') return 'second'
  return 'both'
}

type ScoreCells = {
  s1Max: string
  s1P1: string
  s1P2: string
  s1MaxEx: string
  s1Tot: string
  s2Max: string
  s2P3: string
  s2P4: string
  s2Ex: string
  s2Tot: string
  tg: string
  repPct: string
}

function scoreCellsForSubject(
  s: GradeItem,
  semester: SemesterSide,
  showRepPct: boolean,
): ScoreCells {
  const empty: ScoreCells = {
    s1Max: '',
    s1P1: '',
    s1P2: '',
    s1MaxEx: '',
    s1Tot: '',
    s2Max: '',
    s2P3: '',
    s2P4: '',
    s2Ex: '',
    s2Tot: '',
    tg: fmt(s.obtained, 1),
    repPct: showRepPct ? fmt(s.percentage, 1) : '',
  }
  if (s.dispensed) {
    return { ...empty, tg: 'Disp.', repPct: '' }
  }

  const max = fmt(s.max, 0)
  const tj = fmt(s.tj.obtained, 1)
  const exam = fmt(s.exam.obtained, 1)
  const tot = fmt(s.obtained, 1)
  const examMax = fmt(s.exam.max, 0)

  if (semester === 'first') {
    return {
      ...empty,
      s1Max: max,
      s1P1: tj,
      s1MaxEx: examMax,
      s1Tot: tot,
      tg: tot,
    }
  }
  if (semester === 'second') {
    return {
      ...empty,
      s2Max: max,
      s2P3: tj,
      s2Ex: exam,
      s2Tot: tot,
      tg: tot,
    }
  }
  return {
    s1Max: max,
    s1P1: tj,
    s1P2: '',
    s1MaxEx: examMax,
    s1Tot: tot,
    s2Max: max,
    s2P3: '',
    s2P4: '',
    s2Ex: exam,
    s2Tot: tot,
    tg: tot,
    repPct: showRepPct ? fmt(s.percentage, 1) : '',
  }
}

function ScoreTds({ c }: { c: ScoreCells }) {
  return (
    <>
      <td className={cn(cell, 'w-[18px] tabular-nums')}>{c.s1Max}</td>
      <td className={cn(cell, 'w-[18px] tabular-nums')}>{c.s1P1}</td>
      <td className={cn(cell, 'w-[18px] tabular-nums')}>{c.s1P2}</td>
      <td className={cn(cell, 'w-[22px] tabular-nums')}>{c.s1MaxEx}</td>
      <td className={cn(cell, 'w-[20px] tabular-nums font-semibold')}>{c.s1Tot}</td>
      <td className={cn(cell, 'w-[18px] tabular-nums')}>{c.s2Max}</td>
      <td className={cn(cell, 'w-[18px] tabular-nums')}>{c.s2P3}</td>
      <td className={cn(cell, 'w-[18px] tabular-nums')}>{c.s2P4}</td>
      <td className={cn(cell, 'w-[22px] tabular-nums')}>{c.s2Ex}</td>
      <td className={cn(cell, 'w-[20px] tabular-nums font-semibold')}>{c.s2Tot}</td>
      <td className={cn(cell, 'w-[22px] tabular-nums font-bold')}>{c.tg}</td>
      <td className={cn(cell, 'w-[22px] tabular-nums border-l-2')}>{c.repPct}</td>
      <td className={cn(cell, 'w-[28px]')} />
    </>
  )
}

function SubjectRow({
  subject,
  semester,
  isRepechage,
}: {
  subject: GradeItem
  semester: SemesterSide
  isRepechage: boolean
}) {
  const c = scoreCellsForSubject(subject, semester, isRepechage)
  return (
    <tr>
      <td className={cn(cellL, 'text-[7.5px] pl-1.5')}>{subject.name}</td>
      <ScoreTds c={c} />
    </tr>
  )
}

function DomainBlock({
  domain,
  semester,
  isRepechage,
}: {
  domain: DomainGroup
  semester: SemesterSide
  isRepechage: boolean
}) {
  const subs = [...domain.subDomains].sort((a, b) => a.sortOrder - b.sortOrder)
  return (
    <>
      <tr>
        <td
          colSpan={COLS}
          className={cn(head, 'bg-[#e8e8e8] text-[8px] tracking-wide py-[2px]')}
        >
          {domain.name.toUpperCase().startsWith('DOMAINE')
            ? domain.name.toUpperCase()
            : `DOMAINE ${domain.name.toUpperCase()}`}
        </td>
      </tr>
      {subs.map((sub) => {
        const key = `${domain.domainId ?? domain.name}-${sub.subDomainId ?? sub.name}`
        return (
          <Fragment key={key}>
            <tr>
              <td
                colSpan={COLS}
                className={cn(
                  cell,
                  'bg-[#f3f3f3] text-[7.5px] font-semibold italic text-left pl-2',
                )}
              >
                {sub.name}
              </td>
            </tr>
            {sub.subjects.map((s) => (
              <SubjectRow
                key={s.subjectId}
                subject={s}
                semester={semester}
                isRepechage={isRepechage}
              />
            ))}
            <tr>
              <td className={cn(cellL, 'text-[7.5px] font-bold pl-1.5')}>SOUS-TOTAL</td>
              <ScoreTds
                c={{
                  s1Max: '',
                  s1P1: '',
                  s1P2: '',
                  s1MaxEx: '',
                  s1Tot: fmt(sub.subtotalObtained, 1),
                  s2Max: '',
                  s2P3: '',
                  s2P4: '',
                  s2Ex: '',
                  s2Tot: '',
                  tg: fmt(sub.subtotalObtained, 1),
                  repPct: '',
                }}
              />
            </tr>
          </Fragment>
        )
      })}
    </>
  )
}

function SummaryRow({
  label,
  values,
  blackMask,
}: {
  label: string
  values: Partial<ScoreCells> & { labelExtra?: string }
  blackMask?: Array<keyof ScoreCells>
}) {
  const keys: Array<keyof ScoreCells> = [
    's1Max',
    's1P1',
    's1P2',
    's1MaxEx',
    's1Tot',
    's2Max',
    's2P3',
    's2P4',
    's2Ex',
    's2Tot',
    'tg',
    'repPct',
  ]
  const mask = new Set(blackMask ?? [])
  return (
    <tr>
      <td className={cn(cellL, 'text-[7.5px] font-bold uppercase pl-1')}>{label}</td>
      {keys.map((k) =>
        mask.has(k) ? (
          <td key={k} className={blackOut} />
        ) : (
          <td key={k} className={cn(cell, 'tabular-nums text-[7.5px] font-semibold')}>
            {values[k] ?? ''}
          </td>
        ),
      )}
      <td className={cn(cell, 'border-l-2')} />
    </tr>
  )
}

export function OfficialBulletinView({
  bulletin,
  className,
}: {
  bulletin: StudentBulletinProps
  className?: string
}) {
  const domains = [...bulletin.domains].sort((a, b) => a.sortOrder - b.sortOrder)
  const identity = bulletin.identity ?? {}
  const years = parseAcademicYears(bulletin.meta.academicYear)
  const yearStart = identity.academicYearStart ?? years.start
  const yearEnd = identity.academicYearEnd ?? years.end
  const semester = resolveSemester(
    typeof bulletin.meta.term === 'string' ? bulletin.meta.term : null,
  )
  const decision = String(bulletin.deliberation.decision || '').toUpperCase()
  const isPasse = decision === 'PASSE'
  const isDouble = decision === 'DOUBLE'
  const isRepechage = decision === 'REPECHAGE'
  const place =
    bulletin.deliberation.placeLabel ||
    (bulletin.rank.position != null
      ? `${bulletin.rank.position}/${bulletin.rank.classSize ?? 0}`
      : '')

  const verifyUrl =
    bulletin.verifyUrl ||
    (typeof window !== 'undefined'
      ? `${window.location.origin}/verify/bulletin/${encodeURIComponent(
          bulletin.deliberation.verifyToken,
        )}`
      : bulletin.deliberation.verifyToken)

  const validated = bulletin.deliberation.validatedAt
    ? new Date(bulletin.deliberation.validatedAt)
    : null

  const classYearLabel =
    identity.classYearLabel || bulletin.classInfo.name || ''
  const cycleTitle =
    identity.cycleName ||
    bulletin.classInfo.cycleName ||
    ''
  const province =
    identity.province || bulletin.school?.province || ''
  const city = identity.city || bulletin.school?.city || ''
  const commune =
    identity.commune || bulletin.school?.commune || ''
  const schoolCode =
    identity.schoolCode || bulletin.school?.code || ''
  const schoolDisplayName =
    bulletin.school?.name || bulletin.schoolName || ''
  const sex = identity.sex || bulletin.student.sex || ''
  const birthPlace =
    identity.birthPlace || bulletin.student.birthPlace || ''
  const birthDate =
    identity.birthDate || bulletin.student.birthDate || ''
  const totalsMax = bulletin.totals.max ?? 0
  const totalsObtained = bulletin.totals.obtained ?? null

  return (
    <article
      className={cn(
        'official-bulletin epst-bulletin mx-auto bg-white text-black',
        'w-[210mm] min-h-[297mm] box-border',
        'px-[6mm] py-[5mm]',
        'font-[Arial,Helvetica,sans-serif] text-[8px]',
        'shadow-sm print:shadow-none print:w-[210mm] print:min-h-[297mm]',
        className,
      )}
      data-security-hash={bulletin.deliberation.securityHash}
    >
      {/* ——— En-tête ministère ——— */}
      <header className="grid grid-cols-[48px_1fr_48px] items-start gap-2 border border-black p-1.5">
        <DrcFlag className="h-10 w-[52px] justify-self-start border border-black/20" />
        <div className="text-center leading-tight pt-0.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.04em]">
            République Démocratique du Congo
          </p>
          <p className="text-[8.5px] font-bold uppercase mt-0.5 leading-snug">
            Ministère de l’Enseignement Primaire,
            <br />
            Secondaire et Professionnel
          </p>
        </div>
        <DrcCoatOfArms className="h-11 w-11 justify-self-end" />
      </header>

      {/* N° ID */}
      <div className="mt-1 flex items-center gap-2 border border-black border-t-0 px-1.5 py-1">
        <span className="text-[8px] font-bold uppercase shrink-0">N° ID</span>
        <IdBoxes
          value={identity.nationalId ?? bulletin.student.matricule}
          count={26}
          size="sm"
        />
      </div>

      {/* Grille d’identité */}
      <section className="border border-black border-t-0 px-1.5 py-1.5 space-y-1">
        <DottedField label="Province :" value={province} />
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          <DottedField label="Ville :" value={city} />
          <div className="flex items-baseline gap-2 min-w-0">
            <DottedField
              label="Élève :"
              value={bulletin.student.fullName}
              className="flex-1"
            />
            <span className="shrink-0 font-bold uppercase">
              Sexe :{' '}
              <span className="inline-block min-w-[14px] border-b border-dotted border-black text-center">
                {sex || '\u00a0'}
              </span>
            </span>
          </div>
          <DottedField label="Commune / Ter (1) :" value={commune} />
          <div className="flex items-baseline gap-1 min-w-0">
            <DottedField
              label="Né(e) à :"
              value={birthPlace}
              className="flex-1"
            />
            <span className="shrink-0 font-bold uppercase text-[7.5px]">
              le <DateSlot value={birthDate} />
            </span>
          </div>
          <DottedField label="École :" value={schoolDisplayName} />
          <DottedField label="Classe :" value={bulletin.classInfo.name} />
        </div>
        <div className="grid grid-cols-2 gap-x-3 pt-0.5">
          <div className="flex items-center gap-1.5">
            <span className="font-bold uppercase shrink-0">Code</span>
            <IdBoxes value={schoolCode} count={10} size="sm" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold uppercase shrink-0">N° Perm.</span>
            <IdBoxes
              value={identity.permanentNumber ?? bulletin.student.matricule}
              count={15}
              size="sm"
            />
          </div>
        </div>
      </section>

      {/* Titre bulletin */}
      <div className="border border-black border-t-0 bg-[#ececec] px-1.5 py-1 text-center">
        <p className="text-[8px] font-bold uppercase leading-snug">
          Bulletin de la{' '}
          <span className="underline decoration-dotted underline-offset-2">
            {classYearLabel || '\u00a0'}
          </span>
          {cycleTitle ? (
            <>
              {' '}
              —{' '}
              <span className="underline decoration-dotted underline-offset-2">
                {cycleTitle}
              </span>
            </>
          ) : null}
          <br />
          Année scolaire 20
          <span className="inline-block min-w-[1.2em] border-b border-dotted border-black text-center">
            {yearStart || '\u00a0'}
          </span>{' '}
          – 20
          <span className="inline-block min-w-[1.2em] border-b border-dotted border-black text-center">
            {yearEnd || '\u00a0'}
          </span>
        </p>
      </div>

      {/* ——— Matrice des notes ——— */}
      <table className="mt-0 w-full border-collapse table-fixed text-[7px]">
        <thead>
          <tr>
            <th rowSpan={3} className={cn(head, 'w-[22%] text-[7.5px] bg-[#f5f5f5]')}>
              Branche
            </th>
            <th colSpan={5} className={cn(head, 'text-[7px] bg-[#f5f5f5]')}>
              Premier semestre
            </th>
            <th colSpan={5} className={cn(head, 'text-[7px] bg-[#f5f5f5]')}>
              Second semestre
            </th>
            <th rowSpan={3} className={cn(head, 'w-[5%] text-[7px] bg-[#f5f5f5]')}>
              T.G.
            </th>
            <th
              colSpan={2}
              className={cn(head, 'text-[6.5px] bg-[#f5f5f5] border-l-2')}
            >
              Examen de repêchage
            </th>
          </tr>
          <tr>
            <th rowSpan={2} className={cn(head, 'text-[6.5px]')}>
              Max
            </th>
            <th colSpan={2} className={cn(head, 'text-[6px]')}>
              Travaux journal.
            </th>
            <th rowSpan={2} className={cn(head, 'text-[6px]')}>
              Max examen
            </th>
            <th rowSpan={2} className={cn(head, 'text-[6.5px]')}>
              Tot
            </th>
            <th rowSpan={2} className={cn(head, 'text-[6.5px]')}>
              Max
            </th>
            <th colSpan={2} className={cn(head, 'text-[6px]')}>
              Travaux journal.
            </th>
            <th rowSpan={2} className={cn(head, 'text-[6.5px]')}>
              Examen
            </th>
            <th rowSpan={2} className={cn(head, 'text-[6.5px]')}>
              Tot
            </th>
            <th rowSpan={2} className={cn(head, 'text-[6.5px] border-l-2')}>
              %
            </th>
            <th rowSpan={2} className={cn(head, 'text-[6px]')}>
              Sign. Prof.
            </th>
          </tr>
          <tr>
            <th className={cn(head, 'text-[6px]')}>1ère p</th>
            <th className={cn(head, 'text-[6px]')}>2ème p</th>
            <th className={cn(head, 'text-[6px]')}>3ème p</th>
            <th className={cn(head, 'text-[6px]')}>4ème p</th>
          </tr>
        </thead>
        <tbody>
          {domains.length === 0 ? (
            <tr>
              <td colSpan={COLS} className={cn(cell, 'py-4 text-slate-500 italic')}>
                Aucune branche disponible pour ce bulletin.
              </td>
            </tr>
          ) : (
            domains.map((d) => (
              <DomainBlock
                key={`${d.domainId ?? d.name}-${d.sortOrder}`}
                domain={d}
                semester={semester}
                isRepechage={isRepechage}
              />
            ))
          )}

          <tr>
            <td className={cn(cellL, 'text-[7.5px] font-bold uppercase')}>
              Maxima généraux
            </td>
            <ScoreTds
              c={{
                s1Max: fmt(totalsMax, 0),
                s1P1: '',
                s1P2: '',
                s1MaxEx: '',
                s1Tot: '',
                s2Max: '',
                s2P3: '',
                s2P4: '',
                s2Ex: '',
                s2Tot: '',
                tg: fmt(totalsMax, 0),
                repPct: '',
              }}
            />
          </tr>

          <SummaryRow
            label="Totaux"
            values={{
              s1Tot: fmt(totalsObtained, 1),
              tg: fmt(totalsObtained, 1),
            }}
            blackMask={['s1Max', 's2Max']}
          />
          <SummaryRow
            label="Pourcentage"
            values={{
              tg:
                bulletin.totals.percentage != null
                  ? `${bulletin.totals.percentage.toFixed(1)}%`
                  : '',
              repPct:
                isRepechage && bulletin.totals.percentage != null
                  ? `${bulletin.totals.percentage.toFixed(1)}%`
                  : '',
            }}
            blackMask={[
              's1Max',
              's1P1',
              's1P2',
              's1MaxEx',
              's2Max',
              's2P3',
              's2P4',
              's2Ex',
            ]}
          />
          <SummaryRow
            label="Place / Nbre d'élèves"
            values={{ tg: place }}
            blackMask={[
              's1Max',
              's1P1',
              's1P2',
              's1MaxEx',
              's1Tot',
              's2Max',
              's2P3',
              's2P4',
              's2Ex',
              's2Tot',
              'repPct',
            ]}
          />
          <SummaryRow
            label="Application"
            values={{
              tg:
                bulletin.deliberation.applicationNote != null
                  ? String(bulletin.deliberation.applicationNote)
                  : '',
            }}
            blackMask={[
              's1Max',
              's1P1',
              's1P2',
              's1MaxEx',
              's1Tot',
              's2Max',
              's2P3',
              's2P4',
              's2Ex',
              's2Tot',
              'repPct',
            ]}
          />
          <SummaryRow
            label="Conduite"
            values={{
              tg:
                bulletin.deliberation.conductNote != null
                  ? String(bulletin.deliberation.conductNote)
                  : '',
            }}
            blackMask={[
              's1Max',
              's1P1',
              's1P2',
              's1MaxEx',
              's1Tot',
              's2Max',
              's2P3',
              's2P4',
              's2Ex',
              's2Tot',
              'repPct',
            ]}
          />
          <tr>
            <td className={cn(cellL, 'text-[7.5px] font-bold uppercase')}>Signature</td>
            {Array.from({ length: 11 }, (_, i) => (
              <td key={i} className={blackOut} />
            ))}
            <td className={cn(cell, 'border-l-2')} colSpan={2} />
          </tr>
        </tbody>
      </table>

      {/* Décision chef d’établissement */}
      <section className="mt-1 grid grid-cols-[1fr_120px] gap-0 border border-black">
        <div className="px-1.5 py-1 text-[7.5px] space-y-1 border-r border-black">
          <p>
            • L’élève ne pourra passer dans la classe supérieure s’il n’a subi avec
            succès un examen de repêchage en
            <span className="inline-block min-w-[40%] border-b border-dotted border-black mx-1" />
            .
          </p>
          <p className={cn(isPasse && 'font-bold')}>
            • L’élève passe dans la classe supérieure (1)
            {isPasse ? ' ✓' : ''}
          </p>
          <p className={cn(isDouble && 'font-bold')}>
            • L’élève double la classe (1)
            {isDouble ? ' ✓' : ''}
          </p>
          {isRepechage ? (
            <p className="font-bold">• Examen de repêchage prescrit (1)</p>
          ) : null}
        </div>
        <div className="px-1.5 py-1 text-[7.5px] flex flex-col items-start gap-1">
          <label className="flex items-center gap-1 font-bold uppercase">
            <span
              className={cn(
                'inline-block h-2.5 w-2.5 border border-black',
                isPasse && 'bg-black',
              )}
            />
            Passe (1)
          </label>
          <label className="flex items-center gap-1 font-bold uppercase">
            <span
              className={cn(
                'inline-block h-2.5 w-2.5 border border-black',
                isDouble && 'bg-black',
              )}
            />
            Double (1)
          </label>
          <p className="mt-1 uppercase">
            Le <DateSlot value={validated} />
          </p>
          <p className="mt-1 text-[6.5px] leading-tight font-semibold">
            Le chef d’établissement
            <br />
            / Sceau de l’école
          </p>
        </div>
      </section>

      {/* Signatures */}
      <section className="mt-2 grid grid-cols-3 gap-3 border-t border-black pt-2 text-[7.5px]">
        <div className="text-center">
          <p className="font-bold uppercase">Signature de l’élève</p>
          <div className="mt-6 border-b border-dotted border-black mx-2" />
        </div>
        <div className="text-center">
          <p className="font-bold uppercase">Sceau de l’école</p>
          <div className="mt-6 h-10 border border-dashed border-black/40 mx-4" />
        </div>
        <div className="text-center">
          <p className="uppercase">
            Fait à{' '}
            <span className="border-b border-dotted border-black px-2 inline-block min-w-[48px]">
              {city || '\u00a0'}
            </span>{' '}
            le <DateSlot value={validated} />
          </p>
          <p className="mt-1 font-bold uppercase">Le Chef d’Établissement</p>
          <p className="text-[6.5px]">Nom et Signature</p>
          <div className="mt-4 border-b border-dotted border-black mx-2" />
        </div>
      </section>

      {/* Mentions légales + QR + ID document */}
      <footer className="mt-2 flex items-end justify-between gap-3 border-t border-black pt-1.5">
        <div className="min-w-0 flex-1 text-[6.5px] leading-snug text-black/90">
          <p>(1) Biffer la mention inutile.</p>
          <p className="font-semibold">
            Note importante : Le Bulletin est sans valeur s’il est raturé ou
            surchargé.
          </p>
          <p className="mt-0.5 break-all text-[6px] text-black/70">
            Contrôle d’authenticité : {bulletin.deliberation.securityHash.slice(0, 24)}…
          </p>
        </div>
        <div className="shrink-0 text-center">
          <div className="inline-block border border-black p-0.5 bg-white">
            <QRCodeSVG
              value={verifyUrl}
              size={56}
              level="M"
              bgColor="#ffffff"
              fgColor="#000000"
              aria-label="QR de vérification du bulletin"
            />
          </div>
        </div>
        <p className="shrink-0 text-[7px] font-bold tracking-wide">IDG/P.S./010</p>
      </footer>

      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 6mm; }
          html, body {
            background: #fff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .epst-bulletin {
            box-shadow: none !important;
            margin: 0 auto !important;
            width: 210mm !important;
          }
          .epst-bulletin table,
          .epst-bulletin tr {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </article>
  )
}
