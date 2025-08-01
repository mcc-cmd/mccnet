import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useApiRequest, useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import type { Document } from '../../../shared/schema';
import { FileText, Search, Calendar, CheckCircle, X, Download } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

export function CompletedActivations() {
  const apiRequest = useApiRequest();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [filters, setFilters] = useState({
    search: '',
    startDate: '',
    endDate: '',
    carrier: ''
  });

  const { data: documents, isLoading } = useQuery({
    queryKey: ['/api/documents/completed', filters],
    queryFn: () => {
      const params = new URLSearchParams();
      params.append('activationStatus', '개통');
      // 근무자는 자신이 개통한 건만 조회
      if (user?.userType === 'dealer_worker') {
        params.append('workerFilter', 'my');
      }
      // 개통 처리자 이름을 포함하도록 요청
      params.append('includeActivatedBy', 'true');
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      return apiRequest(`/api/documents?${params}`) as Promise<Document[]>;
    },
  });

  // 개통취소 mutation
  const cancelActivationMutation = useMutation({
    mutationFn: (documentId: number) => {
      return apiRequest(`/api/documents/${documentId}/activation-status`, {
        method: 'PUT',
        body: JSON.stringify({
          activationStatus: '취소',
          notes: '개통취소 처리됨'
        })
      });
    },
    onSuccess: () => {
      toast({
        title: "개통취소 완료",
        description: "문서가 개통취소로 변경되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/documents/completed'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
    },
    onError: () => {
      toast({
        title: "개통취소 실패",
        description: "개통취소 처리 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  });

  const handleCancelActivation = (documentId: number) => {
    if (confirm('이 문서를 개통취소로 변경하시겠습니까?')) {
      cancelActivationMutation.mutate(documentId);
    }
  };

  const handleExportToExcel = async () => {
    try {
      const params = new URLSearchParams();
      params.append('activationStatus', '개통');
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      
      // fetch API를 직접 사용하여 blob 다운로드
      const token = localStorage.getItem('auth-storage');
      let sessionId = '';
      if (token) {
        try {
          const parsed = JSON.parse(token);
          sessionId = parsed.state?.sessionId || '';
        } catch (e) {
          console.error('Failed to parse auth token:', e);
        }
      }
      
      const response = await fetch(`/api/documents/export/excel?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${sessionId}`,
        },
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `개통완료목록_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        toast({
          title: "엑셀 다운로드 완료",
          description: "개통완료 목록이 엑셀 파일로 다운로드되었습니다.",
        });
      } else {
        const errorText = await response.text();
        console.error('Excel download error:', errorText);
        throw new Error('다운로드 실패');
      }
    } catch (error) {
      console.error('Excel download error:', error);
      toast({
        title: "다운로드 실패",  
        description: "엑셀 파일 다운로드 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

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

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">개통완료 관리</h1>
          <div className="flex items-center space-x-4">
            <Button
              onClick={handleExportToExcel}
              disabled={!documents || documents.length === 0 || isLoading}
              className="flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>엑셀 다운로드</span>
            </Button>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <span className="text-sm text-gray-500">개통완료 건: {documents?.length || 0}건</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">필터</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                <label className="text-sm font-medium">통신사</label>
                <Select value={filters.carrier} onValueChange={(value) => setFilters({ ...filters, carrier: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="전체" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">전체</SelectItem>
                    <SelectItem value="KT">KT</SelectItem>
                    <SelectItem value="SK브로드밴드">SK브로드밴드</SelectItem>
                    <SelectItem value="SKT">SKT</SelectItem>
                    <SelectItem value="SK프리티">SK프리티</SelectItem>
                    <SelectItem value="LG미디어로그">LG미디어로그</SelectItem>
                    <SelectItem value="LG유플러스">LG유플러스</SelectItem>
                    <SelectItem value="KTM">KTM</SelectItem>
                    <SelectItem value="KT프리미어">KT프리미어</SelectItem>
                  </SelectContent>
                </Select>
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
            <CardTitle>개통완료 목록</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto"></div>
              </div>
            ) : documents && documents.length > 0 ? (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">개통완료일시</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">고객명</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">연락처</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">판매점</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">개통처리자</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">가입번호</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">통신사</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">요금제 정보</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">액션</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {documents.map((doc) => (
                        <tr key={doc.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-sm font-medium text-gray-900">
                            <div className="leading-tight break-words max-w-full">
                              {doc.activatedAt ? format(new Date(doc.activatedAt), 'yyyy-MM-dd HH:mm', { locale: ko }) : '-'}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-900">
                            <div className="leading-tight break-words max-w-full">
                              {doc.customerName}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-900">
                            <div className="leading-tight break-words max-w-full">
                              {doc.customerPhone}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-900">
                            <div className="leading-tight break-words max-w-full">
                              {(doc as any).storeName || (doc as any).dealerName || '-'}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-900">
                            <div className="leading-tight break-words max-w-full">
                              {(doc as any).activatedByName || '관리자'}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-900">
                            <div className="leading-tight break-words max-w-full font-medium text-blue-600">
                              {(doc as any).subscriptionNumber || '-'}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-900">
                            <div className="leading-tight break-words max-w-full">
                              {doc.carrier}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-900">
                            <div className="space-y-1">
                              {/* 요금제 정보 */}
                              {(doc as any).servicePlanName ? (
                                <div className="font-medium text-blue-600 text-xs leading-tight break-words">
                                  {(doc as any).servicePlanName}
                                </div>
                              ) : (
                                <span className="text-gray-400">미선택</span>
                              )}
                              
                              {/* 부가서비스 */}
                              {(doc as any).additionalServices && (
                                <div className="text-xs text-gray-500 leading-tight break-words">
                                  부가: {(doc as any).additionalServices}
                                </div>
                              )}
                              
                              {/* 가입비/유심비/결합 정보 */}
                              {((doc as any).registrationFeePrepaid || (doc as any).registrationFeePostpaid || 
                                (doc as any).simFeePrepaid || (doc as any).simFeePostpaid ||
                                (doc as any).bundleApplied || (doc as any).bundleNotApplied) && (
                                <div className="text-xs text-gray-600 space-y-0.5">
                                  {((doc as any).registrationFeePrepaid || (doc as any).registrationFeePostpaid) && (
                                    <div>
                                      가입비: {(doc as any).registrationFeePrepaid ? '선납' : ''}{(doc as any).registrationFeePrepaid && (doc as any).registrationFeePostpaid ? '/' : ''}{(doc as any).registrationFeePostpaid ? '후납' : ''}
                                    </div>
                                  )}
                                  {((doc as any).simFeePrepaid || (doc as any).simFeePostpaid) && (
                                    <div>
                                      유심비: {(doc as any).simFeePrepaid ? '선납' : ''}{(doc as any).simFeePrepaid && (doc as any).simFeePostpaid ? '/' : ''}{(doc as any).simFeePostpaid ? '후납' : ''}
                                    </div>
                                  )}
                                  {((doc as any).bundleApplied || (doc as any).bundleNotApplied) && (
                                    <div>
                                      결합: {(doc as any).bundleApplied ? '적용' : ''}{(doc as any).bundleApplied && (doc as any).bundleNotApplied ? '/' : ''}{(doc as any).bundleNotApplied ? '미적용' : ''}
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {/* 월 요금 */}
                              {(doc as any).totalMonthlyFee && (
                                <div className="text-xs font-medium text-green-600">
                                  월 {(doc as any).totalMonthlyFee.toLocaleString()}원
                                </div>
                              )}

                              {/* 판매점 전달 메모 표시 */}
                              {(doc as any).dealerNotes && (
                                <div className="mt-2 p-2 bg-green-50 border-l-4 border-green-400 rounded-r text-xs">
                                  <div className="font-bold text-green-800 mb-1">💼 판매점 메모</div>
                                  <div className="text-green-700 leading-tight">
                                    {(doc as any).dealerNotes}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            {getActivationStatusBadge(doc.activationStatus)}
                          </td>
                          <td className="px-3 py-2">
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleCancelActivation(doc.id)}
                              disabled={cancelActivationMutation.isPending}
                              className="text-xs"
                            >
                              <X className="h-3 w-3 mr-1" />
                              14일내 개취
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-4">
                  {documents.map((doc) => (
                    <Card key={doc.id} className="p-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{doc.customerName}</p>
                            <p className="text-sm text-gray-600">
                              {doc.activatedAt ? format(new Date(doc.activatedAt), 'yyyy-MM-dd HH:mm', { locale: ko }) : '-'}
                            </p>
                            <p className="text-xs text-blue-600">
                              처리자: {(doc as any).activatedByName || '알 수 없음'} {doc.activatedBy ? `(ID: ${doc.activatedBy})` : ''}
                            </p>
                          </div>
                          {getActivationStatusBadge(doc.activationStatus)}
                        </div>
                        <div className="space-y-1 text-sm">
                          <p><span className="font-medium">연락처:</span> {doc.customerPhone}</p>
                          <p><span className="font-medium">판매점:</span> {(doc as any).storeName || (doc as any).dealerName || '-'}</p>
                          <p><span className="font-medium">개통처리자:</span> {(doc as any).activatedByName || '관리자'}</p>
                          <p><span className="font-medium">가입번호:</span> <span className="text-blue-600 font-medium">{(doc as any).subscriptionNumber || '-'}</span></p>
                          <p><span className="font-medium">통신사:</span> {doc.carrier}</p>
                          
                          {/* 요금제 정보 */}
                          <div>
                            <span className="font-medium">요금제:</span>
                            {(doc as any).servicePlanName ? (
                              <div className="mt-1 space-y-1">
                                <div className="font-medium text-blue-600 text-sm">
                                  {(doc as any).servicePlanName}
                                </div>
                                
                                {/* 부가서비스 */}
                                {(doc as any).additionalServices && (
                                  <div className="text-sm text-gray-500">
                                    부가: {(doc as any).additionalServices}
                                  </div>
                                )}
                                
                                {/* 가입비/유심비/결합 정보 */}
                                {((doc as any).registrationFeePrepaid || (doc as any).registrationFeePostpaid || 
                                  (doc as any).simFeePrepaid || (doc as any).simFeePostpaid ||
                                  (doc as any).bundleApplied || (doc as any).bundleNotApplied) && (
                                  <div className="text-sm text-gray-600 space-y-0.5">
                                    {((doc as any).registrationFeePrepaid || (doc as any).registrationFeePostpaid) && (
                                      <div>
                                        가입비: {(doc as any).registrationFeePrepaid ? '선납' : ''}{(doc as any).registrationFeePrepaid && (doc as any).registrationFeePostpaid ? '/' : ''}{(doc as any).registrationFeePostpaid ? '후납' : ''}
                                      </div>
                                    )}
                                    {((doc as any).simFeePrepaid || (doc as any).simFeePostpaid) && (
                                      <div>
                                        유심비: {(doc as any).simFeePrepaid ? '선납' : ''}{(doc as any).simFeePrepaid && (doc as any).simFeePostpaid ? '/' : ''}{(doc as any).simFeePostpaid ? '후납' : ''}
                                      </div>
                                    )}
                                    {((doc as any).bundleApplied || (doc as any).bundleNotApplied) && (
                                      <div>
                                        결합: {(doc as any).bundleApplied ? '적용' : ''}{(doc as any).bundleApplied && (doc as any).bundleNotApplied ? '/' : ''}{(doc as any).bundleNotApplied ? '미적용' : ''}
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                {/* 월 요금 */}
                                {(doc as any).totalMonthlyFee && (
                                  <div className="text-sm font-medium text-green-600">
                                    월 {(doc as any).totalMonthlyFee.toLocaleString()}원
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400"> 미선택</span>
                            )}
                          </div>
                          

                        </div>

                        {/* 판매점 전달 메모 표시 */}
                        {(doc as any).dealerNotes && (
                          <div className="mt-3 p-3 bg-gradient-to-r from-green-50 to-teal-50 border-l-4 border-green-500 rounded-r-lg shadow-sm">
                            <div className="flex items-center mb-2">
                              <span className="text-lg mr-2">💼</span>
                              <div className="text-sm font-bold text-green-800">판매점 전달 메모</div>
                            </div>
                            <div className="text-sm text-green-900 bg-white p-2 rounded border border-green-200">
                              {(doc as any).dealerNotes}
                            </div>
                          </div>
                        )}

                        {/* 개통취소 버튼 */}
                        <div className="mt-3">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleCancelActivation(doc.id)}
                            disabled={cancelActivationMutation.isPending}
                            className="w-full text-sm"
                          >
                            <X className="h-4 w-4 mr-2" />
                            14일내 개취
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">개통완료 건이 없습니다</h3>
                <p className="mt-1 text-sm text-gray-500">아직 개통완료 처리한 건이 없습니다.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}