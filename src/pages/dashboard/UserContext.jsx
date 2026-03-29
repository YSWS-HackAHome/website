import React, { createContext, useState, useContext, useCallback } from 'react';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
    const [userData, setUserData] = useState({
        account: {
            name: '',
            balance: 0,
            avatar: '🧪',
            slack_id: '',
            email: '',
            sub: '',
            verification_status: 'unverified'
        },
        projects: [],
        devLogs: [],
        appInfo: {
            version: ''
        }
    });

    const fetchUserData = useCallback(async () => {
        try {
            const [userRes, infoRes] = await Promise.all([
                fetch('/api/user'),
                fetch('/api/info')
            ]);

            let updatedState = {};

            if (userRes.ok) {
                const data = await userRes.json();
                updatedState = { ...data };
            }

            if (infoRes.ok) {
                const infoData = await infoRes.json();
                updatedState.appInfo = infoData;
            }

            setUserData(prev => ({
                ...prev,
                ...updatedState
            }));

            return userRes.ok;
        } catch (error) {
            console.error("Failed to fetch user or app info:", error);
            return false;
        }
    }, []);

    const updateAccount = (updates) => {
        setUserData(prev => ({
            ...prev,
            account: { ...prev.account, ...updates }
        }));
    };

    const updateProject = (projectId, updates) => {
        setUserData(prev => ({
            ...prev,
            projects: prev.projects.map(p =>
                p.id === projectId ? { ...p, ...updates } : p
            )
        }));
    };

    const addProject = (newProject) => {
        setUserData(prev => ({
            ...prev,
            projects: [newProject, ...prev.projects]
        }));
    };

    const addLog = (newLog) => {
        setUserData(prev => ({
            ...prev,
            devLogs: [newLog, ...prev.devLogs]
        }));
    };

    const logout = () => {
        window.location.href = '/api/logout';
    };

    return (
        <UserContext.Provider value={{
            userData,
            fetchUserData,
            updateAccount,
            updateProject,
            addProject,
            addLog,
            logout
        }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};