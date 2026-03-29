import { Reveal } from '../components/Reveal';

export default function IneligiblePage() {
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
                <div style={{
                    display: 'inline-block',
                    padding: '0.5rem 1rem',
                    background: '#FF5C1A',
                    color: 'white',
                    fontFamily: 'DM Mono, monospace',
                    fontWeight: 800,
                    fontSize: '0.8rem',
                    marginBottom: '1rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em'
                }}>
                    Access_Denied.sys
                </div>

                <h1 style={{
                    fontFamily: 'Syne, sans-serif',
                    fontSize: 'clamp(3rem, 10vw, 8rem)',
                    fontWeight: 800,
                    color: '#1A1410',
                    lineHeight: 0.9,
                    letterSpacing: '-0.05em',
                    margin: 0,
                    textTransform: 'uppercase'
                }}>
                    INELIGIBLE <span style={{ color: '#FF5C1A' }}>_</span>
                </h1>

                <h2 style={{
                    fontFamily: 'Instrument Serif, serif',
                    fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
                    fontStyle: 'italic',
                    margin: '1.5rem 0',
                    color: '#1A1410'
                }}>
                    {"Validation Error: Hardware Requirements Not Met"}
                </h2>

                <p style={{
                    fontFamily: 'DM Mono, monospace',
                    color: '#6B5B4E',
                    maxWidth: '50ch',
                    margin: '0 auto 2.5rem',
                    lineHeight: 1.6,
                    fontSize: '0.9rem'
                }}>
                    Our sensors indicate you don't currently meet the specific criteria
                    for this YSWS grant. This could be due to age, location, or
                    previous grant history.
                    <br /><br />
                    Keep building—there are other circuits to bridge.
                </p>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexDirection: 'column', alignItems: 'center' }}>
                    <a href="/" className="btn-primary" style={{ textDecoration: 'none' }}>
                        <span>RETURN_TO_BASE</span>
                    </a>

                    <a href="https://hackclub.com/slack" target="_blank" rel="noreferrer" style={{
                        fontFamily: 'DM Mono, monospace',
                        fontSize: '0.7rem',
                        color: '#6B5B4E',
                        textDecoration: 'underline',
                        marginTop: '1rem'
                    }}>
                        Questions? Ping us on Slack.
                    </a>
                </div>
            </Reveal>
        </main>
    );
}