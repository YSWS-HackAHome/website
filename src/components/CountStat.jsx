import { useEffect, useRef } from 'react';
import { useInView } from 'react-intersection-observer';

function useCountUpLogic(target, inView, prefix = '') {
    const ref = useRef(null);
    useEffect(() => {
        if (!inView || !ref.current) return;
        const el = ref.current;
        const duration = 1800;
        const start = performance.now();

        const tick = (now) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            el.textContent = prefix + Math.floor(eased * target).toLocaleString();
            if (progress < 1) requestAnimationFrame(tick);
            else el.textContent = prefix + target.toLocaleString();
        };
        requestAnimationFrame(tick);
    }, [inView, target, prefix]);
    return ref;
}

export function CountStat({ target, prefix = '', suffix = '', label }) {
    const { ref: inViewRef, inView } = useInView({
        threshold: 0.5,
        triggerOnce: true
    });

    const countRef = useCountUpLogic(target, inView, prefix);

    return (
        <div ref={inViewRef}>
            <div
                ref={countRef}
                style={{
                    fontFamily: 'Syne, sans-serif',
                    fontSize: '2rem',
                    fontWeight: 800,
                    color: '#FF5C1A',
                    lineHeight: 1
                }}
            >
                {prefix}0{suffix}
            </div>
            <div style={{
                fontSize: '0.7rem',
                color: '#6B5B4E',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginTop: '0.3rem'
            }}>
                {label}
            </div>
        </div>
    );
}