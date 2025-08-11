import { Link, useLocation } from 'wouter';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FileText,
  Download,
  BarChart3,
  Settings,
  TestTube,
  Calculator,
  CheckCircle,
  X,
  Clock,
  Star,
  Trash2,
  Users
} from 'lucide-react';
import logoImage from '@assets/KakaoTalk_20250626_162541112-removebg-preview_1751604392501.png';

const navigation = [
  { name: '대시보드', href: '/dashboard', icon: LayoutDashboard },
  { name: '접수 신청', href: '/submit-application', icon: FileText },
  { name: '접수 관리', href: '/documents', icon: FileText },
  { name: '상태 변경', href: '/status-change', icon: TestTube },
  { name: '업무 요청중', href: '/work-requests', icon: Clock },
  { name: '개통완료 관리', href: '/completed', icon: CheckCircle },
  { name: '기타완료', href: '/other-completions', icon: Star },
  { name: '개통취소 내역', href: '/cancelled', icon: X },
  { name: '폐기', href: '/discarded', icon: Trash2 },
  { name: '서식지 다운로드', href: '/downloads', icon: Download },
  { name: '정산 관리', href: '/settlements', icon: Calculator },
];

const adminNavigation = [
  { name: '관리자 패널', href: '/admin', icon: Settings },
  { name: '영업조직 관리', href: '/sales-team-management', icon: Users },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const [location] = useLocation();
  const { user } = useAuth();

  const isAdmin = user?.userType === 'admin';
  const isSalesManager = user?.userType === 'sales_manager';
  const isWorker = user?.role === 'dealer_worker';
  
  // 영업과장은 읽기 전용 메뉴만 접근 가능 (접수 신청, 상태 변경 제외)
  let baseNavigation = navigation;
  if (isSalesManager) {
    // 영업과장은 읽기 전용 메뉴만 (접수 신청, 상태 변경 제외)
    baseNavigation = navigation.filter(item => 
      item.name !== '접수 신청' && item.name !== '상태 변경' && item.name !== '정산 관리'
    );
  } else if (!isAdmin) {
    // 관리자가 아닌 경우 정산 관리 제외
    baseNavigation = navigation.filter(item => item.name !== '정산 관리');
  }
  
  // 관리자만 관리자 패널 접근 가능
  const currentNavigation = isAdmin ? [...baseNavigation, ...adminNavigation] : baseNavigation;

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
        "fixed inset-y-0 left-0 z-30 w-auto min-w-64 max-w-80 bg-primary transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:inset-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex flex-col items-center flex-shrink-0 px-4 py-6 border-b border-gray-700">
            <Link href="/dashboard" className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity">
              <img 
                src={logoImage} 
                alt="MCC네트월드 로고" 
                className="h-12 w-auto mb-3"
              />
              <div className="text-center">
                <h1 className="text-lg font-semibold text-white leading-tight whitespace-nowrap">MCC네트월드</h1>
              </div>
            </Link>
          </div>
          
          {/* Mobile close button */}
          {onClose && (
            <div className="absolute top-4 right-4 md:hidden">
              <button
                type="button"
                className="text-gray-300 hover:text-white"
                onClick={onClose}
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-3 pb-4 space-y-1">
            {currentNavigation.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.name} href={item.href}>
                  <div
                    className={cn(
                      "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap",
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
                    <span className="flex-1">{item.name}</span>
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
