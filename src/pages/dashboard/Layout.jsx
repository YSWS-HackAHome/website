import React, { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useUser } from './UserContext';

const DashboardLayout = () => {
    const { userData, logout } = useUser();
    const { account, appInfo } = userData;

    // States for collapse and mobile responsiveness
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            if (!mobile) setIsMenuOpen(false);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const navItems = [
        { name: 'Projects', path: '/dashboard/projects', icon: '🛠️' },
        { name: 'Shop', path: '/dashboard/shop', icon: '🛒' },
        { name: 'Account', path: '/dashboard/account', icon: '👤' },
    ];

    // Sidebar widths
    const expandedWidth = '280px';
    const collapsedWidth = '80px';
    const currentWidth = isCollapsed ? collapsedWidth : expandedWidth;

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-color)' }}>

            {/* Sidebar */}
            <aside style={{
                width: isMobile ? expandedWidth : currentWidth,
                borderRight: '1.5px solid rgba(26,20,16,0.12)',
                padding: isCollapsed && !isMobile ? '2rem 0.5rem' : '2rem 1.5rem',
                display: 'flex',
                flexDirection: 'column',
                position: 'fixed',
                height: '100vh',
                background: 'var(--bg-color)',
                zIndex: 100,
                transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s ease',
                transform: isMobile && !isMenuOpen ? 'translateX(-100%)' : 'translateX(0)',
            }}>
                {/* Collapse Toggle Button (Desktop Only) */}
                {!isMobile && (
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        style={{
                            position: 'absolute',
                            right: '-12px',
                            top: '32px',
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            border: '1.5px solid rgba(26,20,16,0.12)',
                            background: 'white',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 101,
                            fontSize: '0.8rem'
                        }}
                    >
                        {isCollapsed ? '→' : '←'}
                    </button>
                )}

                <div style={{ textAlign: isCollapsed && !isMobile ? "center" : "left", overflow: 'hidden' }}>
                    <h1 style={{
                        fontFamily: 'Syne, sans-serif',
                        fontSize: isCollapsed && !isMobile ? '1.5rem' : '1.2rem',
                        fontWeight: 800,
                        letterSpacing: '-0.04em',
                        marginBottom: '2rem',
                        whiteSpace: 'nowrap'
                    }}>
                        {isCollapsed && !isMobile ? 'H' : <>Hack<span style={{ color: '#FF5C1A' }}>&nbsp;A&nbsp;</span>Home</>}
                    </h1>
                </div>

                <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            title={isCollapsed ? item.name : ""}
                            style={({ isActive }) => ({
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: isCollapsed && !isMobile ? 'center' : 'flex-start',
                                gap: '0.75rem',
                                padding: '0.85rem 1rem',
                                textDecoration: 'none',
                                fontFamily: 'Syne, sans-serif',
                                fontWeight: 600,
                                fontSize: '0.9rem',
                                borderRadius: '4px',
                                color: isActive ? 'var(--bg-color)' : 'var(--text-main)',
                                background: isActive ? 'var(--text-main)' : 'transparent',
                                transition: 'all 0.2s ease',
                            })}
                        >
                            <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
                            {(!isCollapsed || isMobile) && <span>{item.name}</span>}
                        </NavLink>
                    ))}
                </nav>

                {/* Profile Section */}
                <div style={{
                    marginTop: 'auto',
                    borderTop: '1.5px solid rgba(26,20,16,0.12)',
                    paddingTop: '1.5rem',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: isCollapsed && !isMobile ? 'center' : 'flex-start',
                        gap: '0.75rem',
                        marginBottom: '1rem'
                    }}>
                        <div style={{
                            width: '36px', height: '36px', border: '1px solid var(--text-main)',
                            background: 'var(--accent-lime)', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            overflow: 'hidden'
                        }}>
                            {account.avatar && (account.avatar.startsWith('http') || account.avatar.startsWith('data:image')) ? (
                                <img src={account.avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : <span style={{ fontSize: '1.2rem' }}>{account.avatar || '🧪'}</span>}
                        </div>
                        {(!isCollapsed || isMobile) && (
                            <div style={{ minWidth: 0 }}>
                                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'Syne, sans-serif' }}>
                                    {account.name || 'Loading...'}
                                </p>
                                <p style={{ margin: 0, fontSize: '0.75rem', color: '#FF5C1A', fontFamily: 'DM Mono', fontWeight: 600 }}>
                                    ${Number(account.balance).toFixed(2)}
                                </p>
                            </div>
                        )}
                    </div>

                    <button onClick={logout} style={{
                        background: 'none', border: 'none', color: 'var(--text-muted)',
                        fontSize: '0.8rem', cursor: 'pointer', width: '100%',
                        textAlign: isCollapsed && !isMobile ? 'center' : 'left',
                        padding: '0.5rem', fontFamily: 'inherit'
                    }}>
                        {isCollapsed && !isMobile ? '⎋' : '← Logout'}
                    </button>

                    {/* RESTORED VERSION TAG */}
                    <div style={{
                        background: 'var(--accent-lime)',
                        padding: '0.5rem',
                        marginTop: '1rem',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        textAlign: 'center',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        border: isCollapsed && !isMobile ? 'none' : '1px solid rgba(0,0,0,0.1)'
                    }}>
                        {isCollapsed && !isMobile
                            ? (appInfo?.version || '...')
                            : (appInfo?.version ? `Version: ${appInfo.version}` : 'LOADING...')}
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main style={{
                flex: 1,
                marginLeft: isMobile ? '0' : currentWidth,
                padding: isMobile ? '1.5rem' : '3rem',
                transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                minWidth: 0
            }}>
                {/* Mobile Header Toggle */}
                {isMobile && (
                    <button
                        onClick={() => setIsMenuOpen(true)}
                        style={{
                            marginBottom: '1rem',
                            padding: '0.6rem 1rem',
                            background: 'var(--text-main)',
                            color: 'white',
                            border: 'none',
                            fontFamily: 'Syne, sans-serif',
                            fontWeight: 800,
                            fontSize: '0.8rem',
                            cursor: 'pointer'
                        }}
                    >
                        ☰ MENU
                    </button>
                )}
                <Outlet />
            </main>

            {/* Mobile Overlay */}
            {isMobile && isMenuOpen && (
                <div onClick={() => setIsMenuOpen(false)} style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 90
                }} />
            )}
        </div>
    );
};

export default DashboardLayout;