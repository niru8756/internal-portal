'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { getUserPermissions } from '@/lib/permissions';

export default function Navigation() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Don't show navigation on auth pages
  if (pathname === '/login' || pathname === '/signup') {
    return null;
  }

  // Don't show navigation if user is not authenticated
  if (!user) {
    return null;
  }

  const permissions = getUserPermissions(user.role as any);

  const handleLogout = async () => {
    await logout();
    setShowUserMenu(false);
  };

  const isActivePath = (path: string) => {
    return pathname === path;
  };

  const navLinkClass = (path: string) => {
    const baseClass = "whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm";
    if (isActivePath(path)) {
      return `${baseClass} border-blue-500 text-blue-600`;
    }
    return `${baseClass} border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300`;
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="text-xl font-bold text-gray-900">
                Internal Ops
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {/* Show Employees only to CEO/CTO */}
              {permissions.canViewAllEmployees && (
                <Link href="/employees" className={navLinkClass('/employees')}>
                  Employees
                </Link>
              )}
              
              {/* Show Resources (everyone can see their own resources) */}
              <Link href="/resources" className={navLinkClass('/resources')}>
                Resources
              </Link>
              
              {/* Show Access only to non-admin users (employees can request, admins manage) */}
              {!permissions.canViewAllEmployees && (
                <Link href="/access" className={navLinkClass('/access')}>
                  Access
                </Link>
              )}
              
              {/* Show Policies (everyone can view) */}
              {permissions.canApproveWorkflows &&  <Link href="/policies" className={navLinkClass('/policies')}>
                Policies
              </Link>}
              
              {/* Show Approvals only to CEO/CTO (who can approve) */}
              {permissions.canApproveWorkflows && (
                <Link href="/approvals" className={navLinkClass('/approvals')}>
                  Approvals
                </Link>
              )}
              
              {/* Show Audit only to CEO/CTO */}
              {permissions.canViewAudit && (
                <Link href="/audit" className={navLinkClass('/audit')}>
                  Audit
                </Link>
              )}
              
              {/* Show Timeline only to CEO/CTO */}
              {permissions.canViewTimeline && (
                <Link href="/timeline" className={navLinkClass('/timeline')}>
                  Timeline
                </Link>
              )}
            </div>
          </div>

          {/* User menu */}
          <div className="flex items-center">
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center">
                      <span className="text-sm font-medium text-white">
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="hidden md:block text-left">
                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                    <div className="text-xs text-gray-500">{user.role.replace(/_/g, ' ')} • {user.department}</div>
                  </div>
                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {showUserMenu && (
                <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                  <div className="py-1">
                    <div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-100">
                      <div className="font-medium">{user.name}</div>
                      <div className="text-xs text-gray-500">{user.email}</div>
                    </div>
                    <Link
                      href="/profile"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setShowUserMenu(false)}
                    >
                      Profile Settings
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className="sm:hidden">
        <div className="pt-2 pb-3 space-y-1">
          {permissions.canViewAllEmployees && (
            <Link
              href="/employees"
              className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                isActivePath('/employees')
                  ? 'bg-blue-50 border-blue-500 text-blue-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 hover:border-gray-300'
              }`}
            >
              Employees
            </Link>
          )}
          
          <Link
            href="/resources"
            className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
              isActivePath('/resources')
                ? 'bg-blue-50 border-blue-500 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 hover:border-gray-300'
            }`}
          >
            Resources
          </Link>
          
          {!permissions.canViewAllEmployees && (
            <Link
              href="/access"
              className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                isActivePath('/access')
                  ? 'bg-blue-50 border-blue-500 text-blue-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 hover:border-gray-300'
              }`}
            >
              Access
            </Link>
          )}
          
          <Link
            href="/policies"
            className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
              isActivePath('/policies')
                ? 'bg-blue-50 border-blue-500 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 hover:border-gray-300'
            }`}
          >
            Policies
          </Link>
          
          {permissions.canApproveWorkflows && (
            <Link
              href="/approvals"
              className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                isActivePath('/approvals')
                  ? 'bg-blue-50 border-blue-500 text-blue-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 hover:border-gray-300'
              }`}
            >
              Approvals
            </Link>
          )}
          
          {permissions.canViewAudit && (
            <Link
              href="/audit"
              className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                isActivePath('/audit')
                  ? 'bg-blue-50 border-blue-500 text-blue-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 hover:border-gray-300'
              }`}
            >
              Audit
            </Link>
          )}
          
          {permissions.canViewTimeline && (
            <Link
              href="/timeline"
              className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                isActivePath('/timeline')
                  ? 'bg-blue-50 border-blue-500 text-blue-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 hover:border-gray-300'
              }`}
            >
              Timeline
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}