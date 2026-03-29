import React, { useState, useEffect } from 'react';
import { useUser } from './UserContext';
import { Reveal } from '../../components/Reveal';

export default function Shop() {
    const { userData, updateAccount } = useUser();
    const { account } = userData;

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

    // Fetch shop data from backend
    useEffect(() => {
        const fetchShopData = async () => {
            try {
                const response = await fetch('/api/shop');
                if (!response.ok) {
                    throw new Error('Failed to fetch shop data');
                }
                const data = await response.json();
                setProducts(data.inventory || []);
                setPermanentItems(data.permanent_fees || []);
            } catch (err) {
                console.error('Error fetching shop data:', err);
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

    // Calculate total including permanent items
    const calculateTotal = () => {
        const cartTotal = cart.reduce((s, i) => s + (i.price * i.quantity), 0);
        const feesTotal = permanentItems.reduce((s, fee) => s + (fee.price * fee.quantity), 0);
        return cartTotal + feesTotal;
    };

    const total = calculateTotal();
    const remainingBalance = account.balance - total;

    const renderThumb = (thumb) => {
        if (!thumb) return <span style={{ fontSize: '4rem' }}>📦</span>;

        const isBase64 = thumb.startsWith('data:image');
        const isEmoji = !isBase64 && thumb.length <= 2;

        if (isBase64) {
            return <img src={thumb} alt="product" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
        }
        if (isEmoji) {
            return <span style={{ fontSize: '4rem' }}>{thumb}</span>;
        }
        // If it's a URL or something else
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

    const removeItem = (id) => {
        setCart(prevCart => prevCart.filter(item => item.id !== id));
    };

    const handlePurchase = async () => {
        if (account.balance < total) {
            alert(`Insufficient balance. Need $${total.toFixed(2)}, have $${account.balance.toFixed(2)}`);
            return;
        }

        setIsProcessing(true);
        try {
            const purchaseItems = cart.map(item => ({
                id: item.id,
                quantity: item.quantity
            }));

            const response = await fetch('/api/purchase', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: purchaseItems })
            });

            if (response.ok) {
                const result = await response.json();
                // Update user balance
                updateAccount({ balance: result.remaining_balance });
                setCart([]);
                setView('browse');
                alert(`Transaction successful! Total paid: $${result.total_paid.toFixed(2)}`);
            } else {
                const err = await response.json();
                alert(`Transaction rejected: ${err.detail || 'Purchase failed'}`);
            }
        } catch (error) {
            console.error('Purchase error:', error);
            alert("Network error. Purchase failed.");
        } finally {
            setIsProcessing(false);
        }
    };

    if (loading) {
        return (
            <div style={{ maxWidth: '1200px', textAlign: 'center', padding: '4rem' }}>
                <div style={{ fontSize: '2rem' }}>🔄</div>
                <p>Loading shop...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ maxWidth: '1200px', textAlign: 'center', padding: '4rem' }}>
                <div style={{ fontSize: '2rem', color: '#ff4444' }}>⚠️</div>
                <p>Error loading shop: {error}</p>
                <button className="btn-primary" onClick={() => window.location.reload()}>
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '1200px' }}>
            <header style={{ marginBottom: '4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '3.5rem', fontWeight: 800 }}>FACTORY <span style={{ color: 'var(--accent-orange)' }}>STORE</span></h2>
                    <div style={{ height: '6px', width: '80px', background: 'var(--accent-lime)', marginTop: '0.5rem' }}></div>
                </div>
                <button className="btn-primary" onClick={() => setView(v => v === 'browse' ? 'cart' : 'browse')}>
                    <span>{view === 'browse' ? `CART [${cart.reduce((a, b) => a + b.quantity, 0)}]` : 'BACK TO SHOP'}</span>
                </button>
            </header>

            {view === 'browse' ? (
                <>
                    {permanentItems.length > 0 && (
                        <div className="brutal-card" style={{ marginBottom: '2rem', background: 'var(--accent-lime-light, #f0f0f0)' }}>
                            <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '1rem', marginBottom: '0.5rem' }}>📦 ADDITIONAL FEES</h3>
                            {permanentItems.map(item => (
                                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0' }}>
                                    <span>{item.name}</span>
                                    <span style={{ fontWeight: 800 }}>${(item.price * item.quantity).toFixed(2)}</span>
                                </div>
                            ))}
                            <p style={{ fontSize: '0.8rem', marginTop: '0.5rem', color: 'var(--text-muted, #666)' }}>
                                * Automatically added to every order
                            </p>
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
                        {products.map(product => {
                            const cartQuantity = cart.find(i => i.id === product.id)?.quantity || 0;
                            const canAfford = account.balance >= product.price;
                            return (
                                <Reveal key={product.id}>
                                    <div className="brutal-card" style={{
                                        opacity: canAfford ? 1 : 0.5,
                                        filter: canAfford ? 'none' : 'grayscale(1)',
                                        transition: 'all 0.3s ease'
                                    }}>
                                        <div style={{
                                            height: '180px', background: 'var(--bg-color)', border: '2px solid var(--text-main)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            overflow: 'hidden', marginBottom: '1.5rem'
                                        }}>
                                            {renderThumb(product.thumb)}
                                        </div>
                                        <span className="brutal-badge">{product.category || 'General'}</span>
                                        <h3 style={{ fontFamily: 'Syne, sans-serif', margin: '0.5rem 0' }}>{product.name}</h3>
                                        <p style={{ fontWeight: 800 }}>${product.price.toFixed(2)}</p>
                                        {cartQuantity > 0 && (
                                            <p style={{ fontSize: '0.8rem', color: 'var(--accent-orange)' }}>
                                                In cart: {cartQuantity}
                                            </p>
                                        )}
                                        <button
                                            className="btn-primary"
                                            disabled={!canAfford}
                                            style={{ marginTop: '1.5rem', width: '100%', cursor: canAfford ? 'pointer' : 'not-allowed' }}
                                            onClick={() => addToCart(product)}
                                        >
                                            <span>{canAfford ? 'ADD TO CART +' : 'INSUFFICIENT FUNDS'}</span>
                                        </button>
                                    </div>
                                </Reveal>
                            );
                        })}
                    </div>
                </>
            ) : (
                <div className="brutal-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
                    <h3 style={{ fontFamily: 'Syne, sans-serif', marginBottom: '1rem' }}>ORDER SUMMARY</h3>
                    <p style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--accent-orange)', marginBottom: '2rem' }}>
                        BALANCE: ${account.balance.toFixed(2)} | REMAINING: ${remainingBalance.toFixed(2)}
                    </p>

                    {cart.length === 0 ? (
                        <p style={{ textAlign: 'center', padding: '2rem' }}>Cart is empty.</p>
                    ) : (
                        <>
                            {cart.map((item) => (
                                <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 0', borderBottom: '2px solid black' }}>
                                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '15px' }}>
                                        <div style={{ width: '40px', height: '40px', border: '1px solid black', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                            <div style={{ transform: item.thumb && !item.thumb.startsWith('data:image') && item.thumb.length <= 2 ? 'scale(0.4)' : 'none' }}>
                                                {renderThumb(item.thumb)}
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 800 }}>{item.name}</div>
                                            <div style={{ fontSize: '0.8rem' }}>${item.price.toFixed(2)} ea.</div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <button onClick={() => updateQuantity(item.id, -1)} style={{ padding: '2px 8px', border: '2px solid black', cursor: 'pointer', fontWeight: 800 }}>-</button>
                                        <span style={{ fontWeight: 800, minWidth: '24px', textAlign: 'center' }}>{item.quantity}</span>
                                        <button
                                            disabled={remainingBalance < item.price}
                                            onClick={() => updateQuantity(item.id, 1)}
                                            style={{ padding: '2px 8px', border: '2px solid black', cursor: remainingBalance < item.price ? 'not-allowed' : 'pointer', fontWeight: 800, opacity: remainingBalance < item.price ? 0.3 : 1 }}
                                        >+</button>
                                        <button onClick={() => removeItem(item.id)} style={{ marginLeft: '10px', background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', fontWeight: 900, fontSize: '1.2rem' }}>×</button>
                                    </div>
                                </div>
                            ))}

                            {/* Display permanent items in cart summary */}
                            {permanentItems.length > 0 && (
                                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '2px dashed black' }}>
                                    <p style={{ fontSize: '0.8rem', fontWeight: 800, marginBottom: '0.5rem' }}>INCLUDES:</p>
                                    {permanentItems.map(item => (
                                        <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                                            <span>{item.name}</span>
                                            <span>${(item.price * item.quantity).toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div style={{ marginTop: '2rem', textAlign: 'right' }}>
                                <p style={{ fontSize: '1.5rem', fontWeight: 800 }}>TOTAL: ${total.toFixed(2)}</p>
                                <button
                                    className="btn-primary"
                                    disabled={isProcessing || account.balance < total}
                                    onClick={handlePurchase}
                                    style={{ width: '100%', marginTop: '1rem' }}
                                >
                                    <span>{isProcessing ? 'PROCESSING...' : 'CONFIRM TRANSACTION ↗'}</span>
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}