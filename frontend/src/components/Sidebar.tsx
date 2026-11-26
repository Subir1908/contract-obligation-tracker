import React, { useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  FileText,
  ListChecks,
  CalendarDays,
  BarChart3,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronsUpDown,
  LogOut,
  X
} from 'lucide-react';
import type { UserAccount } from '../types/auth';

export type WorkspaceSection = 'dashboard' | 'documents' | 'obligations' | 'analytics';

interface SidebarProps {
  activeSection: WorkspaceSection;
  onSelectSection: (section: WorkspaceSection) => void;
  globalSearch: string;
  onGlobalSearchChange: (val: string) => void;
  onExportIcs: () => void;
  currentUser: UserAccount | null;
  onOpenAuthModal: () => void;
  onLogout: () => void;
  contractsCount: number;
  obligationsCount: number;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSelectSection,
  globalSearch,
  onGlobalSearchChange,
  onExportIcs,
  currentUser,
  onOpenAuthModal,
  onLogout,
  contractsCount,
  obligationsCount,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navItems: {
    id: WorkspaceSection | 'calendar';
    label: string;
    icon: React.ReactNode;
    meta?: string | number;
    action: () => void;
  }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-4 h-4 stroke-[1.5]" />,
      action: () => {
        onSelectSection('dashboard');
        onCloseMobile();
      },
    },
    {
      id: 'documents',
      label: 'Contracts',
      icon: <FileText className="w-4 h-4 stroke-[1.5]" />,
      meta: contractsCount > 0 ? contractsCount : undefined,
      action: () => {
        onSelectSection('documents');
        onCloseMobile();
      },
    },
    {
      id: 'obligations',
      label: 'Obligations',
      icon: <ListChecks className="w-4 h-4 stroke-[1.5]" />,
      meta: obligationsCount > 0 ? obligationsCount : undefined,
      action: () => {
        onSelectSection('obligations');
        onCloseMobile();
      },
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: <BarChart3 className="w-4 h-4 stroke-[1.5]" />,
      action: () => {
        onSelectSection('analytics');
        onCloseMobile();
      },
    },
    {
      id: 'calendar',
      label: 'Calendar sync',
      icon: <CalendarDays className="w-4 h-4 stroke-[1.5]" />,
      action: () => {
        onExportIcs();
        onCloseMobile();
      },
    },
  ];

  const userInitial = currentUser?.name
    ? currentUser.name.trim().charAt(0).toUpperCase()
    : currentUser?.email?.charAt(0).toUpperCase() || 'A';

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0f0f10] text-[#ededed] border-r border-white/[0.08] select-none">
      {/* Top Brand Bar */}
      <div className="h-15 px-4 flex items-center justify-between border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="3" y="3" width="8" height="8" rx="1.5" fill="#ededed" />
              <rect x="13" y="13" width="8" height="8" rx="1.5" fill="#ededed" />
              <rect x="13" y="3" width="8" height="8" rx="1.5" stroke="#ededed" strokeWidth="1.5" opacity="0.45" />
            </svg>
          </div>
          {!collapsed && (
            <span className="text-[15px] font-medium tracking-normal text-[#ededed] truncate">
              Obligations
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onToggleCollapse}
          className="hidden lg:flex p-1.5 rounded-md text-[#71717a] hover:text-[#ededed] hover:bg-white/[0.05] transition-colors cursor-pointer"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen className="w-4 h-4 stroke-[1.5]" /> : <PanelLeftClose className="w-4 h-4 stroke-[1.5]" />}
        </button>

        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 rounded-md text-[#71717a] hover:text-[#ededed] cursor-pointer"
          aria-label="Close navigation"
        >
          <X className="w-4 h-4 stroke-[1.5]" />
        </button>
      </div>

      {/* Quick Search */}
      {!collapsed && (
        <div className="px-3 pt-4 pb-2">
          <div className="relative flex items-center bg-[#19191b] border border-white/[0.08] rounded-lg px-2.5 h-9 focus-within:border-white/25 transition-colors">
            <Search className="w-3.5 h-3.5 text-[#71717a] flex-shrink-0 stroke-[1.5]" />
            <input
              ref={searchInputRef}
              type="text"
              value={globalSearch}
              onChange={(e) => {
                onGlobalSearchChange(e.target.value);
                if (activeSection !== 'dashboard' && activeSection !== 'obligations') {
                  onSelectSection('obligations');
                }
              }}
              placeholder="Search"
              className="w-full bg-transparent text-[13px] text-[#ededed] placeholder-[#71717a] px-2 focus:outline-none"
            />
            {globalSearch ? (
              <button
                type="button"
                onClick={() => onGlobalSearchChange('')}
                className="text-[#71717a] hover:text-[#ededed] p-0.5 cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            ) : (
              <kbd className="text-[11px] font-mono text-[#71717a] bg-[#232325] border border-white/[0.08] px-1.5 py-0.5 rounded text-nowrap">
                ⌘ K
              </kbd>
            )}
          </div>
        </div>
      )}

      {/* Navigation Group */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-6">
        <div>
          {!collapsed && (
            <div className="px-2.5 mb-2 text-[12px] font-normal text-[#71717a]">
              Platform
            </div>
          )}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = item.id === activeSection;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.action}
                  title={collapsed ? item.label : undefined}
                  className={`w-full flex items-center justify-between h-9 px-2.5 rounded-lg text-[13px] transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#232325] text-[#ededed] font-medium raised-highlight border border-white/[0.08]'
                      : 'text-[#a1a1a6] hover:text-[#ededed] hover:bg-white/[0.04] border border-transparent'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <span className={isActive ? 'text-[#ededed]' : 'text-[#85858b]'}>
                      {item.icon}
                    </span>
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </span>
                  {!collapsed && item.meta !== undefined && (
                    <span className="text-[11px] font-mono tabular-nums text-[#71717a]">
                      {item.meta}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Bottom Account Control */}
      <div className="p-3 border-t border-white/[0.06] space-y-2">
        {currentUser && !collapsed && (
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center gap-2.5 h-8 px-2.5 rounded-lg text-[13px] text-[#a1a1a6] hover:text-[#e5484d] hover:bg-white/[0.04] transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 stroke-[1.5]" />
            <span>Sign out</span>
          </button>
        )}

        <button
          type="button"
          onClick={onOpenAuthModal}
          className={`w-full flex items-center ${
            collapsed ? 'justify-center p-2' : 'justify-between p-2.5'
          } rounded-xl bg-[#19191b] hover:bg-[#232325] border border-white/[0.08] transition-colors cursor-pointer text-left`}
          title={currentUser ? `${currentUser.email} — Account & Session` : 'Sign in'}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-[#232325] border border-white/[0.1] flex items-center justify-center text-[12px] font-medium text-[#ededed] flex-shrink-0">
              {userInitial}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-[#ededed] truncate leading-tight">
                  {currentUser ? currentUser.name || currentUser.email.split('@')[0] : 'Sign in'}
                </div>
                <div className="text-[11px] text-[#71717a] truncate mt-0.5">
                  {currentUser ? currentUser.organization : 'Authenticate account'}
                </div>
              </div>
            )}
          </div>
          {!collapsed && <ChevronsUpDown className="w-3.5 h-3.5 text-[#71717a] flex-shrink-0" />}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Rail */}
      <aside
        className={`hidden lg:block flex-shrink-0 transition-[width] duration-200 ease-out no-print ${
          collapsed ? 'w-[68px]' : 'w-[248px]'
        }`}
      >
        <div className={`fixed top-0 left-0 bottom-0 z-30 ${collapsed ? 'w-[68px]' : 'w-[248px]'} transition-[width] duration-200 ease-out`}>
          {sidebarContent}
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex no-print">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs"
            onClick={onCloseMobile}
          />
          <div className="relative w-[260px] max-w-[85vw] h-full z-10">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
