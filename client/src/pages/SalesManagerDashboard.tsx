import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  TrendingUp, 
  Calendar,
  Phone,
  Mail,
  Building2,
  BarChart3,
  LogOut,
  User
} from 'lucide-react';

interface SalesManagerUser {
  id: number;
  name: string;
  type: string;
}

export default function SalesManagerDashboard() {
  const [user, setUser] = useState<SalesManagerUser | null>(null);
  const [stats, setStats] = useState({
    totalTeamMembers: 0,
    monthlyActivations: 0,
    teamRevenue: 0,
    activeDeals: 0
  });

  useEffect(() => {
    // localStorage에서 사용자 정보 가져오기
    try {
      const authData = localStorage.getItem('auth-storage');
      if (authData) {
        const parsed = JSON.parse(authData);
        setUser(parsed.state?.user);
      }
    } catch (error) {
      console.error('Failed to parse user data:', error);
    }

    // 임시 통계 데이터
    setStats({
      totalTeamMembers: 8,
      monthlyActivations: 45,
      teamRevenue: 2850000,
      activeDeals: 12
    });
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('auth-storage');
    window.location.href = '/sales-manager-login';
  };

  const handleBackToLogin = () => {
    window.location.href = '/sales-manager-login';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 헤더 */}
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Building2 className="h-8 w-8 text-primary mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  영업과장 대시보드
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  영업 실적 관리 시스템
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {user && (
                <div className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {user.name}님
                  </span>
                  <Badge variant="secondary">영업과장</Badge>
                </div>
              )}
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                로그아웃
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 환영 메시지 */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            안녕하세요, {user?.name || '사용자'}님!
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            오늘도 좋은 하루 되세요. 팀의 영업 현황을 확인해보세요.
          </p>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">팀 구성원</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTeamMembers}명</div>
              <p className="text-xs text-muted-foreground">
                활성 영업 담당자
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">이번 달 개통</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.monthlyActivations}건</div>
              <p className="text-xs text-muted-foreground">
                +12% 전월 대비
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">팀 매출</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.teamRevenue.toLocaleString()}원
              </div>
              <p className="text-xs text-muted-foreground">
                이번 달 누적
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">진행 중 건수</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeDeals}건</div>
              <p className="text-xs text-muted-foreground">
                처리 대기 중
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 주요 기능 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>팀 성과 관리</CardTitle>
              <CardDescription>
                팀원들의 영업 실적과 성과를 관리합니다
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="w-full" variant="outline">
                <BarChart3 className="h-4 w-4 mr-2" />
                팀 실적 현황
              </Button>
              <Button className="w-full" variant="outline">
                <Users className="h-4 w-4 mr-2" />
                팀원 관리
              </Button>
              <Button className="w-full" variant="outline">
                <TrendingUp className="h-4 w-4 mr-2" />
                성과 분석
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>고객 관리</CardTitle>
              <CardDescription>
                담당 고객과 영업 기회를 관리합니다
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="w-full" variant="outline">
                <Phone className="h-4 w-4 mr-2" />
                고객 현황
              </Button>
              <Button className="w-full" variant="outline">
                <Mail className="h-4 w-4 mr-2" />
                상담 이력
              </Button>
              <Button className="w-full" variant="outline">
                <Calendar className="h-4 w-4 mr-2" />
                일정 관리
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* 임시 메시지 */}
        <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
            시스템 개발 중
          </h3>
          <p className="text-blue-700 dark:text-blue-300 mb-4">
            영업과장 전용 기능들이 단계적으로 추가될 예정입니다. 
            현재는 로그인 시스템과 기본 대시보드가 구현되어 있습니다.
          </p>
          <Button onClick={handleBackToLogin} variant="outline">
            로그인 페이지로 돌아가기
          </Button>
        </div>
      </div>
    </div>
  );
}