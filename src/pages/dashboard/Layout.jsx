import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useUser } from './UserContext';

const DashboardLayout = () => {
    const { userData, logout } = useUser();
    const { account, appInfo } = userData;

    const navItems = [
        { name: 'Projects', path: '/dashboard/projects', icon: '🛠️' },
        { name: 'Shop', path: '/dashboard/shop', icon: '🛒' },
        { name: 'Account', path: '/dashboard/account', icon: '👤' },
    ];

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            <aside style={{
                width: '280px',
                borderRight: '1.5px solid rgba(26,20,16,0.12)',
                padding: '2rem 1.5rem',
                display: 'flex',
                flexDirection: 'column',
                position: 'fixed',
                height: '100vh',
                background: 'var(--bg-color)',
                zIndex: 10
            }}>
                <div style={{ textAlign: "center" }}>
                    <h1 style={{
                        fontFamily: 'Syne, sans-serif', fontSize: '1.2rem',
                        fontWeight: 800, letterSpacing: '-0.04em', marginBottom: '2rem'
                    }}>
                        Hack&nbsp;<span style={{ color: '#FF5C1A' }}>A&nbsp;</span>Home
                    </h1>
                </div>

                <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            style={({ isActive }) => ({
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                padding: '0.85rem 1rem',
                                textDecoration: 'none',
                                fontFamily: 'Syne, sans-serif',
                                fontWeight: 600,
                                fontSize: '0.9rem',
                                color: isActive ? 'var(--bg-color)' : 'var(--text-main)',
                                background: isActive ? 'var(--text-main)' : 'transparent',
                                transition: 'all 0.2s ease',
                            })}
                            className="nav-item-hover"
                        >
                            <span>{item.icon}</span>
                            {item.name}
                        </NavLink>
                    ))}
                </nav>

                <div style={{ marginTop: 'auto', borderTop: '1.5px solid rgba(26,20,16,0.12)', paddingTop: '1.5rem' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        marginBottom: '1rem',
                        padding: '0 0.5rem'
                    }}>
                        <div style={{
                            width: '36px',
                            height: '36px',
                            border: '1px solid var(--text-main)',
                            background: 'var(--accent-lime)',
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden'
                        }}>
                            {/* Improved Avatar check */}
                            {account.avatar && (account.avatar.startsWith('http') || account.avatar.startsWith('data:image')) ? (
                                <img
                                    src={account.avatar}
                                    alt="avatar"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            ) : (
                                <span style={{ fontSize: '1.2rem' }}>{account.avatar || '🧪'}</span>
                            )}
                        </div>
                        <div style={{ minWidth: 0 }}>
                            <p style={{
                                margin: 0,
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                fontFamily: 'Syne, sans-serif',
                                color: 'var(--text-main)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }}>
                                {account.name || 'Loading...'}
                            </p>
                            <p style={{
                                margin: 0,
                                fontSize: '0.75rem',
                                color: 'var(--accent-orange)',
                                fontWeight: 600,
                                fontFamily: 'DM Mono, monospace'
                            }}>
                                ${Number(account.balance).toFixed(2)}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={logout}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-muted)',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            padding: '0.5rem',
                            textAlign: 'left',
                            width: '100%',
                            fontFamily: 'inherit'
                        }}
                    >
                        ← Logout
                    </button>

                    <div style={{
                        background: 'var(--accent-lime)',
                        padding: '0.5rem',
                        marginTop: '1rem',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        textAlign: 'center'
                    }}>
                        {appInfo?.version ? `Version: ${appInfo.version}` : 'LOADING...'}
                    </div>
                </div>
            </aside>

            <main style={{ flex: 1, marginLeft: '280px', padding: '3rem', minWidth: 0 }}>
                <Outlet />
            </main>
        </div>
    );
};

export default DashboardLayout;