import { useInView } from 'react-intersection-observer'

export function Reveal({ children, delay = 0, style = {} }) {
    const { ref, inView } = useInView({ threshold: 0.1, triggerOnce: true });
    return (
        <div ref={ref} style={{
            opacity: inView ? 1 : 0,
            transform: inView ? 'translateY(0)' : 'translateY(24px)', // Note: I swapped these so it slides UP into view
            transition: `opacity 0.7s ${delay}ms ease, transform 0.7s ${delay}ms ease`,
            ...style
        }}>
            {children}
        </div>
    );
}