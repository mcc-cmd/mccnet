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
  Calendar,
  Users,
  Building
} from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

export function WorkerDashboard() {
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

  // 근무자 전용 대시보드 통계
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/dashboard/worker-stats', startDate, endDate],
    queryFn: () => {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const url = `/api/dashboard/stats${params.toString() ? '?' + params.toString() : ''}`;
      return apiRequest(url) as Promise<DashboardStats>;
    },
  });

  // 근무자 당월 개통 현황 통계 (자신이 처리한 건만)
  const { data: monthlyStats, isLoading: monthlyStatsLoading } = useQuery({
    queryKey: ['/api/dashboard/monthly-activation-stats'],
    queryFn: () => apiRequest('/api/dashboard/monthly-activation-stats'),
  });

  // 근무자 당월 상태별 통계 (자신이 처리한 건만)
  const { data: monthlyStatusStats, isLoading: monthlyStatusStatsLoading } = useQuery({
    queryKey: ['/api/dashboard/monthly-status-stats'],
    queryFn: () => apiRequest('/api/dashboard/monthly-status-stats'),
  });

  // 최근 접수 문서 조회 (접수 관리에서 사용하는 것과 동일)
  const { data: recentDocuments, isLoading: recentDocumentsLoading } = useQuery({
    queryKey: ['/api/documents/recent-worker'],
    queryFn: () => {
      const params = new URLSearchParams();
      params.append('activationStatus', '대기,진행중');
      params.append('excludeDeleted', 'true');
      params.append('limit', '10');
      return apiRequest(`/api/documents?${params}`);
    },
  });

  return (
    <Layout title="근무자 대시보드">
      <div className="container mx-auto p-6 space-y-6">
        {/* 헤더 섹션 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">근무자 대시보드</h1>
            <p className="text-muted-foreground">
              안녕하세요, {user?.name}님. 오늘도 좋은 하루 되세요!
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-auto"
            />
            <span className="text-sm text-muted-foreground">~</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-auto"
            />
          </div>
        </div>

        {/* 주요 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">전체 신청</CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="space-y-1">
                  <div className="text-2xl font-bold">{(stats as any)?.total || 0}</div>
                  <p className="text-xs text-muted-foreground">접수 건수</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">대기</CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-yellow-600">{(stats as any)?.pending || 0}</div>
                  <p className="text-xs text-muted-foreground">처리 대기</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">진행중</CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-blue-600">{(stats as any)?.inProgress || 0}</div>
                  <p className="text-xs text-muted-foreground">처리 중</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">완료</CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-green-600">{(stats as any)?.completed || 0}</div>
                  <p className="text-xs text-muted-foreground">개통 완료</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 당월 성과 및 최근 접수 건 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 당월 개통 현황 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                당월 개통 현황
              </CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyStatsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ) : (
                <div className="space-y-4">
                  {monthlyStats?.length ? (
                    monthlyStats.map((stat: any, index: number) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-sm">{stat.carrier}</span>
                        <Badge variant="secondary">{stat.count}건</Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">당월 개통 건이 없습니다.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 최근 접수 건 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                최근 접수 건
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentDocumentsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : recentDocuments?.length ? (
                <div className="space-y-3">
                  {recentDocuments.slice(0, 5).map((doc: Document) => (
                    <div key={doc.id} className="flex items-center justify-between p-2 rounded-lg border">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{doc.customerName}</span>
                          <Badge 
                            variant={doc.activationStatus === '대기' ? 'destructive' : 'default'}
                            className="text-xs"
                          >
                            {doc.activationStatus}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {doc.carrier} • {formatSafeDate((doc as any).createdAt, 'MM/dd HH:mm')}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setLocation('/documents')}
                      >
                        보기
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">최근 접수 건이 없습니다.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 빠른 액션 버튼 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button
            variant="outline"
            className="h-16 flex flex-col gap-2"
            onClick={() => setLocation('/documents')}
          >
            <FileText className="h-5 w-5" />
            <span className="text-sm">접수 관리</span>
          </Button>
          
          <Button
            variant="outline"
            className="h-16 flex flex-col gap-2"
            onClick={() => setLocation('/work-requests')}
          >
            <Clock className="h-5 w-5" />
            <span className="text-sm">업무요청</span>
          </Button>
          
          <Button
            variant="outline"
            className="h-16 flex flex-col gap-2"
            onClick={() => setLocation('/completed')}
          >
            <CheckCircle className="h-5 w-5" />
            <span className="text-sm">개통완료</span>
          </Button>
          
          <Button
            variant="outline"
            className="h-16 flex flex-col gap-2"
            onClick={() => setLocation('/downloads')}
          >
            <Download className="h-5 w-5" />
            <span className="text-sm">다운로드</span>
          </Button>
        </div>
      </div>
    </Layout>
  );
}