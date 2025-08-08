import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/lib/auth';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  PhoneCall, 
  ShoppingCart, 
  Award,
  ChevronRight,
  ArrowLeft,
  LogOut,
  User,
  BarChart3,
  Calendar
} from 'lucide-react';
import logoImage from '@assets/KakaoTalk_20250626_162541112-removebg-preview_1751604392501.png';

interface TodayStats {
  todayReception: number;
  todayActivation: number;
  todayOtherCompleted: number;
  carrierStats: any[];
}

interface CarrierStats {
  carrier: string;
  newCustomer: number;
  portIn: number;
  total: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function SalesManagerDashboard() {
  const { user, logout } = useAuth();

  // 당일 실적 데이터 조회
  const { data: todayStats, isLoading: todayLoading } = useQuery({
    queryKey: ['/api/dashboard/today-stats'],
    queryFn: () => apiRequest('/api/dashboard/today-stats') as Promise<TodayStats>,
  });

  // 통신사별 실적 데이터 조회
  const { data: carrierStats, isLoading: carrierLoading } = useQuery({
    queryKey: ['/api/dashboard/carrier-stats'],
    queryFn: () => apiRequest('/api/dashboard/carrier-stats') as Promise<CarrierStats[]>,
  });

  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  if (todayLoading || carrierLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <div className="flex-1 p-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500">실적 데이터 로딩 중...</p>
          </div>
        </div>
      </div>
    );
  }

  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const carrierChartData = carrierStats?.map(stat => ({
    carrier: stat.carrier,
    신규: stat.newCustomer || 0,
    번호이동: stat.portIn || 0,
    전체: stat.total || 0
  })) || [];

  const renderTodayStats = () => (
    <div className="space-y-6">
      {/* 당일 실적 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">오늘 접수</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayStats?.todayReception || 0}</div>
            <p className="text-xs text-muted-foreground">건</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">오늘 개통</CardTitle>
            <PhoneCall className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayStats?.todayActivation || 0}</div>
            <p className="text-xs text-muted-foreground">건</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">기타 완료</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayStats?.todayOtherCompleted || 0}</div>
            <p className="text-xs text-muted-foreground">건</p>
          </CardContent>
        </Card>
      </div>

      {/* 통신사별 실적 차트 */}
      <Card>
        <CardHeader>
          <CardTitle>통신사별 판매 현황 (신규/번호이동)</CardTitle>
          <p className="text-sm text-gray-600">{today}</p>
        </CardHeader>
        <CardContent>
          {carrierChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={carrierChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="carrier" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="신규" fill="#8884d8" name="신규" />
                <Bar dataKey="번호이동" fill="#82ca9d" name="번호이동" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-8 text-gray-500">
              오늘 판매 데이터가 없습니다.
            </div>
          )}
        </CardContent>
      </Card>

      {/* 통신사별 상세 통계 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle>통신사별 상세 현황</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">통신사</th>
                  <th className="text-center py-2">신규</th>
                  <th className="text-center py-2">번호이동</th>
                  <th className="text-center py-2">합계</th>
                </tr>
              </thead>
              <tbody>
                {carrierStats?.map((stat, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-2 font-medium">{stat.carrier}</td>
                    <td className="text-center py-2">{stat.newCustomer || 0}건</td>
                    <td className="text-center py-2">{stat.portIn || 0}건</td>
                    <td className="text-center py-2 font-semibold">{stat.total || 0}건</td>
                  </tr>
                ))}
                {(!carrierStats || carrierStats.length === 0) && (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-gray-500">
                      오늘 판매 데이터가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* 사이드바 */}
      <div className="w-64 bg-white shadow-lg">
        <div className="p-6">
          <div className="flex items-center space-x-3">
            <img src={logoImage} alt="MCC네트월드" className="h-8 w-8" />
            <h1 className="text-lg font-bold text-gray-800">MCC네트월드</h1>
          </div>
        </div>
        
        <div className="p-6 border-t">
          <div className="space-y-3">
            <div className="text-sm text-gray-600">로그인 사용자</div>
            <div className="flex items-center space-x-3">
              <User className="h-5 w-5 text-gray-400" />
              <div>
                <div className="font-medium">{user?.name}</div>
                <div className="text-sm text-gray-500">{user?.team || '영업과장'}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            로그아웃
          </Button>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
            <p className="text-gray-600">판매점 현황 정보</p>
          </div>

          {renderTodayStats()}
        </div>
      </div>
    </div>
  );
}