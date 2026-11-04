import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import { INSTAGRAM, VALUES } from '../session.js'

const KEYS = [
  ['h', 'yardım'],
  ['q', 'ana sayfa'],
  ['j', 'aşağı'],
  ['k', 'yukarı'],
  ['gg', 'en üst'],
  ['G', 'en alt'],
]

// `man grusiber`, with less(1) keys and status line.
export default function About() {
  const [help, setHelp] = useState(false)
  const [percent, setPercent] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    let lastG = 0
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.target.closest?.('input, textarea')) return
      if (e.key === 'j') window.scrollBy(0, 48)
      else if (e.key === 'k') window.scrollBy(0, -48)
      else if (e.key === 'G') window.scrollTo(0, document.body.scrollHeight)
      else if (e.key === 'g') {
        if (Date.now() - lastG < 400) window.scrollTo(0, 0)
        lastG = Date.now()
      } else if (e.key === 'h') setHelp((v) => !v)
      else if (e.key === 'q') (help ? setHelp(false) : navigate('/'))
    }
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      setPercent(max > 0 ? Math.round((window.scrollY / max) * 100) : 100)
    }
    onScroll()
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll)
    }
  }, [help, navigate])

  return (
    <Layout>
      <article className="man">
        <header className="man-head dim">
          <span>GRUSIBER(7)</span>
          <span>Topluluk Kılavuzu</span>
          <span>GRUSIBER(7)</span>
        </header>

        {help ? (
          <Section name="KEY BINDINGS">
            <dl className="man-keys">
              {KEYS.map(([k, v]) => (
                <div key={k}>
                  <dt className="accent">{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </Section>
        ) : (
          <>
            <Section name="NAME">
              <p>grusiber — giresun üniversitesi siber güvenlik topluluğu</p>
            </Section>

            <Section name="SYNOPSIS">
              <p>
                <b className="accent">grusiber</b> [<b>OPTIONS</b>]
              </p>
            </Section>

            <Section name="DESCRIPTION">
              <p>giresun üniversitesi'nde siber güvenlik topluluğu.</p>
              <p>öğreniyoruz, kurcalıyoruz, paylaşıyoruz.</p>
            </Section>

            <Section name="OPTIONS">
              <dl className="man-opts">
                {VALUES.map(([key, text]) => (
                  <div key={key}>
                    <dt className="accent">--{key}</dt>
                    <dd>{text}</dd>
                  </div>
                ))}
              </dl>
            </Section>

            <Section name="SEE ALSO">
              <p>
                <Link to="/">home(1)</Link>,{' '}
                <a href={INSTAGRAM} target="_blank" rel="noreferrer">instagram(4)</a>
              </p>
            </Section>

            <Section name="KNOWN BUGS">
              <p>kahve hep bitiyor.</p>
            </Section>
          </>
        )}
      </article>

      <div className="less-status" aria-hidden="true">
        Manual page grusiber(7) {percent}% (h: yardım, q: çık)
      </div>
    </Layout>
  )
}

function Section({ name, children }) {
  return (
    <section className="man-section">
      <h2>{name}</h2>
      <div className="man-body">{children}</div>
    </section>
  )
}
