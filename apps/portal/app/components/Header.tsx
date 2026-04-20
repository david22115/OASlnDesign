"use client";
import { useRouter } from "next/navigation";

export default function Header({ user }: { user: any }) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      await fetch(`${apiUrl}/api/auth/logout`, { method: 'POST' }); 
    } catch(e) {} // best-effort logout
    localStorage.removeItem('user');
    router.push('/login');
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm">
      <div className="flex items-center text-slate-500 text-sm">
         歡迎回來，<span className="font-semibold text-slate-800 ml-1">{user?.fullName || '員工'}</span> !
      </div>
      <div>
        <button 
          onClick={handleLogout}
          className="text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-300 px-3 py-1.5 rounded bg-white hover:bg-slate-50 transition-colors"
        >
          登出登入
        </button>
      </div>
    </header>
  );
}
