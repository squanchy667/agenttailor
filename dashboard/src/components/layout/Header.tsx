import { useNavigate, useLocation } from 'react-router-dom';
import { useCurrentUser, useSignOut, AUTH_MODE } from '../../lib/authProvider';

const ROUTE_LABELS: Record<string, string> = {
  '/projects': 'Projects',
  '/documents': 'Documents',
  '/tailoring': 'Tailoring',
  '/settings': 'Settings',
};

export interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const signOut = useSignOut();
  const { user } = useCurrentUser();
  const navigate = useNavigate();
  const location = useLocation();

  const pageLabel = ROUTE_LABELS[location.pathname] ?? 'AgentTailor';

  async function handleSignOut() {
    await signOut();
    if (AUTH_MODE === 'clerk') navigate('/login');
  }

  const initials = user
    ? `${user.firstName?.charAt(0) ?? ''}${user.lastName?.charAt(0) ?? ''}`.toUpperCase() || 'U'
    : 'U';

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center px-4 gap-4 shrink-0">
      {/* Mobile hamburger */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        aria-label="Open menu"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xs text-slate-400 hidden sm:inline">AgentTailor</span>
        <span className="text-xs text-slate-300 hidden sm:inline">/</span>
        <span className="text-sm font-semibold text-slate-900 truncate">{pageLabel}</span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search placeholder */}
      <div className="hidden md:flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-2 w-64">
        <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
        <input
          type="text"
          placeholder="Search..."
          className="bg-transparent text-sm text-slate-600 placeholder-slate-400 outline-none w-full"
          readOnly
          aria-label="Search (coming soon)"
        />
      </div>

      {/* Notification bell placeholder */}
      <button
        className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors relative"
        aria-label="Notifications (coming soon)"
        title="Notifications coming soon"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
        </svg>
      </button>

      {/* User avatar dropdown */}
      <div className="relative group">
        <button
          className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          aria-label="User menu"
        >
          {user?.imageUrl ? (
            <img
              src={user.imageUrl}
              alt={user.fullName ?? 'User avatar'}
              className="w-8 h-8 rounded-full object-cover ring-2 ring-indigo-100"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center ring-2 ring-indigo-100">
              <span className="text-white text-xs font-semibold">{initials}</span>
            </div>
          )}
          <svg className="w-4 h-4 text-slate-400 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        {/* Dropdown */}
        <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-sm font-medium text-slate-900 truncate">
              {user?.fullName ?? 'User'}
            </p>
            <p className="text-xs text-slate-500 truncate">
              {user?.primaryEmailAddress?.emailAddress ?? ''}
            </p>
          </div>
          <div className="py-1">
            <button
              onClick={() => navigate('/settings')}
              className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Profile
            </button>
            <button
              onClick={() => navigate('/settings')}
              className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Settings
            </button>
            <div className="border-t border-slate-100 mt-1 pt-1">
              <button
                onClick={handleSignOut}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
