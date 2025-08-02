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
  ArrowLeft
} from 'lucide-react';

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
  const { user } = useAuth();
  const [selectedSalesManager, setSelectedSalesManager] = useState<SalesManagerStats | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<TeamStats | null>(null);
  const [viewMode, setViewMode] = useState<'overview' | 'manager' | 'dealer' | 'team'>('overview');

  const { data: salesStats, isLoading } = useQuery({
    queryKey: ['/api/sales-stats'],
    queryFn: () => apiRequest('/api/sales-stats') as Promise<SalesStats>,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">실적 데이터 로딩 중...</p>
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
      {/* 전체 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 개통 건수</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{salesStats?.totalActivations || 0}</div>
            <p className="text-xs text-muted-foreground">누적 개통 건수</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">이번 달 개통</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{salesStats?.monthlyActivations || 0}</div>
            <p className="text-xs text-muted-foreground">이번 달 실적</p>
          </CardContent>
        </Card>

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

      {/* 영업과장별 실적 */}
      <Card>
        <CardHeader>
          <CardTitle>영업과장별 실적</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {salesStats?.salesManagerStats
              .filter(manager => {
                if (isTeamLeader) return manager.team === currentUserTeam;
                if (isManager || isAssociate) return manager.name === user?.name;
                return false;
              })
              .map((manager) => (
              <div key={manager.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium">{manager.name} ({manager.position})</h3>
                    <p className="text-sm text-gray-600">{manager.team}</p>
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
                    자세히 보기 <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
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
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">영업 실적 대시보드</h1>
          <p className="text-gray-600">
            {user?.name}님의 실적 현황을 확인하세요
          </p>
        </div>

        {viewMode === 'overview' && renderOverview()}
        {viewMode === 'team' && renderTeamDetail()}
        {viewMode === 'manager' && renderManagerDetail()}
      </div>
    </div>
  );
}