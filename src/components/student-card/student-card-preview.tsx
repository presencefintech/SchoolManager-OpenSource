'use client'

import { forwardRef, useMemo } from 'react'
import type { StudentCardData } from '@/types/student-card'
import type { StudentCardAssets } from '@/lib/student-card/resolve-assets'
import { CARD, mm } from '@/lib/student-card/card-layout'
import { fitFontSize } from '@/lib/student-card/fit-font'
import { STATUS_COLORS } from '@/lib/student-card/card-dimensions'
import { resolveCardTheme } from '@/lib/student-card/card-theme'
import { formatGenderLabel, formatValidityLabel } from '@/lib/student-card/utils'
import { formatStudentIdentityView } from '@/lib/utils/student-name.util'
import { cn } from '@/lib/utils'
import { CardText } from './card-text'

export interface StudentCardPreviewProps {
  data: StudentCardData
  assets: StudentCardAssets
  className?: string
}

const LABEL = '#94a3b8'
const WHITE = '#ffffff'

function MicroLabel({ children, color = LABEL }: { children: string; color?: string }) {
  return (
    <span
      style={{
        display: 'block',
        fontSize: CARD.font.detailLabel,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        color,
        lineHeight: 1.05,
        marginBottom: 1,
      }}
    >
      {children}
    </span>
  )
}

function DetailRow({
  label,
  value,
  fontSize,
  labelColor = LABEL,
}: {
  label: string
  value: string | null | undefined
  fontSize: number
  labelColor?: string
}) {
  if (!value?.trim()) return null
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        marginTop: mm(0.35),
        width: '100%',
        minWidth: 0,
        gap: mm(0.7),
      }}
    >
      <span
        style={{
          width: CARD.identity.detailLabelWidth,
          flexShrink: 0,
          fontSize: CARD.font.detailLabel,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: 0.4,
          color: labelColor,
          lineHeight: 1.1,
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
      <CardText
        lines={value.trim().length > 22 ? 2 : 1}
        fontSize={fontSize}
        title={value}
        style={{ flex: 1, fontWeight: 700, color: '#334155' }}
      >
        {value}
      </CardText>
    </div>
  )
}

/**
 * Carte élève CR80 — thème école + identité RDC (Nom / Postnom / Prénom).
 */
export const StudentCardPreview = forwardRef<HTMLDivElement, StudentCardPreviewProps>(
  function StudentCardPreview({ data, assets, className }, ref) {
    const theme = resolveCardTheme(data.cardTheme)
    const stripeColor = STATUS_COLORS[data.financialStatus]
    const genderLabel = formatGenderLabel(data.gender)
    const validity = formatValidityLabel(data.academicYear)
    const classLine = [data.className, data.section, data.option]
      .filter((p): p is string => Boolean(p?.trim()))
      .join(' · ')
    const schoolInitial = data.schoolName.trim()[0]?.toUpperCase() ?? 'E'
    const matricule = data.matricule ?? `ID-${String(data.studentId).padStart(6, '0')}`
    const serial = `PF-${String(data.studentId).padStart(6, '0')}`

    const identity = formatStudentIdentityView(data)
    const typography = useMemo(
      () => ({
        schoolName: fitFontSize(data.schoolName, CARD.font.schoolName, 26, 5),
        nom: fitFontSize(identity.nom, CARD.font.lastName, 14, 5.5),
        postnom: fitFontSize(identity.postnom ?? '', CARD.font.lastName, 14, 5.5),
        prenom: fitFontSize(identity.prenom, CARD.font.firstName, 14, 5.5),
        detailValue: fitFontSize(
          [classLine, data.nationality, data.placeOfBirth, data.dateOfBirth]
            .filter(Boolean)
            .join(' '),
          CARD.font.detailValue,
          36,
          4.2,
        ),
      }),
      [
        data.schoolName,
        identity.nom,
        identity.postnom,
        identity.prenom,
        classLine,
        data.nationality,
        data.placeOfBirth,
        data.dateOfBirth,
      ],
    )

    const originLine = [data.nationality?.trim(), data.placeOfBirth?.trim()]
      .filter(Boolean)
      .join(' · ')

    return (
      <div
        ref={ref}
        className={cn('student-card', className)}
        style={{
          position: 'relative',
          width: CARD.widthPx,
          height: CARD.heightPx,
          minWidth: CARD.widthPx,
          minHeight: CARD.heightPx,
          maxWidth: CARD.widthPx,
          maxHeight: CARD.heightPx,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          backgroundColor: WHITE,
          boxSizing: 'border-box',
          fontFamily: 'Arial, Helvetica, sans-serif',
          textAlign: 'left',
          userSelect: 'none',
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact',
        }}
      >
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: CARD.stripeWidth,
            backgroundColor: stripeColor,
            zIndex: 2,
          }}
        />

        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.045,
            backgroundImage: `repeating-linear-gradient(115deg, ${theme.headerTo} 0 1px, transparent 1px 7px), repeating-linear-gradient(-25deg, ${theme.headerTo} 0 1px, transparent 1px 9px)`,
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />

        <header
          style={{
            position: 'relative',
            zIndex: 1,
            flexShrink: 0,
            marginLeft: CARD.header.marginLeft,
            height: CARD.header.height,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: `linear-gradient(115deg, ${theme.headerFrom} 0%, ${theme.headerTo} 100%)`,
            paddingLeft: CARD.header.paddingX,
            paddingRight: CARD.header.paddingX,
            paddingTop: CARD.header.paddingY,
            paddingBottom: CARD.header.paddingY,
            boxSizing: 'border-box',
          }}
        >
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(ellipse 70% 80% at 0% 0%, rgba(255,255,255,0.16), transparent 55%)',
              pointerEvents: 'none',
            }}
          />

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              flex: 1,
              minWidth: 0,
              gap: mm(1.5),
              paddingRight: mm(1),
              position: 'relative',
            }}
          >
            <div
              style={{
                width: CARD.logo.size,
                height: CARD.logo.size,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(255,255,255,0.96)',
                borderRadius: 3,
                boxShadow: '0 0 0 1px rgba(251,191,36,0.45)',
              }}
            >
              {assets.logoSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={assets.logoSrc}
                  alt=""
                  style={{
                    width: CARD.logo.imgSize,
                    height: CARD.logo.imgSize,
                    objectFit: 'contain',
                    display: 'block',
                  }}
                />
              ) : (
                <span
                  style={{
                    fontSize: CARD.font.logoInitial,
                    fontWeight: 800,
                    color: theme.headerTo,
                  }}
                >
                  {schoolInitial}
                </span>
              )}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <CardText
                lines={2}
                fontSize={typography.schoolName}
                title={data.schoolName}
                style={{ fontWeight: 800, color: '#ffffff', letterSpacing: 0.1 }}
              >
                {data.schoolName}
              </CardText>
              {data.schoolDevise?.trim() ? (
                <CardText
                  lines={1}
                  fontSize={CARD.font.brandSub}
                  title={data.schoolDevise}
                  style={{ fontStyle: 'italic', color: 'rgba(255,255,255,0.92)', marginTop: 1 }}
                >
                  « {data.schoolDevise} »
                </CardText>
              ) : null}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: mm(1),
                  marginTop: 1,
                  minWidth: 0,
                }}
              >
                <span
                  style={{
                    fontSize: CARD.font.brandSub,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: 0.8,
                    color: theme.accent,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {data.schoolSlogan?.trim() || "Carte d'identité élève"}
                </span>
                {data.schoolCity?.trim() ? (
                  <CardText
                    fontSize={CARD.font.schoolCity}
                    title={data.schoolCity}
                    style={{ color: '#99f6e4', minWidth: 0 }}
                  >
                    {data.schoolCity}
                  </CardText>
                ) : null}
              </div>
            </div>
          </div>

          <div
            style={{
              flexShrink: 0,
              textAlign: 'right',
              marginLeft: mm(1),
              position: 'relative',
              padding: `${mm(0.4)}px ${mm(0.8)}px`,
              borderRadius: 3,
              border: '1px solid rgba(251,191,36,0.35)',
              backgroundColor: 'rgba(0,0,0,0.18)',
            }}
          >
            <div
              style={{
                fontSize: 4,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                color: '#fde68a',
                lineHeight: 1.1,
              }}
            >
              Année
            </div>
            <div
              style={{
                fontSize: CARD.font.brand,
                fontWeight: 800,
                color: '#ffffff',
                lineHeight: 1.15,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {(data.academicYear ?? '').trim() || '—'}
            </div>
          </div>
        </header>

        <div
          aria-hidden
          style={{
            height: mm(1.1),
            marginLeft: CARD.header.marginLeft,
            background: `linear-gradient(90deg, transparent, ${theme.headerTo}26, ${theme.accent}8c, ${theme.headerTo}33, transparent)`,
            flexShrink: 0,
          }}
        />

        <div
          style={{
            position: 'relative',
            zIndex: 1,
            flex: 1,
            minHeight: 0,
            marginLeft: CARD.body.marginLeft,
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'stretch',
            paddingTop: CARD.body.paddingTop,
            paddingRight: CARD.body.paddingRight,
            paddingBottom: CARD.body.paddingBottom,
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              width: CARD.photo.width,
              flexShrink: 0,
              marginRight: mm(1.5),
              alignSelf: 'flex-start',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={assets.photoSrc}
              alt=""
              draggable={false}
              style={{
                width: CARD.photo.width,
                height: CARD.photo.height,
                objectFit: 'cover',
                objectPosition: 'center top',
                display: 'block',
                borderRadius: 3,
                border: `1.5px solid ${theme.accent}`,
                boxShadow: '0 1px 3px rgba(15,23,42,0.12)',
              }}
            />
            <div
              aria-hidden
              style={{
                marginTop: mm(1),
                width: mm(7),
                height: mm(5),
                borderRadius: 2,
                background: `linear-gradient(135deg, ${theme.accent} 0%, ${theme.accent}cc 50%, ${theme.headerFrom} 100%)`,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.45)',
              }}
            />
          </div>

          <div
            style={{
              flex: 1,
              minWidth: 0,
              paddingRight: CARD.identity.paddingRight,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-start',
              alignSelf: 'stretch',
            }}
          >
            <div>
              <MicroLabel>Nom</MicroLabel>
              <CardText
                lines={1}
                fontSize={typography.nom}
                title={identity.nom}
                style={{
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  color: theme.ink,
                }}
              >
                {identity.nom}
              </CardText>
            </div>

            {identity.postnom ? (
              <div style={{ marginTop: mm(0.45) }}>
                <MicroLabel>Postnom</MicroLabel>
                <CardText
                  lines={1}
                  fontSize={typography.postnom}
                  title={identity.postnom}
                  style={{
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    color: '#1e293b',
                  }}
                >
                  {identity.postnom}
                </CardText>
              </div>
            ) : null}

            <div style={{ marginTop: mm(0.45) }}>
              <MicroLabel>Prénom</MicroLabel>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: mm(1),
                  minWidth: 0,
                }}
              >
                <CardText
                  lines={1}
                  fontSize={typography.prenom}
                  title={identity.prenom}
                  style={{ fontWeight: 700, color: '#334155', flex: 1, minWidth: 0 }}
                >
                  {identity.prenom}
                </CardText>
                {genderLabel ? (
                  <span
                    style={{
                      flexShrink: 0,
                      fontSize: CARD.font.gender,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: theme.headerTo,
                      backgroundColor: theme.accentSoft,
                      padding: `1px ${mm(0.8)}px`,
                      borderRadius: 2,
                      lineHeight: 1.2,
                    }}
                  >
                    {genderLabel === 'Masculin' ? 'M' : genderLabel === 'Féminin' ? 'F' : genderLabel}
                  </span>
                ) : null}
              </div>
            </div>

            <div
              style={{
                marginTop: mm(0.9),
                alignSelf: 'flex-start',
                maxWidth: '100%',
                padding: `${mm(0.55)}px ${mm(1.1)}px`,
                backgroundColor: theme.accentSoft,
                border: `1px solid ${theme.accent}59`,
                borderRadius: 3,
                boxSizing: 'border-box',
              }}
            >
              <MicroLabel>Matricule</MicroLabel>
              <CardText
                fontSize={CARD.font.matricule}
                title={matricule}
                style={{
                  fontWeight: 800,
                  fontFamily: 'Consolas, Monaco, monospace',
                  color: '#92400e',
                  letterSpacing: 0.3,
                }}
              >
                {matricule}
              </CardText>
            </div>

            {classLine ? (
              <DetailRow label="Classe" value={classLine} fontSize={typography.detailValue} />
            ) : null}
            {data.dateOfBirth?.trim() ? (
              <DetailRow
                label="Né(e)"
                value={data.dateOfBirth.trim()}
                fontSize={typography.detailValue}
              />
            ) : null}
            {originLine ? (
              <DetailRow label="Origine" value={originLine} fontSize={typography.detailValue} />
            ) : null}
          </div>

          <div
            style={{
              width: CARD.qr.colWidth,
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-end',
              alignSelf: 'stretch',
            }}
          >
            <div
              className="student-card-qr-box"
              style={{
                width: CARD.qr.boxSize,
                height: CARD.qr.boxSize,
                padding: CARD.qr.padding,
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#ffffff',
                flexShrink: 0,
                borderRadius: 4,
                border: '1px solid #e2e8f0',
                boxShadow: '0 2px 6px rgba(15,23,42,0.08)',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={assets.qrDataUrl}
                alt=""
                draggable={false}
                className="student-card-qr-image"
                style={{
                  width: CARD.qr.imageSize,
                  height: CARD.qr.imageSize,
                  objectFit: 'contain',
                  display: 'block',
                }}
              />
            </div>
            <p
              style={{
                margin: `${mm(0.55)}px 0 0`,
                width: CARD.qr.colWidth,
                textAlign: 'center',
                fontSize: CARD.font.qrLabel,
                fontWeight: 800,
                lineHeight: 1.15,
                textTransform: 'uppercase',
                letterSpacing: 0.4,
                color: theme.headerTo,
              }}
            >
              Présence
            </p>
            <p
              style={{
                margin: '1px 0 0',
                width: CARD.qr.colWidth,
                textAlign: 'center',
                fontSize: 4,
                fontWeight: 600,
                lineHeight: 1.1,
                color: theme.muted,
              }}
            >
              Scanner le QR
            </p>
          </div>
        </div>

        <footer
          style={{
            position: 'relative',
            zIndex: 1,
            flexShrink: 0,
            height: CARD.footer.height,
            marginLeft: CARD.footer.marginLeft,
            marginRight: CARD.footer.marginRight,
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: CARD.footer.paddingTop,
            paddingBottom: CARD.footer.paddingBottom,
            boxSizing: 'border-box',
            gap: mm(1),
          }}
        >
          <CardText
            fontSize={CARD.font.validity}
            style={{ fontWeight: 700, color: '#475569', flex: 1 }}
          >
            {validity}
          </CardText>
          <span
            style={{
              flexShrink: 0,
              fontSize: CARD.font.microId,
              color: '#94a3b8',
              lineHeight: 1.1,
              whiteSpace: 'nowrap',
            }}
          >
            Document officiel · RDC
          </span>
          <span
            style={{
              flexShrink: 0,
              fontSize: CARD.font.microId,
              fontFamily: 'Consolas, Monaco, monospace',
              fontWeight: 700,
              color: theme.headerTo,
              marginLeft: mm(0.8),
              lineHeight: 1.1,
              whiteSpace: 'nowrap',
            }}
          >
            {serial}
          </span>
        </footer>
      </div>
    )
  },
)

StudentCardPreview.displayName = 'StudentCardPreview'
