import { useState, useEffect } from 'react';

export function Cursor() {
    const [pos, setPos] = useState({ x: -100, y: -100 });
    const [hovered, setHovered] = useState(false);
    const [isTouch, setIsTouch] = useState(false);

    useEffect(() => {
        if (window.matchMedia('(pointer: coarse)').matches) {
            setIsTouch(true);
            return;
        }

        const move = (e) => setPos({ x: e.clientX, y: e.clientY });
        const over = (e) => setHovered(e.target.closest('a, button, select, input') !== null);

        window.addEventListener('mousemove', move);
        window.addEventListener('mouseover', over);
        return () => {
            window.removeEventListener('mousemove', move);
            window.removeEventListener('mouseover', over);
        };
    }, []);

    if (isTouch) return null;

    return (
        <>
            < div style={{
                position: 'fixed', left: pos.x, top: pos.y, width: 12, height: 12,
                background: hovered ? '#C8F135' : '#FF5C1A', borderRadius: '50%',
                pointerEvents: 'none', zIndex: 9999,
                transform: `translate(-50%, -50%) scale(${hovered ? 2.5 : 1})`,
                transition: 'transform 0.15s ease, background 0.2s ease'
            }
            } />
            <div style={
                {
                    position: 'fixed', left: pos.x, top: pos.y, width: 36, height: 36,
                    border: '1.5px solid #FF5C1A', borderRadius: '50%',
                    pointerEvents: 'none', zIndex: 9998,
                    transform: `translate(-50%, -50%) scale(${hovered ? 1.5 : 1})`,
                    opacity: hovered ? 0 : 0.6,
                    transition: 'all 0.1s ease'
                }
            } />
        </>
    );
}