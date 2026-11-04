import { Link } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import Scramble from '../components/Scramble.jsx'
import { VALUES } from '../session.js'

// Written as a man page: `man grusiber`
export default function About() {
  return (
    <Layout>
      <article className="man">
        <header className="man-head dim">
          <span>GRUSIBER(7)</span>
          <span>Topluluk Kılavuzu</span>
          <span>GRUSIBER(7)</span>
        </header>

        <h1 className="glitch man-title" data-text="man grusiber">
          <Scramble text="man grusiber" duration={800} />
        </h1>

        <Section name="NAME">
          <p>grusiber — giresun üniversitesi siber güvenlik topluluğu</p>
        </Section>

        <Section name="SYNOPSIS">
          <p>
            <span className="accent">grusiber</span>{' '}
            {['merak', 'öğren', 'kurcala', 'paylaş', 'tekrarla'].map((o) => (
              <span key={o} className="nowrap">[--{o}] </span>
            ))}
          </p>
        </Section>

        <Section name="DESCRIPTION">
          <p>
            giresun üniversitesi'nde siber güvenliğin neden bu kadar önemli olduğunu anlatmaya çalışan, buna karşı neler
            yapılabilir diye kafa yoran bir topluluğuz.
          </p>
          <p>
            etkinlikler, projeler, bolca kurcalama ve gece 3'te "bu neden çalışmıyor" anları. hepsi var. kısaca:
            sistemlerin nasıl kırıldığını öğreniyoruz ki nasıl korunacağını bilelim.
          </p>
        </Section>

        <Section name="VALUES">
          <dl className="man-opts">
            {VALUES.map(([key, text], i) => (
              <div key={key} className="fade-in" style={{ animationDelay: `${0.3 + i * 0.08}s` }}>
                <dt className="accent">--{key}</dt>
                <dd>{text}</dd>
              </div>
            ))}
          </dl>
        </Section>

        <Section name="BUGS">
          <p>kahve stoğu sürekli bitiyor. çözüm aranıyor.</p>
        </Section>

        <Section name="SEE ALSO">
          <p>
            <Link to="/">home(1)</Link>, merak(7), sen(1)
          </p>
        </Section>

        <footer className="man-head dim">
          <span>grusiber 0.2</span>
          <span>{new Date().toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}</span>
          <span>GRUSIBER(7)</span>
        </footer>
      </article>
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
