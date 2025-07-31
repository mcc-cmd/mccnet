import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth, useApiRequest } from '@/lib/auth';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Search, Calendar, User, Phone, Building2, Smartphone, Download, Eye } from 'lucide-react';
import { Document } from '@shared/schema';

export function OtherCompletions() {
  const { user } = useAuth();
  const apiRequest = useApiRequest();
  
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // 기타완료 문서 조회
  const { data: documents = [], isLoading, refetch } = useQuery<Document[]>({
    queryKey: ['/api/documents', { activationStatus: '기타완료', search, startDate, endDate }],
    queryFn: () => {
      const params = new URLSearchParams();
      params.append('activationStatus', '기타완료');
      if (search) params.append('search', search);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      return apiRequest(`/api/documents?${params.toString()}`);
    },
  });

  const handleFileDownload = async (document: Document) => {
    if (!document.filePath) return;
    
    try {
      const response = await fetch(`/api/documents/${document.id}/download`, {
        headers: {
          'Authorization': `Bearer ${useAuth.getState().sessionId}`
        }
      });
      
      if (!response.ok) {
        throw new Error('파일 다운로드에 실패했습니다.');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      
      // 고객명을 포함한 파일명으로 다운로드
      const fileExtension = document.fileName?.split('.').pop() || '';
      a.download = `${document.customerName}_서류.${fileExtension}`;
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('파일 다운로드 오류:', error);
    }
  };

  const getCustomerFileName = (doc: Document) => {
    if (!doc.fileName) return '';
    const extension = doc.fileName.split('.').pop();
    return `${doc.customerName}_서류.${extension}`;
  };

  return (
    <Layout title="기타완료">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">기타완료 관리</h2>
          <p className="text-gray-600">
            기타 통신사로 처리 완료된 건들을 관리합니다.
          </p>
        </div>

        {/* 검색 및 필터 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Search className="mr-2 h-5 w-5" />
              검색 및 필터
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Input
                  placeholder="고객명, 연락처, 판매점명 검색"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div>
                <Input
                  type="date"
                  placeholder="시작일"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <Input
                  type="date"
                  placeholder="종료일"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div>
                <Button onClick={() => refetch()} className="w-full">
                  <Search className="mr-2 h-4 w-4" />
                  검색
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 기타완료 문서 목록 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <FileText className="mr-2 h-5 w-5" />
                기타완료 목록 ({documents.length}건)
              </div>
            </CardTitle>
            <CardDescription>
              기타 통신사로 처리 완료된 접수 건들입니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">로딩 중...</p>
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-gray-600">기타완료 건이 없습니다.</p>
              </div>
            ) : (
              <>
                {/* 데스크톱 테이블 뷰 */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-2 font-medium text-gray-700 text-sm">접수일</th>
                        <th className="text-left py-3 px-2 font-medium text-gray-700 text-sm">고객명</th>
                        <th className="text-left py-3 px-2 font-medium text-gray-700 text-sm">연락처</th>
                        <th className="text-left py-3 px-2 font-medium text-gray-700 text-sm">판매점명</th>
                        <th className="text-left py-3 px-2 font-medium text-gray-700 text-sm">통신사</th>
                        <th className="text-left py-3 px-2 font-medium text-gray-700 text-sm">상태</th>
                        <th className="text-left py-3 px-2 font-medium text-gray-700 text-sm">작업내용</th>
                        <th className="text-left py-3 px-2 font-medium text-gray-700 text-sm">유심번호</th>
                        <th className="text-left py-3 px-2 font-medium text-gray-700 text-sm">가입번호</th>
                        <th className="text-left py-3 px-2 font-medium text-gray-700 text-sm">처리자</th>
                        <th className="text-left py-3 px-2 font-medium text-gray-700 text-sm">다운로드</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents.map((doc) => (
                        <tr key={doc.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-2 text-sm leading-tight break-words">
                            {new Date(doc.uploadedAt).toLocaleDateString('ko-KR', { 
                              month: '2-digit', 
                              day: '2-digit' 
                            })}
                          </td>
                          <td className="py-3 px-2 text-sm leading-tight break-words font-medium">
                            {doc.customerName}
                          </td>
                          <td className="py-3 px-2 text-sm leading-tight break-words">
                            {doc.customerPhone}
                          </td>
                          <td className="py-3 px-2 text-sm leading-tight break-words">
                            {doc.storeName || doc.contactCode || (doc as any).dealerName || '-'}
                          </td>
                          <td className="py-3 px-2 text-sm leading-tight break-words">
                            {doc.carrier}
                          </td>
                          <td className="py-3 px-2">
                            <Badge className="bg-purple-100 text-purple-700 text-xs">
                              기타완료
                            </Badge>
                          </td>
                          <td className="py-3 px-2 text-sm leading-tight break-words max-w-xs">
                            <div className="space-y-1">
                              {doc.deviceModel && <div>기기: {doc.deviceModel}</div>}
                              {doc.notes && <div className="text-blue-600 font-medium">작업내용: {doc.notes}</div>}
                              {!doc.deviceModel && !doc.notes && '-'}
                            </div>
                          </td>
                          <td className="py-3 px-2 text-sm leading-tight break-words">
                            {doc.simNumber || '-'}
                          </td>
                          <td className="py-3 px-2 text-sm leading-tight break-words">
                            {doc.subscriptionNumber || '-'}
                          </td>
                          <td className="py-3 px-2 text-sm leading-tight break-words">
                            {(doc as any).activatedByName || '-'}
                          </td>
                          <td className="py-3 px-2">
                            {doc.filePath && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleFileDownload(doc)}
                                className="text-xs"
                              >
                                <Download className="h-3 w-3 mr-1" />
                                다운로드
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 모바일 카드 뷰 */}
                <div className="md:hidden space-y-4">
                  {documents.map((doc) => (
                    <div key={doc.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center">
                            <User className="h-4 w-4 mr-2 text-gray-500" />
                            <span className="font-medium break-words leading-tight">{doc.customerName}</span>
                          </div>
                          <div className="flex items-center">
                            <Phone className="h-4 w-4 mr-2 text-gray-500" />
                            <span className="text-sm text-gray-600 break-words leading-tight">{doc.customerPhone}</span>
                          </div>
                          <div className="flex items-center">
                            <Building2 className="h-4 w-4 mr-2 text-gray-500" />
                            <span className="text-sm text-gray-600 break-words leading-tight">
                              {doc.storeName || doc.contactCode || (doc as any).dealerName || '-'}
                            </span>
                          </div>
                          <div className="flex items-center">
                            <Smartphone className="h-4 w-4 mr-2 text-gray-500" />
                            <span className="text-sm text-gray-600 break-words leading-tight">{doc.carrier}</span>
                          </div>
                        </div>
                        <Badge className="bg-purple-100 text-purple-700 text-xs">
                          기타완료
                        </Badge>
                      </div>
                      
                      <div className="text-xs text-gray-500 space-y-1">
                        <div>접수일: {new Date(doc.uploadedAt).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })}</div>
                        {doc.deviceModel && <div>기기모델: {doc.deviceModel}</div>}
                        {doc.notes && <div className="text-blue-600 font-medium">작업내용: {doc.notes}</div>}
                        <div>유심번호: {doc.simNumber || '-'}</div>
                        <div>가입번호: {doc.subscriptionNumber || '-'}</div>
                        <div>처리자: {(doc as any).activatedByName || '-'}</div>
                      </div>

                      {doc.filePath && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleFileDownload(doc)}
                          className="w-full text-xs"
                        >
                          <Download className="h-3 w-3 mr-1" />
                          {getCustomerFileName(doc)}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}