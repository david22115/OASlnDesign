"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";

// Clean Desktop-first Bento Grid Dashboard
export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Basic route guard based on local storage cache
    const cachedUser = localStorage.getItem("user");
    if (!cachedUser) {
      router.push("/login");
    } else {
      setUser(JSON.parse(cachedUser));
    }
  }, [router]);

  if (!user) return null; // Wait for guard

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header user={user} />
        <main className="flex-1 p-8 overflow-auto">
          
          <div className="max-w-6xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-slate-800">儀表板 (Dashboard)</h1>
            
            <div className="grid grid-cols-12 gap-6 auto-rows-[180px]">
              
              {/* 打卡模組 (Clock-in Panel) */}
              <div className="col-span-12 lg:col-span-4 bg-white border border-slate-200 rounded p-6 flex flex-col items-center justify-center">
                <h3 className="text-slate-500 font-medium mb-4 text-sm tracking-wide">今日出勤狀態</h3>
                <button className="bg-emerald-600 text-white px-10 py-3 rounded text-lg font-bold hover:bg-emerald-700 transition-colors focus:outline-none focus:ring-4 focus:ring-emerald-600/20">
                  出勤打卡
                </button>
                <p className="text-xs text-slate-400 mt-4 text-center">
                  尚未取得今日打卡紀錄<br/>
                  (請允許獲取 GPS 座標資訊)
                </p>
              </div>

              {/* 待辦事項清單 (To-Do List) */}
              <div className="col-span-12 lg:col-span-8 bg-white border border-slate-200 rounded p-6">
                <h3 className="text-slate-800 font-bold mb-4 flex items-center">
                  <span className="w-2 h-2 rounded-full bg-orange-500 mr-2"></span>
                  待辦簽核 (Pending Actions)
                </h3>
                <ul className="space-y-0 text-sm">
                    <li className="flex justify-between items-center py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 px-2 rounded cursor-pointer transition-colors">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-700">PR-20230501 - 請購單簽核</span>
                        <span className="text-xs text-slate-400 mt-1">申請人: 林大明 | 部門: 資訊部</span>
                      </div>
                      <span className="text-orange-600 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded text-xs font-medium">待簽核</span>
                    </li>
                    <li className="flex justify-between items-center py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 px-2 rounded cursor-pointer transition-colors">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-700">Leave-20230502 - 特休申請</span>
                        <span className="text-xs text-slate-400 mt-1">申請人: 王小明 | 期間: 5/10 - 5/12</span>
                      </div>
                      <span className="text-orange-600 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded text-xs font-medium">待簽核</span>
                    </li>
                </ul>
              </div>

              {/* 應用市集 (Launchpad) */}
              <div className="col-span-12 bg-white border border-slate-200 rounded p-6 row-span-2">
                <h3 className="text-slate-800 font-bold mb-6">企業應用捷徑 (Launchpad)</h3>
                <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-6">
                  {/* Apps */}
                  {[
                    {name: '人事系統', color: 'bg-blue-600'},
                    {name: 'ERP 管理', color: 'bg-indigo-600'},
                    {name: '電子文件', color: 'bg-purple-600'},
                    {name: '會議室借用', color: 'bg-emerald-600'},
                    {name: '差勤報銷', color: 'bg-amber-500'},
                    {name: '資訊報修', color: 'bg-rose-500'},
                  ].map((app, idx) => (
                    <div key={idx} className="flex flex-col items-center justify-center p-4 border border-transparent hover:border-slate-200 hover:bg-slate-50 cursor-pointer rounded transition-all group">
                      <div className={`w-12 h-12 ${app.color} rounded shadow-sm text-white flex items-center justify-center mb-3 font-bold opacity-90 group-hover:opacity-100`}>
                        {app.name[0]}
                      </div>
                      <span className="text-sm font-medium text-slate-700">{app.name}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
