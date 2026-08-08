import { Toaster } from '@/components/ui/sonner';
import type { UserPermissions } from '@/types/sheets';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { getUserByUsername } from '../services/userService';
import { API_URL, saveSession, getStoredUser, getToken, clearSession } from '@/lib/auth';

interface AuthState {
    loggedIn: boolean;
    login: (username: string, password: string) => Promise<boolean>;
    logout: () => void;
    loading: boolean;
    user: UserPermissions;
}

const AuthContext = createContext<AuthState | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [loggedIn, setLoggedIn] = useState(false);
    const [userPermissions, setUserPermissions] = useState<UserPermissions | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        const rawUser = getStoredUser();
        const token = getToken();
        if (rawUser && token) {
            getUserByUsername(rawUser.username).then((storeUser) => {
                if (storeUser) {
                    setUserPermissions(storeUser);
                    setLoggedIn(true);
                } else {
                    // Set default permissions if not defined in store DB
                    setUserPermissions({} as UserPermissions);
                    setLoggedIn(true);
                }
                setLoading(false);
            }).catch((error) => {
                console.error('Error fetching user data:', error);
                setLoading(false);
            });
        } else {
            setLoading(false);
        }
    }, []);

    async function login(username: string, password: string) {
        try {
            const res = await fetch(`${API_URL}/users/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                return false;
            }

            saveSession(data.token, {
                id: data.id,
                username: data.username,
                role: data.role,
                page_access: data.page_access,
                firm_name: data.firm_name,
                last_login: data.last_login,
            });

            const storeUser = await getUserByUsername(username);
            if (storeUser) {
                setUserPermissions(storeUser);
            } else {
                setUserPermissions({} as UserPermissions);
            }

            setLoggedIn(true);
            return true;
        } catch (error) {
            console.error('Error during login:', error);
            return false;
        }
    }

    function logout() {
        clearSession();
        setLoggedIn(false);
        setUserPermissions(null);
    }

    const defaultUser: UserPermissions = userPermissions || {} as UserPermissions;

    return (
        <AuthContext.Provider value={{
            login,
            loggedIn,
            logout,
            user: defaultUser,
            loading
        }}>
            {children}
            <Toaster expand richColors theme="light" closeButton />
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
