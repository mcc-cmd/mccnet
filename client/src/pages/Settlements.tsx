import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth, useApiRequest } from '@/lib/auth';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { createSettlementSchema, updateSettlementSchema } from '../../../shared/schema';
import type { Settlement } from '../../../shared/schema';
import { 
  Calculator,
  Plus,
  Edit,
  Trash2,
  TrendingUp,
  DollarSign,
  Users,
  Clock,
  CheckCircle,
  AlertTriangle,
  Pause
} from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

type CreateSettlementForm = {
  documentId: number;
  dealerId: number;
  customerName: string;
  customerPhone: string;
  servicePlanId?: number;
  servicePlanName?: string;
  additionalServices: string[];
  bundleType?: '결합' | '미결합' | '단독';
  bundleDetails?: string;
  policyLevel: number;
  policyDetails?: string;
  settlementAmount?: number;
  commissionRate?: number;
  settlementStatus: '대기' | '계산완료' | '지급완료' | '보류';
  settlementDate?: Date;
};

export function Settlements() {
  const { user } = useAuth();
  const apiRequest = useApiRequest();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [settlementDialogOpen, setSettlementDialogOpen] = useState(false);
  const [editingSettlement, setEditingSettlement] = useState<Settlement | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null);
  
  // 정산 데이터 조회
  const { data: settlements, isLoading: settlementsLoading } = useQuery({
    queryKey: ['/api/settlements'],
    queryFn: () => apiRequest('/api/settlements') as Promise<Settlement[]>,
  });

  // 개통 완료된 문서 목록 조회
  const { data: completedDocuments } = useQuery({
    queryKey: ['/api/documents', { status: '완료', activationStatus: '개통' }],
    queryFn: () => apiRequest('/api/documents?status=완료&activationStatus=개통') as Promise<any[]>,
  });

  // 정산 생성 폼
  const settlementForm = useForm<CreateSettlementForm>({
    resolver: zodResolver(createSettlementSchema),
    defaultValues: {
      documentId: 0,
      dealerId: user?.dealerId || 0,
      customerName: '',
      customerPhone: '',
      additionalServices: [],
      policyLevel: 1,
      settlementStatus: '대기',
    },
  });

  // 정산 생성 뮤테이션
  const createSettlementMutation = useMutation({
    mutationFn: async (data: CreateSettlementForm) => {
      return apiRequest('/api/settlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settlements'] });
      setSettlementDialogOpen(false);
      settlementForm.reset();
      toast({
        title: "정산 등록 완료",
        description: "새로운 정산 정보가 등록되었습니다.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "정산 등록 실패",
        description: error.message || "정산 정보 등록에 실패했습니다.",
        variant: "destructive"
      });
    }
  });

  // 정산 업데이트 뮤테이션
  const updateSettlementMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<CreateSettlementForm> }) => {
      return apiRequest(`/api/settlements/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settlements'] });
      setEditingSettlement(null);
      toast({
        title: "정산 수정 완료",
        description: "정산 정보가 수정되었습니다.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "정산 수정 실패",
        description: error.message || "정산 정보 수정에 실패했습니다.",
        variant: "destructive"
      });
    }
  });

  // 정산 삭제 뮤테이션
  const deleteSettlementMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/settlements/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settlements'] });
      toast({
        title: "정산 삭제 완료",
        description: "정산 정보가 삭제되었습니다.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "정산 삭제 실패",
        description: error.message || "정산 정보 삭제에 실패했습니다.",
        variant: "destructive"
      });
    }
  });

  // 문서 선택 시 데이터 자동 로드
  const loadDocumentData = async (documentId: number) => {
    try {
      // 문서 정산 데이터 조회
      const documentData = await apiRequest(`/api/documents/${documentId}/settlement-data`);
      
      // 정책차수 자동 계산
      const policyData = await apiRequest(`/api/policy-level?date=${documentData.activatedAt}&carrier=${documentData.carrier}`);
      
      // 폼에 데이터 설정
      settlementForm.reset({
        documentId: documentData.documentId,
        dealerId: documentData.dealerId,
        customerName: documentData.customerName,
        customerPhone: documentData.customerPhone,
        servicePlanId: documentData.servicePlanId,
        servicePlanName: documentData.servicePlanName,
        additionalServices: documentData.additionalServices || [],
        policyLevel: policyData.policyLevel || 1,
        policyDetails: policyData.policyDetails || '',
        settlementStatus: '대기',
      });

      toast({
        title: "문서 데이터 로드 완료",
        description: `${documentData.customerName} 고객의 정보가 자동으로 입력되었습니다. 정책차수: ${policyData.policyLevel}차수`,
      });
    } catch (error: any) {
      toast({
        title: "데이터 로드 실패",
        description: error.message || "문서 데이터를 불러오는데 실패했습니다.",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = (data: CreateSettlementForm) => {
    createSettlementMutation.mutate(data);
  };

  const handleEdit = (settlement: Settlement) => {
    setEditingSettlement(settlement);
  };

  const handleDelete = (id: number) => {
    if (confirm('정말로 이 정산 정보를 삭제하시겠습니까?')) {
      deleteSettlementMutation.mutate(id);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case '대기':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />대기</Badge>;
      case '계산완료':
        return <Badge variant="default"><Calculator className="w-3 h-3 mr-1" />계산완료</Badge>;
      case '지급완료':
        return <Badge variant="destructive"><CheckCircle className="w-3 h-3 mr-1" />지급완료</Badge>;
      case '보류':
        return <Badge variant="outline"><Pause className="w-3 h-3 mr-1" />보류</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // 정산 통계 계산
  const stats = settlements ? {
    total: settlements.length,
    pending: settlements.filter(s => s.settlementStatus === '대기').length,
    calculated: settlements.filter(s => s.settlementStatus === '계산완료').length,
    paid: settlements.filter(s => s.settlementStatus === '지급완료').length,
    onHold: settlements.filter(s => s.settlementStatus === '보류').length,
    totalAmount: settlements
      .filter(s => s.settlementAmount)
      .reduce((sum, s) => sum + (s.settlementAmount || 0), 0)
  } : { total: 0, pending: 0, calculated: 0, paid: 0, onHold: 0, totalAmount: 0 };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* 페이지 헤더 */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">정산 관리</h1>
            <p className="text-muted-foreground mt-2">
              판매점, 고객 정보, 요금제, 부가 서비스, 결합내역, 정책차수를 관리합니다.
            </p>
          </div>
          <Dialog open={settlementDialogOpen} onOpenChange={setSettlementDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                정산 등록
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>새 정산 등록</DialogTitle>
              </DialogHeader>
              <Form {...settlementForm}>
                <form onSubmit={settlementForm.handleSubmit(handleSubmit)} className="space-y-6">
                  {/* 개통 완료 문서 선택 */}
                  <div className="border rounded-lg p-4 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-950 dark:to-green-950">
                    <h4 className="font-semibold mb-3 text-blue-900 dark:text-blue-100">📋 개통 완료 문서 선택</h4>
                    <div className="space-y-3">
                      <Label htmlFor="document-select" className="text-sm font-medium">문서를 선택하면 모든 정보가 자동으로 입력됩니다</Label>
                      <Select 
                        value={selectedDocumentId?.toString() || ''} 
                        onValueChange={(value) => {
                          const docId = parseInt(value);
                          setSelectedDocumentId(docId);
                          if (docId) {
                            loadDocumentData(docId);
                          }
                        }}
                      >
                        <SelectTrigger className="bg-white dark:bg-gray-800">
                          <SelectValue placeholder="🔍 개통 완료된 문서를 선택하세요..." />
                        </SelectTrigger>
                        <SelectContent>
                          {completedDocuments?.map((doc) => (
                            <SelectItem key={doc.id} value={doc.id.toString()}>
                              <div className="flex flex-col">
                                <span className="font-medium">{doc.documentNumber} - {doc.customerName}</span>
                                <span className="text-xs text-muted-foreground">{doc.carrier} • {doc.storeName || '판매점'}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* 자동 입력된 정보 표시 */}
                  {selectedDocumentId && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-green-700 dark:text-green-300">고객 정보</Label>
                        <div className="text-sm">
                          <p><span className="font-medium">이름:</span> {settlementForm.watch('customerName')}</p>
                          <p><span className="font-medium">연락처:</span> {settlementForm.watch('customerPhone')}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-green-700 dark:text-green-300">요금제 정보</Label>
                        <div className="text-sm">
                          <p><span className="font-medium">요금제:</span> {settlementForm.watch('servicePlanName') || '없음'}</p>
                          <p><span className="font-medium">결합유형:</span> {settlementForm.watch('bundleType') || '미지정'}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-green-700 dark:text-green-300">부가 서비스</Label>
                        <div className="flex flex-wrap gap-1">
                          {settlementForm.watch('additionalServices')?.length > 0 ? (
                            settlementForm.watch('additionalServices').map((service, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {service}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">부가 서비스 없음</span>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-green-700 dark:text-green-300">정책 정보</Label>
                        <div className="text-sm">
                          <p><span className="font-medium">정책차수:</span> <Badge variant="secondary">{settlementForm.watch('policyLevel')}차수</Badge></p>
                          <p className="text-xs text-muted-foreground">{settlementForm.watch('policyDetails')}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 정산 정보 입력 */}
                  {selectedDocumentId && (
                    <div className="border rounded-lg p-4 bg-yellow-50 dark:bg-yellow-950">
                      <h4 className="font-semibold mb-3 text-yellow-900 dark:text-yellow-100">💰 정산 정보 입력</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={settlementForm.control}
                          name="settlementAmount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>정산 금액</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  {...field} 
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                  placeholder="정산 금액을 입력하세요" 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={settlementForm.control}
                          name="commissionRate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>수수료율 (%)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  {...field} 
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  placeholder="수수료율을 입력하세요" 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="mt-4">
                        <FormField
                          control={settlementForm.control}
                          name="bundleDetails"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>결합 상세 (선택사항)</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="결합 관련 상세 정보" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      취소
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={!selectedDocumentId || isCreating}
                      className="bg-teal-600 hover:bg-teal-700"
                    >
                      {isCreating ? '등록 중...' : '정산 등록'}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </Layout>
  );
}