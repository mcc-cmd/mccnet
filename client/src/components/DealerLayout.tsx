import { useState, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { 
  PlusCircle, 
  FolderOpen, 
  CheckSquare, 
  FileCheck, 
  XCircle, 
  Clock,
  Menu, 
  X, 
  LogOut 
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import mccLogoPath from "@assets/image_1755076636262.png";

// 판매점 전용 사이드바 메뉴 정의
const dealerMenuItems = [
  {
    title: "접수신청",
    icon: PlusCircle,
    href: "/dealer/submit-application",
    description: "새로운 고객 접수 신청"
  },
  {
    title: "접수관리",
    icon: FolderOpen,
    href: "/dealer/applications",
    description: "접수된 신청서 관리"
  },
  {
    title: "업무요청중",
    icon: Clock,
    href: "/dealer/work-requests",
    description: "업무 요청 중인 신청서"
  },
  {
    title: "개통완료 관리",
    icon: CheckSquare,
    href: "/dealer/completed",
    description: "개통 완료된 신청서"
  },
  {
    title: "기타완료",
    icon: FileCheck,
    href: "/dealer/other-completed",
    description: "기타 완료된 신청서"
  },
  {
    title: "개통취소내역",
    icon: XCircle,
    href: "/dealer/cancelled",
    description: "취소된 신청서"
  }
];

interface DealerLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
}

export function DealerLayout({ children, title, description }: DealerLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [location] = useLocation();
  
  // 현재 로그인한 판매점 정보 조회
  // const { data: dealerInfo } = useQuery({
  //   queryKey: ["/api/auth/user"],
  //   enabled: false // 임시로 비활성화, 실제 API 구현 시 활성화
  // });

  // 임시 판매점 이름 (실제로는 dealerInfo에서 가져올 예정)
  const dealerName = "테스트 판매점";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 사이드바 오버레이 (모바일) */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 lg:hidden z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 사이드바 */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* 로고 및 헤더 */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-3">
              <img src={mccLogoPath} alt="MCC 로고" className="h-8 w-auto" />
              <div>
                <h1 className="text-lg font-semibold">판매점 포털</h1>
                <p className="text-xs text-muted-foreground">{dealerName}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* 메뉴 항목 */}
          <nav className="flex-1 p-4 space-y-2">
            {dealerMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href;
              
              return (
                <Link key={item.href} href={item.href}>
                  <div className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                    isActive 
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200" 
                      : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                  )}>
                    <Icon className="h-5 w-5" />
                    <div>
                      <div>{item.title}</div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* 로그아웃 버튼 */}
          <div className="p-4 border-t">
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => window.location.href = "/api/logout"}
            >
              <LogOut className="h-4 w-4 mr-2" />
              로그아웃
            </Button>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="lg:pl-64">
        {/* 상단 헤더 */}
        <div className="bg-white dark:bg-gray-800 border-b lg:border-l">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-12">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden"
                >
                  <Menu className="h-5 w-5" />
                </Button>
                <div>
                  <h1 className="text-lg font-semibold">{title || "대시보드"}</h1>
                  <p className="text-xs text-muted-foreground">{description || "접수 현황 및 관리"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 메인 콘텐츠 영역 */}
        {children}
      </div>
    </div>
  );
}