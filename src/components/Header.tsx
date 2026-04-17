interface HeaderProps {
  placesCount: number
  wishlistCount: number
  onLogoClick?: () => void
  onOpenList?: () => void
}

export default function Header({ placesCount, wishlistCount, onLogoClick }: HeaderProps) {
  return (
    <header className="flex-shrink-0"
      style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between px-5" style={{ height: '52px' }}>

        {/* Logo → accueil */}
        <button onClick={onLogoClick}
          style={{ background: 'none', border: 'none', cursor: onLogoClick ? 'pointer' : 'default', padding: 0 }}>
          <span className="font-display font-medium"
            style={{ fontSize: '1.45rem', letterSpacing: '0.16em', color: 'var(--cream)', fontStyle: 'italic' }}>
            kaki
          </span>
        </button>

        {/* Compteurs discrets */}
        <div className="flex items-center gap-3">
          {wishlistCount > 0 && (
            <span className="font-ui"
              style={{ fontSize: '10px', padding: '3px 9px', borderRadius: '99px',
                background: 'rgba(196,124,16,0.15)', color: 'var(--accent)',
                border: '1px solid rgba(196,124,16,0.25)', letterSpacing: '0.04em' }}>
              {wishlistCount} à tester
            </span>
          )}
          <span className="font-ui" style={{ fontSize: '11px', color: 'var(--muted)' }}>
            {placesCount} {placesCount === 1 ? 'lieu' : 'lieux'}
          </span>
        </div>
      </div>
    </header>
  )
}
