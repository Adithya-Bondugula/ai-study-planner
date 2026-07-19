'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppStore } from '../stores/useAppStore';
import { 
  LayoutDashboard, 
  Timer, 
  Compass, 
  Briefcase, 
  FolderGit2, 
  FileText, 
  Sparkles, 
  Calendar, 
  BarChart3, 
  Settings,
  Flame,
  User
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const { profile } = useAppStore();

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Today\'s Focus', href: '/focus', icon: Timer },
    { name: 'Roadmaps', href: '/roadmaps', icon: Compass },
    { name: 'Career Hub', href: '/career', icon: Briefcase },
    { name: 'Projects', href: '/projects', icon: FolderGit2 },
    { name: 'Notes', href: '/notes', icon: FileText },
    { name: 'AI Studio', href: '/ai-studio', icon: Sparkles },
    { name: 'Calendar', href: '/calendar', icon: Calendar },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  // Calculate XP percentage to level up (assume 1000 XP per level)
  const xpInCurrentLevel = profile.xp % 1000;
  const xpPercentage = (xpInCurrentLevel / 1000) * 100;

  return (
    <aside className="w-64 h-screen border-r border-white/10 flex flex-col justify-between p-4 bg-slate-950/40 backdrop-blur-md sticky top-0">
      {/* Brand Logo */}
      <div>
        <div className="flex items-center gap-3 px-3 py-4 mb-4">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-400 to-purple-600 flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-cyan-500/20">
            M
          </div>
          <div>
            <h1 className="font-bold text-lg leading-none bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              MentorOS
            </h1>
            <span className="text-[10px] text-cyan-400 font-semibold uppercase tracking-wider">
              AI Learning OS
            </span>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative ${
                  isActive 
                    ? 'text-cyan-400 bg-cyan-500/10 border border-cyan-500/20' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 transition-transform duration-200 group-hover:scale-110 ${
                  isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200'
                }`} />
                {item.name}

                {/* Left Active Glow bar */}
                {isActive && (
                  <span className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-cyan-400 rounded-r-md" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Progress Panel */}
      <div className="p-3 bg-white/5 rounded-2xl border border-white/5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center border border-white/10 overflow-hidden text-slate-300">
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
            ) : (
              <User className="w-5 h-5" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate text-white leading-none mb-1">
              {profile.name}
            </p>
            <div className="flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500 animate-pulse" />
              <span className="text-xs font-bold text-amber-400">
                {profile.streak} Days
              </span>
            </div>
          </div>
        </div>

        {/* XP Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] font-medium">
            <span className="text-slate-400">Level {profile.level}</span>
            <span className="text-cyan-400 font-bold">{xpInCurrentLevel} / 1000 XP</span>
          </div>
          <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden border border-white/5">
            <div 
              className="h-full bg-gradient-to-r from-cyan-400 to-purple-600 rounded-full transition-all duration-500"
              style={{ width: `${xpPercentage}%` }}
            />
          </div>
        </div>
      </div>
    </aside>
  );
}
