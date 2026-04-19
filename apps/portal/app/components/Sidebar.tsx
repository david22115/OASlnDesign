"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();

  const links = [
    { name: '主控台 (Dashboard)', href: '/' },
    { name: '我的待辦 (My Tasks)', href: '/tasks' },
    { name: '員工名錄 (Directory)', href: '/directory' },
  ];

  return (
    <div className="w-64 bg-slate-900 text-slate-200 hidden lg:flex flex-col">
      <div className="p-6 border-b border-slate-800">
        <h2 className="text-xl font-bold text-white tracking-wide">TASKMASTER</h2>
        <p className="text-xs text-slate-500 mt-1">Enterprise Workplace</p>
      </div>
      <nav className="flex-1 px-4 py-6 space-y-2">
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link 
              key={link.name} 
              href={link.href}
              className={`block px-3 py-2 rounded text-sm font-medium transition-colors ${isActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            >
              {link.name}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-slate-800">
        <div className="text-xs text-slate-500 text-center">v1.0.0-rc1</div>
      </div>
    </div>
  );
}
