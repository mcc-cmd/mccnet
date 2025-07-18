import { useQuery } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiRequest } from '@/lib/auth';
import { useAuth } from '@/lib/auth';
import type { DashboardStats, Document, PricingTable } from '../../../shared/schema';
import {
  FileText,
  Clock,
  CheckCircle,
  Upload,
  Download,
  Calculator,
  TrendingUp
} from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

export function Dashboard() {
  const apiRequest = useApiRequest();
  const { user } = useAuth();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/dashboard/stats'],
    queryFn: () => apiRequest('/api/dashboard/stats') as Promise<DashboardStats>,
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
    queryFn: () => apiRequest('/api/pricing-tables/active') as Promise<PricingTable | null>,
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
    if (activePricingTable) {
      window.open(`/api/files/pricing/${activePricingTable.id}`, '_blank');
    }
  };

  return (
    <Layout title="대시보드">
      <div className="space-y-6">
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
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
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
              
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {statsLoading ? (
                    <Skeleton className="h-8 w-12 mx-auto" />
                  ) : (
                    stats?.activatedCount || 0
                  )}
                </div>
                <div className="text-sm text-green-800 mt-1">개통 완료</div>
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
                  <Button variant="link" size="sm">
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
                    disabled={!activePricingTable}
                  >
                    <Download className="mr-2 h-5 w-5" />
                    개통서류 다운로드
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
      </div>
    </Layout>
  );
}
