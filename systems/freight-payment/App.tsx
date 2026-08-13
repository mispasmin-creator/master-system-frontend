import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getStoredUser, clearSession, AuthUser } from "@/lib/auth";
import { FreightDashboard } from "./pages/FreightDashboard";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const stored = getStoredUser();
    if (stored) {
      setUser(stored);
    }
  }, []);

  const handleLogout = () => {
    clearSession();
    setUser(null);
    window.location.href = '/';
  };

  return (
    <QueryClientProvider client={queryClient}>
      <FreightDashboard user={user || { id: 0, username: 'User', role: 'user', page_access: '', firm_name: '', last_login: '' }} onLogout={handleLogout} />
    </QueryClientProvider>
  );
}
