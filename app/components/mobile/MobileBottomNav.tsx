'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TrendingUp, Plus, Settings, Trophy, User } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';

export const MobileBottomNav: React.FC = () => {
  const pathname = usePathname();
  const { connected } = useWallet();

  const navItems = [
    {
      href: '/',
      icon: TrendingUp,
      label: 'Markets',
      active: pathname === '/',
    },
    ...(connected ? [
      {
        href: '/create',
        icon: Plus,
        label: 'Create',
        active: pathname === '/create',
      },
      {
        href: '/manage',
        icon: Settings,
        label: 'Manage',
        active: pathname === '/manage',
      },
    ] : []),
    {
      href: '/leaderboard',
      icon: Trophy,
      label: 'Leaderboard',
      active: pathname === '/leaderboard',
    },
    {
      href: '/profile',
      icon: User,
      label: 'Profile',
      active: pathname === '/profile',
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t border-border md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const IconComponent = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex flex-col items-center justify-center px-3 py-2 rounded-lg transition-colors min-w-0 flex-1
                ${item.active
                  ? 'text-zenith-400 bg-zenith-500/10'
                  : 'text-muted-foreground hover:text-foreground'
                }
              `}
            >
              <IconComponent className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};