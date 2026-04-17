import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'

interface LandingPageProps {
  onEnter: () => void
  onOpenList: () => void
}

const fadeUp = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
}
const stagger = { visible: { transition: { staggerChildren: 0.1 } } }

function Reveal({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-50px' })
  return (
    <motion.div ref={ref} variants={stagger} initial="hidden" animate={inView ? 'visible' : 'hidden'} style={style}>
      {children}
    </motion.div>
  )
}

const features = [
  { num: '01', title: 'La wishlist', body: "Épinglez ensemble les adresses qui vous font envie. Restaurants, cafés, bars — votre liste commune, toujours à portée." },
  { num: '02', title: 'Ce soir, on va où ?', body: "L'indécision, c'est fini. Quand vous hésitez, Kaki tire au sort et choisit pour vous. Un bouton, une décision." },
  { num: '03', title: 'Après le dîner', body: "Swipez à droite si vous avez adoré, à gauche si c'était décevant. Votre mémoire culinaire à deux, construite au fil des sorties." },
]

export default function LandingPage({ onEnter, onOpenList }: LandingPageProps) {
  const heroRef    = useRef(null)
  const heroInView = useInView(heroRef, { once: true })

  return (
    <div className="flex flex-col overflow-y-auto"
      style={{ height: '100dvh', background: 'var(--bg)', WebkitOverflowScrolling: 'touch' as const }}>

      {/* ── NAV ── */}
      <motion.nav
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.1 }}
        className="flex items-center justify-between flex-shrink-0"
        style={{ position: 'sticky', top: 0, zIndex: 100, padding: '16px 24px',
          background: 'rgba(13,14,11,0.82)', backdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--border)' }}>
        <span className="font-display font-medium"
          style={{ fontSize: '1.15rem', color: 'var(--cream)', fontStyle: 'italic', letterSpacing: '0.1em' }}>
          kaki
        </span>
        <div className="flex items-center gap-3">
          <button onClick={onOpenList} className="font-ui"
            style={{ fontSize: '11px', color: 'var(--cream-dim)', letterSpacing: '0.13em', textTransform: 'uppercase',
              background: 'none', border: 'none', cursor: 'pointer' }}>
            Restaurants
          </button>
          <button onClick={onEnter} className="font-ui font-medium"
            style={{ fontSize: '11px', color: 'var(--bg)', background: 'var(--cream)',
              padding: '7px 16px', borderRadius: '99px', letterSpacing: '0.07em', border: 'none', cursor: 'pointer' }}>
            Ouvrir →
          </button>
        </div>
      </motion.nav>

      {/* ── HERO ── */}
      <div ref={heroRef} className="relative flex flex-col justify-end flex-shrink-0"
        style={{ minHeight: '92dvh',
          background: [
            'linear-gradient(to bottom, rgba(13,14,11,0.1) 0%, rgba(13,14,11,0.42) 50%, rgba(13,14,11,0.97) 100%)',
            "url('/ambiance.jpg')",
          ].join(', '),
          backgroundSize: 'cover', backgroundPosition: 'center 40%', backgroundRepeat: 'no-repeat' }}>
        <div style={{ padding: '0 28px 52px' }}>
          <motion.p
            initial={{ opacity: 0 }} animate={heroInView ? { opacity: 1 } : {}} transition={{ delay: 0.25 }}
            className="font-ui"
            style={{ fontSize: '10px', letterSpacing: '0.22em', color: 'rgba(244,239,227,0.45)',
              textTransform: 'uppercase', marginBottom: '18px' }}>
            Sara & Eden · Paris
          </motion.p>

          {['Vos', 'tables', 'à deux.'].map((word, i) => (
            <motion.h1 key={word}
              initial={{ opacity: 0, y: 32 }} animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.85, delay: 0.3 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="font-display"
              style={{ fontSize: 'clamp(3.6rem, 15vw, 5.2rem)', fontWeight: 400, fontStyle: 'italic',
                lineHeight: 0.96, letterSpacing: '-0.01em', display: 'block', marginBottom: '4px',
                color: i === 1 ? 'var(--kaki-light)' : 'var(--cream)' }}>
              {word}
            </motion.h1>
          ))}

          <motion.p
            initial={{ opacity: 0, y: 14 }} animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.65, delay: 0.65 }} className="font-ui"
            style={{ fontSize: '14px', color: 'var(--cream-dim)', lineHeight: 1.65, marginTop: '22px', maxWidth: '300px' }}>
            Le carnet de restaurants de Sara & Eden.
            Des adresses à explorer, des souvenirs à garder.
          </motion.p>

          <motion.button
            initial={{ opacity: 0, y: 12 }} animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.55, delay: 0.85 }}
            onClick={onEnter} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }}
            className="font-ui font-semibold"
            style={{ marginTop: '32px', padding: '16px 28px', borderRadius: '14px', background: 'var(--cream)',
              color: 'var(--bg)', fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase',
              border: 'none', cursor: 'pointer', display: 'block', width: '100%' }}>
            Ouvrir la carte
          </motion.button>

          <motion.div
            initial={{ opacity: 0 }} animate={heroInView ? { opacity: 1 } : {}}
            transition={{ delay: 1.1 }}
            className="flex items-center justify-center gap-2" style={{ marginTop: '24px' }}>
            <span className="font-ui" style={{ fontSize: '9px', color: 'rgba(244,239,227,0.25)', letterSpacing: '0.2em' }}>DÉFILER</span>
            <motion.span animate={{ y: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
              style={{ color: 'rgba(244,239,227,0.25)', fontSize: '10px' }}>↓</motion.span>
          </motion.div>
        </div>
      </div>

      {/* ── PHOTO STRIP ── */}
      <div style={{ paddingTop: '40px', overflow: 'hidden' }}>
        <div style={{ padding: '0 28px', marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p className="font-ui" style={{ fontSize: '9px', letterSpacing: '0.22em', color: 'var(--muted)', textTransform: 'uppercase' }}>Nos tables</p>
          <span style={{ fontSize: '9px', color: 'var(--border-2)', letterSpacing: '0.1em' }}>→ défiler</span>
        </div>
        <div style={{ display: 'flex', gap: '10px', padding: '0 28px 44px', overflowX: 'auto',
          scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' as const, scrollSnapType: 'x mandatory' }}>
          {[
            { url: '/ambiance.jpg',                                                                      label: 'Notre table',      w: '256px', h: '316px' },
            { url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80',           label: 'Septime',          w: '176px', h: '240px' },
            { url: 'https://images.unsplash.com/photo-1559339352-11d035aa65ce?w=600&q=80',              label: 'Frenchie',         w: '176px', h: '240px' },
            { url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80',           label: 'Clown Bar',        w: '176px', h: '240px' },
            { url: 'https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?w=600&q=80',           label: 'Café de Flore',    w: '176px', h: '240px' },
            { url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&q=80',              label: 'Le Grand Véfour',  w: '176px', h: '240px' },
          ].map((p, i) => (
            <motion.div key={p.label}
              initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-20px' }}
              transition={{ duration: 0.45, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
              style={{ flexShrink: 0, width: p.w, height: p.h, borderRadius: '14px', overflow: 'hidden',
                position: 'relative', background: 'var(--surface-3)', scrollSnapAlign: 'start' }}>
              <img src={p.url} alt={p.label} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0,
                background: 'linear-gradient(to top, rgba(13,14,11,0.88) 0%, transparent 100%)',
                padding: '24px 12px 12px' }}>
                {i === 0 && <p className="font-ui" style={{ fontSize: '9px', letterSpacing: '0.2em', color: 'var(--kaki-light)', textTransform: 'uppercase', marginBottom: '3px' }}>Sara & Eden</p>}
                <p className="font-display font-medium" style={{ fontSize: i === 0 ? '1.05rem' : '0.82rem', color: 'var(--cream)', fontStyle: 'italic', lineHeight: 1 }}>{p.label}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── FEATURES ── */}
      <div style={{ padding: '0 28px 80px' }}>
        {features.map((f, i) => (
          <Reveal key={f.num} style={{ paddingTop: i === 0 ? '64px' : '56px', paddingBottom: '56px', borderTop: '1px solid var(--border)' }}>
            <motion.div variants={fadeUp} className="flex items-center justify-between" style={{ marginBottom: '18px' }}>
              <span className="font-display" style={{ fontSize: '0.68rem', color: 'var(--muted)', letterSpacing: '0.1em', fontStyle: 'italic' }}>{f.num}</span>
            </motion.div>
            <motion.h2 variants={fadeUp} className="font-display font-medium"
              style={{ fontSize: 'clamp(1.9rem, 8vw, 2.6rem)', color: 'var(--cream)', lineHeight: 1.1, marginBottom: '16px', letterSpacing: '-0.01em' }}>
              {f.title}
            </motion.h2>
            <motion.p variants={fadeUp} className="font-ui"
              style={{ fontSize: '14px', color: 'var(--cream-dim)', lineHeight: 1.8, maxWidth: '320px' }}>
              {f.body}
            </motion.p>
          </Reveal>
        ))}
      </div>

      {/* ── À PROPOS ── */}
      <div id="apropos" style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', scrollMarginTop: '64px' }}>
        <Reveal style={{ padding: '64px 28px' }}>
          <motion.p variants={fadeUp} className="font-ui"
            style={{ fontSize: '9px', letterSpacing: '0.22em', color: 'var(--kaki)', textTransform: 'uppercase', marginBottom: '24px' }}>
            À propos
          </motion.p>
          <motion.h2 variants={fadeUp} className="font-display"
            style={{ fontSize: 'clamp(1.5rem, 6.5vw, 2rem)', fontWeight: 400, fontStyle: 'italic', color: 'var(--cream)', lineHeight: 1.3, marginBottom: '24px' }}>
            "Parce que les meilleures tables méritent d'être partagées."
          </motion.h2>
          <motion.p variants={fadeUp} className="font-ui"
            style={{ fontSize: '14px', color: 'var(--cream-dim)', lineHeight: 1.85, maxWidth: '320px', marginBottom: '16px' }}>
            Kaki est né d'une simple observation : on passe plus de temps à décider où aller qu'à profiter de l'expérience.
          </motion.p>
          <motion.p variants={fadeUp} className="font-ui"
            style={{ fontSize: '14px', color: 'var(--cream-dim)', lineHeight: 1.85, maxWidth: '320px' }}>
            Un outil simple, intime, fait pour deux.
          </motion.p>
        </Reveal>
      </div>

      {/* ── CTA ── */}
      <div style={{ padding: '64px 28px 72px', textAlign: 'center' }}>
        <Reveal>
          <motion.p variants={fadeUp} className="font-display"
            style={{ fontSize: 'clamp(1.3rem, 5.5vw, 1.75rem)', color: 'var(--cream-dim)', lineHeight: 1.3, marginBottom: '24px', fontStyle: 'italic' }}>
            On commence ?
          </motion.p>
          <motion.button variants={fadeUp} onClick={onEnter} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            className="font-ui font-semibold"
            style={{ padding: '13px 32px', borderRadius: '99px', background: 'var(--cream)', color: 'var(--bg)',
              fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase', border: 'none', cursor: 'pointer' }}>
            Ouvrir la carte →
          </motion.button>
        </Reveal>
      </div>

      {/* ── FOOTER ── */}
      <div style={{ padding: '20px 28px 36px', borderTop: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between">
          <span className="font-display font-medium" style={{ fontSize: '0.95rem', color: 'var(--muted)', fontStyle: 'italic' }}>kaki</span>
          <span className="font-ui" style={{ fontSize: '9px', color: 'var(--muted)', letterSpacing: '0.12em' }}>avec ♡ pour Sara & Eden</span>
        </div>
      </div>

    </div>
  )
}
