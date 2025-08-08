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
  Users, 
  ShoppingCart, 
  Award,
  ChevronRight,
  ArrowLeft,
  LogOut,
  User,
  BarChart3
} from 'lucide-react';
import logoImage from '@assets/KakaoTalk_20250626_162541112-removebg-preview_1751604392501.png';

interface SalesStats {
  totalActivations: number;
  monthlyActivations: number;
  teamStats: TeamStats[];
  salesManagerStats: SalesManagerStats[];
  dealerStats: DealerStats[];
}

interface TeamStats {
  team: string;
  totalActivations: number;
  monthlyActivations: number;
  salesManagers: SalesManagerStats[];
}

interface SalesManagerStats {
  id: number;
  name: string;
  team: string;
  position: '팀장' | '과장' | '대리';
  totalActivations: number;
  monthlyActivations: number;
  dealers: DealerStats[];
}

interface DealerStats {
  dealerName: string;
  contactCode: string;
  activations: number;
  monthlyActivations: number;
  carrier: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function SalesManagerDashboard() {
  const { user, logout } = useAuth();
  const [selectedSalesManager, setSelectedSalesManager] = useState<SalesManagerStats | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<TeamStats | null>(null);
  const [viewMode, setViewMode] = useState<'overview' | 'manager' | 'dealer' | 'team'>('overview');

  const { data: salesStats, isLoading } = useQuery({
    queryKey: ['/api/sales-stats'],
    queryFn: () => apiRequest('/api/sales-stats') as Promise<SalesStats>,
  });

  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  if (isLoading) {
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

  const currentUserTeam = user?.team || '';
  const currentUserPosition = user?.position || '';
  const isTeamLeader = currentUserPosition === '팀장';
  const isManager = currentUserPosition === '과장';
  const isAssociate = currentUserPosition === '대리';

  const renderOverview = () => (
    <div className="space-y-6">
      {/* 전체 통계 카드 - 영업과장은 판매점수만 표시 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">영업과장 수</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{salesStats?.salesManagerStats.length || 0}</div>
            <p className="text-xs text-muted-foreground">활성 영업과장</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">판매점 수</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{salesStats?.dealerStats.length || 0}</div>
            <p className="text-xs text-muted-foreground">등록된 판매점</p>
          </CardContent>
        </Card>
      </div>

      {/* 팀별 실적 (팀장만 볼 수 있음) */}
      {isTeamLeader && salesStats?.teamStats && (
        <Card>
          <CardHeader>
            <CardTitle>팀별 실적</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {salesStats.teamStats.map((team) => (
                <div key={team.team} className="border rounded-lg p-4 cursor-pointer hover:bg-gray-50" 
                     onClick={() => {
                       // 팀을 클릭했을 때 해당 팀원들 표시
                       setViewMode('team');
                       setSelectedTeam(team);
                     }}>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium">{team.team}</h3>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">
                        총 {team.totalActivations}건
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    이번 달: {team.monthlyActivations}건 | 팀원: {team.salesManagers?.length || 0}명
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 판매점 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>판매점 목록</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {salesStats?.dealerStats?.map((dealer, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium">{dealer.dealerName}</h3>
                    <p className="text-sm text-gray-600">접점코드: {dealer.contactCode}</p>
                    <p className="text-sm text-gray-600">통신사: {dealer.carrier}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderTeamDetail = () => {
    if (!selectedTeam) return null;

    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode('overview')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            뒤로 가기
          </Button>
          <div>
            <h2 className="text-xl font-bold">{selectedTeam.team} 팀원 목록</h2>
            <p className="text-gray-600">총 실적: {selectedTeam.totalActivations}건 | 이번 달: {selectedTeam.monthlyActivations}건</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>팀원별 실적</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {selectedTeam.salesManagers?.map((manager) => (
                <div key={manager.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium">{manager.name} ({manager.position})</h3>
                      <div className="mt-2 space-y-1">
                        <div className="text-sm">
                          <span className="text-gray-500">총 개통:</span> {manager.totalActivations}건
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-500">이번 달:</span> {manager.monthlyActivations}건
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedSalesManager(manager);
                        setViewMode('manager');
                      }}
                    >
                      판매점 보기 <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderManagerDetail = () => {
    if (!selectedSalesManager) return null;

    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(selectedTeam ? 'team' : 'overview')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            뒤로 가기
          </Button>
          <div>
            <h2 className="text-xl font-bold">{selectedSalesManager.name} ({selectedSalesManager.position}) 실적</h2>
            <p className="text-gray-600">{selectedSalesManager.team}</p>
          </div>
        </div>

        {/* 개별 통계 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">총 개통 건수</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{selectedSalesManager.totalActivations}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">이번 달 개통</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{selectedSalesManager.monthlyActivations}</div>
            </CardContent>
          </Card>
        </div>

        {/* 판매점별 실적 */}
        <Card>
          <CardHeader>
            <CardTitle>판매점별 실적</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {selectedSalesManager.dealers.map((dealer, index) => (
                <div key={`${dealer.contactCode}-${index}`} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium">{dealer.dealerName}</h3>
                      <p className="text-sm text-gray-600">접점코드: {dealer.contactCode}</p>
                      <Badge variant="outline" className="mt-1">{dealer.carrier}</Badge>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold">{dealer.activations}건</div>
                      <div className="text-sm text-gray-600">이번 달: {dealer.monthlyActivations}건</div>
                    </div>
                  </div>
                </div>
              ))}
              {selectedSalesManager.dealers.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  등록된 판매점이 없습니다.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

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
        
        <nav className="mt-8">
          <div className="px-4 space-y-2">
            <button
              onClick={() => setViewMode('overview')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                viewMode === 'overview' 
                  ? 'bg-accent text-white' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <BarChart3 className="mr-3 h-4 w-4" />
              대시보드
            </button>
          </div>
        </nav>

        {/* 사용자 정보 및 로그아웃 */}
        <div className="absolute bottom-0 w-64 p-4 border-t bg-white">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.name}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user?.team} {user?.position}
              </p>
            </div>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <LogOut className="mr-2 h-4 w-4" />
            로그아웃
          </Button>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="flex-1 p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
          <p className="text-gray-600">
            판매점 현황 정보
          </p>
        </div>

        {viewMode === 'overview' && renderOverview()}
        {viewMode === 'team' && renderTeamDetail()}
        {viewMode === 'manager' && renderManagerDetail()}
      </div>
    </div>
  );
}