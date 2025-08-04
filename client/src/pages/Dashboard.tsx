import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useApiRequest } from '@/lib/auth';
import { useAuth } from '@/lib/auth';
import { useState } from 'react';
import type { DashboardStats, Document } from '../../../shared/schema';
import {
  FileText,
  Clock,
  CheckCircle,
  Upload,
  Download,
  Calculator,
  TrendingUp,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

export function Dashboard() {
  const apiRequest = useApiRequest();
  const { user } = useAuth();
  const [location, setLocation] = useLocation();

  // 안전한 날짜 포맷팅 함수
  const formatSafeDate = (dateString: string | null | undefined, formatString: string = 'yyyy-MM-dd HH:mm') => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '-';
      return format(date, formatString, { locale: ko });
    } catch (error) {
      console.error('Date formatting error:', error, 'for date:', dateString);
      return '-';
    }
  };
  
  // Date filter states for general dashboard
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Separate date filter states for carrier and worker stats
  const [carrierStartDate, setCarrierStartDate] = useState('');
  const [carrierEndDate, setCarrierEndDate] = useState('');
  const [workerStartDate, setWorkerStartDate] = useState('');
  const [workerEndDate, setWorkerEndDate] = useState('');
  
  // Dialog states for analytics
  const [carrierDetailsOpen, setCarrierDetailsOpen] = useState(false);
  const [workerDetailsOpen, setWorkerDetailsOpen] = useState(false);
  const [selectedCarrier, setSelectedCarrier] = useState('');
  const [selectedWorker, setSelectedWorker] = useState<{ id: number; name: string } | null>(null);
  const [carrierDealerDetails, setCarrierDealerDetails] = useState<Array<{ dealerName: string; count: number }>>([]);
  const [workerCarrierDetails, setWorkerCarrierDetails] = useState<Array<{ carrier: string; count: number }>>([]);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/dashboard/stats', startDate, endDate],
    queryFn: () => {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const url = `/api/dashboard/stats${params.toString() ? '?' + params.toString() : ''}`;
      return apiRequest(url) as Promise<DashboardStats>;
    },
  });

  // 당월 개통 현황 통계 (자동으로 현재 월 데이터 조회)
  const { data: carrierStats, isLoading: carrierStatsLoading } = useQuery({
    queryKey: ['/api/dashboard/carrier-stats'],
    queryFn: () => apiRequest('/api/dashboard/carrier-stats') as Promise<any[]>,
    enabled: user?.userType === 'admin',
  });

  const { data: workerStats, isLoading: workerStatsLoading } = useQuery({
    queryKey: ['/api/dashboard/worker-stats'],
    queryFn: () => apiRequest('/api/dashboard/worker-stats') as Promise<any[]>,
    enabled: user?.userType === 'admin',
  });

  // 기간별 분석용 별도 통계 (날짜 필터 적용)
  const { data: carrierAnalytics, isLoading: carrierAnalyticsLoading } = useQuery({
    queryKey: ['/api/dashboard/carrier-stats', carrierStartDate, carrierEndDate],
    queryFn: () => {
      const params = new URLSearchParams();
      if (carrierStartDate) params.append('startDate', carrierStartDate);
      if (carrierEndDate) params.append('endDate', carrierEndDate);
      const url = `/api/dashboard/carrier-stats${params.toString() ? '?' + params.toString() : ''}`;
      return apiRequest(url) as Promise<any[]>;
    },
    enabled: user?.userType === 'admin' && !!(carrierStartDate || carrierEndDate),
  });

  const { data: workerAnalytics, isLoading: workerAnalyticsLoading } = useQuery({
    queryKey: ['/api/dashboard/worker-stats', workerStartDate, workerEndDate],
    queryFn: () => {
      const params = new URLSearchParams();
      if (workerStartDate) params.append('startDate', workerStartDate);
      if (workerEndDate) params.append('endDate', workerEndDate);
      const url = `/api/dashboard/worker-stats${params.toString() ? '?' + params.toString() : ''}`;
      return apiRequest(url) as Promise<any[]>;
    },
    enabled: user?.userType === 'admin' && !!(workerStartDate || workerEndDate),
  });

  // 당일 통계 조회
  const { data: todayStats, isLoading: todayStatsLoading } = useQuery({
    queryKey: ['/api/dashboard/today-stats'],
    queryFn: () => apiRequest('/api/dashboard/today-stats') as Promise<{
      todayReception: number;
      todayActivation: number;
      todayOtherCompleted: number;
      carrierStats: Array<{ carrier: string; count: number }>;
    }>,
  });

  const { data: activePricingTable } = useQuery({
    queryKey: ['/api/pricing-tables/active'],
    queryFn: () => apiRequest('/api/pricing-tables/active') as Promise<any | null>,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case '접수':
        return <Badge className="status-badge-pending">접수</Badge>;
      case '완료':
        return <Badge className="status-badge-completed">완료</Badge>;
      case '보완필요':
        return <Badge className="status-badge-needs-review">보완필요</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleUploadDocument = () => {
    // Navigate to document upload page
    window.location.href = '/documents';
  };

  const handleDownloadPricing = async () => {
    // Navigate to downloads page instead of downloading pricing table directly
    window.location.href = '/downloads';
  };

  const handleCarrierClick = async (carrier: string) => {
    try {
      setSelectedCarrier(carrier);
      const response = await apiRequest(`/api/admin/carrier-details/${carrier}`) as Array<{ dealerName: string; count: number }>;
      setCarrierDealerDetails(response);
      setCarrierDetailsOpen(true);
    } catch (error) {
      console.error('Error fetching carrier details:', error);
    }
  };

  const handleWorkerClick = async (worker: { id: number; name: string }) => {
    try {
      setSelectedWorker(worker);
      const response = await apiRequest(`/api/admin/worker-details/${worker.id}`) as Array<{ carrier: string; count: number }>;
      setWorkerCarrierDetails(response);
      setWorkerDetailsOpen(true);
    } catch (error) {
      console.error('Error fetching worker details:', error);
    }
  };

  return (
    <Layout title="대시보드">
      <div className="space-y-6">

        {/* Main Content Grid - 당일 현황을 전체 너비로 확장 */}
        <div className="space-y-6">
          {/* Today's Statistics - 전체 너비로 확장 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>당일 현황</CardTitle>
                <Button 
                  variant="link" 
                  size="sm"
                  onClick={() => window.location.href = '/documents'}
                >
                  전체보기
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 당일 접수건 */}
                  <div className="bg-blue-50 rounded-lg p-5 border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-blue-900 mb-2">당일 접수건</h3>
                        <p className="text-sm text-blue-700">오늘 새로 접수된 건수</p>
                      </div>
                      <Upload className="h-8 w-8 text-blue-600" />
                    </div>
                    <div className="mt-3">
                      {statsLoading ? (
                        <Skeleton className="h-10 w-16" />
                      ) : (
                        <>
                          <div className="text-2xl font-bold text-blue-600">
                            {stats?.todaySubmissions || 0}
                          </div>
                          <div className="text-sm text-blue-600 mt-1">건</div>
                          
                          {/* 폐기/취소 세부사항 */}
                          {stats?.todayDiscarded > 0 && (
                            <div className="mt-3 p-2 rounded bg-red-100 border border-red-200">
                              <div className="text-sm font-medium text-red-700">
                                폐기/취소: {stats.todayDiscarded}건
                              </div>
                              <div className="text-xs text-red-600 mt-1">
                                당일 접수 후 처리된 건수
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* 당일 개통건 */}
                  <div className="bg-green-50 rounded-lg p-5 border border-green-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-green-900 mb-2">당일 개통건</h3>
                        <p className="text-sm text-green-700">오늘 개통 완료된 건수</p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <div className="mt-3">
                      {statsLoading ? (
                        <Skeleton className="h-10 w-16" />
                      ) : (
                        <>
                          <div className="text-2xl font-bold text-green-600">
                            {stats?.todayCompletions?.total || 0}
                          </div>
                          <div className="text-sm text-green-600 mt-1">건</div>
                          
                          {/* 신규/번호이동 세부사항 */}
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <div className="p-2 rounded bg-green-100 border border-green-200">
                              <div className="text-sm font-medium text-green-700">
                                신규: {stats?.todayCompletions?.new || 0}건
                              </div>
                            </div>
                            <div className="p-2 rounded bg-blue-100 border border-blue-200">
                              <div className="text-sm font-medium text-blue-700">
                                번호이동: {stats?.todayCompletions?.portIn || 0}건
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* 당일 기타완료건 - 항상 표시되는 작은 박스 */}
                <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-purple-900 mb-1">기타 업무 처리건</h4>
                      <p className="text-xs text-purple-700">기타 처리 완료된 건수</p>
                    </div>
                    <div className="text-xl font-bold text-purple-600">
                      {todayStatsLoading ? (
                        <Skeleton className="h-6 w-10" />
                      ) : (
                        `${todayStats?.todayOtherCompleted || 0}건`
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 통신사별 개통 현황 */}
              {todayStats?.carrierStats && todayStats.carrierStats.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">당일 통신사별 개통 현황</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                    {todayStats.carrierStats.map((stat, index) => (
                      <div 
                        key={stat.carrier} 
                        className="bg-white border rounded-lg p-3 text-center hover:shadow-sm transition-shadow"
                      >
                        <div className="text-lg font-bold text-gray-900">{stat.count}</div>
                        <div className="text-xs text-gray-600 mt-1 break-words leading-tight">
                          {stat.carrier}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 추가 정보 */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
                <div className="flex items-center justify-center space-x-8 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4" />
                    <span>{format(new Date(), 'yyyy년 MM월 dd일', { locale: ko })}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4" />
                    <span>실시간 업데이트</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 당월 개통 현황 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calculator className="mr-2 h-5 w-5" />
              당월 개통 현황
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-7">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {statsLoading ? (
                    <Skeleton className="h-8 w-12 mx-auto" />
                  ) : (
                    stats?.totalDocuments || 0
                  )}
                </div>
                <div className="text-sm text-blue-800 mt-1">총 서류</div>
              </div>
              
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">
                  {statsLoading ? (
                    <Skeleton className="h-8 w-12 mx-auto" />
                  ) : (
                    stats?.pendingActivations || 0
                  )}
                </div>
                <div className="text-sm text-yellow-800 mt-1">접수 대기</div>
                <div className="text-xs text-yellow-700 mt-1">(대기 상태 문서)</div>
              </div>
              
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {statsLoading ? (
                    <Skeleton className="h-8 w-12 mx-auto" />
                  ) : (
                    stats?.inProgressCount || 0
                  )}
                </div>
                <div className="text-sm text-orange-800 mt-1">진행중</div>
              </div>
              
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {statsLoading ? (
                    <Skeleton className="h-8 w-12 mx-auto" />
                  ) : (
                    stats?.activatedCount || 0
                  )}
                </div>
                <div className="text-sm text-green-800 mt-1">개통완료</div>
              </div>
              
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {statsLoading ? (
                    <Skeleton className="h-8 w-12 mx-auto" />
                  ) : (
                    (stats as any)?.otherCompletedCount || 0
                  )}
                </div>
                <div className="text-sm text-purple-800 mt-1">기타완료</div>
              </div>
              
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {statsLoading ? (
                    <Skeleton className="h-8 w-12 mx-auto" />
                  ) : (
                    stats?.canceledCount || 0
                  )}
                </div>
                <div className="text-sm text-red-800 mt-1">취소</div>
              </div>
              
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-600">
                  {statsLoading ? (
                    <Skeleton className="h-8 w-12 mx-auto" />
                  ) : (
                    (stats as any)?.discardedCount || 0
                  )}
                </div>
                <div className="text-sm text-gray-800 mt-1">폐기</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Worker personal stats */}
        {user?.role === 'dealer_worker' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">내 개통 실적</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center">
                  <CheckCircle className="h-8 w-8 text-blue-600 mr-3" />
                  <div>
                    <div className="text-sm text-gray-600">내가 개통한 건수</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {stats?.activatedCount || 0}건
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Role-based additional stats for admin and workers - 전체 너비로 가로 배치 */}
        {user?.userType === 'admin' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">통신사별 · 근무자별 개통 수량</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 통신사별 개통 수량 */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-medium">통신사별 개통 수량</h3>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="date"
                        value={carrierStartDate}
                        onChange={(e) => setCarrierStartDate(e.target.value)}
                        className="h-8 text-xs w-32"
                        placeholder="시작일"
                      />
                      <span className="text-xs text-gray-500">~</span>
                      <Input
                        type="date"
                        value={carrierEndDate}
                        onChange={(e) => setCarrierEndDate(e.target.value)}
                        className="h-8 text-xs w-32"
                        placeholder="종료일"
                      />
                      {(carrierStartDate || carrierEndDate) && (
                        <Button 
                          onClick={() => {
                            setCarrierStartDate('');
                            setCarrierEndDate('');
                          }}
                          variant="outline"
                          size="sm"
                          className="h-8 px-2 text-xs"
                        >
                          초기화
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {carrierStatsLoading ? (
                      <div className="space-y-2">
                        {[1, 2, 3].map((i) => (
                          <Skeleton key={i} className="h-8 w-full" />
                        ))}
                      </div>
                    ) : (
                      (Array.isArray(carrierStats) ? carrierStats : []).map((carrier: any, index: number) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                          <button 
                            onClick={() => handleCarrierClick(carrier.carrier)}
                            className="font-medium text-blue-600 hover:text-blue-800 underline"
                          >
                            {carrier.carrier}
                          </button>
                          <Badge variant="secondary" className="text-xs">{carrier.count}건</Badge>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 근무자별 개통 수량 */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-medium">근무자별 개통 수량</h3>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="date"
                        value={workerStartDate}
                        onChange={(e) => setWorkerStartDate(e.target.value)}
                        className="h-8 text-xs w-32"
                        placeholder="시작일"
                      />
                      <span className="text-xs text-gray-500">~</span>
                      <Input
                        type="date"
                        value={workerEndDate}
                        onChange={(e) => setWorkerEndDate(e.target.value)}
                        className="h-8 text-xs w-32"
                        placeholder="종료일"
                      />
                      {(workerStartDate || workerEndDate) && (
                        <Button 
                          onClick={() => {
                            setWorkerStartDate('');
                            setWorkerEndDate('');
                          }}
                          variant="outline"
                          size="sm"
                          className="h-8 px-2 text-xs"
                        >
                          초기화
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {workerStatsLoading ? (
                      <div className="space-y-2">
                        {[1, 2, 3].map((i) => (
                          <Skeleton key={i} className="h-8 w-full" />
                        ))}
                      </div>
                    ) : (
                      (Array.isArray(workerStats) ? workerStats : []).map((worker: any, index: number) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                          <button 
                            onClick={() => handleWorkerClick({ id: worker.workerId, name: worker.workerName })}
                            className="font-medium text-blue-600 hover:text-blue-800 underline"
                          >
                            {worker.workerName}
                          </button>
                          <Badge variant="secondary" className="text-xs">{worker.count}건</Badge>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 단가표 최신 공지 & 빠른 기능 - 가로 배치 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 단가표 최신 공지 */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Calculator className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-lg font-semibold">단가표 최신 공지</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {activePricingTable ? (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-blue-900 mb-1">
                        최신 업로드된 단가표
                      </div>
                      <div className="text-base font-semibold text-blue-800 mb-2">
                        {activePricingTable.title}
                      </div>
                      <div className="text-xs text-blue-700">
                        {formatSafeDate(activePricingTable.uploadedAt, 'yyyy-MM-dd') + ' 게시'}
                      </div>
                    </div>
                    <div className="flex flex-col items-center ml-4">
                      <div className="bg-blue-100 p-2 rounded-full mb-2">
                        <Download className="h-6 w-6 text-blue-600" />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={handleDownloadPricing}
                      >
                        다운로드
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="bg-gray-100 p-3 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                    <Calculator className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500">등록된 단가표가 없습니다.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 빠른 기능 */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <Upload className="h-4 w-4 text-gray-600" />
                  <Download className="h-4 w-4 text-gray-600" />
                </div>
                <CardTitle className="text-lg font-semibold">빠른 기능</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-sm text-gray-600 mb-4">자주 사용하는 메뉴</div>
                
                <Button 
                  onClick={() => setLocation('/submit-application')}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <Upload className="mr-3 h-5 w-5" />
                  <div className="text-left">
                    <div className="font-medium">접수 신청</div>
                    <div className="text-xs text-gray-500">새로운 서류 접수</div>
                  </div>
                </Button>
                
                <Button 
                  onClick={() => setLocation('/downloads')}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <Download className="mr-3 h-5 w-5" />
                  <div className="text-left">
                    <div className="font-medium">서식지 다운로드</div>
                    <div className="text-xs text-gray-500">서류 양식 다운로드</div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Dialog modals */}

        {/* Carrier Details Dialog */}
        <Dialog open={carrierDetailsOpen} onOpenChange={setCarrierDetailsOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{selectedCarrier} 판매점별 개통 현황</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {carrierDealerDetails.length > 0 ? (
                carrierDealerDetails.map((detail, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="font-medium">{detail.dealerName}</span>
                    <Badge variant="secondary">{detail.count}건</Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500">
                  개통 내역이 없습니다.
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Worker Details Dialog */}
        <Dialog open={workerDetailsOpen} onOpenChange={setWorkerDetailsOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{selectedWorker?.name} 통신사별 개통 현황</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {workerCarrierDetails.length > 0 ? (
                workerCarrierDetails.map((detail, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="font-medium">{detail.carrier}</span>
                    <Badge variant="secondary">{detail.count}건</Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500">
                  개통 내역이 없습니다.
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
