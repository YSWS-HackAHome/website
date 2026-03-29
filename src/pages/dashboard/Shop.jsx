import React, { useState, useEffect } from 'react';
import { useUser } from './UserContext';
import { Reveal } from '../../components/Reveal';

export default function Shop() {
    const { userData, updateAccount } = useUser();
    const { account } = userData;

    // Mobile Detection
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    const [cart, setCart] = useState(() => {
        const savedCart = localStorage.getItem('cart');
        return savedCart ? JSON.parse(savedCart) : [];
    });

    const [view, setView] = useState('browse');
    const [isProcessing, setIsProcessing] = useState(false);
    const [products, setProducts] = useState([]);
    const [permanentItems, setPermanentItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // ... (Keep existing fetchShopData, useEffect for cart, calculateTotal, etc. unchanged)

    useEffect(() => {
        const fetchShopData = async () => {
            try {
                const response = await fetch('/api/shop');
                if (!response.ok) throw new Error('Failed to fetch shop data');
                const data = await response.json();
                setProducts(data.inventory || []);
                setPermanentItems(data.permanent_fees || []);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchShopData();
    }, []);

    useEffect(() => {
        localStorage.setItem('cart', JSON.stringify(cart));
    }, [cart]);

    const calculateTotal = () => {
        const cartTotal = cart.reduce((s, i) => s + (i.price * i.quantity), 0);
        const feesTotal = permanentItems.reduce((s, fee) => s + (fee.price * fee.quantity), 0);
        return cartTotal + feesTotal;
    };

    const total = calculateTotal();
    const remainingBalance = account.balance - total;

    const renderThumb = (thumb) => {
        if (!thumb) return <span style={{ fontSize: isMobile ? '3rem' : '4rem' }}>📦</span>;
        const isBase64 = thumb.startsWith('data:image');
        const isEmoji = !isBase64 && thumb.length <= 2;
        if (isEmoji) return <span style={{ fontSize: isMobile ? '3rem' : '4rem' }}>{thumb}</span>;
        return <img src={thumb} alt="product" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
    };

    const addToCart = (product) => {
        setCart(prevCart => {
            const existing = prevCart.find(item => item.id === product.id);
            if (existing) {
                return prevCart.map(item =>
                    item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prevCart, { ...product, quantity: 1 }];
        });
    };

    const updateQuantity = (id, delta) => {
        setCart(prevCart => prevCart.map(item => {
            if (item.id === id) {
                const newQty = Math.max(0, item.quantity + delta);
                return { ...item, quantity: newQty };
            }
            return item;
        }).filter(item => item.quantity > 0));
    };

    const removeItem = (id) => setCart(prevCart => prevCart.filter(item => item.id !== id));

    const handlePurchase = async () => {
        if (account.balance < total) {
            alert(`Insufficient balance.`);
            return;
        }
        setIsProcessing(true);
        try {
            const purchaseItems = cart.map(item => ({ id: item.id, quantity: item.quantity }));
            const response = await fetch('/api/purchase', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: purchaseItems })
            });
            if (response.ok) {
                const result = await response.json();
                updateAccount({ balance: result.remaining_balance });
                setCart([]);
                setView('browse');
                alert(`Success!`);
            } else {
                alert(`Failed`);
            }
        } catch (error) {
            alert("Network error.");
        } finally {
            setIsProcessing(false);
        }
    };

    if (loading) return <div style={{ textAlign: 'center', padding: '4rem' }}><p>Loading...</p></div>;

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {/* Responsive Header */}
            <header style={{
                marginBottom: isMobile ? '2rem' : '4rem',
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                justifyContent: 'space-between',
                alignItems: isMobile ? 'flex-start' : 'flex-end',
                gap: '1.5rem'
            }}>
                <div>
                    <h2 style={{
                        fontFamily: 'Syne, sans-serif',
                        fontSize: isMobile ? '2.2rem' : '3.5rem',
                        fontWeight: 800,
                        lineHeight: 1
                    }}>
                        FACTORY <span style={{ color: 'var(--accent-orange)' }}>STORE</span>
                    </h2>
                    <div style={{ height: '6px', width: '60px', background: 'var(--accent-lime)', marginTop: '0.5rem' }}></div>
                </div>
                <button
                    className="btn-primary"
                    onClick={() => setView(v => v === 'browse' ? 'cart' : 'browse')}
                    style={{ width: isMobile ? '100%' : 'auto' }}
                >
                    <span>{view === 'browse' ? `CART [${cart.reduce((a, b) => a + b.quantity, 0)}]` : 'BACK TO SHOP'}</span>
                </button>
            </header>

            {view === 'browse' ? (
                <>
                    {permanentItems.length > 0 && (
                        <div className="brutal-card" style={{ marginBottom: '2rem', background: '#f9f9f9' }}>
                            <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '0.9rem', marginBottom: '0.5rem' }}>📦 MANDATORY FEES</h3>
                            {permanentItems.map(item => (
                                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                    <span>{item.name}</span>
                                    <span style={{ fontWeight: 800 }}>${(item.price * item.quantity).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Grid Responsive Adjustments */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))',
                        gap: isMobile ? '1rem' : '2rem'
                    }}>
                        {products.map(product => {
                            const cartQuantity = cart.find(i => i.id === product.id)?.quantity || 0;
                            const canAfford = account.balance >= product.price;
                            return (
                                <Reveal key={product.id}>
                                    <div className="brutal-card" style={{
                                        opacity: canAfford ? 1 : 0.7,
                                        display: 'flex',
                                        flexDirection: 'column'
                                    }}>
                                        <div style={{
                                            height: isMobile ? '140px' : '180px',
                                            background: 'var(--bg-color)',
                                            border: '2px solid var(--text-main)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            marginBottom: '1rem'
                                        }}>
                                            {renderThumb(product.thumb)}
                                        </div>
                                        <div style={{ flexGrow: 1 }}>
                                            <span className="brutal-badge" style={{ fontSize: '0.7rem' }}>{product.category || 'General'}</span>
                                            <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.2rem', margin: '0.5rem 0' }}>{product.name}</h3>
                                            <p style={{ fontWeight: 800 }}>${product.price.toFixed(2)}</p>
                                        </div>

                                        <button
                                            className="btn-primary"
                                            disabled={!canAfford}
                                            style={{ marginTop: '1rem', width: '100%' }}
                                            onClick={() => addToCart(product)}
                                        >
                                            <span>{canAfford ? 'ADD +' : 'NO FUNDS'}</span>
                                        </button>
                                    </div>
                                </Reveal>
                            );
                        })}
                    </div>
                </>
            ) : (
                /* Cart View Mobile Adjustments */
                <div className="brutal-card" style={{ maxWidth: '600px', margin: '0 auto', padding: isMobile ? '1rem' : '2rem' }}>
                    <h3 style={{ fontFamily: 'Syne, sans-serif', marginBottom: '1rem' }}>ORDER SUMMARY</h3>
                    <div style={{
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        color: 'var(--accent-orange)',
                        marginBottom: '1.5rem',
                        display: 'flex',
                        flexDirection: isMobile ? 'column' : 'row',
                        gap: '0.5rem'
                    }}>
                        <span>BALANCE: ${account.balance.toFixed(2)}</span>
                        {!isMobile && <span> | </span>}
                        <span>REMAINING: ${remainingBalance.toFixed(2)}</span>
                    </div>

                    {cart.length === 0 ? (
                        <p style={{ textAlign: 'center', padding: '2rem' }}>Cart is empty.</p>
                    ) : (
                        <>
                            {cart.map((item) => (
                                <div key={item.id} style={{
                                    display: 'flex',
                                    flexDirection: isMobile ? 'column' : 'row',
                                    alignItems: isMobile ? 'flex-start' : 'center',
                                    gap: '1rem',
                                    padding: '1rem 0',
                                    borderBottom: '2px solid black'
                                }}>
                                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: '40px', height: '40px', border: '1px solid black', flexShrink: 0 }}>
                                            {renderThumb(item.thumb)}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{item.name}</div>
                                            <div style={{ fontSize: '0.75rem' }}>${item.price.toFixed(2)}</div>
                                        </div>
                                    </div>

                                    <div style={{
                                        display: 'flex',
                                        width: isMobile ? '100%' : 'auto',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <button onClick={() => updateQuantity(item.id, -1)} style={{ padding: '4px 10px', border: '2px solid black' }}>-</button>
                                            <span style={{ fontWeight: 800, minWidth: '20px', textAlign: 'center' }}>{item.quantity}</span>
                                            <button
                                                disabled={remainingBalance < item.price}
                                                onClick={() => updateQuantity(item.id, 1)}
                                                style={{ padding: '4px 10px', border: '2px solid black', opacity: remainingBalance < item.price ? 0.3 : 1 }}
                                            >+</button>
                                        </div>
                                        <button onClick={() => removeItem(item.id)} style={{ color: '#ff4444', border: 'none', background: 'none', fontSize: '1.5rem' }}>×</button>
                                    </div>
                                </div>
                            ))}

                            <div style={{ marginTop: '2rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 800 }}>TOTAL</span>
                                    <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>${total.toFixed(2)}</span>
                                </div>
                                <button
                                    className="btn-primary"
                                    disabled={isProcessing || account.balance < total}
                                    onClick={handlePurchase}
                                    style={{ width: '100%', marginTop: '1.5rem' }}
                                >
                                    <span>{isProcessing ? 'WORKING...' : 'PURCHASE ↗'}</span>
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}