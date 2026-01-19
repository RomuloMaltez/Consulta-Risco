'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  {
    name: 'Consulta CNAE',
    href: '/consulta-cnae',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/>
        <path d="m21 21-4.3-4.3"/>
      </svg>
    ),
  },
  {
    name: 'Consulta NFSe',
    href: '/consulta-item-lc',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
      </svg>
    ),
  },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="bg-slate-50 border-b border-slate-200">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-center gap-2 sm:gap-3">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`
                  flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-lg text-sm font-medium transition-all
                  ${isActive
                    ? 'bg-pv-blue-900 text-white shadow-md'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-pv-blue-300 hover:text-pv-blue-900 hover:bg-slate-50'
                  }
                `}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.name}</span>
                <span className="sm:hidden">{tab.name.split(' ').pop()}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
