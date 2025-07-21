import { useQuery } from '@tanstack/react-query';
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

  // Separate queries for carrier and worker stats with their own date filters
  const { data: carrierStats, isLoading: carrierStatsLoading } = useQuery({
    queryKey: ['/api/dashboard/carrier-stats', carrierStartDate, carrierEndDate],
    queryFn: () => {
      const params = new URLSearchParams();
      if (carrierStartDate) params.append('startDate', carrierStartDate);
      if (carrierEndDate) params.append('endDate', carrierEndDate);
      const url = `/api/dashboard/carrier-stats${params.toString() ? '?' + params.toString() : ''}`;
      return apiRequest(url) as Promise<any[]>;
    },
    enabled: user?.userType === 'admin',
  });

  const { data: workerStats, isLoading: workerStatsLoading } = useQuery({
    queryKey: ['/api/dashboard/worker-stats', workerStartDate, workerEndDate],
    queryFn: () => {
      const params = new URLSearchParams();
      if (workerStartDate) params.append('startDate', workerStartDate);
      if (workerEndDate) params.append('endDate', workerEndDate);
      const url = `/api/dashboard/worker-stats${params.toString() ? '?' + params.toString() : ''}`;
      return apiRequest(url) as Promise<any[]>;
    },
    enabled: user?.userType === 'admin',
  });

  const { data: recentDocuments, isLoading: documentsLoading } = useQuery({
    queryKey: ['/api/documents', { recent: true }],
    queryFn: () => {
      const params = new URLSearchParams({
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
      return apiRequest(`/api/documents?${params}`) as Promise<Document[]>;
    },
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
      const response = await apiRequest(`/api/admin/carrier-details/${carrier}`);
      setCarrierDealerDetails(response);
      setCarrierDetailsOpen(true);
    } catch (error) {
      console.error('Error fetching carrier details:', error);
    }
  };

  const handleWorkerClick = async (worker: { id: number; name: string }) => {
    try {
      setSelectedWorker(worker);
      const response = await apiRequest(`/api/admin/worker-details/${worker.id}`);
      setWorkerCarrierDetails(response);
      setWorkerDetailsOpen(true);
    } catch (error) {
      console.error('Error fetching worker details:', error);
    }
  };

  return (
    <Layout title="대시보드">
      <div className="space-y-6">
        {/* Date Filter Section for Admin */}
        {user?.userType === 'admin' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="mr-2 h-5 w-5" />
                날짜별 통계 필터
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-date">시작일</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-date">종료일</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label>&nbsp;</Label>
                  <Button 
                    onClick={() => {
                      setStartDate('');
                      setEndDate('');
                    }}
                    variant="outline"
                    className="w-full"
                  >
                    초기화
                  </Button>
                </div>
              </div>
              {(startDate || endDate) && (
                <div className="mt-3 text-sm text-gray-600">
                  {startDate && endDate 
                    ? `${startDate} ~ ${endDate} 기간의 통계`
                    : startDate 
                    ? `${startDate} 이후 통계`
                    : `${endDate} 이전 통계`
                  }
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Role-based additional stats for admin and workers */}
        {user?.userType === 'admin' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* 통신사별 개통 수량 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">통신사별 개통 수량</CardTitle>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <div className="space-y-1">
                    <Label htmlFor="carrier-start-date" className="text-xs">시작일</Label>
                    <Input
                      id="carrier-start-date"
                      type="date"
                      value={carrierStartDate}
                      onChange={(e) => setCarrierStartDate(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="carrier-end-date" className="text-xs">종료일</Label>
                    <Input
                      id="carrier-end-date"
                      type="date"
                      value={carrierEndDate}
                      onChange={(e) => setCarrierEndDate(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
                {(carrierStartDate || carrierEndDate) && (
                  <div className="flex justify-between items-center mt-2">
                    <div className="text-xs text-gray-600">
                      {carrierStartDate && carrierEndDate 
                        ? `${carrierStartDate} ~ ${carrierEndDate}`
                        : carrierStartDate 
                        ? `${carrierStartDate} 이후`
                        : `${carrierEndDate} 이전`
                      }
                    </div>
                    <Button 
                      onClick={() => {
                        setCarrierStartDate('');
                        setCarrierEndDate('');
                      }}
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-xs"
                    >
                      초기화
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {carrierStatsLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-10 w-full" />
                      ))}
                    </div>
                  ) : (
                    (carrierStats || []).map((carrier: any, index: number) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <button 
                          onClick={() => handleCarrierClick(carrier.carrier)}
                          className="font-medium text-blue-600 hover:text-blue-800 underline"
                        >
                          {carrier.carrier}
                        </button>
                        <Badge variant="secondary">{carrier.count}건</Badge>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 근무자별 개통 수량 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">근무자별 개통 수량</CardTitle>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <div className="space-y-1">
                    <Label htmlFor="worker-start-date" className="text-xs">시작일</Label>
                    <Input
                      id="worker-start-date"
                      type="date"
                      value={workerStartDate}
                      onChange={(e) => setWorkerStartDate(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="worker-end-date" className="text-xs">종료일</Label>
                    <Input
                      id="worker-end-date"
                      type="date"
                      value={workerEndDate}
                      onChange={(e) => setWorkerEndDate(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
                {(workerStartDate || workerEndDate) && (
                  <div className="flex justify-between items-center mt-2">
                    <div className="text-xs text-gray-600">
                      {workerStartDate && workerEndDate 
                        ? `${workerStartDate} ~ ${workerEndDate}`
                        : workerStartDate 
                        ? `${workerStartDate} 이후`
                        : `${workerEndDate} 이전`
                      }
                    </div>
                    <Button 
                      onClick={() => {
                        setWorkerStartDate('');
                        setWorkerEndDate('');
                      }}
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-xs"
                    >
                      초기화
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {workerStatsLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-10 w-full" />
                      ))}
                    </div>
                  ) : (
                    (workerStats || []).map((worker: any, index: number) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <button 
                          onClick={() => handleWorkerClick({ id: worker.workerId, name: worker.workerName })}
                          className="font-medium text-blue-600 hover:text-blue-800 underline"
                        >
                          {worker.workerName}
                        </button>
                        <Badge variant="secondary">{worker.count}건</Badge>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Worker personal stats */}
        {user?.userType === 'dealer_worker' && (
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FileText className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">총 서류</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {statsLoading ? (
                        <Skeleton className="h-6 w-12" />
                      ) : (
                        stats?.totalDocuments || 0
                      )}
                    </dd>
                  </dl>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Clock className="h-6 w-6 text-warning" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">접수 대기</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {statsLoading ? (
                        <Skeleton className="h-6 w-12" />
                      ) : (
                        stats?.pendingDocuments || 0
                      )}
                    </dd>
                  </dl>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-6 w-6 text-success" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">완료</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {statsLoading ? (
                        <Skeleton className="h-6 w-12" />
                      ) : (
                        stats?.completedDocuments || 0
                      )}
                    </dd>
                  </dl>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TrendingUp className="h-6 w-6 text-accent" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">이번 주</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {statsLoading ? (
                        <Skeleton className="h-6 w-12" />
                      ) : (
                        stats?.thisWeekSubmissions || 0
                      )}
                    </dd>
                  </dl>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activation Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calculator className="mr-2 h-5 w-5" />
              당월 개통 현황
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {statsLoading ? (
                    <Skeleton className="h-8 w-12 mx-auto" />
                  ) : (
                    stats?.thisMonthSubmissions || 0
                  )}
                </div>
                <div className="text-sm text-blue-800 mt-1">당월 접수</div>
              </div>
              
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">
                  {statsLoading ? (
                    <Skeleton className="h-8 w-12 mx-auto" />
                  ) : (
                    stats?.pendingActivations || 0
                  )}
                </div>
                <div className="text-sm text-yellow-800 mt-1">개통 대기</div>
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
            </div>
          </CardContent>
        </Card>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Documents */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>서류 접수 내역 (최근 7일)</CardTitle>
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
                {documentsLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center space-x-4">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    ))}
                  </div>
                ) : recentDocuments && recentDocuments.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-300">
                      <thead>
                        <tr>
                          <th className="py-3.5 pl-4 pr-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                            접수번호
                          </th>
                          <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                            고객명
                          </th>
                          <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                            상태
                          </th>
                          <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                            접수일시
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {recentDocuments.slice(0, 5).map((doc) => (
                          <tr key={doc.id}>
                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">
                              {doc.documentNumber}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                              {doc.customerName}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm">
                              {getStatusBadge(doc.status)}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                              {format(new Date(doc.uploadedAt), 'yyyy-MM-dd HH:mm', { locale: ko })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <FileText className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">서류가 없습니다</h3>
                    <p className="mt-1 text-sm text-gray-500">최근 7일간 접수된 서류가 없습니다.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Pricing Announcements */}
            <Card>
              <CardHeader>
                <CardTitle>단가표 최신 공지</CardTitle>
              </CardHeader>
              <CardContent>
                {activePricingTable ? (
                  <div className="p-3 bg-blue-50 rounded-lg border-l-4 border-accent">
                    <div className="flex items-start space-x-3">
                      <Calculator className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {activePricingTable.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {format(new Date(activePricingTable.uploadedAt), 'yyyy-MM-dd 게시', { locale: ko })}
                        </p>
                        <Button
                          variant="link"
                          size="sm"
                          className="text-xs p-0 h-auto mt-2"
                          onClick={handleDownloadPricing}
                        >
                          다운로드
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Calculator className="mx-auto h-8 w-8 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500">등록된 단가표가 없습니다.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>바로가기</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {user?.userType === 'user' && (
                    <Button
                      className="w-full"
                      onClick={handleUploadDocument}
                    >
                      <Upload className="mr-2 h-5 w-5" />
                      서류 업로드
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleDownloadPricing}
                  >
                    <Download className="mr-2 h-5 w-5" />
                    서식지 다운로드
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => window.location.href = '/downloads'}
                  >
                    <Calculator className="mr-2 h-5 w-5" />
                    단가표
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

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
