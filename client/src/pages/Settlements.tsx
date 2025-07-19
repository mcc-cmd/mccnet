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
  
  // 정산 데이터 조회
  const { data: settlements, isLoading: settlementsLoading } = useQuery({
    queryKey: ['/api/settlements'],
    queryFn: () => apiRequest('/api/settlements') as Promise<Settlement[]>,
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
                <form onSubmit={settlementForm.handleSubmit(handleSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={settlementForm.control}
                      name="customerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>고객명</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="고객명을 입력하세요" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={settlementForm.control}
                      name="customerPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>고객 연락처</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="연락처를 입력하세요" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={settlementForm.control}
                      name="servicePlanName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>요금제명</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="요금제명을 입력하세요" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={settlementForm.control}
                      name="bundleType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>결합 유형</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="결합 유형 선택" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="결합">결합</SelectItem>
                              <SelectItem value="미결합">미결합</SelectItem>
                              <SelectItem value="단독">단독</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={settlementForm.control}
                      name="policyLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>정책차수</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field} 
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                              placeholder="정책차수를 입력하세요" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
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
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={settlementForm.control}
                      name="commissionRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>수수료율 (%)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.1"
                              {...field} 
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              placeholder="수수료율을 입력하세요" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={settlementForm.control}
                      name="settlementStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>정산 상태</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="정산 상태 선택" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="대기">대기</SelectItem>
                              <SelectItem value="계산완료">계산완료</SelectItem>
                              <SelectItem value="지급완료">지급완료</SelectItem>
                              <SelectItem value="보류">보류</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setSettlementDialogOpen(false)}>
                      취소
                    </Button>
                    <Button type="submit" disabled={createSettlementMutation.isPending}>
                      {createSettlementMutation.isPending ? '등록 중...' : '등록'}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">전체 정산</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">건</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">대기 중</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending}</div>
              <p className="text-xs text-muted-foreground">건</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">지급 완료</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.paid}</div>
              <p className="text-xs text-muted-foreground">건</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">총 정산액</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAmount.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">원</p>
            </CardContent>
          </Card>
        </div>

        {/* 정산 목록 */}
        <Card>
          <CardHeader>
            <CardTitle>정산 목록</CardTitle>
            <CardDescription>
              등록된 정산 정보를 관리할 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {settlementsLoading ? (
              <div className="text-center py-8">로딩 중...</div>
            ) : settlements && settlements.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>고객명</TableHead>
                      <TableHead>연락처</TableHead>
                      <TableHead>요금제</TableHead>
                      <TableHead>결합유형</TableHead>
                      <TableHead>정책차수</TableHead>
                      <TableHead>정산금액</TableHead>
                      <TableHead>수수료율</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>등록일</TableHead>
                      <TableHead>관리</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {settlements.map((settlement) => (
                      <TableRow key={settlement.id}>
                        <TableCell>{settlement.customerName}</TableCell>
                        <TableCell>{settlement.customerPhone}</TableCell>
                        <TableCell>{settlement.servicePlanName || '-'}</TableCell>
                        <TableCell>{settlement.bundleType || '-'}</TableCell>
                        <TableCell>{settlement.policyLevel}</TableCell>
                        <TableCell>{settlement.settlementAmount?.toLocaleString() || '-'}원</TableCell>
                        <TableCell>{settlement.commissionRate || '-'}%</TableCell>
                        <TableCell>{getStatusBadge(settlement.settlementStatus)}</TableCell>
                        <TableCell>
                          {format(new Date(settlement.createdAt), 'yyyy-MM-dd', { locale: ko })}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(settlement)}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            {user?.role === 'admin' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(settlement.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                등록된 정산 정보가 없습니다.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}