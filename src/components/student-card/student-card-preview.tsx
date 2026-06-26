'use client'

import { forwardRef, useMemo } from 'react'
import type { StudentCardData } from '@/types/student-card'
import type { StudentCardAssets } from '@/lib/student-card/resolve-assets'
import { CARD, mm } from '@/lib/student-card/card-layout'
import { fitFontSize } from '@/lib/student-card/fit-font'
import { STATUS_COLORS } from '@/lib/student-card/card-dimensions'
import { formatGenderLabel, formatValidityLabel } from '@/lib/student-card/utils'
import { cn } from '@/lib/utils'
import { CardText } from './card-text'

export interface StudentCardPreviewProps {
  data: StudentCardData
  assets: StudentCardAssets
  className?: string
}

function DetailRow({
  label,
  value,
  fontSize,
}: {
  label: string
  value: string | null | undefined
  fontSize: number
}) {
  if (!value?.trim()) return null
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        marginTop: mm(0.4),
        width: '100%',
        minWidth: 0,
        gap: mm(0.8),
      }}
    >
      <span
        style={{
          width: CARD.identity.detailLabelWidth,
          flexShrink: 0,
          fontSize: CARD.font.detailLabel,
          fontWeight: 700,
          textTransform: 'uppercase',
          color: '#a1a1aa',
          lineHeight: 1.1,
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
      <CardText
        fontSize={fontSize}
        title={value}
        style={{ flex: 1, fontWeight: 700, color: '#3f3f46' }}
      >
        {value}
      </CardText>
    </div>
  )
}

/** Aperçu HTML CR80 — flex colonne, polices adaptatives, pas de centrage vertical */
export const StudentCardPreview = forwardRef<HTMLDivElement, StudentCardPreviewProps>(
  function StudentCardPreview({ data, assets, className }, ref) {
    const stripeColor = STATUS_COLORS[data.financialStatus]
    const genderLabel = formatGenderLabel(data.gender)
    const validity = formatValidityLabel(data.academicYear)
    const classLine = [data.className, data.section, data.option]
      .filter((p): p is string => Boolean(p?.trim()))
      .join(' · ')
    const schoolInitial = data.schoolName.trim()[0]?.toUpperCase() ?? 'E'
    const matricule = data.matricule ?? `ID-${String(data.studentId).padStart(6, '0')}`

    const typography = useMemo(
      () => ({
        schoolName: fitFontSize(data.schoolName, CARD.font.schoolName, 28, 5.5),
        lastName: fitFontSize(data.lastName, CARD.font.lastName, 18, 6.5),
        firstName: fitFontSize(data.firstName, CARD.font.firstName, 16, 6),
        detailValue: fitFontSize(
          [classLine, data.nationality, data.placeOfBirth].filter(Boolean).join(' '),
          CARD.font.detailValue,
          40,
          4.5,
        ),
      }),
      [data.schoolName, data.lastName, data.firstName, classLine, data.nationality, data.placeOfBirth],
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
          backgroundColor: '#ffffff',
          boxSizing: 'border-box',
          fontFamily: 'Arial, Helvetica, sans-serif',
          textAlign: 'left',
          userSelect: 'none',
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
            backgroundColor: '#312e81',
            paddingLeft: CARD.header.paddingX,
            paddingRight: CARD.header.paddingX,
            paddingTop: CARD.header.paddingY,
            paddingBottom: CARD.header.paddingY,
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              flex: 1,
              minWidth: 0,
              gap: mm(1.5),
              paddingRight: mm(1),
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
                backgroundColor: 'rgba(255,255,255,0.95)',
                borderRadius: 2,
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
                <span style={{ fontSize: CARD.font.logoInitial, fontWeight: 700, color: '#4338ca' }}>
                  {schoolInitial}
                </span>
              )}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <CardText
                lines={2}
                fontSize={typography.schoolName}
                title={data.schoolName}
                style={{ fontWeight: 700, color: '#ffffff' }}
              >
                {data.schoolName}
              </CardText>
              {data.schoolCity?.trim() ? (
                <CardText
                  fontSize={CARD.font.schoolCity}
                  title={data.schoolCity}
                  style={{ color: '#c7d2fe', marginTop: 1 }}
                >
                  {data.schoolCity}
                </CardText>
              ) : null}
            </div>
          </div>
          <div style={{ flexShrink: 0, textAlign: 'right', marginLeft: mm(1) }}>
            <div
              style={{
                fontSize: CARD.font.brand,
                fontWeight: 700,
                color: '#ffffff',
                lineHeight: 1.1,
              }}
            >
              Presence
            </div>
            <div
              style={{
                fontSize: CARD.font.brandSub,
                color: '#a5b4fc',
                letterSpacing: 0.5,
                lineHeight: 1.1,
              }}
            >
              FINTECH
            </div>
          </div>
        </header>

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
                borderRadius: 2,
                border: '1px solid #d4d4d8',
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
            <CardText
              fontSize={typography.lastName}
              title={data.lastName}
              style={{
                fontWeight: 700,
                textTransform: 'uppercase',
                color: '#18181b',
              }}
            >
              {data.lastName}
            </CardText>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: mm(1),
                marginTop: mm(0.3),
                minWidth: 0,
              }}
            >
              <CardText
                fontSize={typography.firstName}
                title={data.firstName}
                style={{ fontWeight: 700, color: '#52525b', flex: 1, minWidth: 0 }}
              >
                {data.firstName}
              </CardText>
              {genderLabel ? (
                <span
                  style={{
                    flexShrink: 0,
                    fontSize: CARD.font.gender,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: '#4f46e5',
                    lineHeight: 1.1,
                  }}
                >
                  {genderLabel}
                </span>
              ) : null}
            </div>

            <div
              style={{
                marginTop: mm(0.8),
                alignSelf: 'flex-start',
                maxWidth: '100%',
                padding: `${mm(0.5)}px ${mm(1)}px`,
                backgroundColor: '#eef2ff',
                boxSizing: 'border-box',
              }}
            >
              <CardText
                fontSize={CARD.font.matricule}
                title={matricule}
                style={{
                  fontWeight: 700,
                  fontFamily: 'Consolas, Monaco, monospace',
                  color: '#3730a3',
                }}
              >
                {matricule}
              </CardText>
            </div>

            {classLine ? (
              <DetailRow label="Classe" value={classLine} fontSize={typography.detailValue} />
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
                margin: `${mm(0.5)}px 0 0`,
                width: CARD.qr.colWidth,
                textAlign: 'center',
                fontSize: CARD.font.qrLabel,
                fontWeight: 700,
                lineHeight: 1.15,
                color: '#4f46e5',
              }}
            >
              Scanner pour la présence
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
            borderTop: '1px solid #e4e4e7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: CARD.footer.paddingTop,
            paddingBottom: CARD.footer.paddingBottom,
            boxSizing: 'border-box',
          }}
        >
          <CardText
            fontSize={CARD.font.validity}
            style={{ fontWeight: 700, color: '#71717a', flex: 1 }}
          >
            {validity}
          </CardText>
          <span
            style={{
              flexShrink: 0,
              fontSize: CARD.font.microId,
              fontFamily: 'Consolas, Monaco, monospace',
              color: '#d4d4d8',
              marginLeft: mm(1.5),
              lineHeight: 1.1,
              whiteSpace: 'nowrap',
            }}
          >
            PF·{data.studentId}
          </span>
        </footer>
      </div>
    )
  },
)

StudentCardPreview.displayName = 'StudentCardPreview'
