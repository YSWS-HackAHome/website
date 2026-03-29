import { useEffect, useState } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { useUser } from '../pages/dashboard/UserContext';

const AuthGuard = () => {
    const [isLoading, setIsLoading] = useState(true);
    const { fetchUserData } = useUser();
    const navigate = useNavigate();

    useEffect(() => {
        const verifySession = async () => {
            try {
                const success = await fetchUserData();
                if (!success) {
                    navigate('/');
                }
            } catch (error) {
                navigate('/');
            } finally {
                setIsLoading(false);
            }
        };

        verifySession();
    }, [navigate, fetchUserData]);

    if (isLoading) return null;

    return <Outlet />;
};

export default AuthGuard;