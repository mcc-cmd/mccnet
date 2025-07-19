import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, isValid } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Users, Clock, CheckCircle, Download, FileText, Calendar, Plus, Search } from 'lucide-react';

interface CompletedDocument {
  id: number;
  documentNumber: string;
  customerName: string;
  customerPhone: string;
  storeName: string;
  carrier: string;
  contactCode?: string;
  servicePlanName?: string;
  additionalServices?: string | string[];
  activatedAt: string;
  dealerName: string;
  userName?: string;
  deviceModel?: string;
  simNumber?: string;
  subscriptionNumber?: string;
  bundleApplied: boolean;
  bundleNotApplied: boolean;
  dealerId: number;
  userId: number;
  status: string;
  activationStatus: string;
  filePath?: string;
  fileName?: string;
  fileSize?: number;
  uploadedAt: string;
  updatedAt: string;
  activatedBy?: string;
  notes?: string;
  supplementNotes?: string;
  supplementRequiredBy?: string;
  supplementRequiredAt?: string;
  servicePlanId?: number;
  additionalServiceIds?: string;
  totalMonthlyFee?: number;
  registrationFeePrepaid?: boolean;
  registrationFeePostpaid?: boolean;
  simFeePrepaid?: boolean;
  simFeePostpaid?: boolean;
}

interface SettlementStats {
  total: number;
  thisMonth: number;
  lastMonth: number;
  totalAmount: number;
}

// 수기 정산 등록 스키마
const manualSettlementSchema = z.object({
  customerName: z.string().min(1, '고객명을 입력해주세요'),
  customerPhone: z.string().min(1, '연락처를 입력해주세요'),
  storeName: z.string().min(1, '판매점을 입력해주세요'),
  carrier: z.string().min(1, '통신사를 선택해주세요'),
  servicePlanId: z.number().optional(),
  additionalServices: z.array(z.string()).optional(),
  activatedAt: z.string().min(1, '개통날짜를 입력해주세요'),
  subscriptionNumber: z.string().optional(),
  deviceModel: z.string().optional(),
  simNumber: z.string().optional(),
  bundleApplied: z.boolean().default(false),
  bundleNotApplied: z.boolean().default(false),
  registrationFeePrepaid: z.boolean().default(false),
  registrationFeePostpaid: z.boolean().default(false),
  simFeePrepaid: z.boolean().default(false),
  simFeePostpaid: z.boolean().default(false),
  notes: z.string().optional(),
});

type ManualSettlementForm = z.infer<typeof manualSettlementSchema>;

export function Settlements() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  
  // 개통 완료된 문서 조회 (정산 데이터로 활용)
  const { data: completedDocuments, isLoading, refetch } = useQuery({
    queryKey: ['/api/documents', { activationStatus: '개통', startDate, endDate, search: searchQuery }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('activationStatus', '개통');
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (searchQuery) params.append('search', searchQuery);
      console.log('Fetching completed documents with params:', params.toString());
      try {
        const response = await apiRequest('GET', `/api/documents?${params.toString()}`);
        console.log('API Response status:', response.status);
        const data = await response.json() as CompletedDocument[];
        console.log('Received completed documents:', data);
        console.log('Data length:', data?.length);
        console.log('Is array:', Array.isArray(data));
        return data || [];
      } catch (error) {
        console.error('API Request failed:', error);
        return [];
      }
    },
  });

  // 서비스 플랜 조회
  const { data: servicePlans } = useQuery({
    queryKey: ['/api/service-plans'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/service-plans');
      return response.json();
    },
  });

  // 부가 서비스 조회
  const { data: additionalServices } = useQuery({
    queryKey: ['/api/additional-services'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/additional-services');
      return response.json();
    },
  });

  // 수기 정산 등록 폼
  const form = useForm<ManualSettlementForm>({
    resolver: zodResolver(manualSettlementSchema),
    defaultValues: {
      customerName: '',
      customerPhone: '',
      storeName: '',
      carrier: '',
      activatedAt: '',
      deviceModel: '',
      simNumber: '',
      subscriptionNumber: '',
      notes: '',
      additionalServices: [],
      bundleApplied: false,
      bundleNotApplied: false,
      registrationFeePrepaid: false,
      registrationFeePostpaid: false,
      simFeePrepaid: false,
      simFeePostpaid: false,
    },
  });

  // 체크박스 상호 배타적 처리 핸들러
  const handleRegistrationFeeChange = (field: 'registrationFeePrepaid' | 'registrationFeePostpaid', checked: boolean) => {
    if (checked) {
      if (field === 'registrationFeePrepaid') {
        form.setValue('registrationFeePrepaid', true);
        form.setValue('registrationFeePostpaid', false);
      } else {
        form.setValue('registrationFeePrepaid', false);
        form.setValue('registrationFeePostpaid', true);
      }
    } else {
      form.setValue(field, false);
    }
  };

  const handleSimFeeChange = (field: 'simFeePrepaid' | 'simFeePostpaid', checked: boolean) => {
    if (checked) {
      if (field === 'simFeePrepaid') {
        form.setValue('simFeePrepaid', true);
        form.setValue('simFeePostpaid', false);
      } else {
        form.setValue('simFeePrepaid', false);
        form.setValue('simFeePostpaid', true);
      }
    } else {
      form.setValue(field, false);
    }
  };

  const handleBundleChange = (field: 'bundleApplied' | 'bundleNotApplied', checked: boolean) => {
    if (checked) {
      if (field === 'bundleApplied') {
        form.setValue('bundleApplied', true);
        form.setValue('bundleNotApplied', false);
      } else {
        form.setValue('bundleApplied', false);
        form.setValue('bundleNotApplied', true);
      }
    } else {
      form.setValue(field, false);
    }
  };

  // 수기 정산 등록 mutation
  const createManualSettlement = useMutation({
    mutationFn: async (data: ManualSettlementForm) => {
      console.log('Submitting manual settlement:', data);
      const response = await apiRequest('POST', '/api/settlements/manual', data);
      const result = await response.json();
      console.log('Manual settlement response:', result);
      return result;
    },
    onSuccess: () => {
      toast({
        title: "정산 등록 완료",
        description: "수기 정산이 성공적으로 등록되었습니다.",
      });
      setManualDialogOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
    },
    onError: (error: any) => {
      toast({
        title: "등록 실패",
        description: error.message || "정산 등록 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // 정산 통계 계산 (전체 개통 완료 데이터 기준)
  const { data: allCompletedDocuments } = useQuery({
    queryKey: ['/api/documents', { activationStatus: '개통' }],
    queryFn: async () => {
      try {
        const params = new URLSearchParams();
        params.append('activationStatus', '개통');
        const response = await apiRequest('GET', `/api/documents?${params.toString()}`);
        const data = await response.json() as CompletedDocument[];
        return data || [];
      } catch (error) {
        console.error('Failed to fetch all completed documents:', error);
        return [];
      }
    },
  });

  const stats: SettlementStats = React.useMemo(() => {
    if (!allCompletedDocuments) return { total: 0, thisMonth: 0, lastMonth: 0, totalAmount: 0 };
    
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    
    let thisMonth = 0;
    let lastMonth = 0;
    
    allCompletedDocuments.forEach(doc => {
      if (doc.activatedAt) {
        try {
          const activatedDate = new Date(doc.activatedAt);
          if (!isNaN(activatedDate.getTime())) {
            if (activatedDate >= thisMonthStart) {
              thisMonth++;
            } else if (activatedDate >= lastMonthStart && activatedDate <= lastMonthEnd) {
              lastMonth++;
            }
          }
        } catch (e) {
          console.warn('Invalid date:', doc.activatedAt);
        }
      }
    });
    
    return {
      total: allCompletedDocuments.length,
      thisMonth,
      lastMonth,
      totalAmount: 0 // 예상 정산액 제거
    };
  }, [allCompletedDocuments]);

  // 검색 실행
  const handleSearch = () => {
    refetch();
  };

  // 필터 초기화
  const handleClearFilters = () => {
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
  };

  // 수기 정산 등록 제출
  const onSubmit = (data: ManualSettlementForm) => {
    createManualSettlement.mutate(data);
  };

  // 엑셀 다운로드 함수
  const handleExcelDownload = async () => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await apiRequest('GET', `/api/documents/export-excel?${params.toString()}`);
      
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
          <Dialog open={manualDialogOpen} onOpenChange={setManualDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-teal-600 hover:bg-teal-700">
                <Plus className="w-4 h-4 mr-2" />
                수기 정산 등록
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>수기 정산 등록</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                개통 완료된 고객 정보를 수기로 등록합니다.
              </p>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="customerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>고객명 *</FormLabel>
                          <FormControl>
                            <Input placeholder="고객명을 입력하세요" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="customerPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>고객 연락처 *</FormLabel>
                          <FormControl>
                            <Input placeholder="연락처를 입력하세요" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="storeName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>판매점 *</FormLabel>
                          <FormControl>
                            <Input placeholder="판매점을 입력하세요" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="carrier"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>통신사 *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="통신사를 선택하세요" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="SK텔링크">SK텔링크</SelectItem>
                              <SelectItem value="SK프리티">SK프리티</SelectItem>
                              <SelectItem value="SK스테이지파이브">SK스테이지파이브</SelectItem>
                              <SelectItem value="KT엠모바일">KT엠모바일</SelectItem>
                              <SelectItem value="KT프리즈">KT프리즈</SelectItem>
                              <SelectItem value="헬로모바일">헬로모바일</SelectItem>
                              <SelectItem value="헬로모바일LG">헬로모바일LG</SelectItem>
                              <SelectItem value="미래엔">미래엔</SelectItem>
                              <SelectItem value="중국외국인">중국외국인</SelectItem>
                              <SelectItem value="선불">선불</SelectItem>
                              <SelectItem value="기타">기타</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="activatedAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>개통날짜 *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="servicePlanId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>요금제</FormLabel>
                        <Select onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="요금제를 선택하세요" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {servicePlans?.map((plan: any) => (
                              <SelectItem key={plan.id} value={plan.id.toString()}>
                                {plan.planName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="subscriptionNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>가입번호/계약번호</FormLabel>
                          <FormControl>
                            <Input placeholder="가입번호 또는 계약번호를 입력하세요" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="deviceModel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>기기모델</FormLabel>
                          <FormControl>
                            <Input placeholder="기기모델을 입력하세요" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="simNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>유심번호</FormLabel>
                          <FormControl>
                            <Input placeholder="유심번호를 입력하세요" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>부가 등록 여부</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <FormField
                          control={form.control}
                          name="bundleApplied"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                              <FormControl>
                                <input
                                  type="checkbox"
                                  checked={field.value}
                                  onChange={(e) => handleBundleChange('bundleApplied', e.target.checked)}
                                  className="rounded border-gray-300"
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>결합 적용</FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="registrationFeePrepaid"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                              <FormControl>
                                <input
                                  type="checkbox"
                                  checked={field.value}
                                  onChange={(e) => handleRegistrationFeeChange('registrationFeePrepaid', e.target.checked)}
                                  className="rounded border-gray-300"
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>가입비 선납</FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="simFeePrepaid"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                              <FormControl>
                                <input
                                  type="checkbox"
                                  checked={field.value}
                                  onChange={(e) => handleSimFeeChange('simFeePrepaid', e.target.checked)}
                                  className="rounded border-gray-300"
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>유심비 선납</FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="space-y-2">
                        <FormField
                          control={form.control}
                          name="bundleNotApplied"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                              <FormControl>
                                <input
                                  type="checkbox"
                                  checked={field.value}
                                  onChange={(e) => handleBundleChange('bundleNotApplied', e.target.checked)}
                                  className="rounded border-gray-300"
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>결합 미적용</FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="registrationFeePostpaid"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                              <FormControl>
                                <input
                                  type="checkbox"
                                  checked={field.value}
                                  onChange={(e) => handleRegistrationFeeChange('registrationFeePostpaid', e.target.checked)}
                                  className="rounded border-gray-300"
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>가입비 후납</FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="simFeePostpaid"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                              <FormControl>
                                <input
                                  type="checkbox"
                                  checked={field.value}
                                  onChange={(e) => handleSimFeeChange('simFeePostpaid', e.target.checked)}
                                  className="rounded border-gray-300"
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>유심비 후납</FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>정산 금액</FormLabel>
                        <FormControl>
                          <Input placeholder="정산 금액을 입력하세요" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setManualDialogOpen(false)}
                    >
                      취소
                    </Button>
                    <Button
                      type="submit"
                      className="bg-teal-600 hover:bg-teal-700"
                      disabled={createManualSettlement.isPending}
                    >
                      {createManualSettlement.isPending ? '등록 중...' : '등록'}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="search-query">검색 (고객명/문서번호)</Label>
                <Input
                  id="search-query"
                  type="text"
                  placeholder="검색어를 입력하세요"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleSearch}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Search className="w-4 h-4 mr-2" />
                  검색
                </Button>
                <Button
                  onClick={handleClearFilters}
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
              개통 완료된 문서를 기반으로 한 정산 정보입니다. ({completedDocuments?.length || 0}건)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">로딩 중...</div>
            ) : completedDocuments && Array.isArray(completedDocuments) && completedDocuments.length > 0 ? (
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
                      <TableHead>가입번호</TableHead>
                      <TableHead>기기/유심</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {completedDocuments.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell>
                          {doc.activatedAt ? (() => {
                            try {
                              const date = new Date(doc.activatedAt);
                              return isValid(date) ? format(date, 'yyyy-MM-dd', { locale: ko }) : '-';
                            } catch (e) {
                              return '-';
                            }
                          })() : '-'}
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
                          {doc.additionalServices ? (
                            <div className="flex flex-wrap gap-1">
                              {typeof doc.additionalServices === 'string' ? (
                                doc.additionalServices.split(', ').slice(0, 2).map((service, index) => (
                                  <Badge key={index} variant="secondary" className="text-xs">
                                    {service}
                                  </Badge>
                                ))
                              ) : (
                                doc.additionalServices.slice(0, 2).map((service, index) => (
                                  <Badge key={index} variant="secondary" className="text-xs">
                                    {service}
                                  </Badge>
                                ))
                              )}
                              {((typeof doc.additionalServices === 'string' ? doc.additionalServices.split(', ').length : doc.additionalServices.length) > 2) && (
                                <Badge variant="secondary" className="text-xs">
                                  +{(typeof doc.additionalServices === 'string' ? doc.additionalServices.split(', ').length : doc.additionalServices.length) - 2}
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
                          <span className="text-sm font-mono">
                            {doc.subscriptionNumber || '-'}
                          </span>
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
                {completedDocuments ? `개통 완료된 문서가 없습니다. (${JSON.stringify(completedDocuments)})` : '데이터를 불러오는 중...'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}