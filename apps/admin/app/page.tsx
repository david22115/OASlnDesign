"use client";
import { useState } from "react";

export default function AdminDashboard() {
  const [schemas, setSchemas] = useState([
    { tableCode: 'HR_LEAVE_REQ', name: '員工請假單', status: 'PUBLISHED', version: 1 },
    { tableCode: 'IT_TICKET', name: '資訊報修單', status: 'DRAFT', version: 3 },
  ]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">表單引擎管理中心 (JSONB Registry)</h2>
          <p className="text-sm text-slate-500 mt-1">統一管理所有前端動態表單的 Schema，鎖定發布後確保資料完整性。</p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700">
          + 新建表單 (New Schema)
        </button>
      </div>

      <div className="bg-white rounded shadow-sm overflow-hidden border border-slate-200">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-sm font-medium text-slate-600">表單代碼 (Code)</th>
              <th className="px-6 py-4 text-sm font-medium text-slate-600">表單名稱 (Name)</th>
              <th className="px-6 py-4 text-sm font-medium text-slate-600">當前版本 (Version)</th>
              <th className="px-6 py-4 text-sm font-medium text-slate-600">部署狀態 (Status)</th>
              <th className="px-6 py-4 text-sm font-medium text-slate-600 text-right">操作 (Action)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {schemas.map((schema) => (
              <tr key={schema.tableCode} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-mono text-sm">{schema.tableCode}</td>
                <td className="px-6 py-4 font-medium text-slate-800">{schema.name}</td>
                <td className="px-6 py-4 text-sm">v{schema.version}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-semibold rounded ${
                    schema.status === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {schema.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right space-x-3">
                  <button className="text-sm text-blue-600 font-medium hover:underline">
                    {schema.status === 'PUBLISHED' ? '檢視 (View)' : '編輯 Schema (Edit)'}
                  </button>
                  {schema.status === 'PUBLISHED' && (
                     <button className="text-sm text-amber-600 font-medium hover:underline">
                       查看資料紀錄 (Records)
                     </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
