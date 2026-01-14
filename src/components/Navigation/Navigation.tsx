'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  {
    name: 'Consulta de Risco',
    href: '/',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>
        <path d="m9 12 2 2 4-4"/>
      </svg>
    ),
  },
  {
    name: 'Consulta CNAE',
    href: '/consulta-cnae',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
        <polyline points="14,2 14,8 20,8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <line x1="10" y1="9" x2="8" y2="9"/>
      </svg>
    ),
  },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-1 sm:gap-2">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`
                  flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all
                  ${isActive 
                    ? 'border-pv-blue-900 text-pv-blue-900 bg-pv-blue-900/5' 
                    : 'border-transparent text-gray-600 hover:text-pv-blue-900 hover:border-pv-blue-300 hover:bg-gray-50'
                  }
                `}
              >
                <span className={isActive ? 'text-pv-blue-900' : 'text-gray-400'}>
                  {tab.icon}
                </span>
                <span className="hidden sm:inline">{tab.name}</span>
                <span className="sm:hidden">{tab.name.split(' ')[1]}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
