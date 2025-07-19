import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Users, Clock, CheckCircle, DollarSign, Download, FileText, Calendar } from 'lucide-react';

interface CompletedDocument {
  id: number;
  documentNumber: string;
  customerName: string;
  customerPhone: string;
  storeName: string;
  carrier: string;
  contactCode: string;
  servicePlanName?: string;
  additionalServices: string[];
  activatedAt: Date;
  dealerName: string;
  deviceModel?: string;
  simNumber?: string;
  bundleApplied: boolean;
  bundleNotApplied: boolean;
}

interface SettlementStats {
  total: number;
  thisMonth: number;
  lastMonth: number;
  totalAmount: number;
}

export function Settlements() {
  const { toast } = useToast();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // 개통 완료된 문서 조회 (정산 데이터로 활용)
  const { data: completedDocuments, isLoading } = useQuery({
    queryKey: ['/api/documents', { activationStatus: '개통' }],
    queryFn: async () => {
      const params = new URLSearchParams({ activationStatus: '개통' });
      const response = await apiRequest('GET', `/api/documents?${params.toString()}`);
      return response.json() as Promise<CompletedDocument[]>;
    },
  });

  // 정산 통계 계산
  const stats: SettlementStats = React.useMemo(() => {
    if (!completedDocuments) return { total: 0, thisMonth: 0, lastMonth: 0, totalAmount: 0 };
    
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    
    let thisMonth = 0;
    let lastMonth = 0;
    
    completedDocuments.forEach(doc => {
      const activatedDate = new Date(doc.activatedAt);
      if (activatedDate >= thisMonthStart) {
        thisMonth++;
      } else if (activatedDate >= lastMonthStart && activatedDate <= lastMonthEnd) {
        lastMonth++;
      }
    });
    
    return {
      total: completedDocuments.length,
      thisMonth,
      lastMonth,
      totalAmount: completedDocuments.length * 50000 // 예시 금액
    };
  }, [completedDocuments]);

  // 날짜 필터링된 문서 목록
  const filteredDocuments = React.useMemo(() => {
    if (!completedDocuments) return [];
    
    return completedDocuments.filter(doc => {
      const docDate = format(new Date(doc.activatedAt), 'yyyy-MM-dd');
      const start = startDate || '2020-01-01';
      const end = endDate || '2030-12-31';
      return docDate >= start && docDate <= end;
    });
  }, [completedDocuments, startDate, endDate]);

  // 엑셀 다운로드 함수
  const handleExcelDownload = async () => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await apiRequest('GET', `/api/settlements/export?${params.toString()}`);
      
      if (!response.ok) throw new Error('다운로드 실패');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `정산데이터_${startDate || '전체'}_${endDate || '현재'}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "다운로드 완료",
        description: "정산 데이터를 엑셀 파일로 다운로드했습니다.",
      });
    } catch (error) {
      toast({
        title: "다운로드 실패",
        description: "엑셀 파일 다운로드 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (bundleApplied: boolean, bundleNotApplied: boolean) => {
    if (bundleApplied) {
      return <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">결합</Badge>;
    } else if (bundleNotApplied) {
      return <Badge variant="secondary" className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100">미결합</Badge>;
    } else {
      return <Badge variant="outline">미지정</Badge>;
    }
  };

  return (
    <Layout>
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">정산 관리</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              접수 관리의 개통 완료 데이터를 기반으로 정산 정보를 관리합니다.
            </p>
          </div>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">총 개통건수</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">전체 개통 완료</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">이번달 개통</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.thisMonth}</div>
              <p className="text-xs text-muted-foreground">이번달 개통</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">지난달 개통</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.lastMonth}</div>
              <p className="text-xs text-muted-foreground">지난달 개통</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">예상 정산액</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAmount.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">원</p>
            </CardContent>
          </Card>
        </div>

        {/* 필터링 및 다운로드 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>데이터 필터링 및 다운로드</CardTitle>
            <CardDescription>
              개통날짜를 기준으로 정산 데이터를 필터링하고 엑셀로 다운로드할 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="start-date">시작 날짜</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="end-date">종료 날짜</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                  variant="outline"
                >
                  필터 초기화
                </Button>
                <Button onClick={handleExcelDownload} className="bg-teal-600 hover:bg-teal-700">
                  <Download className="w-4 h-4 mr-2" />
                  엑셀 다운로드
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 정산 데이터 목록 */}
        <Card>
          <CardHeader>
            <CardTitle>정산 데이터 목록</CardTitle>
            <CardDescription>
              개통 완료된 문서를 기반으로 한 정산 정보입니다. ({filteredDocuments.length}건)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">로딩 중...</div>
            ) : filteredDocuments && filteredDocuments.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>개통날짜</TableHead>
                      <TableHead>문서번호</TableHead>
                      <TableHead>고객명</TableHead>
                      <TableHead>연락처</TableHead>
                      <TableHead>판매점명</TableHead>
                      <TableHead>통신사</TableHead>
                      <TableHead>요금제</TableHead>
                      <TableHead>부가서비스</TableHead>
                      <TableHead>결합여부</TableHead>
                      <TableHead>기기/유심</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDocuments.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell>
                          {format(new Date(doc.activatedAt), 'yyyy-MM-dd', { locale: ko })}
                        </TableCell>
                        <TableCell className="font-medium">{doc.documentNumber}</TableCell>
                        <TableCell>{doc.customerName}</TableCell>
                        <TableCell>{doc.customerPhone}</TableCell>
                        <TableCell>{doc.storeName || doc.dealerName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{doc.carrier}</Badge>
                        </TableCell>
                        <TableCell>{doc.servicePlanName || '-'}</TableCell>
                        <TableCell>
                          {doc.additionalServices && doc.additionalServices.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {doc.additionalServices.slice(0, 2).map((service, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {service}
                                </Badge>
                              ))}
                              {doc.additionalServices.length > 2 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{doc.additionalServices.length - 2}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">없음</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(doc.bundleApplied, doc.bundleNotApplied)}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {doc.deviceModel && <div>기기: {doc.deviceModel}</div>}
                            {doc.simNumber && <div>유심: {doc.simNumber}</div>}
                            {!doc.deviceModel && !doc.simNumber && <span className="text-muted-foreground">-</span>}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                선택한 기간에 개통 완료된 문서가 없습니다.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}