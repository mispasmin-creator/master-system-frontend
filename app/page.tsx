'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { API_URL, saveSession, getToken, getStoredUser } from '@/lib/auth';
import { Eye, EyeOff } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // Check theme and auto-redirect if already logged in
  useEffect(() => {
    setIsMounted(true);
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
      setTheme('dark');
    } else if (savedTheme === 'light') {
      document.documentElement.classList.remove('dark');
      setTheme('light');
    } else {
      if (document.documentElement.classList.contains('dark')) {
        setTheme('dark');
      } else {
        document.documentElement.classList.remove('dark');
        setTheme('light');
      }
    }

    // Auto-redirect if active session exists
    const token = getToken();
    const user = getStoredUser();
    if (token && user) {
      router.replace('/dashboard');
    } else {
      setCheckingSession(false);
    }
  }, [router]);

  const toggleTheme = () => {
    if (theme === 'light') {
      document.documentElement.classList.add('dark');
      setTheme('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      setTheme('light');
      localStorage.setItem('theme', 'light');
    }
  };

  const checkCapsLock = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.getModifierState) {
      setCapsLockActive(e.getModifierState('CapsLock'));
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = username.trim();
    if (!cleanUsername || !password) {
      setError('Please provide both username and password');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUsername, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 403) {
          throw new Error(data.message || 'Your account has been deactivated. Please contact administrator.');
        }
        throw new Error(data.message || 'Invalid username or password');
      }

      saveSession(
        data.token,
        {
          id: data.id,
          username: data.username,
          role: data.role,
          page_access: data.page_access,
          firm_name: data.firm_name,
          last_login: data.last_login,
          is_active: data.is_active,
        },
        rememberMe
      );

      router.push('/dashboard');
    } catch (err) {
      if (err instanceof TypeError && err.message.toLowerCase().includes('fetch')) {
        setError('Unable to connect to server. Please check your internet connection or backend server status.');
      } else {
        setError(err instanceof Error ? err.message : 'Something went wrong during login');
      }
      setLoading(false);
    }
  };

  if (!isMounted || checkingSession) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#faf9fd] dark:bg-[#09090b] transition-colors duration-500">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#2fa36b] border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Checking session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#faf9fd] dark:bg-[#09090b] transition-colors duration-700 font-sans selection:bg-[#2fa36b]/30">
      
      {/* Dynamic Animated Background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-gradient-to-br from-[#2fa36b]/20 to-transparent dark:from-[#5ec792]/10 blur-[120px] animate-pulse duration-[8000ms]" />
        <div className="absolute top-[60%] -right-[10%] w-[60%] h-[60%] rounded-full bg-gradient-to-tl from-[#504696]/10 to-transparent dark:from-[#5ec792]/10 blur-[120px] animate-pulse duration-[10000ms] delay-1000" />
      </div>

      {/* Decorative floating shapes (illustration side only) */}
      <div className="pointer-events-none absolute inset-0 hidden lg:block z-0">
        <div className="absolute top-[20%] left-[10%] w-3 h-3 rounded-full bg-gradient-to-r from-[#2fa36b] to-[#5ec792] shadow-[0_0_15px_rgba(47,163,107,0.5)] animate-bounce" style={{ animationDuration: '3s' }} />
        <div className="absolute top-[75%] left-[20%] w-4 h-4 rounded-full bg-gradient-to-r from-[#504696] to-[#7165c0] shadow-[0_0_15px_rgba(80,70,150,0.5)] animate-bounce" style={{ animationDuration: '4s', animationDelay: '1s' }} />
        <div className="absolute top-[40%] left-[45%] w-2.5 h-2.5 rounded-full bg-[#2fa36b]/60 dark:bg-[#5ec792]/60 animate-ping" style={{ animationDuration: '3s' }} />
      </div>

      {/* Brand Logo - Top Left */}
      <div className="absolute top-6 left-6 lg:top-10 lg:left-10 z-20 flex items-center gap-3 group cursor-pointer">
        <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-white dark:bg-zinc-800 shadow-md group-hover:shadow-lg group-hover:-translate-y-0.5 transition-all duration-300">
          <Image src="/logo.png" alt="Passary System Logo" width={24} height={24} className="object-contain" priority />
        </div>
        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-400 tracking-tight">Passary System</span>
      </div>

      {/* Theme Toggle - Top Right */}
      <div className="absolute top-6 right-6 lg:top-10 lg:right-10 z-20">
        <button
          onClick={toggleTheme}
          className="relative flex items-center justify-center w-11 h-11 rounded-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md shadow-sm border border-zinc-200/50 dark:border-zinc-800/50 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:scale-110 active:scale-95 transition-all duration-300"
          title="Toggle Theme"
          aria-label="Toggle Theme"
        >
          {theme === 'light' ? (
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-in spin-in-90"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
          ) : (
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-in spin-in-[-90deg]"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
          )}
        </button>
      </div>

      {/* Page content: illustration left, sign-in card right */}
      <div className="relative z-10 min-h-screen w-full flex flex-col lg:flex-row items-center justify-center lg:justify-between max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Illustration - Hidden on Mobile */}
        <div className="hidden lg:flex relative w-full lg:flex-1 items-center justify-center pt-28 pb-8 px-6 lg:pt-0 lg:pb-0 lg:pl-12 lg:pr-0">
          <div className="relative w-full max-w-[600px] aspect-square transition-transform duration-700 hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#2fa36b]/10 to-transparent dark:from-[#5ec792]/5 rounded-full blur-3xl mix-blend-multiply dark:mix-blend-lighten" />
            <Image
              src={theme === 'dark' ? "/factory-globe-dark.png" : "/factory-globe.png"}
              alt="Global factory network illustration"
              fill
              priority
              className="object-contain drop-shadow-[0_30px_60px_rgba(47,163,107,0.15)] dark:drop-shadow-[0_30px_60px_rgba(94,199,146,0.1)] transition-all duration-700"
            />
          </div>
        </div>

        {/* Login Card */}
        <div className="relative z-10 w-full lg:w-1/2 flex items-center justify-center py-12 lg:py-0">
          <div className="w-full max-w-[460px] bg-white/70 dark:bg-zinc-900/60 backdrop-blur-2xl p-8 sm:p-12 rounded-[32px] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] dark:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)] border border-white/80 dark:border-zinc-800/80 transition-all duration-500 relative overflow-hidden group">
            
            {/* Subtle inner glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/0 dark:from-white/5 dark:to-transparent opacity-50 rounded-[32px] pointer-events-none" />

            <div className="relative z-10">
              <div className="mb-10">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-400 tracking-tight leading-tight mb-3">
                  Welcome back
                </h1>
                <p className="text-[15px] text-zinc-500 dark:text-zinc-400 font-medium">
                  Enter your details to access the Merge System Dashboard.
                </p>
              </div>

              <form onSubmit={handleLogin} className="flex flex-col gap-5 text-sm font-medium">
                <div className="flex flex-col gap-2 group/input">
                  <label className="text-zinc-700 dark:text-zinc-300 text-[14px] ml-1 group-focus-within/input:text-[#2fa36b] dark:group-focus-within/input:text-[#5ec792] transition-colors">Username</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400 group-focus-within/input:text-[#2fa36b] dark:group-focus-within/input:text-[#5ec792] transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    </div>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      disabled={loading}
                      autoFocus
                      className="h-[52px] w-full pl-11 pr-4 text-[15px] rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50 text-zinc-900 dark:text-white outline-none focus:border-[#2fa36b] dark:focus:border-[#5ec792] focus:ring-4 focus:ring-[#2fa36b]/10 dark:focus:ring-[#5ec792]/10 transition-all shadow-sm placeholder:text-zinc-400 disabled:opacity-60 disabled:cursor-not-allowed"
                      placeholder="admin"
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2 group/input">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-zinc-700 dark:text-zinc-300 text-[14px] group-focus-within/input:text-[#2fa36b] dark:group-focus-within/input:text-[#5ec792] transition-colors">Password</label>
                    {capsLockActive && (
                      <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 text-[11px] font-semibold tracking-wide animate-in fade-in">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l7 7h-4v7h-6v-7H5l7-7z"/><rect x="5" y="19" width="14" height="2" rx="1"/></svg>
                        CAPS LOCK ON
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400 group-focus-within/input:text-[#2fa36b] dark:group-focus-within/input:text-[#5ec792] transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    </div>
                    <input
                      type={isVisible ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={checkCapsLock}
                      onKeyUp={checkCapsLock}
                      disabled={loading}
                      className="h-[52px] w-full pl-11 pr-12 text-[15px] rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50 text-zinc-900 dark:text-white outline-none focus:border-[#2fa36b] dark:focus:border-[#5ec792] focus:ring-4 focus:ring-[#2fa36b]/10 dark:focus:ring-[#5ec792]/10 transition-all shadow-sm placeholder:text-zinc-400 disabled:opacity-60 disabled:cursor-not-allowed"
                      placeholder="••••••••"
                      required
                    />
                    <button 
                      type="button"
                      onClick={() => setIsVisible(!isVisible)}
                      disabled={loading}
                      aria-label={isVisible ? 'Hide password' : 'Show password'}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 group-focus-within/input:text-[#2fa36b] dark:group-focus-within/input:text-[#5ec792] transition-colors disabled:opacity-50"
                    >
                      {isVisible ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                {/* Remember Me Option */}
                <div className="flex items-center justify-between ml-1">
                  <label className="flex items-center gap-2.5 cursor-pointer group/checkbox select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      disabled={loading}
                      className="w-4 h-4 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-[#2fa36b] accent-[#2fa36b] focus:ring-2 focus:ring-[#2fa36b]/20 transition-all cursor-pointer disabled:cursor-not-allowed"
                    />
                    <span className="text-[13px] text-zinc-600 dark:text-zinc-400 group-hover/checkbox:text-zinc-900 dark:group-hover/checkbox:text-zinc-200 transition-colors font-medium">
                      Remember me
                    </span>
                  </label>
                </div>

                {error && (
                  <div className="flex items-center gap-2.5 mt-1 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 p-3.5 rounded-2xl border border-red-200/80 dark:border-red-900/60 animate-in fade-in slide-in-from-top-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
                    <p className="text-[13px] font-medium leading-snug">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 relative overflow-hidden group/btn flex h-[52px] w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#2fa36b] to-[#27905d] dark:from-[#5ec792] dark:to-[#4bb27d] text-white dark:text-zinc-950 text-[15px] font-bold transition-all hover:shadow-[0_8px_20px_-6px_rgba(47,163,107,0.5)] dark:hover:shadow-[0_8px_20px_-6px_rgba(94,199,146,0.4)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        Authenticating...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </span>
                  <div className="absolute inset-0 h-full w-full bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300 ease-out" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

