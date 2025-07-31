import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useApiRequest } from '@/lib/auth';
import type { Document } from '../../../shared/schema';
import { Trash2, Search, Calendar, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

export function DiscardedDocuments() {
  const apiRequest = useApiRequest();
  
  const [filters, setFilters] = useState({
    search: '',
    startDate: '',
    endDate: ''
  });

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

  const { data: discardedDocuments, isLoading } = useQuery({
    queryKey: ['/api/documents/discarded', filters],
    queryFn: () => {
      const params = new URLSearchParams();
      params.append('activationStatus', '폐기');
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== '') params.append(key, value);
      });
      return apiRequest(`/api/documents?${params}`) as Promise<Document[]>;
    },
  });

  return (
    <Layout title="폐기 관리">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium text-gray-900">폐기된 서류</h3>
            <p className="text-sm text-gray-500">
              폐기 처리된 서류들과 폐기 사유를 확인할 수 있습니다.
            </p>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <AlertTriangle className="h-4 w-4" />
            <span>총 {discardedDocuments?.length || 0}건 폐기</span>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-base">
              <Search className="mr-2 h-4 w-4" />
              검색 및 필터
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="search">고객명/연락처 검색</Label>
                <Input
                  id="search"
                  placeholder="고객명 또는 연락처로 검색..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="startDate">시작일</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="endDate">종료일</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Discarded Documents List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Trash2 className="mr-2 h-5 w-5" />
              폐기된 서류 목록
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, index) => (
                  <div key={index} className="flex justify-between items-center p-4 border rounded-lg">
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))}
              </div>
            ) : discardedDocuments && discardedDocuments.length > 0 ? (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            고객 정보
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            통신사
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            폐기일
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            폐기 사유
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            처리자
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {discardedDocuments.map((doc) => (
                          <tr key={doc.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="break-words leading-tight">
                                <div className="text-sm font-medium text-gray-900">
                                  {doc.customerName}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {doc.customerPhone}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm text-gray-900 break-words leading-tight">
                                {doc.carrier || '-'}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm text-gray-900 break-words leading-tight">
                                {formatSafeDate((doc as any).activatedAt, 'MM/dd HH:mm')}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm text-red-700 bg-red-50 p-2 rounded border-l-4 border-red-400 break-words leading-tight">
                                {(doc as any).discardReason || '사유 없음'}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm text-gray-900 break-words leading-tight">
                                {(doc as any).activatedByName || '-'}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                  {discardedDocuments.map((doc) => (
                    <div key={doc.id} className="border rounded-lg p-4 bg-white">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium text-gray-900 break-words leading-tight">
                              {doc.customerName}
                            </div>
                            <div className="text-sm text-gray-500 break-words leading-tight">
                              {doc.customerPhone}
                            </div>
                          </div>
                          <Badge variant="outline" className="text-red-600 border-red-600 text-xs">
                            폐기
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <div className="text-gray-500">통신사</div>
                            <div className="text-gray-900 break-words leading-tight">
                              {doc.carrier || '-'}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-500">폐기일</div>
                            <div className="text-gray-900 break-words leading-tight">
                              {formatSafeDate((doc as any).activatedAt, 'MM/dd HH:mm')}
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-gray-500 text-sm mb-1">폐기 사유</div>
                          <div className="text-sm text-red-700 bg-red-50 p-2 rounded border-l-4 border-red-400 break-words leading-tight">
                            {(doc as any).discardReason || '사유 없음'}
                          </div>
                        </div>
                        
                        <div className="text-xs text-gray-500">
                          처리자: {(doc as any).activatedByName || '-'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <Trash2 className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">폐기된 서류가 없습니다</h3>
                <p className="mt-1 text-sm text-gray-500">
                  아직 폐기 처리된 서류가 없습니다.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}