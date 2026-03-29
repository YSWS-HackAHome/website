import { Reveal } from '../components/Reveal';

export default function ErrorPage() {
    return (
        <main style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            padding: '2rem',
            background: '#F5F0E8'
        }}>
            <Reveal>
                <h1 style={{
                    fontFamily: 'Syne, sans-serif',
                    fontSize: 'clamp(5rem, 15vw, 12rem)',
                    fontWeight: 800,
                    color: '#FF5C1A',
                    lineHeight: 0.8,
                    letterSpacing: '-0.05em',
                    margin: 0
                }}>
                    404
                </h1>

                <h2 style={{
                    fontFamily: 'Instrument Serif, serif',
                    fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
                    fontStyle: 'italic',
                    margin: '1.5rem 0',
                    color: '#1A1410'
                }}>
                    {"Circuit Not Found"}
                </h2>

                <p style={{
                    fontFamily: 'DM Mono, monospace',
                    color: '#6B5B4E',
                    maxWidth: '40ch',
                    margin: '0 auto 2.5rem',
                    lineHeight: 1.6,
                    fontSize: '0.9rem'
                }}>
                    The hardware you're looking for isn't responding.
                    The connection timed out or the page was de-soldered.
                </p>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                    <a href="/" className="btn-primary" style={{ textDecoration: 'none' }}>
                        <span>← Back Home</span>
                    </a>
                </div>
            </Reveal>
        </main>
    );
}