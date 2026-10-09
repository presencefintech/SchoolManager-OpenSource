/** Emblèmes RDC simplifiés — impression monochrome-friendly, sans asset externe. */

export function DrcFlag({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 60 40"
      className={className}
      aria-hidden
      role="img"
    >
      <title>Drapeau de la République Démocratique du Congo</title>
      <rect width="60" height="40" fill="#007fff" />
      <polygon points="0,40 60,0 60,8 8,40" fill="#f7d618" />
      <polygon points="0,40 60,0 60,14 14,40" fill="#ce1021" />
      <polygon points="0,40 60,0 60,10 10,40" fill="#f7d618" />
      <polygon
        points="12,8 13.2,11.5 17,11.5 14,13.7 15.2,17.2 12,15 8.8,17.2 10,13.7 7,11.5 10.8,11.5"
        fill="#f7d618"
      />
    </svg>
  )
}

export function DrcCoatOfArms({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      aria-hidden
      role="img"
    >
      <title>Armoiries de la République Démocratique du Congo</title>
      <circle cx="32" cy="32" r="30" fill="#007fff" stroke="#111" strokeWidth="1.5" />
      <circle cx="32" cy="32" r="22" fill="#f7d618" />
      <circle cx="32" cy="32" r="14" fill="#ce1021" />
      <polygon
        points="32,20 34,26 40,26 35,30 37,36 32,32 27,36 29,30 24,26 30,26"
        fill="#f7d618"
      />
      <text
        x="32"
        y="58"
        textAnchor="middle"
        fontSize="5"
        fontFamily="Arial, Helvetica, sans-serif"
        fill="#111"
        fontWeight="700"
      >
        JUSTICE PAIX TRAVAIL
      </text>
    </svg>
  )
}
