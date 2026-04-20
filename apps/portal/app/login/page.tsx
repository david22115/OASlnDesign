"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const res = await fetch(`${apiUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, password }),
      });

      const data = await res.json();
      if (res.ok && data.status === "OK") {
        // 利用 localStorage 儲存純粹的身分資訊，用作前端狀態判斷 (Token 將在後續由 HttpOnly Cookie 攜帶)
        localStorage.setItem("user", JSON.stringify(data.data.user));
        router.push("/");
      } else {
        setError(data.message || "登入失敗，請確認帳號密碼");
      }
    } catch (err) {
      setError("連線伺服器失敗，請確認 API 是否啟動。");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white p-8 rounded border border-slate-200 shadow-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">TASKMASTER EIP</h1>
          <p className="text-sm text-slate-500 mt-1">企業登入入口</p>
        </div>
        
        {error && (
          <div className="mb-6 text-sm text-red-600 bg-red-50 p-3 rounded border border-red-100 font-medium">
            {error}
          </div>
        )}
        
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">員工編號 (Employee ID)</label>
            <input 
              type="text" 
              className="w-full border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors" 
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              placeholder="e.g. EMP-001"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">登入密碼 (Password)</label>
            <input 
              type="password" 
              className="w-full border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-slate-900 text-white rounded py-2.5 font-medium hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {isLoading ? '登入中...' : '登入系統'}
          </button>
        </form>
      </div>
    </div>
  );
}
