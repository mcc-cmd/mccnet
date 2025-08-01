import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useApiRequest, useAuth } from '@/lib/auth';
import type { Document } from '../../../shared/schema';
import { X, Search, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

export function CancelledActivations() {
  const apiRequest = useApiRequest();
  const { user } = useAuth();
  
  const [filters, setFilters] = useState({
    search: '',
    startDate: '',
    endDate: ''
  });

  const { data: documents, isLoading } = useQuery({
    queryKey: ['/api/documents/cancelled', filters],
    queryFn: () => {
      const params = new URLSearchParams();
      params.append('activationStatus', '취소');
      // Include cancelled by information
      params.append('includeCancelledBy', 'true');
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      return apiRequest(`/api/documents?${params}`) as Promise<Document[]>;
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case '접수':
        return <Badge variant="secondary">접수</Badge>;
      case '보완필요':
        return <Badge variant="destructive">보완필요</Badge>;
      case '완료':
        return <Badge variant="default">완료</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getActivationStatusBadge = (status: string) => {
    switch (status) {
      case '대기':
        return <Badge variant="secondary">대기</Badge>;
      case '진행중':
        return <Badge variant="outline">진행중</Badge>;
      case '개통':
        return <Badge variant="default" className="bg-green-600">개통완료</Badge>;
      case '취소':
        return <Badge variant="destructive">취소</Badge>;
      case '보완필요':
        return <Badge variant="destructive">보완필요</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <h1 className="text-3xl font-bold">개통취소 관리</h1>
          <div className="text-center py-8">로딩 중...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">개통취소 관리</h1>
          <div className="flex items-center space-x-2">
            <X className="h-6 w-6 text-red-600" />
            <span className="text-sm text-gray-500">취소된 건: {documents?.length || 0}건</span>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">필터</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">검색</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="고객명, 전화번호로 검색"
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">시작일</label>
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">종료일</label>
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Documents List */}
        <Card>
          <CardHeader>
            <CardTitle>개통취소 목록</CardTitle>
          </CardHeader>
          <CardContent>
            {!documents || documents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <X className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2">취소된 문서가 없습니다.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">취소일시</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">고객명</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">연락처</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">판매점</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">통신사</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">요금제 정보</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">취소 처리자</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {documents.map((doc) => (
                        <tr key={doc.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-sm font-medium text-gray-900">
                            <div className="leading-tight break-words max-w-full">
                              {doc.updatedAt ? format(new Date(doc.updatedAt), 'yyyy-MM-dd HH:mm', { locale: ko }) : '-'}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-900">
                            <div className="leading-tight break-words max-w-full">
                              {(doc as any).customerName}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-900">
                            <div className="leading-tight break-words max-w-full">
                              {(doc as any).customerPhone}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-900">
                            <div className="leading-tight break-words max-w-full">
                              {(doc as any).storeName || (doc as any).dealerName || '-'}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-900">
                            <div className="leading-tight break-words max-w-full">
                              {doc.carrier}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-900">
                            <div className="leading-tight break-words max-w-full">
                              {(doc as any).servicePlanName || '-'}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-900">
                            <div className="leading-tight break-words max-w-full">
                              <div className="font-medium text-red-600">
                                {(doc as any).cancelledByName || '알 수 없음'}
                              </div>
                              {(doc as any).cancelledBy && (
                                <div className="text-xs text-gray-500">
                                  ID: {(doc as any).cancelledBy}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            {getActivationStatusBadge(doc.activationStatus)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-4">
                  {documents.map((doc) => (
                    <Card key={doc.id} className="shadow-sm">
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium break-words leading-tight">{(doc as any).customerName}</div>
                              <div className="text-sm text-gray-500 break-words leading-tight">{(doc as any).customerPhone}</div>
                            </div>
                            {getActivationStatusBadge(doc.activationStatus)}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-gray-500">판매점:</span>
                              <div className="break-words leading-tight">{(doc as any).storeName || (doc as any).dealerName || '-'}</div>
                            </div>
                            <div>
                              <span className="text-gray-500">통신사:</span>
                              <div className="break-words leading-tight">{doc.carrier}</div>
                            </div>
                          </div>

                          <div className="text-sm">
                            <span className="text-gray-500">요금제:</span>
                            <div className="break-words leading-tight">{(doc as any).servicePlanName || '-'}</div>
                          </div>

                          <div className="text-sm">
                            <span className="text-gray-500">취소 처리자:</span>
                            <div className="break-words leading-tight">
                              <div className="font-medium text-red-600">
                                {(doc as any).cancelledByName || '알 수 없음'}
                              </div>
                              {(doc as any).cancelledBy && (
                                <div className="text-xs text-gray-500">
                                  ID: {(doc as any).cancelledBy}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="text-sm">
                            <span className="text-gray-500">취소일:</span>
                            <div className="break-words leading-tight">
                              {doc.updatedAt ? format(new Date(doc.updatedAt), 'yyyy-MM-dd HH:mm', { locale: ko }) : '-'}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}