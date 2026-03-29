import { useState, useEffect, useRef } from 'react'
import { useInView } from 'react-intersection-observer'
import { Cursor } from "../components/Cursor";
import { Reveal } from "../components/Reveal";
import { CountStat } from "../components/CountStat";

// ─── Global styles  ────────────────────────────────────────────
const globalStyles = `
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
  @keyframes underline-in { to { transform: scaleX(1); } }
  @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
  @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }

  .hero-underline { position: relative; display: inline-block; }
  .hero-underline::after {
    content: '';
    position: absolute; bottom: 4px; left: 0; right: 0;
    height: 4px; background: #C8F135;
    transform: scaleX(0); transform-origin: left;
    animation: underline-in 0.8s 0.6s cubic-bezier(.22,1,.36,1) forwards;
  }

  .device-card { transition: transform 0.3s ease, box-shadow 0.3s ease; }
  .device-card:hover { transform: rotate(0deg) translateY(-4px) !important; box-shadow: 8px 10px 0 #1A1410 !important; }

  .step-item { transition: background 0.25s, color 0.25s; }
  .step-item:hover { background: #1A1410; color: #F5F0E8; }
  .step-item:hover .step-num { color: #C8F135 !important; }
  .step-item:hover .step-body { color: rgba(245,240,232,0.65) !important; }
  .step-num { transition: color 0.25s; }

  .tier-card { transition: all 0.25s; cursor: none; }
  .tier-card:hover { background: rgba(255,255,255,0.2) !important; transform: translateX(6px); }

  .perks-item { transition: background 0.2s; }
  .perks-item:hover { background: rgba(255,255,255,0.2) !important; }

  .marquee-track { animation: marquee 18s linear infinite; }
  .marquee-track:hover { animation-play-state: paused; }

  .float-tag-1 { animation: float 3s ease-in-out infinite; }
  .float-tag-2 { animation: float 3s ease-in-out 1s infinite; }
  .float-tag-3 { animation: float 3s ease-in-out 2s infinite; }

  .nav-link { transition: color 0.2s; }
  .nav-link:hover { color: #FF5C1A !important; }
  .nav-cta-link { transition: background 0.2s, color 0.2s !important; }
  .nav-cta-link:hover { background: #FF5C1A !important; color: #1A1410 !important; }

  .footer-link { transition: color 0.2s; }
  .footer-link:hover { color: #C8F135 !important; }

  .sponsor-cta-btn { transition: all 0.2s; }
  .sponsor-cta-btn:hover { background: #C8F135 !important; color: #1A1410 !important; }

  input, select, textarea { outline: none; transition: border-color 0.2s; }
  input:focus, select:focus, textarea:focus { border-color: #FF5C1A !important; }

  select {
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%231A1410' stroke-width='1.5' fill='none'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 1rem center;
    background-color: #fff;
  }

  .faq-question:hover {
    color: #FF5C1A !important;
  }

  /* ─── Hero responsive ─────────────────────────────── */
  .hero-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    min-height: 100vh;
    padding: 5rem 3rem 0;
  }
  .hero-left {
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding-right: 4rem;
    padding-bottom: 4rem;
  }
  .hero-stats {
    display: flex;
    gap: 2.5rem;
    margin-top: 3rem;
    padding-top: 2rem;
    border-top: 1px solid rgba(26,20,16,0.12);
    flex-wrap: wrap;
  }
  .hero-cta-row {
    display: flex;
    gap: 1rem;
    align-items: center;
    flex-wrap: wrap;
  }

  /* ─── Steps responsive ─────────────────────────────── */
  .steps-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    border: 1.5px solid rgba(26,20,16,0.15);
  }
  .step-col-border {
    border-right: 1.5px solid rgba(26,20,16,0.12);
  }

  /* ─── About band responsive ────────────────────────── */
  .about-inner {
    display: flex;
    gap: 4rem;
    align-items: center;
  }
  .about-badge {
    white-space: nowrap;
    flex-shrink: 0;
  }

  /* ─── Footer responsive ────────────────────────────── */
  .footer-inner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1.5rem;
  }

  /* ─── MOBILE ────────────────────────────────────────── */
  @media (max-width: 768px) {

    /* Hero */
    .hero-grid {
      grid-template-columns: 1fr;
      min-height: auto;
      padding: 5rem 1.5rem 3rem;
    }
    .hero-left {
      padding-right: 0;
      padding-bottom: 0;
    }
    .hero-right {
      display: none !important;
    }
    .hero-cta-row {
      flex-direction: column;
      align-items: stretch;
    }
    .hero-cta-row .btn-primary,
    .hero-cta-row .btn-ghost {
      text-align: center;
      width: 100%;
    }
    .hero-stats {
      gap: 1.5rem;
      margin-top: 2rem;
    }

    /* Steps */
    .steps-grid {
      grid-template-columns: 1fr;
      border: 1.5px solid rgba(26,20,16,0.15);
    }
    .step-col-border {
      border-right: none;
      border-bottom: 1.5px solid rgba(26,20,16,0.12);
    }

    /* About band */
    .about-inner {
      flex-direction: column;
      gap: 2rem;
      align-items: flex-start;
    }
    .about-badge {
      white-space: normal;
      width: 100%;
      text-align: center;
    }

    /* Sections padding */
    .section-pad {
      padding: 4rem 1.5rem !important;
    }
    .about-pad {
      padding: 2.5rem 1.5rem !important;
    }

    /* Footer */
    .footer-inner {
      flex-direction: column;
      align-items: flex-start;
      gap: 1.25rem;
    }

    /* FAQ */
    .faq-container {
      padding: 0 !important;
    }

    /* Hide custom cursor on touch */
    .custom-cursor { display: none !important; }
  }

  @media (max-width: 480px) {
    .hero-grid {
      padding: 4.5rem 1.25rem 2.5rem;
    }
    .section-pad {
      padding: 3rem 1.25rem !important;
    }
    .about-pad {
      padding: 2rem 1.25rem !important;
    }
    .footer-inner {
      padding: 2rem 1.25rem !important;
    }
  }
`

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
    return (
        <section id="home" className="hero-grid">
            {/* Left */}
            <div className="hero-left">
                <h1 style={{
                    fontFamily: 'Syne, sans-serif', fontSize: 'clamp(3.5rem, 7vw, 6.5rem)',
                    fontWeight: 800, lineHeight: 0.92, letterSpacing: '-0.04em', marginBottom: '2rem'
                }}>
                    Hack<br />
                    <span style={{ color: '#FF5C1A', fontStyle: 'italic', fontFamily: 'Instrument Serif, serif' }}>your</span><br />
                    <span className="hero-underline">Home.</span>
                </h1>

                <p style={{ fontSize: '0.95rem', lineHeight: 1.7, color: '#6B5B4E', marginBottom: '2.5rem', maxWidth: '38ch' }}>
                    Mod, tweak, and upgrade your devices — earn grants to buy IoT hardware.
                    No experience required. Just curiosity, a screwdriver, and something at home worth hacking.
                </p>

                <div className="hero-cta-row">
                    <a className="btn-primary" href="https://rsvp.hackclub.community/hack-a-home" target="_blank"><span>RSVP to Join →</span></a>
                    <a className="btn-ghost" href="/api/login">Dashboard</a>
                </div>

                <div className="hero-stats">
                    <CountStat target={2} label="Builders Joining" />
                    <CountStat target={0} label="Projects submitted" />
                    <CountStat target={3} label="Week Program" />
                </div>
            </div>

            {/* Right Side Addition */}
            <div className="hero-right" style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '400px'
            }}>
                {/* Decorative floating elements */}
                <div className="float-tag-1" style={{ position: 'absolute', top: '20%', left: '10%', background: '#C8F135', padding: '0.5rem 1rem', fontWeight: 800, fontFamily: 'Syne', fontSize: '0.8rem', transform: 'rotate(-5deg)', zIndex: 2 }}>
                    ESP32_WROOM
                </div>
                <div className="float-tag-2" style={{ position: 'absolute', bottom: '25%', right: '15%', background: '#FF5C1A', color: 'white', padding: '0.5rem 1rem', fontWeight: 800, fontFamily: 'Syne', fontSize: '0.8rem', transform: 'rotate(8deg)', zIndex: 2 }}>
                    MQTT_CONNECTED
                </div>

                {/* Main Visual Card */}
                <div className="device-card" style={{
                    width: '80%',
                    maxWidth: '400px',
                    aspectRatio: '4/3',
                    background: '#FFFFFF',
                    border: '2px solid #1A1410',
                    boxShadow: '12px 12px 0px #C8F135',
                    position: 'relative',
                    padding: '1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transform: 'rotate(-2deg)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ width: '40px', height: '40px', border: '2px solid #1A1410', borderRadius: '50%', display: 'grid', placeItems: 'center', fontWeight: 'bold' }}>⚡</div>
                        <div style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: '0.7rem', color: '#6B5B4E' }}>
                            STATUS: COMPILING...<br />
                            VOLTAGE: 3.3V
                        </div>
                    </div>

                    {/* Faux "Circuit" lines */}
                    <div style={{ flex: 1, margin: '1rem 0', border: '1px dashed rgba(26,20,16,0.2)', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: '20%', left: '-10%', width: '120%', height: '1px', background: 'rgba(26,20,16,0.1)', transform: 'rotate(15deg)' }} />
                        <div style={{ position: 'absolute', top: '60%', left: '-10%', width: '120%', height: '1px', background: 'rgba(26,20,16,0.1)', transform: 'rotate(-10deg)' }} />
                        <div style={{ padding: '1rem', fontFamily: 'monospace', fontSize: '0.65rem' }}>
                            <span style={{ color: '#FF5C1A' }}>void</span> setup() {'{'}<br />
                            &nbsp;&nbsp;pinMode(LED, OUTPUT);<br />
                            &nbsp;&nbsp;Serial.begin(115200);<br />
                            {'}'}
                        </div>
                    </div>

                    <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.02em' }}>
                        SMART_HOME_V1.0
                    </div>
                </div>
            </div>
        </section>
    )
}
// ─── Marquee ──────────────────────────────────────────────────────────────────

const marqueeItems = [
    'Smart Home Hacks',
    'IoT Firmware Modding',
    'Raspberry Pi Projects',
    'Arduino Builds',
    'Open Source Hardware',
    'Teen Builders Worldwide',
    'Hack Club Network'
]

function Marquee() {
    const doubled = [...marqueeItems, ...marqueeItems]
    return (
        <div style={{ padding: '2rem 0', borderTop: '1.5px solid rgba(26,20,16,0.12)', borderBottom: '1.5px solid rgba(26,20,16,0.12)', overflow: 'hidden', background: '#F5F0E8' }}>
            <div className="marquee-track" style={{ display: 'flex', gap: '3rem', width: 'max-content' }}>
                {doubled.map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.9rem', whiteSpace: 'nowrap', color: '#6B5B4E', letterSpacing: '0.02em' }}>
                        <span style={{ width: 6, height: 6, background: '#FF5C1A', borderRadius: '50%', flexShrink: 0, display: 'inline-block' }} />
                        {item}
                    </div>
                ))}
            </div>
        </div>
    )
}

// ─── About Band ───────────────────────────────────────────────────────────────

function AboutBand() {
    return (
        <Reveal>
            <div className="about-pad" style={{
                background: '#1A1410', color: '#F5F0E8', padding: '3rem',
                overflow: 'hidden', position: 'relative'
            }}>
                <div className="about-inner">
                    <div style={{ flex: 1 }}>
                        <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(1.3rem, 4vw, 1.8rem)', fontWeight: 800, marginBottom: '1rem' }}>
                            Built on <em style={{ fontFamily: 'Instrument Serif, serif', color: '#FF5C1A' }}>Hack Club's</em> network of 100,000+ teen hackers
                        </h2>
                        <p style={{ fontSize: '0.9rem', lineHeight: 1.8, color: 'rgba(245,240,232,0.7)', maxWidth: '45ch' }}>
                            Hack a Home is a YSWS — a "You Ship, We Ship" program. Participants build something real, share it with the world, and receive grant funding to keep building. Powered by the Hack Club community and backed by sponsors who believe teenagers can change what "home" means.
                        </p>
                    </div>
                    <a
                        className="about-badge"
                        style={{
                            background: '#C8F135',
                            color: '#1A1410',
                            padding: '0.85rem 1.5rem',
                            fontFamily: 'Syne, sans-serif',
                            fontWeight: 700, fontSize: '0.85rem',
                            display: 'inline-block',
                            textDecoration: 'none',
                        }}
                        href="https://hackclub.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Hack Club Verified ✦
                    </a>
                </div>
            </div>
        </Reveal>
    )
}


// ─── How It Works ─────────────────────────────────────────────────────────────

const steps = [
    { num: '01', icon: '🏠', title: 'Find something to hack', body: 'Look around your home and see what you have. Got an old router, a dumb thermostat, a blinking LED strip? Choose it!' },
    { num: '02', icon: '🔧', title: 'Mod, tweak, or upgrade it', body: "Write a firmware for it. Flash it. Rewire it. Anything goes as long as you're making it smarter, faster, or cooler than before!" },
    { num: '03', icon: '🚢', title: 'Ship your project', body: 'Document your build by posting Devlogs periodically. Post it on GitHub. Share it with the community and record a short demo to show what you made.' },
    { num: '04', icon: '💸', title: 'Receive your IoT grant', body: "We send you a grant to buy your next IoT device — ESP32, Raspberry Pi, sensors, modules. Hack the next thing. Repeat." },
]

function HowItWorks() {
    return (
        <section id="howitworks" className="section-pad" style={{ padding: '6rem 3rem' }}>
            <Reveal style={{ marginBottom: '4rem' }}>
                <div style={{ fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#FF5C1A', fontWeight: 500, marginBottom: '1rem' }}>How It Works</div>
                <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(2rem, 4vw, 3.5rem)', lineHeight: 1.05, letterSpacing: '-0.03em' }}>
                    Four steps from idea<br />to IoT hardware in hand.
                </h2>
            </Reveal>
            <Reveal>
                <div className="steps-grid">
                    {steps.map((step, i) => (
                        <div key={i} className={`step-item${i < steps.length - 1 ? ' step-col-border' : ''}`} style={{
                            padding: '2rem 1.75rem',
                        }}>
                            <div className="step-num" style={{ fontFamily: 'Syne, sans-serif', fontSize: '3rem', fontWeight: 800, color: 'rgba(26,20,16,0.1)', lineHeight: 1, marginBottom: '1.25rem' }}>{step.num}</div>
                            <div style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }}>{step.icon}</div>
                            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1rem', marginBottom: '0.5rem' }}>{step.title}</div>
                            <div className="step-body" style={{ fontSize: '0.8rem', lineHeight: 1.65, color: '#6B5B4E' }}>{step.body}</div>
                        </div>
                    ))}
                </div>
            </Reveal>
        </section>
    )
}

// ─── FAQ Section ───────────────────────────────────────────────────────────────

const faqs = [
    {
        q: "Who can participate?",
        a: "Any teenager (13-18) anywhere in the world! No prior hardware experience needed — just curiosity and a willingness to learn."
    },
    {
        q: "Do I need to buy hardware first?",
        a: "Nope! Hack something you already have at home. After you ship your project, we'll send you a grant to buy your next IoT device."
    },
    {
        q: "What counts as 'hacking a home'?",
        a: "Anything that modifies, upgrades, or adds smart features to something in your home. Think: smart mirror, automated blinds, custom thermostat, LED mods, voice-controlled gadgets, or even a quirky sensor setup!"
    },
    {
        q: "How do I get the grant?",
        a: "Complete your project, document it in a devlog, share your code on GitHub, and submit a short demo video. Once approved, we'll send you a grant to buy IoT hardware of your choice."
    },
    {
        q: "How much is the grant?",
        a: "Grants typically range from $10–$20 depending on project complexity and needs. Enough for an ESP32, and some sensors!"
    },
    {
        q: "How long do I have?",
        a: "The program runs for a few weeks. You can work at your own pace, but make sure to submit before the deadline to qualify for the grant."
    },
    {
        q: "Can I work with friends?",
        a: "Absolutely! Team up with other builders. Just make sure each person's contribution is clear — everyone who ships gets their own grant."
    },
    {
        q: "What if I get stuck?",
        a: "Join our Slack! The Hack Club community is super supportive — mentors and fellow builders are there to help you troubleshoot."
    }
]

function FAQ() {
    const [openIndex, setOpenIndex] = useState(null)

    const toggleFAQ = (index) => {
        setOpenIndex(openIndex === index ? null : index)
    }

    return (
        <section id="faq" className="section-pad" style={{ padding: '6rem 3rem', background: '#F5F0E8' }}>
            <Reveal style={{ marginBottom: '4rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#FF5C1A', fontWeight: 500, marginBottom: '1rem' }}>
                    Got Questions?
                </div>
                <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(2rem, 4vw, 3.5rem)', lineHeight: 1.05, letterSpacing: '-0.03em' }}>
                    Frequently Asked<br />Questions
                </h2>
            </Reveal>

            <div className="faq-container" style={{ maxWidth: '800px', margin: '0 auto' }}>
                {faqs.map((faq, index) => (
                    <Reveal key={index} delay={index * 50}>
                        <div
                            style={{
                                borderBottom: index < faqs.length - 1 ? '1.5px solid rgba(26,20,16,0.12)' : 'none',
                                cursor: 'pointer'
                            }}
                            onClick={() => toggleFAQ(index)}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '1.5rem 0',
                                    gap: '1rem'
                                }}
                            >
                                <h3
                                    className="faq-question"
                                    style={{
                                        fontFamily: 'Syne, sans-serif',
                                        fontWeight: 600,
                                        fontSize: 'clamp(0.95rem, 3vw, 1.1rem)',
                                        letterSpacing: '-0.02em',
                                        color: '#1A1410',
                                        flex: 1,
                                        transition: 'color 0.2s'
                                    }}
                                >
                                    {faq.q}
                                </h3>
                                <div style={{ width: '24px', height: '24px', position: 'relative', flexShrink: 0 }}>
                                    <div style={{
                                        position: 'absolute', top: '50%', left: '50%',
                                        width: '14px', height: '2px', background: '#FF5C1A',
                                        transform: 'translate(-50%, -50%)', transition: 'transform 0.2s ease'
                                    }} />
                                    <div style={{
                                        position: 'absolute', top: '50%', left: '50%',
                                        width: '2px', height: '14px', background: '#FF5C1A',
                                        transform: `translate(-50%, -50%) ${openIndex === index ? 'rotate(90deg)' : 'rotate(0deg)'}`,
                                        transition: 'transform 0.2s ease'
                                    }} />
                                </div>
                            </div>
                            <div style={{
                                maxHeight: openIndex === index ? '500px' : '0',
                                overflow: 'hidden',
                                transition: 'max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                marginBottom: openIndex === index ? '1.5rem' : '0'
                            }}>
                                <p style={{ fontSize: '0.9rem', lineHeight: 1.7, color: '#6B5B4E', paddingRight: '2rem' }}>
                                    {faq.a}
                                </p>
                            </div>
                        </div>
                    </Reveal>
                ))}
            </div>

            <Reveal style={{ textAlign: 'center', marginTop: '4rem' }}>
                <div style={{ padding: '2rem', background: '#1A1410', color: '#F5F0E8' }}>
                    <p style={{ fontSize: '0.9rem', marginBottom: '1.5rem', color: 'rgba(245,240,232,0.8)' }}>
                        Still have questions? We're here to help!
                    </p>
                    <a
                        href="https://hackclub.enterprise.slack.com/archives/C0APEJDF7RU"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            background: '#C8F135', color: '#1A1410',
                            padding: '0.85rem 2rem',
                            fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.85rem',
                            textDecoration: 'none', display: 'inline-block',
                            transition: 'transform 0.15s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        Join us on Slack →
                    </a>
                </div>
            </Reveal>
        </section>
    )
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
    return (
        <footer style={{ background: '#1A1410', color: '#F5F0E8', padding: '3rem' }}>
            <div className="footer-inner">
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>
                    Hack a Home
                </div>
                <div style={{ display: 'flex', gap: '2rem' }}>
                    <a href="https://github.com/YSWS-HackAHome/" target="_blank" className="footer-link" style={{ fontSize: '0.75rem', color: 'rgba(245,240,232,0.5)', fontWeight: 'bold', letterSpacing: '0.08em', textDecoration: 'none' }}>
                        GitHub
                    </a>
                    <a href="https://hackclub.enterprise.slack.com/archives/C0APEJDF7RU" target="_blank" className="footer-link" style={{ fontSize: '0.75rem', color: 'rgba(245,240,232,0.5)', fontWeight: 'bold', letterSpacing: '0.08em', textDecoration: 'none' }}>
                        Slack
                    </a>
                </div>
                <div style={{ background: '#C8F135', color: '#1A1410', padding: '0.4rem 0.85rem', fontSize: '0.7rem', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    YSWS Program ✦ 2026
                </div>
            </div>
        </footer>
    )
}

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
    return (
        <>
            <style>{globalStyles}</style>
            <Cursor />
            <Hero />
            <Marquee />
            <AboutBand />
            <HowItWorks />
            <FAQ />
            <Footer />
        </>
    )
}