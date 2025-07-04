import { Link, useLocation } from 'wouter';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FileText,
  Calculator,
  BarChart3,
  Settings
} from 'lucide-react';
import logoImage from '@/assets/logo.png';

const navigation = [
  { name: '대시보드', href: '/dashboard', icon: LayoutDashboard },
  { name: '접수 관리', href: '/documents', icon: FileText },
  { name: '단가표', href: '/pricing', icon: Calculator },
  { name: '통계', href: '/stats', icon: BarChart3 },
];

const adminNavigation = [
  { name: '관리자 패널', href: '/admin', icon: Settings },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const [location] = useLocation();
  const { user } = useAuth();

  const isAdmin = user?.userType === 'admin';
  const currentNavigation = isAdmin ? [...navigation, ...adminNavigation] : navigation;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && onClose && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-20 md:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-30 w-64 bg-primary transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:inset-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center flex-shrink-0 px-4 py-5">
            <div className="flex items-center">
              <img 
                src={logoImage} 
                alt="MCC네트월드 로고" 
                className="h-8 w-auto"
              />
              <h1 className="ml-3 text-xl font-semibold text-white">MCC네트월드</h1>
            </div>
            {/* Mobile close button */}
            {onClose && (
              <button
                type="button"
                className="ml-auto md:hidden text-gray-300 hover:text-white"
                onClick={onClose}
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 pb-4 space-y-1">
            {currentNavigation.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.name} href={item.href}>
                  <div
                    className={cn(
                      "group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer",
                      isActive
                        ? "bg-accent text-white"
                        : "text-gray-300 hover:bg-gray-700 hover:text-white"
                    )}
                    onClick={onClose}
                  >
                    <item.icon
                      className={cn(
                        "mr-3 flex-shrink-0 h-6 w-6",
                        isActive ? "text-white" : "text-gray-400"
                      )}
                    />
                    {item.name}
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </>
  );
}
