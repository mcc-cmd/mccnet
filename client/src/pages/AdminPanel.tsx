import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useApiRequest, useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { createDealerSchema, createUserSchema, createAdminSchema, createWorkerSchema, updateDocumentStatusSchema, createServicePlanSchema, createAdditionalServiceSchema, createCarrierSchema, updateCarrierSchema, createSettlementUnitPriceSchema, updateSettlementUnitPriceSchema, createAdditionalServiceDeductionSchema, updateAdditionalServiceDeductionSchema } from '../../../shared/schema';
import type { Dealer, User, Document, ServicePlan, AdditionalService, Carrier, SettlementUnitPrice, CreateSettlementUnitPriceForm, UpdateSettlementUnitPriceForm, AdditionalServiceDeduction, CreateAdditionalServiceDeductionForm, UpdateAdditionalServiceDeductionForm } from '../../../shared/schema';
import { 
  Building2, 
  Users, 
  Upload, 
  FileText, 
  Calculator,
  Settings,
  Plus,
  Download,
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  Trash2,
  Edit,
  Edit2,
  DollarSign,
  FileSpreadsheet,
  Image as ImageIcon,
  Info,
  Search
} from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

type CreateDealerForm = {
  name: string;
  location: string;
  contactEmail: string;
  contactPhone: string;
};

type CreateUserForm = {
  username: string;
  password: string;
  name: string;
  role: 'dealer_store' | 'dealer_worker';
};

type CreateAdminForm = {
  username: string;
  password: string;
  name: string;
};

type CreateWorkerForm = {
  username: string;
  password: string;
  name: string;
};

type CreateSalesManagerForm = {
  username: string;
  password: string;
  name: string;
  team: string;
};

type UpdateDocumentStatusForm = {
  status: '접수' | '보완필요' | '완료';
  activationStatus?: '대기' | '개통' | '취소';
  notes?: string;
};

type ChangeUserRoleForm = {
  userId: number;
  accountType: 'admin' | 'sales_manager' | 'worker';
};

interface ContactCode {
  id?: number;
  carrierId?: string;
  carrierName?: string;
  contactCode?: string;
  code?: string;
  dealerName?: string;
  carrier?: string;
  isActive?: boolean;
};

// 통신사 리스트 (업데이트됨)
const CARRIERS = [
  { id: 'sk-tellink', name: 'SK텔링크' },
  { id: 'sk-pretty', name: 'SK프리티' },
  { id: 'sk-stage5', name: 'SK스테이지파이브' },
  { id: 'kt-telecom', name: 'KT' },
  { id: 'kt-emobile', name: 'KT엠모바일' },
  { id: 'kt-codemore', name: 'KT코드모바일' },
  { id: 'lg-hellomobile', name: 'LG헬로모바일' },
  { id: 'lg-uplus', name: '미디어로그' },
  { id: 'mvno-emobile', name: 'KT스테이지파이브' },
  { id: 'mvno-future', name: 'LG밸류컴' },
  { id: 'mvno-china', name: '중고KT' },
  { id: 'mvno-prepaid', name: 'LG스마텔' },
];



// 통신사 관리 컴포넌트
function CarrierManagement() {
  const [carrierDialogOpen, setCarrierDialogOpen] = useState(false);
  const [editingCarrier, setEditingCarrier] = useState<Carrier | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const apiRequest = useApiRequest();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // 통신사 목록 조회
  const { data: carriers = [], isLoading: carriersLoading } = useQuery({
    queryKey: ['/api/carriers'],
    queryFn: () => apiRequest('/api/carriers'),
    staleTime: 0, // 항상 최신 데이터를 가져오도록 설정
    refetchOnWindowFocus: true // 창 포커스 시 새로고침
  });

  // 통신사 생성/수정 폼 - 동적 기본값 설정
  const getDefaultValues = () => {
    if (editingCarrier) {
      return {
        name: editingCarrier.name || '',
        displayOrder: Number(editingCarrier.displayOrder) || 0,
        isActive: editingCarrier.isActive !== false,
        isWired: editingCarrier.isWired || false,
        bundleNumber: editingCarrier.bundleNumber || '',
        bundleCarrier: editingCarrier.bundleCarrier || '',
        documentRequired: editingCarrier.documentRequired || false,
        requireCustomerName: editingCarrier.requireCustomerName !== false,
        requireCustomerPhone: editingCarrier.requireCustomerPhone !== false,
        requireCustomerEmail: editingCarrier.requireCustomerEmail || false,
        requireContactCode: editingCarrier.requireContactCode !== false,
        requireCarrier: editingCarrier.requireCarrier !== false,
        requirePreviousCarrier: editingCarrier.requirePreviousCarrier || false,
        requireDocumentUpload: editingCarrier.requireDocumentUpload || false,
        requireBundleNumber: editingCarrier.requireBundleNumber || false,
        requireBundleCarrier: editingCarrier.requireBundleCarrier || false,
        allowNewCustomer: editingCarrier.allowNewCustomer !== false,
        allowPortIn: editingCarrier.allowPortIn !== false,
        requireDesiredNumber: editingCarrier.requireDesiredNumber || false
      };
    }
    return {
      name: '',
      displayOrder: carriers.length,
      isActive: true,
      isWired: false,
      bundleNumber: '',
      bundleCarrier: '',
      documentRequired: false,
      requireCustomerName: true,
      requireCustomerPhone: true,
      requireCustomerEmail: false,
      requireContactCode: true,
      requireCarrier: true,
      requirePreviousCarrier: false,
      requireDocumentUpload: false,
      requireBundleNumber: false,
      requireBundleCarrier: false,
      allowNewCustomer: true,
      allowPortIn: true,
      requireDesiredNumber: false
    };
  };

  const carrierForm = useForm({
    resolver: zodResolver(createCarrierSchema),
    mode: 'onChange',
    defaultValues: getDefaultValues()
  });

  // 통신사 생성
  const createCarrierMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/carriers', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    onSuccess: async () => {
      // 캐시 무효화 및 강제 새로고침
      await queryClient.invalidateQueries({ queryKey: ['/api/carriers'] });
      await queryClient.removeQueries({ queryKey: ['/api/carriers'] }); // 캐시 완전 제거
      await queryClient.refetchQueries({ queryKey: ['/api/carriers'] });
      
      setCarrierDialogOpen(false);
      setEditingCarrier(null);
      carrierForm.reset();
      toast({
        title: "통신사 추가",
        description: "새 통신사가 성공적으로 추가되었습니다."
      });
    },
    onError: (error: any) => {
      toast({
        title: "추가 실패",
        description: error.message || "통신사 추가에 실패했습니다.",
        variant: "destructive"
      });
    }
  });

  // 통신사 수정
  const updateCarrierMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      apiRequest(`/api/carriers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    onSuccess: async () => {
      // 모든 관련 쿼리 무효화 및 새로고침
      await queryClient.invalidateQueries({ queryKey: ['/api/carriers'] });
      await queryClient.removeQueries({ queryKey: ['/api/carriers'] }); // 캐시 완전 제거
      await queryClient.refetchQueries({ queryKey: ['/api/carriers'] });
      
      // 토글 작업이 아닌 경우에만 대화상자 닫기
      if (carrierDialogOpen) {
        setCarrierDialogOpen(false);
        setEditingCarrier(null);
        carrierForm.reset();
        toast({
          title: "통신사 수정",
          description: "통신사가 성공적으로 수정되었습니다."
        });
      } else {
        // 토글 작업 시에는 간단한 알림만
        toast({
          title: "상태 변경",
          description: "통신사 상태가 성공적으로 변경되었습니다."
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "수정 실패",
        description: error.message || "통신사 수정에 실패했습니다.",
        variant: "destructive"
      });
    }
  });

  // 통신사 삭제
  const deleteCarrierMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/carriers/${id}`, {
      method: 'DELETE'
    }),
    onSuccess: async () => {
      // 캐시 무효화 및 강제 새로고침
      await queryClient.invalidateQueries({ queryKey: ['/api/carriers'] });
      await queryClient.removeQueries({ queryKey: ['/api/carriers'] }); // 캐시 완전 제거
      await queryClient.refetchQueries({ queryKey: ['/api/carriers'] });
      
      toast({
        title: "통신사 삭제",
        description: "통신사가 성공적으로 삭제되었습니다."
      });
    },
    onError: (error: any) => {
      toast({
        title: "삭제 실패",
        description: error.message || "통신사 삭제에 실패했습니다.",
        variant: "destructive"
      });
    }
  });

  const handleCreateOrUpdate = (data: any) => {
    if (editingCarrier) {
      updateCarrierMutation.mutate({ id: editingCarrier.id, data });
    } else {
      createCarrierMutation.mutate(data);
    }
  };

  const handleEditCarrier = (carrier: Carrier) => {
    setEditingCarrier(carrier);
    
    // 폼을 기존 값으로 리셋
    const editValues = {
      name: carrier.name || '',
      displayOrder: Number(carrier.displayOrder) || 0,
      isActive: carrier.isActive !== false,
      isWired: carrier.isWired || false,
      bundleNumber: carrier.bundleNumber || '',
      bundleCarrier: carrier.bundleCarrier || '',
      documentRequired: carrier.documentRequired || false,
      requireCustomerName: carrier.requireCustomerName !== false,
      requireCustomerPhone: carrier.requireCustomerPhone !== false,
      requireCustomerEmail: carrier.requireCustomerEmail || false,
      requireContactCode: carrier.requireContactCode !== false,
      requireCarrier: carrier.requireCarrier !== false,
      requirePreviousCarrier: carrier.requirePreviousCarrier || false,
      requireDocumentUpload: carrier.requireDocumentUpload || false,
      requireBundleNumber: carrier.requireBundleNumber || false,
      requireBundleCarrier: carrier.requireBundleCarrier || false,
      allowNewCustomer: carrier.allowNewCustomer !== false,
      allowPortIn: carrier.allowPortIn !== false,
      requireDesiredNumber: carrier.requireDesiredNumber || false
    };
    
    carrierForm.reset(editValues);
    setFormKey(prev => prev + 1); // 폼 컴포넌트 재렌더링 강제
    setCarrierDialogOpen(true);
  };

  const handleAddCarrier = () => {
    setEditingCarrier(null);
    
    // 폼을 초기값으로 리셋
    const defaultValues = {
      name: '',
      displayOrder: carriers.length,
      isActive: true,
      isWired: false,
      bundleNumber: '',
      bundleCarrier: '',
      documentRequired: false,
      requireCustomerName: true,
      requireCustomerPhone: true,
      requireCustomerEmail: false,
      requireContactCode: true,
      requireCarrier: true,
      requirePreviousCarrier: false,
      requireDocumentUpload: false,
      requireBundleNumber: false,
      requireBundleCarrier: false
    };
    
    carrierForm.reset(defaultValues);
    setFormKey(prev => prev + 1); // 폼 컴포넌트 재렌더링 강제
    setCarrierDialogOpen(true);
  };

  const handleDeleteCarrier = (id: number) => {
    if (confirm('정말로 이 통신사를 삭제하시겠습니까?')) {
      deleteCarrierMutation.mutate(id);
    }
  };

  const handleToggleCarrierStatus = (carrier: Carrier) => {
    console.log('Toggle carrier status:', carrier.id, 'from', carrier.isActive, 'to', !carrier.isActive);
    
    // 토글용 별도 mutation 생성
    const toggleData = {
      isActive: !carrier.isActive
    };
    
    updateCarrierMutation.mutate({
      id: carrier.id,
      data: toggleData
    });
  };

  // 엑셀 양식 다운로드
  const handleDownloadTemplate = async () => {
    try {
      // Get session ID from auth store
      let sessionId = null;
      try {
        const authStore = localStorage.getItem('auth-storage');
        if (authStore) {
          const parsed = JSON.parse(authStore);
          sessionId = parsed?.state?.sessionId || null;
        }
      } catch (e) {
        console.warn('Failed to parse auth store:', e);
      }

      const headers: Record<string, string> = {};
      if (sessionId) {
        headers["Authorization"] = `Bearer ${sessionId}`;
      }

      const response = await fetch('/api/carriers/excel-template', {
        method: 'GET',
        headers,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('템플릿 다운로드에 실패했습니다.');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `통신사_업로드_양식_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "다운로드 완료",
        description: "엑셀 양식이 다운로드되었습니다.",
        variant: "default",
      });
    } catch (error: any) {
      console.error('Template download error:', error);
      toast({
        title: "다운로드 실패",
        description: error.message || "템플릿 다운로드에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  // 엑셀 파일 업로드
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      toast({
        title: "파일 형식 오류",
        description: "엑셀 파일(.xlsx, .xls)만 업로드 가능합니다.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Get session ID from auth store
      let sessionId = null;
      try {
        const authStore = localStorage.getItem('auth-storage');
        if (authStore) {
          const parsed = JSON.parse(authStore);
          sessionId = parsed?.state?.sessionId || null;
        }
      } catch (e) {
        console.warn('Failed to parse auth store:', e);
      }

      const formData = new FormData();
      formData.append('file', file);

      const headers: Record<string, string> = {};
      if (sessionId) {
        headers["Authorization"] = `Bearer ${sessionId}`;
      }

      const response = await fetch('/api/carriers/upload-excel', {
        method: 'POST',
        headers,
        body: formData,
        credentials: 'include',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '업로드에 실패했습니다.');
      }

      // 성공 메시지 표시
      toast({
        title: "업로드 완료",
        description: `${result.message}`,
        variant: "default",
      });

      // 실패한 항목이 있으면 상세 정보 표시
      if (result.errors && result.errors.length > 0) {
        console.warn('Upload errors:', result.errors);
        toast({
          title: "일부 오류 발생",
          description: `${result.errors.length}개 항목에서 오류가 발생했습니다. 콘솔을 확인하세요.`,
          variant: "destructive",
        });
      }

      // 통신사 목록 새로고침
      await queryClient.invalidateQueries({ queryKey: ['/api/carriers'] });
      
      setUploadDialogOpen(false);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "업로드 실패",
        description: error.message || "파일 업로드에 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 대화상자가 닫힐 때 상태 정리
  React.useEffect(() => {
    if (!carrierDialogOpen) {
      setEditingCarrier(null);
    }
  }, [carrierDialogOpen]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>통신사 관리</CardTitle>
          <CardDescription>
            통신사를 관리하고 정렬 순서를 설정할 수 있습니다.
          </CardDescription>
        </div>
        <div className="flex space-x-2">
          {/* 엑셀 양식 다운로드 버튼 */}
          <Button
            variant="outline"
            onClick={handleDownloadTemplate}
            className="flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>엑셀 양식</span>
          </Button>
          
          {/* 엑셀 업로드 버튼 */}
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center space-x-2">
                <Upload className="h-4 w-4" />
                <span>엑셀 업로드</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>통신사 엑셀 업로드</DialogTitle>
                <DialogDescription>
                  엑셀 파일을 업로드하여 통신사 정보를 일괄 등록할 수 있습니다.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isUploading}
                  />
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      {isUploading ? '업로드 중...' : '파일 선택'}
                    </Button>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    .xlsx, .xls 파일만 지원됩니다
                  </p>
                </div>
                {isUploading && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>업로드 진행률</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
          {/* 통신사 추가 버튼 */}
          <Dialog open={carrierDialogOpen} onOpenChange={setCarrierDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleAddCarrier}>
                <Plus className="mr-2 h-4 w-4" />
                통신사 추가
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingCarrier ? '통신사 수정' : '새 통신사 추가'}
              </DialogTitle>
            </DialogHeader>
            <Form {...carrierForm} key={`carrier-form-${formKey}`}>
              <form onSubmit={carrierForm.handleSubmit(handleCreateOrUpdate)} className="space-y-4">
                <FormField
                  control={carrierForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>통신사명</FormLabel>
                      <FormControl>
                        <Input placeholder="통신사명을 입력하세요" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={carrierForm.control}
                  name="displayOrder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>정렬 순서</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="정렬 순서를 입력하세요"
                          value={field.value?.toString() || ''}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={carrierForm.control}
                  name="isWired"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">유선 통신사</FormLabel>
                        <FormDescription>
                          유선 통신사인 경우 활성화하세요.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">접수 신청 필수 입력 필드 설정</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={carrierForm.control}
                      name="requireCustomerName"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm">고객명</FormLabel>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={carrierForm.control}
                      name="requireCustomerPhone"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm">연락처</FormLabel>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={carrierForm.control}
                      name="requireCustomerEmail"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm">이메일</FormLabel>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={carrierForm.control}
                      name="requireContactCode"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm">개통방명 코드</FormLabel>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={carrierForm.control}
                      name="requireCarrier"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm">통신사</FormLabel>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={carrierForm.control}
                      name="requirePreviousCarrier"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm">이전통신사</FormLabel>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={carrierForm.control}
                      name="requireDocumentUpload"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm">서류 첨부</FormLabel>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={carrierForm.control}
                      name="requireBundleNumber"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm">결합번호</FormLabel>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={carrierForm.control}
                      name="requireBundleCarrier"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm">결합통신사</FormLabel>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* 고객 유형 설정 */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-gray-900">고객 유형별 지원 설정</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={carrierForm.control}
                      name="allowNewCustomer"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm">신규</FormLabel>
                            <FormDescription className="text-xs">신규 고객 지원 여부</FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={carrierForm.control}
                      name="allowPortIn"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm">번호이동</FormLabel>
                            <FormDescription className="text-xs">번호이동 고객 지원 여부</FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={carrierForm.control}
                      name="requireDesiredNumber"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm">희망번호</FormLabel>
                            <FormDescription className="text-xs">신규 시 희망번호 입력 필수</FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                
                <FormField
                  control={carrierForm.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">활성 상태</FormLabel>
                        <FormDescription>
                          비활성화하면 선택 목록에서 제외됩니다.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCarrierDialogOpen(false)}
                  >
                    취소
                  </Button>
                  <Button
                    type="submit"
                    disabled={createCarrierMutation.isPending || updateCarrierMutation.isPending}
                  >
                    {editingCarrier ? '수정' : '추가'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {carriersLoading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {carriers.length > 0 ? (
              <div className="grid gap-4">
                {carriers
                  .sort((a: Carrier, b: Carrier) => (a.displayOrder || 0) - (b.displayOrder || 0))
                  .map((carrier: Carrier) => (
                    <div
                      key={carrier.id}
                      className="flex items-center justify-between p-4 border rounded-lg bg-white"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium">
                          {carrier.displayOrder}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{carrier.name}</h4>
                          <div className="text-sm text-gray-500 space-y-1">
                            <p>정렬 순서: {carrier.displayOrder}</p>
                            {carrier.bundleNumber && (
                              <p>결합 번호: {carrier.bundleNumber}</p>
                            )}
                            {carrier.bundleCarrier && (
                              <p>결합 통신사: {carrier.bundleCarrier}</p>
                            )}
                            <p>서류 필수: {carrier.documentRequired ? '예' : '아니오'}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant={carrier.isActive ? "default" : "secondary"}
                          size="sm"
                          onClick={() => handleToggleCarrierStatus(carrier)}
                          className={`min-w-[60px] ${
                            carrier.isActive 
                              ? 'bg-green-600 hover:bg-green-700 text-white' 
                              : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
                          }`}
                        >
                          {carrier.isActive ? '활성' : '비활성'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditCarrier(carrier)}
                        >
                          수정
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteCarrier(carrier.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Building2 className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">통신사가 없습니다</h3>
                <p className="mt-1 text-sm text-gray-500">첫 번째 통신사를 추가해보세요.</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ContactCodeManagement({ dealer }: { dealer: Dealer }) {
  const [isEditing, setIsEditing] = useState(false);
  const [contactCodes, setContactCodes] = useState<ContactCode[]>([]);
  const [tempContactCodes, setTempContactCodes] = useState<ContactCode[]>([]);
  const apiRequest = useApiRequest();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // 접점 코드 조회
  const { data: dealerContactCodes, isLoading } = useQuery({
    queryKey: [`/api/dealers/${dealer.id}/contact-codes`],
    queryFn: () => apiRequest(`/api/dealers/${dealer.id}/contact-codes`),
  });

  // 초기 데이터 설정
  React.useEffect(() => {
    if (dealerContactCodes && dealerContactCodes.length > 0) {
      setContactCodes(dealerContactCodes);
      setTempContactCodes(dealerContactCodes);
    } else {
      // 기본값: 모든 통신사에 빈 접점 코드
      const defaultCodes = CARRIERS.map((carrier, index) => ({
        carrierId: typeof carrier === 'string' ? `carrier-${index}` : (carrier.id || `carrier-${index}`),
        carrierName: typeof carrier === 'string' ? carrier : (carrier.name || carrier),
        contactCode: ''
      }));
      setContactCodes(defaultCodes);
      setTempContactCodes(defaultCodes);
    }
  }, [dealerContactCodes]);

  // 접점 코드 저장
  const saveContactCodesMutation = useMutation({
    mutationFn: (data: ContactCode[]) => 
      apiRequest(`/api/dealers/${dealer.id}/contact-codes`, {
        method: 'POST',
        body: JSON.stringify({ contactCodes: data }),
        headers: { 'Content-Type': 'application/json' }
      }),
    onSuccess: () => {
      setContactCodes(tempContactCodes);
      setIsEditing(false);
      toast({
        title: "저장 완료",
        description: "접점 코드가 성공적으로 저장되었습니다.",
        variant: "default"
      });
      queryClient.invalidateQueries({ queryKey: [`/api/dealers/${dealer.id}/contact-codes`] });
    },
    onError: (error: any) => {
      console.error('Save contact codes error:', error);
      toast({
        title: "저장 실패",
        description: error.message || "접점 코드 저장에 실패했습니다.",
        variant: "destructive"
      });
    }
  });

  const handleSave = () => {
    saveContactCodesMutation.mutate(tempContactCodes);
  };

  const handleCancel = () => {
    setTempContactCodes(contactCodes);
    setIsEditing(false);
  };

  const updateContactCode = (carrierId: string, contactCode: string) => {
    setTempContactCodes(prev => 
      prev.map(code => 
        (code.carrierId || code.carrier) === carrierId 
          ? { ...code, contactCode }
          : code
      )
    );
  };

  if (isLoading) {
    return (
      <div className="border rounded-lg p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="font-medium text-gray-900">{dealer.name}</h4>
          <p className="text-sm text-gray-500">{dealer.location}</p>
        </div>
        <div className="flex space-x-2">
          {isEditing ? (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleCancel}
                disabled={saveContactCodesMutation.isPending}
              >
                취소
              </Button>
              <Button 
                size="sm" 
                onClick={handleSave}
                disabled={saveContactCodesMutation.isPending}
              >
                {saveContactCodesMutation.isPending ? '저장 중...' : '저장'}
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => setIsEditing(true)}>
              편집
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(isEditing ? tempContactCodes : contactCodes).map((code, index) => (
          <div key={code.carrierId || code.carrier || index} className="space-y-2">
            <Label className="text-sm font-medium">{code.carrierName || code.carrier}</Label>
            {isEditing ? (
              <Input
                value={code.contactCode || code.code || ''}
                onChange={(e) => updateContactCode(code.carrierId || code.carrier || '', e.target.value)}
                placeholder="접점 코드 입력"
                className="text-sm"
              />
            ) : (
              <div className="p-2 bg-gray-50 rounded text-sm min-h-[36px] flex items-center">
                {code.contactCode || code.code || '미설정'}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export function AdminPanel() {
  const { user } = useAuth();
  const apiRequest = useApiRequest();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Admin-only access check
  if (user?.userType !== 'admin') {
    return (
      <Layout title="접근 권한 없음">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-yellow-400 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">접근 권한이 없습니다</h2>
            <p className="text-gray-600">관리자만 접근할 수 있는 페이지입니다.</p>
          </div>
        </div>
      </Layout>
    );
  }
  
  const [dealerDialogOpen, setDealerDialogOpen] = useState(false);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [workerDialogOpen, setWorkerDialogOpen] = useState(false);
  const [salesManagerDialogOpen, setSalesManagerDialogOpen] = useState(false);
  const [editUserDialogOpen, setEditUserDialogOpen] = useState(false);
  const [changePasswordDialogOpen, setChangePasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [servicePlanDialogOpen, setServicePlanDialogOpen] = useState(false);
  const [editServicePlanDialogOpen, setEditServicePlanDialogOpen] = useState(false);
  const [editingServicePlan, setEditingServicePlan] = useState<ServicePlan | null>(null);
  const [additionalServiceDialogOpen, setAdditionalServiceDialogOpen] = useState(false);
  const [editAdditionalServiceDialogOpen, setEditAdditionalServiceDialogOpen] = useState(false);
  const [editingAdditionalService, setEditingAdditionalService] = useState<AdditionalService | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [selectedDealerForContactCodes, setSelectedDealerForContactCodes] = useState<Dealer | null>(null);
  const [contactCodeDialogOpen, setContactCodeDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [pricingTitle, setPricingTitle] = useState('');
  const [templateTitle, setTemplateTitle] = useState('');
  const [templateCategory, setTemplateCategory] = useState<'가입서류' | '변경서류'>('가입서류');
  
  // 정산단가 검색 상태
  const [settlementSearchTerm, setSettlementSearchTerm] = useState('');
  const [settlementCarrierFilter, setSettlementCarrierFilter] = useState('all');
  
  // 접점코드 관리 상태
  const [newContactCode, setNewContactCode] = useState('');
  const [newDealerName, setNewDealerName] = useState('');
  const [newCarrier, setNewCarrier] = useState('');
  const [newSalesManagerId, setNewSalesManagerId] = useState<number | null>(null);
  
  // 접점코드 검색 및 필터링
  const [contactCodeSearch, setContactCodeSearch] = useState('');
  const [contactCodeCarrierFilter, setContactCodeCarrierFilter] = useState('all');
  const [selectedContactCodes, setSelectedContactCodes] = useState<number[]>([]);
  const [selectAllContactCodes, setSelectAllContactCodes] = useState(false);
  
  // 서비스 플랜 검색 및 필터링
  const [servicePlanSearch, setServicePlanSearch] = useState('');
  const [servicePlanCarrierFilter, setServicePlanCarrierFilter] = useState('all');
  const [selectedServicePlans, setSelectedServicePlans] = useState<number[]>([]);
  const [selectAllServicePlans, setSelectAllServicePlans] = useState(false);
  
  const contactCodeExcelInputRef = useRef<HTMLInputElement>(null);
  
  // Analytics dialog states
  const [workerDetailsOpen, setWorkerDetailsOpen] = useState(false);
  const [carrierDetailsOpen, setCarrierDetailsOpen] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<{ id: number; name: string } | null>(null);
  const [selectedCarrier, setSelectedCarrier] = useState<string>('');
  const [workerCarrierDetails, setWorkerCarrierDetails] = useState<Array<{ carrier: string; count: number }>>([]);
  const [carrierDealerDetails, setCarrierDealerDetails] = useState<Array<{ dealerName: string; count: number }>>([]);

  // User management states
  const [editingUser, setEditingUser] = useState<(User & { dealerName: string; userType: string }) | null>(null);
  
  // 서비스플랜 업로드 관련
  const [selectedExcelFile, setSelectedExcelFile] = useState<File | null>(null);
  const [servicePlanImageForm, setServicePlanImageForm] = useState({
    carrier: '',
    file: null as File | null
  });
  
  // 엑셀 다운로드 관련
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  
  // 엑셀 업로드 관련 상태
  const excelFileInputRef = useRef<HTMLInputElement>(null);

  // Settlement unit pricing states
  const [settlementPriceDialogOpen, setSettlementPriceDialogOpen] = useState(false);
  const [selectedServicePlan, setSelectedServicePlan] = useState<ServicePlan | null>(null);
  const [pricingDialogOpen, setPricingDialogOpen] = useState(false);
  
  // Settlement unit pricing excel upload
  const settlementPricingExcelInputRef = useRef<HTMLInputElement>(null);
  const [settlementPricingFile, setSettlementPricingFile] = useState<File | null>(null);

  // Queries
  const { data: dealers, isLoading: dealersLoading } = useQuery({
    queryKey: ['/api/admin/dealers'],
    queryFn: () => apiRequest('/api/admin/dealers') as Promise<Dealer[]>,
  });

  const { data: users = [], isLoading: usersLoading, error: usersError } = useQuery({
    queryKey: ['/api/admin/users'],
    queryFn: () => apiRequest('/api/admin/users') as Promise<Array<User & { dealerName: string; userType: string; displayName: string; affiliation: string; accountType: string }>>,
  });

  // 통신사 데이터 조회 (서비스 플랜 관리용)
  const { data: carriersData = [], isLoading: carriersLoading } = useQuery({
    queryKey: ['/api/carriers'],
    queryFn: () => apiRequest('/api/carriers') as Promise<Carrier[]>,
    staleTime: 0,
    refetchOnWindowFocus: true
  });

  // 디버깅용 로그 제거 (정상 작동 확인됨)

  // Sales managers data query
  const { data: salesManagers = [] } = useQuery({
    queryKey: ['/api/admin/sales-managers'],
    queryFn: () => apiRequest('/api/admin/sales-managers')
  });

  // Combined users list (기존 users + 영업과장 + 관리자)
  const allUsers = [
    ...users.map((user: any) => ({ 
      ...user, 
      accountType: 'user',
      displayName: user.name,
      teamName: user.dealerName || '-'
    })),
    ...salesManagers.map((manager: any) => ({ 
      ...manager, 
      accountType: 'sales_manager',
      userType: 'sales_manager',
      username: manager.username,
      displayName: manager.managerName,
      teamName: manager.teamName || '-',
      createdAt: manager.createdAt
    })),
    {
      id: user?.userId,
      accountType: 'admin',
      userType: 'admin',
      username: 'admin',
      displayName: '시스템 관리자',
      teamName: '시스템',
      createdAt: new Date()
    }
  ];

  const { data: documents, isLoading: documentsLoading } = useQuery({
    queryKey: ['/api/admin/documents'],
    queryFn: () => apiRequest('/api/admin/documents') as Promise<Array<Document & { dealerName: string; userName: string }>>,
  });



  const { data: documentTemplates } = useQuery({
    queryKey: ['/api/document-templates'],
    queryFn: () => apiRequest('/api/document-templates') as Promise<Array<{
      id: number;
      title: string;
      fileName: string;
      fileSize: number;
      category: string;
      uploadedAt: Date;
    }>>,
  });

  const { data: workerStats, isLoading: workerStatsLoading } = useQuery({
    queryKey: ['/api/worker-stats'],
    queryFn: () => apiRequest('/api/worker-stats') as Promise<Array<{
      workerName: string;
      totalActivations: number;
      monthlyActivations: number;
      dealerId: number;
    }>>,
  });

  const { data: servicePlans, isLoading: servicePlansLoading } = useQuery({
    queryKey: ['/api/service-plans'],
    queryFn: () => apiRequest('/api/service-plans') as Promise<ServicePlan[]>,
  });

  const { data: additionalServices, isLoading: additionalServicesLoading } = useQuery({
    queryKey: ['/api/additional-services'],
    queryFn: () => apiRequest('/api/additional-services') as Promise<AdditionalService[]>,
  });

  // Contact Codes Query
  const { data: contactCodes, isLoading: contactCodesLoading } = useQuery({
    queryKey: ['/api/contact-codes'],
    queryFn: () => apiRequest('/api/contact-codes') as Promise<ContactCode[]>,
  });

  // Sales Managers Query for contact code assignment
  const { data: salesManagersList } = useQuery({
    queryKey: ['/api/admin/sales-managers'],
    queryFn: () => apiRequest('/api/admin/sales-managers'),
  });

  // Carriers Query for contact code form
  const { data: carriersList = [] } = useQuery({
    queryKey: ['/api/carriers'],
    queryFn: () => apiRequest('/api/carriers'),
  });

  // Settlement unit pricing queries
  const { data: settlementPrices, isLoading: settlementPricesLoading } = useQuery({
    queryKey: ['/api/settlement-unit-prices'],
    queryFn: () => apiRequest('/api/settlement-unit-prices') as Promise<SettlementUnitPrice[]>,
  });



  // Forms
  const dealerForm = useForm<CreateDealerForm>({
    resolver: zodResolver(createDealerSchema),
    defaultValues: {
      name: '',
      location: '',
      contactEmail: '',
      contactPhone: '',
    },
  });

  const userForm = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      username: '',
      password: '',
      name: '',
      role: 'dealer_store',
    },
  });

  const adminForm = useForm<CreateAdminForm>({
    resolver: zodResolver(createAdminSchema),
    defaultValues: {
      username: '',
      password: '',
      name: '',
    },
  });

  const workerForm = useForm<CreateWorkerForm>({
    resolver: zodResolver(createWorkerSchema),
    defaultValues: {
      username: '',
      password: '',
      name: '',
    },
  });

  const salesManagerForm = useForm<CreateSalesManagerForm>({
    defaultValues: {
      username: '',
      password: '',
      name: '',
      team: 'DX 1팀',
    },
  });

  const changePasswordForm = useForm({
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  });

  const editUserForm = useForm({
    defaultValues: {
      username: '',
      password: '',
      name: '',
      role: 'worker',
    },
  });

  const statusForm = useForm<UpdateDocumentStatusForm>({
    resolver: zodResolver(updateDocumentStatusSchema),
    defaultValues: {
      status: '접수',
      activationStatus: '대기',
      notes: '',
    },
  });

  const servicePlanForm = useForm({
    resolver: zodResolver(createServicePlanSchema),
    defaultValues: {
      planName: '',
      carrier: '',
      planType: '',
      dataAllowance: '',
      monthlyFee: 0,
      isActive: true,
    },
  });



  const editServicePlanForm = useForm({
    resolver: zodResolver(createServicePlanSchema),
    defaultValues: {
      planName: '',
      carrier: '',
      planType: '',
      dataAllowance: '',
      monthlyFee: 0,
      isActive: true,
    },
  });

  const additionalServiceForm = useForm({
    resolver: zodResolver(createAdditionalServiceSchema),
    defaultValues: {
      serviceName: '',
      serviceType: '',
      monthlyFee: 0,
      description: '',
      isActive: true,
    },
  });

  const editAdditionalServiceForm = useForm({
    resolver: zodResolver(createAdditionalServiceSchema),
    defaultValues: {
      serviceName: '',
      serviceType: '',
      monthlyFee: 0,
      description: '',
      isActive: true,
    },
  });

  const settlementPriceForm = useForm<CreateSettlementUnitPriceForm>({
    resolver: zodResolver(createSettlementUnitPriceSchema),
    defaultValues: {
      servicePlanId: 0,
      newCustomerPrice: 0,
      portInPrice: 0,
      memo: '',
    },
  });

  // Mutations
  const createDealerMutation = useMutation({
    mutationFn: (data: CreateDealerForm) => apiRequest('/api/admin/dealers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dealers'] });
      setDealerDialogOpen(false);
      dealerForm.reset();
      toast({
        title: '성공',
        description: '대리점이 성공적으로 생성되었습니다.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: '오류',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: (data: CreateUserForm) => apiRequest('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setUserDialogOpen(false);
      userForm.reset();
      toast({
        title: '성공',
        description: '사용자가 성공적으로 생성되었습니다.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: '오류',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const createAdminMutation = useMutation({
    mutationFn: (data: CreateAdminForm) => apiRequest('/api/admin/create-admin', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      setAdminDialogOpen(false);
      adminForm.reset();
      toast({
        title: '성공',
        description: '관리자 계정이 성공적으로 생성되었습니다.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: '오류',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const createWorkerMutation = useMutation({
    mutationFn: (data: CreateWorkerForm) => apiRequest('/api/admin/create-worker', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setWorkerDialogOpen(false);
      workerForm.reset();
      toast({
        title: '성공',
        description: '근무자 계정이 성공적으로 생성되었습니다.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: '오류',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const createSalesManagerMutation = useMutation({
    mutationFn: (data: CreateSalesManagerForm) => apiRequest('/api/admin/create-sales-manager', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sales-managers'] });
      setSalesManagerDialogOpen(false);
      salesManagerForm.reset();
      toast({
        title: '성공',
        description: '영업과장 계정이 성공적으로 생성되었습니다.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: '오류',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: (data: { userId: number; accountType: string; newPassword: string }) => 
      apiRequest('/api/admin/change-password', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      setChangePasswordDialogOpen(false);
      changePasswordForm.reset();
      toast({
        title: '성공',
        description: '비밀번호가 성공적으로 변경되었습니다.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: '오류',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteSalesManagerMutation = useMutation({
    mutationFn: (managerId: number) => apiRequest(`/api/admin/sales-managers/${managerId}`, {
      method: 'DELETE',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sales-managers'] });
      toast({
        title: '성공',
        description: '영업과장 계정이 성공적으로 삭제되었습니다.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: '오류',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const changeUserRoleMutation = useMutation({
    mutationFn: (data: ChangeUserRoleForm) => apiRequest('/api/admin/change-user-role', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sales-managers'] });
      toast({
        title: '성공',
        description: '사용자 권한이 성공적으로 변경되었습니다.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: '오류',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const uploadPricingMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const sessionId = useAuth.getState().sessionId;
      const response = await fetch('/api/admin/pricing-tables', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionId}`,
        },
        body: data,
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: '업로드에 실패했습니다.' }));
        throw new Error(error.error || '업로드에 실패했습니다.');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pricing-tables'] });
      setPricingDialogOpen(false);
      setSelectedFile(null);
      setPricingTitle('');
      toast({
        title: '성공',
        description: '단가표가 성공적으로 업로드되었습니다.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: '오류',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const uploadTemplateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const sessionId = useAuth.getState().sessionId;
      const response = await fetch('/api/admin/document-templates', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionId}`,
        },
        body: data,
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: '업로드에 실패했습니다.' }));
        throw new Error(error.error || '업로드에 실패했습니다.');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/document-templates'] });
      setTemplateDialogOpen(false);
      setTemplateFile(null);
      setTemplateTitle('');
      setTemplateCategory('가입서류');
      toast({
        title: '성공',
        description: '서식지가 성공적으로 업로드되었습니다.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: '오류',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Settlement unit pricing excel upload mutation
  const settlementPricingExcelUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const sessionId = useAuth.getState().sessionId;
      const response = await fetch('/api/admin/settlement-pricing/excel-upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionId}`,
        },
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: '업로드에 실패했습니다.' }));
        throw new Error(error.error || '업로드에 실패했습니다.');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/service-plans'] });
      queryClient.invalidateQueries({ queryKey: ['/api/settlement-prices'] });
      setSettlementPricingFile(null);
      
      let description = `정산단가 ${data.processed || 0}건이 성공적으로 처리되었습니다.`;
      if (data.duplicatesSkipped > 0) {
        description += ` (${data.duplicatesSkipped}개 중복건 제외)`;
      }
      
      toast({
        title: '성공',
        description,
      });
    },
    onError: (error: Error) => {
      toast({
        title: '오류',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateDocumentStatusMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateDocumentStatusForm }) => 
      apiRequest(`/api/admin/documents/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/documents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      setStatusDialogOpen(false);
      setSelectedDocument(null);
      statusForm.reset();
      toast({
        title: '성공',
        description: '서류 상태가 업데이트되었습니다.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: '오류',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Event handlers
  const handleCreateDealer = (data: CreateDealerForm) => {
    createDealerMutation.mutate(data);
  };

  const handleCreateUser = (data: CreateUserForm) => {
    // role을 userType으로 변환
    const userData = {
      ...data,
      userType: data.role // role 필드를 userType으로 매핑
    };
    createUserMutation.mutate(userData);
  };

  // 사용자 수정 뮤테이션
  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { username?: string; password?: string; name?: string } }) =>
      apiRequest(`/api/admin/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setEditUserDialogOpen(false);
      setEditingUser(null);
      editUserForm.reset();
      toast({
        title: '성공',
        description: '사용자 정보가 업데이트되었습니다.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: '오류',
        description: error.message,
        variant: 'destructive',
      });
    },
  });



  const handleUpdateUser = (data: { username: string; password: string; name: string }) => {
    if (!editingUser) return;
    
    const updateData: any = {};
    if (data.username !== editingUser.username) updateData.username = data.username;
    if (data.password) updateData.password = data.password;
    if (data.name !== editingUser.name) updateData.name = data.name;
    
    if (Object.keys(updateData).length === 0) {
      toast({
        title: '알림',
        description: '변경된 내용이 없습니다.',
      });
      return;
    }
    
    updateUserMutation.mutate({ id: editingUser.id, data: updateData });
  };

  // 사용자 삭제 함수
  const deleteUserMutation = useMutation({
    mutationFn: (userId: number) => apiRequest(`/api/admin/users/${userId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "삭제 완료",
        description: "사용자가 성공적으로 삭제되었습니다.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "삭제 실패",
        description: error.message || "사용자 삭제에 실패했습니다.",
        variant: "destructive"
      });
    }
  });

  const handleDeleteUser = async (userToDelete: any) => {
    if (confirm(`정말로 "${userToDelete.displayName}" 계정을 삭제하시겠습니까?`)) {
      if (userToDelete.accountType === 'sales_manager') {
        deleteSalesManagerMutation.mutate(userToDelete.id);
      } else {
        deleteUserMutation.mutate(userToDelete.id);
      }
    }
  };

  // 접점코드 엑셀 업로드 뮤테이션
  const contactCodeExcelUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      return apiRequest('/api/contact-codes/upload-excel', {
        method: 'POST',
        body: formData,
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/contact-codes'] });
      
      let description = `${data.addedCodes || 0}개의 접점코드가 성공적으로 추가되었습니다.`;
      if (data.duplicatesSkipped > 0) {
        description += ` (${data.duplicatesSkipped}개 중복건 제외)`;
      }
      if (data.errors && data.errors.length > 0) {
        description += `\n\n오류가 발생한 행:\n${data.errors.join('\n')}`;
      }
      
      toast({
        title: "업로드 완료",
        description: description,
      });
      // 파일 입력 초기화
      if (contactCodeExcelInputRef.current) {
        contactCodeExcelInputRef.current.value = '';
      }
    },
    onError: (error: any) => {
      console.error('Contact code upload error:', error);
      
      let description = error.message || "접점코드 업로드에 실패했습니다.";
      
      // 상세 에러 정보 추가
      if (error.details) {
        if (Array.isArray(error.details)) {
          const errorCount = error.totalErrors || error.details.length;
          description += `\n\n오류 발생 (총 ${errorCount}건):\n${error.details.slice(0, 5).join('\n')}`;
          if (errorCount > 5) {
            description += `\n... 외 ${errorCount - 5}건 더`;
          }
        } else {
          description += `\n\n오류 상세: ${error.details}`;
        }
      }
      
      // 중복 접점코드 오류인 경우 안내 메시지 추가
      if (description.includes('이미 존재합니다')) {
        description += '\n\n💡 팁: 동일한 파일을 다시 업로드하면 중복 오류가 발생합니다.';
      }
      
      toast({
        title: "업로드 실패",
        description: description,
        variant: "destructive"
      });
      // 파일 입력 초기화
      if (contactCodeExcelInputRef.current) {
        contactCodeExcelInputRef.current.value = '';
      }
    }
  });

  // 엑셀 업로드 뮤테이션
  const excelUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      return apiRequest('/api/admin/contact-codes/upload', {
        method: 'POST',
        body: formData,
      });
    },
    onSuccess: () => {
      toast({
        title: "업로드 완료",
        description: "접점 코드가 성공적으로 업로드되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dealers'] });
      // 모든 대리점의 접점 코드 쿼리를 무효화
      dealers?.forEach(dealer => {
        queryClient.invalidateQueries({ queryKey: [`/api/dealers/${dealer.id}/contact-codes`] });
      });
    },
    onError: (error: any) => {
      toast({
        title: "업로드 실패",
        description: error.message || "접점 코드 업로드에 실패했습니다.",
        variant: "destructive"
      });
    }
  });

  const handleExcelUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      excelUploadMutation.mutate(file);
    }
    // 파일 입력 초기화
    if (excelFileInputRef.current) {
      excelFileInputRef.current.value = '';
    }
  };

  const handleCreateAdmin = (data: CreateAdminForm) => {
    createAdminMutation.mutate(data);
  };

  const handleCreateWorker = (data: CreateWorkerForm) => {
    createWorkerMutation.mutate(data);
  };

  const handleCreateSalesManager = (data: CreateSalesManagerForm) => {
    createSalesManagerMutation.mutate(data);
  };

  const handleEditUser = (userToEdit: any) => {
    setSelectedUser(userToEdit);
    setEditUserDialogOpen(true);
  };

  const handleChangePassword = (userToEdit: any) => {
    setSelectedUser(userToEdit);
    setChangePasswordDialogOpen(true);
  };



  // Analytics handlers
  const handleWorkerClick = async (worker: { id: number; name: string }) => {
    setSelectedWorker(worker);
    try {
      const response = await apiRequest(`/api/admin/worker-details/${worker.id}`);
      setWorkerCarrierDetails(response);
      setWorkerDetailsOpen(true);
    } catch (error) {
      toast({
        title: '오류',
        description: '근무자 상세 정보를 불러오는데 실패했습니다.',
        variant: 'destructive',
      });
    }
  };

  const handleCarrierClick = async (carrier: string) => {
    setSelectedCarrier(carrier);
    try {
      const response = await apiRequest(`/api/admin/carrier-details/${carrier}`);
      setCarrierDealerDetails(response);
      setCarrierDetailsOpen(true);
    } catch (error) {
      toast({
        title: '오류',
        description: '통신사 상세 정보를 불러오는데 실패했습니다.',
        variant: 'destructive',
      });
    }
  };

  const createServicePlanMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/service-plans', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/service-plans'] });
      setServicePlanDialogOpen(false);
      servicePlanForm.reset();
      toast({
        title: '성공',
        description: '요금제가 성공적으로 생성되었습니다.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: '오류',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateServicePlanMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest(`/api/service-plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/service-plans'] });
      setEditServicePlanDialogOpen(false);
      setEditingServicePlan(null);
      editServicePlanForm.reset();
      toast({
        title: '성공',
        description: '요금제가 성공적으로 수정되었습니다.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: '오류',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteServicePlanMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/service-plans/${id}`, {
      method: 'DELETE',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/service-plans'] });
      toast({
        title: '성공',
        description: '요금제가 성공적으로 삭제되었습니다.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: '오류',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const createAdditionalServiceMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/additional-services', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/additional-services'] });
      setAdditionalServiceDialogOpen(false);
      additionalServiceForm.reset();
      toast({
        title: '성공',
        description: '부가서비스가 성공적으로 생성되었습니다.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: '오류',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateAdditionalServiceMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest(`/api/additional-services/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/additional-services'] });
      setEditAdditionalServiceDialogOpen(false);
      setEditingAdditionalService(null);
      editAdditionalServiceForm.reset();
      toast({
        title: '성공',
        description: '부가서비스가 성공적으로 수정되었습니다.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: '오류',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteAdditionalServiceMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/additional-services/${id}`, {
      method: 'DELETE',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/additional-services'] });
      toast({
        title: '성공',
        description: '부가서비스가 성공적으로 삭제되었습니다.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: '오류',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Service Plan Excel Upload Mutation
  const servicePlanExcelMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      return apiRequest('/api/service-plans/upload-excel', {
        method: 'POST',
        body: formData,
      });
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['/api/service-plans'] });
      // 파일 입력 초기화
      const fileInput = document.querySelector('#service-plan-excel') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
      
      let description = `${result.addedPlans || 0}개의 요금제가 성공적으로 추가되었습니다.`;
      if (result.duplicatesSkipped > 0) {
        description += ` (${result.duplicatesSkipped}개 중복건 제외)`;
      }
      
      toast({
        title: '업로드 완료',
        description,
      });
    },
    onError: (error: Error) => {
      toast({
        title: '업로드 실패',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const servicePlanImageMutation = useMutation({
    mutationFn: async (data: { carrier: string; file: File }) => {
      const formData = new FormData();
      formData.append('carrier', data.carrier);
      formData.append('image', data.file);
      
      return apiRequest('/api/service-plans/upload-image', {
        method: 'POST',
        body: formData,
      });
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['/api/service-plans'] });
      setServicePlanImageForm({ carrier: '', file: null });
      toast({
        title: '성공',
        description: `${result.addedPlans}개의 요금제가 추가되었습니다.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: '오류',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Contact Code Mutations
  const createContactCodeMutation = useMutation({
    mutationFn: (data: { code: string; dealerName: string; carrier: string; salesManagerId?: number | null; salesManagerName?: string | null }) => 
      apiRequest('/api/contact-codes', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contact-codes'] });
      setContactCodeDialogOpen(false);
      setNewContactCode('');
      setNewDealerName('');
      setNewCarrier('');
      setNewSalesManagerId(null);
      toast({
        title: '성공',
        description: '접점코드가 성공적으로 생성되었습니다.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: '오류',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteContactCodeMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/contact-codes/${id}`, {
      method: 'DELETE',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contact-codes'] });
      toast({
        title: '성공',
        description: '접점코드가 성공적으로 삭제되었습니다.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: '오류',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Settlement Unit Pricing Mutations
  const createSettlementPriceMutation = useMutation({
    mutationFn: (data: CreateSettlementUnitPriceForm) => apiRequest('/api/settlement-unit-prices', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settlement-unit-prices'] });
      setSettlementPriceDialogOpen(false);
      settlementPriceForm.reset();
      toast({
        title: '성공',
        description: '정산단가가 성공적으로 설정되었습니다.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: '오류',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateSettlementPriceMutation = useMutation({
    mutationFn: ({ servicePlanId, data }: { servicePlanId: number; data: UpdateSettlementUnitPriceForm }) => 
      apiRequest(`/api/settlement-unit-prices/${servicePlanId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settlement-unit-prices'] });
      setSettlementPriceDialogOpen(false);
      settlementPriceForm.reset();
      toast({
        title: '성공',
        description: '정산단가가 성공적으로 수정되었습니다.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: '오류',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleCreateServicePlan = (data: any) => {
    createServicePlanMutation.mutate(data);
  };

  const openEditServicePlanDialog = (plan: ServicePlan) => {
    setEditingServicePlan(plan);
    editServicePlanForm.reset({
      planName: plan.planName,
      carrier: plan.carrier,
      planType: plan.planType,
      dataAllowance: plan.dataAllowance,
      monthlyFee: plan.monthlyFee,
      isActive: plan.isActive,
    });
    setEditServicePlanDialogOpen(true);
  };

  const handleUpdateServicePlan = (data: any) => {
    if (editingServicePlan) {
      updateServicePlanMutation.mutate({ id: editingServicePlan.id, data });
    }
  };

  const handleDeleteServicePlan = (id: number) => {
    if (confirm('정말로 이 요금제를 삭제하시겠습니까?')) {
      deleteServicePlanMutation.mutate(id);
    }
  };

  const handleCreateAdditionalService = (data: any) => {
    createAdditionalServiceMutation.mutate(data);
  };

  const openEditAdditionalServiceDialog = (service: AdditionalService) => {
    setEditingAdditionalService(service);
    editAdditionalServiceForm.reset({
      serviceName: service.serviceName,
      serviceType: service.serviceType,
      monthlyFee: service.monthlyFee,
      description: service.description,
      isActive: service.isActive,
    });
    setEditAdditionalServiceDialogOpen(true);
  };

  const handleUpdateAdditionalService = (data: any) => {
    if (editingAdditionalService) {
      updateAdditionalServiceMutation.mutate({ id: editingAdditionalService.id, data });
    }
  };

  const handleDeleteAdditionalService = (id: number) => {
    if (confirm('정말로 이 부가서비스를 삭제하시겠습니까?')) {
      deleteAdditionalServiceMutation.mutate(id);
    }
  };

  const handleDownloadServicePlanTemplate = () => {
    // Create Excel template for service plans
    const template = [
      ['요금제명', '통신사', '요금제유형', '데이터제공량', '월요금(원)', '활성여부'],
      ['선)363/1M', 'SK텔링크', 'LTE', '1GB', '36300', 'TRUE'],
      ['중외)5G 웰컴 5', 'KT엠모바일', '5G', '5GB', '0', 'TRUE'],
      ['미)이동의즐거움 K', 'LG미디어로그', 'LTE', '무제한', '0', 'TRUE']
    ];
    
    const csvContent = template.map(row => row.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', '요금제_업로드_양식.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: '다운로드 완료',
      description: '요금제 업로드 양식이 다운로드되었습니다.',
    });
  };

  const handleServicePlanImageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!servicePlanImageForm.carrier || !servicePlanImageForm.file) {
      toast({
        title: '오류',
        description: '통신사와 파일을 모두 선택해주세요.',
        variant: 'destructive',
      });
      return;
    }

    servicePlanImageMutation.mutate({
      carrier: servicePlanImageForm.carrier,
      file: servicePlanImageForm.file
    });
  };

  // Contact Code Handlers
  const handleCreateContactCode = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newContactCode || !newDealerName || !newCarrier || !newSalesManagerId) {
      toast({
        title: '오류',
        description: '접점코드, 판매점명, 통신사, 담당 영업과장을 모두 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }

    const selectedSalesManager = salesManagersList?.find((manager: any) => manager.id === newSalesManagerId);

    createContactCodeMutation.mutate({
      code: newContactCode,
      dealerName: newDealerName,
      carrier: newCarrier,
      salesManagerId: newSalesManagerId,
      salesManagerName: selectedSalesManager?.managerName || null,
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/contact-codes'] });
      }
    });
  };

  const handleDeleteContactCode = (id: number) => {
    if (confirm('정말로 이 접점코드를 삭제하시겠습니까?')) {
      deleteContactCodeMutation.mutate(id);
    }
  };

  // 접점코드 체크박스 관련 함수들
  const handleSelectContactCode = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedContactCodes(prev => [...prev, id]);
    } else {
      setSelectedContactCodes(prev => prev.filter(codeId => codeId !== id));
    }
  };

  const handleSelectAllContactCodes = (checked: boolean) => {
    setSelectAllContactCodes(checked);
    if (checked) {
      const allIds = filteredContactCodes?.map(code => code.id).filter(Boolean) || [];
      setSelectedContactCodes(allIds);
    } else {
      setSelectedContactCodes([]);
    }
  };

  // 선택된 접점코드들 삭제
  const handleDeleteSelectedContactCodes = async () => {
    if (selectedContactCodes.length === 0) return;
    
    if (confirm(`선택된 ${selectedContactCodes.length}개의 접점코드를 삭제하시겠습니까?`)) {
      try {
        await Promise.all(
          selectedContactCodes.map(id => 
            apiRequest(`/api/contact-codes/${id}`, { method: 'DELETE' })
          )
        );
        
        queryClient.invalidateQueries({ queryKey: ['/api/contact-codes'] });
        setSelectedContactCodes([]);
        setSelectAllContactCodes(false);
        
        toast({
          title: "삭제 완료",
          description: `${selectedContactCodes.length}개의 접점코드가 삭제되었습니다.`,
        });
      } catch (error: any) {
        toast({
          title: "삭제 실패",
          description: error.message || "접점코드 삭제에 실패했습니다.",
          variant: "destructive"
        });
      }
    }
  };

  // 접점코드 필터링
  const filteredContactCodes = contactCodes?.filter(code => {
    const matchesSearch = !contactCodeSearch || 
      code.code.toLowerCase().includes(contactCodeSearch.toLowerCase()) ||
      code.dealerName.toLowerCase().includes(contactCodeSearch.toLowerCase()) ||
      (code.salesManagerName && code.salesManagerName.toLowerCase().includes(contactCodeSearch.toLowerCase()));
    
    const matchesCarrier = !contactCodeCarrierFilter || contactCodeCarrierFilter === 'all' || code.carrier === contactCodeCarrierFilter;
    
    return matchesSearch && matchesCarrier;
  });

  // 서비스 플랜 체크박스 관련 함수들
  const handleSelectServicePlan = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedServicePlans(prev => [...prev, id]);
    } else {
      setSelectedServicePlans(prev => prev.filter(planId => planId !== id));
    }
  };

  const handleSelectAllServicePlans = (checked: boolean) => {
    setSelectAllServicePlans(checked);
    if (checked) {
      const allIds = filteredServicePlans?.map(plan => plan.id).filter(Boolean) || [];
      setSelectedServicePlans(allIds);
    } else {
      setSelectedServicePlans([]);
    }
  };

  // 선택된 서비스 플랜들 삭제
  const handleDeleteSelectedServicePlans = async () => {
    if (selectedServicePlans.length === 0) return;
    
    if (confirm(`선택된 ${selectedServicePlans.length}개의 서비스 플랜을 삭제하시겠습니까?`)) {
      try {
        await Promise.all(
          selectedServicePlans.map(id => 
            apiRequest(`/api/service-plans/${id}`, { method: 'DELETE' })
          )
        );
        
        queryClient.invalidateQueries({ queryKey: ['/api/service-plans'] });
        setSelectedServicePlans([]);
        setSelectAllServicePlans(false);
        
        toast({
          title: "삭제 완료",
          description: `${selectedServicePlans.length}개의 서비스 플랜이 삭제되었습니다.`,
        });
      } catch (error: any) {
        toast({
          title: "삭제 실패",
          description: error.message || "서비스 플랜 삭제에 실패했습니다.",
          variant: "destructive"
        });
      }
    }
  };

  // 서비스 플랜 필터링
  const filteredServicePlans = servicePlans?.filter(plan => {
    const matchesSearch = !servicePlanSearch || 
      plan.planName.toLowerCase().includes(servicePlanSearch.toLowerCase()) ||
      plan.carrier.toLowerCase().includes(servicePlanSearch.toLowerCase());
    
    const matchesCarrier = !servicePlanCarrierFilter || servicePlanCarrierFilter === 'all' || plan.carrier === servicePlanCarrierFilter;
    
    return matchesSearch && matchesCarrier;
  });



  const handleContactCodeExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      contactCodeExcelUploadMutation.mutate(file);
    }
  };

  const handleSettlementPricingExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      settlementPricingExcelUploadMutation.mutate(file);
    }
  };

  const handleDownloadSettlementPricingTemplate = () => {
    // 정산단가 엑셀 템플릿 생성
    const csvContent = '\uFEFF' + // BOM for Excel UTF-8 recognition
      '통신사,요금제명,정산단가\n' +
      'SK텔링크,5G100K-스페셜,50000\n' +
      'KT엠모바일,5G110K-셀프,45000\n' +
      'LG미디어로그,LTE베이직,30000\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', '정산단가_업로드_양식.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Settlement unit pricing handlers
  const onSubmitSettlementPrice = (data: CreateSettlementUnitPriceForm) => {
    console.log('Settlement price form submitted:', data);
    console.log('Selected service plan:', selectedServicePlan);
    
    if (!selectedServicePlan) {
      toast({
        title: '오류',
        description: '요금제를 선택해주세요.',
        variant: 'destructive',
      });
      return;
    }
    
    const currentPrice = settlementPrices?.find(p => p.servicePlanId === selectedServicePlan.id);
    console.log('Current price:', currentPrice);
    
    if (currentPrice) {
      // Update existing price
      console.log('Updating existing price');
      updateSettlementPriceMutation.mutate({
        servicePlanId: selectedServicePlan.id,
        data: {
          newCustomerPrice: data.newCustomerPrice,
          portInPrice: data.portInPrice,
          memo: data.memo,
        }
      });
    } else {
      // Create new price
      console.log('Creating new price with data:', {
        servicePlanId: selectedServicePlan.id,
        newCustomerPrice: data.newCustomerPrice,
        portInPrice: data.portInPrice,
        memo: data.memo,
      });
      createSettlementPriceMutation.mutate({
        servicePlanId: selectedServicePlan.id,
        newCustomerPrice: data.newCustomerPrice,
        portInPrice: data.portInPrice,
        memo: data.memo,
      });
    }
  };

  const handleDownloadTemplate = () => {
    // 접점코드 엑셀 템플릿 생성
    const templateData = [
      {
        '접점코드': 'LDI672346',
        '판매점명': '샘플판매점',
        '통신사': 'LG미디어로그',
        '담당영업과장': '황병준'
      },
      {
        '접점코드': 'SKT123456',
        '판매점명': '테스트판매점',
        '통신사': 'SK텔링크',
        '담당영업과장': '김영수'
      }
    ];

    // CSV 형태로 다운로드
    const csvContent = '\uFEFF' + // BOM for Excel UTF-8 recognition
      '접점코드,판매점명,통신사,담당영업과장\n' +
      'LDI672346,샘플판매점,LG미디어로그,황병준\n' +
      'SKT123456,테스트판매점,SK텔링크,김영수\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', '접점코드_업로드_양식.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 엑셀 다운로드 mutation
  const exportMutation = useMutation({
    mutationFn: async () => {
      const sessionId = useAuth.getState().sessionId;
      const headers: Record<string, string> = {};
      if (sessionId) {
        headers['Authorization'] = `Bearer ${sessionId}`;
      }
      
      const response = await fetch(`/api/admin/export/activated-documents?startDate=${exportStartDate}&endDate=${exportEndDate}`, {
        method: 'GET',
        headers,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: '엑셀 파일 생성에 실패했습니다.' }));
        throw new Error(error.error || '엑셀 파일 생성에 실패했습니다.');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `개통서류_${exportStartDate}_${exportEndDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({
        title: '성공',
        description: '엑셀 파일이 다운로드되었습니다.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: '오류',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleExportActivatedDocuments = () => {
    if (!exportStartDate || !exportEndDate) {
      toast({
        title: '오류',
        description: '시작일과 종료일을 선택해주세요.',
        variant: 'destructive',
      });
      return;
    }
    exportMutation.mutate();
  };

  const handleTemplateDownload = async (templateId: number, fileName: string) => {
    try {
      const sessionId = useAuth.getState().sessionId;
      const response = await fetch(`/api/document-templates/${templateId}/download`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${sessionId}`
        },
      });

      if (!response.ok) {
        throw new Error('다운로드에 실패했습니다.');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "다운로드 완료",
        description: `${fileName} 파일이 다운로드되었습니다.`,
      });
    } catch (error) {
      toast({
        title: "다운로드 실패",
        description: error instanceof Error ? error.message : "파일 다운로드 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const handlePricingDownload = async (tableId: number, fileName: string) => {
    try {
      const sessionId = useAuth.getState().sessionId;
      const response = await fetch(`/api/files/pricing/${tableId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${sessionId}`
        },
      });

      if (!response.ok) {
        throw new Error('파일 다운로드에 실패했습니다.');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "다운로드 완료",
        description: `${fileName} 파일이 다운로드되었습니다.`,
      });
    } catch (error) {
      toast({
        title: "다운로드 실패",
        description: error instanceof Error ? error.message : "파일 다운로드 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const getCustomerFileName = (customerName: string, originalFileName: string) => {
    // 파일 확장자 추출
    const fileExtension = originalFileName.includes('.') 
      ? originalFileName.substring(originalFileName.lastIndexOf('.'))
      : '';
    
    // 고객명을 파일명에 안전하게 사용할 수 있도록 처리
    const safeCustomerName = customerName.replace(/[^가-힣a-zA-Z0-9]/g, '_');
    
    return `${safeCustomerName}_서류${fileExtension}`;
  };

  const handleDocumentDownload = async (documentId: number, fileName: string) => {
    try {
      const sessionId = useAuth.getState().sessionId;
      const response = await fetch(`/api/files/documents/${documentId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${sessionId}`
        },
      });

      if (!response.ok) {
        throw new Error('파일 다운로드에 실패했습니다.');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "다운로드 완료",
        description: `파일이 다운로드되었습니다.`,
      });
    } catch (error) {
      toast({
        title: "다운로드 실패",
        description: error instanceof Error ? error.message : "파일 다운로드 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };



  const handleUploadTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!templateFile) {
      toast({
        title: '오류',
        description: '파일을 선택해주세요.',
        variant: 'destructive',
      });
      return;
    }

    const formData = new FormData();
    formData.append('file', templateFile);
    formData.append('title', templateTitle || templateFile.name);
    formData.append('category', templateCategory);

    uploadTemplateMutation.mutate(formData);
  };

  const handleUpdateStatus = (data: UpdateDocumentStatusForm) => {
    if (selectedDocument) {
      updateDocumentStatusMutation.mutate({ id: selectedDocument.id, data });
    }
  };

  const openStatusDialog = (document: Document) => {
    setSelectedDocument(document);
    statusForm.setValue('status', document.status);
    statusForm.setValue('activationStatus', (document as any).activationStatus || '대기');
    statusForm.setValue('notes', document.notes || '');
    setStatusDialogOpen(true);
  };

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

  const getActivationStatusBadge = (status: string) => {
    switch (status) {
      case '대기':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">대기</Badge>;
      case '개통':
        return <Badge variant="outline" className="text-green-600 border-green-600">개통</Badge>;
      case '취소':
        return <Badge variant="outline" className="text-red-600 border-red-600">취소</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case '접수':
        return <Clock className="h-4 w-4 text-warning" />;
      case '완료':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case '보완필요':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <Layout title="관리자 패널">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">시스템 관리</h3>
            <p className="text-sm text-gray-500">
              대리점, 사용자, 서류 및 단가표를 관리할 수 있습니다.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Settings className="h-5 w-5 text-gray-400" />
            <span className="text-sm text-gray-500">관리자 전용</span>
          </div>
        </div>

        {/* Admin Tabs */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-9">
            <TabsTrigger value="contact-codes" className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>접점코드</span>
            </TabsTrigger>
            <TabsTrigger value="carriers" className="flex items-center space-x-2">
              <Building2 className="h-4 w-4" />
              <span>통신사</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>사용자</span>
            </TabsTrigger>
            <TabsTrigger value="accounts" className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>계정 생성</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>서류 관리</span>
            </TabsTrigger>
            <TabsTrigger value="service-plans" className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>서비스 플랜</span>
            </TabsTrigger>
            <TabsTrigger value="workers" className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4" />
              <span>근무자 통계</span>
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center space-x-2">
              <Upload className="h-4 w-4" />
              <span>서식지 관리</span>
            </TabsTrigger>
            <TabsTrigger value="pricing" className="flex items-center space-x-2">
              <Calculator className="h-4 w-4" />
              <span>정산단가</span>
            </TabsTrigger>
          </TabsList>



          {/* Contact Codes Tab */}
          <TabsContent value="contact-codes">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>접점코드 관리</CardTitle>
                  <CardDescription>
                    개통방명 코드를 관리하여 자동으로 판매점명이 설정되도록 합니다.
                  </CardDescription>
                </div>
                <div className="space-x-2">
                  <input
                    ref={contactCodeExcelInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleContactCodeExcelUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={handleDownloadTemplate}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    양식 다운로드
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => contactCodeExcelInputRef.current?.click()}
                    disabled={contactCodeExcelUploadMutation.isPending}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {contactCodeExcelUploadMutation.isPending ? '업로드 중...' : '엑셀 업로드'}
                  </Button>
                  <Dialog open={contactCodeDialogOpen} onOpenChange={setContactCodeDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        접점코드 추가
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>새 접점코드 추가</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleCreateContactCode} className="space-y-4">
                        <div>
                          <Label htmlFor="contactCodeInput">접점코드</Label>
                          <Input
                            id="contactCodeInput"
                            value={newContactCode}
                            onChange={(e) => setNewContactCode(e.target.value)}
                            placeholder="접점코드를 입력하세요"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="dealerName">판매점명</Label>
                          <Input
                            id="dealerName"
                            value={newDealerName}
                            onChange={(e) => setNewDealerName(e.target.value)}
                            placeholder="판매점명을 입력하세요"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="carrier">통신사</Label>
                          <Select value={newCarrier} onValueChange={setNewCarrier}>
                            <SelectTrigger>
                              <SelectValue placeholder="통신사를 선택하세요" />
                            </SelectTrigger>
                            <SelectContent>
                              {carriersList && carriersList.map((carrier: any) => (
                                <SelectItem key={carrier.id} value={carrier.name}>
                                  {carrier.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="salesManager">담당 영업과장 *</Label>
                          <Select 
                            value={newSalesManagerId?.toString() || 'none'} 
                            onValueChange={(value) => setNewSalesManagerId(value && value !== 'none' ? parseInt(value) : null)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="담당 영업과장을 선택하세요" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">선택하지 않음</SelectItem>
                              {salesManagersList && salesManagersList.map((manager: any) => (
                                <SelectItem key={manager.id} value={manager.id.toString()}>
                                  {manager.managerName} ({manager.managerCode || manager.teamName})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button type="button" variant="outline" onClick={() => setContactCodeDialogOpen(false)}>
                            취소
                          </Button>
                          <Button type="submit" disabled={createContactCodeMutation.isPending}>
                            {createContactCodeMutation.isPending ? '생성 중...' : '생성'}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {/* 검색 및 필터 */}
                <div className="mb-6 space-y-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <Input
                        placeholder="접점코드, 판매점명, 담당자명으로 검색..."
                        value={contactCodeSearch}
                        onChange={(e) => setContactCodeSearch(e.target.value)}
                        className="w-full"
                      />
                    </div>
                    <div className="w-full sm:w-48">
                      <Select value={contactCodeCarrierFilter} onValueChange={setContactCodeCarrierFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="통신사 필터" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">전체 통신사</SelectItem>
                          {carriersList && carriersList.map((carrier: any) => (
                            <SelectItem key={carrier.id} value={carrier.name}>
                              {carrier.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* 선택된 항목 삭제 버튼 */}
                  {selectedContactCodes.length > 0 && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                      <span className="text-sm text-red-700 dark:text-red-300">
                        {selectedContactCodes.length}개 항목 선택됨
                      </span>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleDeleteSelectedContactCodes}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        선택 항목 삭제
                      </Button>
                    </div>
                  )}
                </div>

                <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">엑셀 업로드 사용법</h4>
                  <div className="text-sm text-blue-700 dark:text-blue-300">
                    <p className="mb-2">1. 위의 "양식 다운로드" 버튼을 클릭하여 템플릿을 다운로드하세요.</p>
                    <p className="mb-2">2. 다운로드한 파일에 접점코드 데이터를 입력하세요:</p>
                    <ul className="list-disc list-inside ml-4 mb-2">
                      <li><strong>접점코드</strong>: 개통방명 시 사용할 코드</li>
                      <li><strong>판매점명</strong>: 자동으로 설정될 판매점 이름</li>
                      <li><strong>통신사</strong>: 해당 통신사명</li>
                      <li><strong>담당영업과장</strong>: 영업과장 이름 (선택사항)</li>
                    </ul>
                    <p>3. 작성이 완료되면 "엑셀 업로드" 버튼을 클릭하여 파일을 업로드하세요.</p>
                  </div>
                </div>
                
                {contactCodesLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto"></div>
                    <p className="mt-2 text-sm text-gray-500">접점코드 로딩 중...</p>
                  </div>
                ) : filteredContactCodes && filteredContactCodes.length > 0 ? (
                  <div className="space-y-4">
                    {/* 전체 선택 체크박스 */}
                    <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <input
                        type="checkbox"
                        id="selectAllContactCodes"
                        checked={selectAllContactCodes}
                        onChange={(e) => handleSelectAllContactCodes(e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="selectAllContactCodes" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        전체 선택 ({filteredContactCodes.length}개)
                      </label>
                    </div>

                    <div className="max-h-[600px] overflow-y-auto border border-gray-200 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredContactCodes.map((code) => (
                        <div key={code.id} className="border rounded-lg p-4 bg-white dark:bg-gray-900 relative">
                          {/* 체크박스 */}
                          <div className="absolute top-2 left-2">
                            <input
                              type="checkbox"
                              checked={selectedContactCodes.includes(code.id)}
                              onChange={(e) => handleSelectContactCode(code.id, e.target.checked)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                          </div>

                          <div className="ml-6">
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <h4 className="font-medium text-gray-900 dark:text-gray-100">{code.code}</h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{code.dealerName}</p>
                                {code.salesManagerName && (
                                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                    담당: {code.salesManagerName}
                                  </p>
                                )}
                              </div>
                              <Badge variant="outline">{code.carrier}</Badge>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                code.isActive 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                              }`}>
                                {code.isActive ? '활성' : '비활성'}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteContactCode(code.id || 0)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : contactCodes && contactCodes.length > 0 ? (
                  <div className="text-center py-8">
                    <Settings className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">검색 결과가 없습니다</h3>
                    <p className="mt-1 text-sm text-gray-500">다른 검색어를 시도해보세요.</p>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Settings className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">접점코드가 없습니다</h3>
                    <p className="mt-1 text-sm text-gray-500">첫 번째 접점코드를 추가해보세요.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Carriers Tab */}
          <TabsContent value="carriers">
            <CarrierManagement />
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>사용자 관리</CardTitle>
                <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      사용자 추가
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>새 사용자 추가</DialogTitle>
                    </DialogHeader>
                    <Form {...userForm}>
                      <form onSubmit={userForm.handleSubmit(handleCreateUser)} className="space-y-4">
                        <FormField
                          control={userForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>이름</FormLabel>
                              <FormControl>
                                <Input placeholder="이름을 입력하세요" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={userForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>아이디</FormLabel>
                              <FormControl>
                                <Input type="text" placeholder="아이디를 입력하세요" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={userForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>비밀번호</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="비밀번호를 입력하세요" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={userForm.control}
                          name="role"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>역할</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="계정 유형을 선택하세요" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="admin">관리자 (시스템 관리)</SelectItem>
                                  <SelectItem value="worker" disabled>근무자 (개통업무) - 시스템에서 관리됨</SelectItem>
                                  <SelectItem value="dealer" disabled>판매점 (접수) - 시스템에서 관리됨</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                              <p className="text-sm text-gray-600 mt-1">
                                근무자와 판매점 계정은 시스템에서 자동으로 관리됩니다.
                              </p>
                            </FormItem>
                          )}
                        />
                        <div className="flex justify-end space-x-2">
                          <Button type="button" variant="outline" onClick={() => setUserDialogOpen(false)}>
                            취소
                          </Button>
                          <Button type="submit" disabled={createUserMutation.isPending}>
                            {createUserMutation.isPending ? '생성 중...' : '생성'}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto"></div>
                  </div>
                ) : users.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-300">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            이름
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            아이디
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            소속/팀
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            계정 유형
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            생성일
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            관리
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {users.map((user) => (
                          <tr key={user.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {user.displayName || user.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {user.username}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {user.affiliation || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <Badge variant="secondary">
                                {user.accountType === 'admin' ? '시스템 관리자' : 
                                 user.accountType === 'sales_manager' ? '영업과장' : 
                                 user.userType === 'worker' ? '근무자' : '기타'}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {format(new Date(user.createdAt), 'yyyy-MM-dd', { locale: ko })}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div className="flex space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    console.log('Edit button clicked for user:', user);
                                    setEditingUser(user);
                                    setEditUserDialogOpen(true);
                                    setChangePasswordDialogOpen(false); // 비밀번호 다이얼로그 닫기
                                    editUserForm.setValue('username', user.username);
                                    editUserForm.setValue('name', user.displayName || user.name);
                                    editUserForm.setValue('password', '');
                                    // 현재 역할 설정
                                    const currentRole = user.accountType === 'admin' ? 'admin' : 
                                                      user.accountType === 'sales_manager' ? 'sales_manager' : 'worker';
                                    editUserForm.setValue('role', currentRole);
                                    console.log('Edit user dialog should open now');
                                  }}
                                  className="text-blue-600 hover:text-blue-700"
                                  title="사용자 정보 수정"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                {user.id !== 1 && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDeleteUser(user.id)}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">사용자가 없습니다</h3>
                    <p className="mt-1 text-sm text-gray-500">첫 번째 사용자를 추가해보세요.</p>

                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Worker Stats Tab */}
          <TabsContent value="workers">
            <Card>
              <CardHeader>
                <CardTitle>근무자 통계</CardTitle>
              </CardHeader>
              <CardContent>
                {workerStatsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto"></div>
                  </div>
                ) : workerStats && workerStats.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-300">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            근무자명
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            총 개통 건수
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            월 개통 건수
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            순위
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {workerStats
                          .sort((a, b) => b.totalActivations - a.totalActivations)
                          .map((worker, index) => (
                            <tr key={worker.workerName} className={index < 3 ? 'bg-green-50' : ''}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                <button
                                  onClick={() => handleWorkerClick({ id: worker.dealerId || 0, name: worker.workerName })}
                                  className="text-blue-600 hover:text-blue-800 underline"
                                >
                                  {worker.workerName}
                                </button>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {worker.totalActivations}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {worker.monthlyActivations}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                <Badge variant={index < 3 ? 'default' : 'secondary'}>
                                  {index + 1}위
                                </Badge>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <TrendingUp className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">통계가 없습니다</h3>
                    <p className="mt-1 text-sm text-gray-500">근무자 통계가 없습니다.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Account Creation Tab */}
          <TabsContent value="accounts">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>관리자 계정 생성</CardTitle>
                  <CardDescription>
                    새로운 관리자 계정을 생성합니다. 관리자는 모든 시스템 권한을 가집니다.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-end">
                    <Dialog open={adminDialogOpen} onOpenChange={setAdminDialogOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="mr-2 h-4 w-4" />
                          관리자 계정 생성
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>새 관리자 계정 생성</DialogTitle>
                        </DialogHeader>
                        <Form {...adminForm}>
                          <form onSubmit={adminForm.handleSubmit(handleCreateAdmin)} className="space-y-4">
                            <FormField
                              control={adminForm.control}
                              name="name"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>이름</FormLabel>
                                  <FormControl>
                                    <Input placeholder="이름을 입력하세요" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={adminForm.control}
                              name="username"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>아이디</FormLabel>
                                  <FormControl>
                                    <Input type="text" placeholder="아이디를 입력하세요" autoComplete="off" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={adminForm.control}
                              name="password"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>비밀번호</FormLabel>
                                  <FormControl>
                                    <Input type="password" placeholder="비밀번호를 입력하세요" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <div className="flex justify-end space-x-2">
                              <Button type="button" variant="outline" onClick={() => setAdminDialogOpen(false)}>
                                취소
                              </Button>
                              <Button type="submit" disabled={createAdminMutation.isPending}>
                                {createAdminMutation.isPending ? '생성 중...' : '생성'}
                              </Button>
                            </div>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>근무자 계정 생성</CardTitle>
                  <CardDescription>
                    새로운 근무자 계정을 생성합니다. 근무자는 모든 판매점 데이터를 볼 수 있습니다.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-end">
                    <Dialog open={workerDialogOpen} onOpenChange={setWorkerDialogOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="mr-2 h-4 w-4" />
                          근무자 계정 생성
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>새 근무자 계정 생성</DialogTitle>
                        </DialogHeader>
                        <Form {...workerForm}>
                          <form onSubmit={workerForm.handleSubmit(handleCreateWorker)} className="space-y-4">
                            <FormField
                              control={workerForm.control}
                              name="name"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>이름</FormLabel>
                                  <FormControl>
                                    <Input placeholder="이름을 입력하세요" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={workerForm.control}
                              name="username"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>아이디</FormLabel>
                                  <FormControl>
                                    <Input type="text" placeholder="아이디를 입력하세요" autoComplete="off" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={workerForm.control}
                              name="password"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>비밀번호</FormLabel>
                                  <FormControl>
                                    <Input type="password" placeholder="비밀번호를 입력하세요" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <div className="flex justify-end space-x-2">
                              <Button type="button" variant="outline" onClick={() => setWorkerDialogOpen(false)}>
                                취소
                              </Button>
                              <Button type="submit" disabled={createWorkerMutation.isPending}>
                                {createWorkerMutation.isPending ? '생성 중...' : '생성'}
                              </Button>
                            </div>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>영업과장 계정 생성</CardTitle>
                  <CardDescription>
                    새로운 영업과장 계정을 생성합니다. 영업과장은 팀 실적을 관리할 수 있습니다.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-end">
                    <Dialog open={salesManagerDialogOpen} onOpenChange={setSalesManagerDialogOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="mr-2 h-4 w-4" />
                          영업과장 계정 생성
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>새 영업과장 계정 생성</DialogTitle>
                        </DialogHeader>
                        <Form {...salesManagerForm}>
                          <form onSubmit={salesManagerForm.handleSubmit(handleCreateSalesManager)} className="space-y-4">
                            <FormField
                              control={salesManagerForm.control}
                              name="name"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>이름</FormLabel>
                                  <FormControl>
                                    <Input placeholder="이름을 입력하세요" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={salesManagerForm.control}
                              name="username"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>아이디</FormLabel>
                                  <FormControl>
                                    <Input type="text" placeholder="아이디를 입력하세요" autoComplete="off" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={salesManagerForm.control}
                              name="password"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>비밀번호</FormLabel>
                                  <FormControl>
                                    <Input type="password" placeholder="비밀번호를 입력하세요" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={salesManagerForm.control}
                              name="team"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>소속 팀</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="팀을 선택하세요" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="DX 1팀">DX 1팀</SelectItem>
                                      <SelectItem value="DX 2팀">DX 2팀</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <div className="flex justify-end space-x-2">
                              <Button type="button" variant="outline" onClick={() => setSalesManagerDialogOpen(false)}>
                                취소
                              </Button>
                              <Button type="submit" disabled={createSalesManagerMutation.isPending}>
                                {createSalesManagerMutation.isPending ? '생성 중...' : '생성'}
                              </Button>
                            </div>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>

              {/* Existing Users List */}
              <Card>
                <CardHeader>
                  <CardTitle>기존 계정 관리</CardTitle>
                  <CardDescription>
                    기존 사용자 계정을 조회하고 수정할 수 있습니다.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {allUsers && allUsers.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              이름
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              아이디
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              계정 유형
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              소속/팀
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              생성일
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              작업
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {allUsers.map((userItem, index) => (
                            <tr key={`${userItem.accountType}-${userItem.id || index}`}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {userItem.displayName}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {userItem.username}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <Badge variant={
                                  userItem.userType === 'admin' ? 'default' : 
                                  userItem.userType === 'sales_manager' ? 'outline' : 'secondary'
                                }>
                                  {userItem.userType === 'admin' ? '시스템 관리자' : 
                                   userItem.userType === 'sales_manager' ? '영업과장' :
                                   userItem.userType === 'dealer_worker' ? '근무자' : 
                                   userItem.userType === 'dealer_store' ? '판매점' : userItem.userType}
                                </Badge>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {userItem.teamName}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {userItem.createdAt ? format(new Date(userItem.createdAt), 'yyyy-MM-dd', { locale: ko }) : '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <div className="flex space-x-2">
                                  {user?.userType === 'admin' && (
                                    <>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleEditUser(userItem)}
                                        title="사용자 정보 수정"
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleChangePassword(userItem)}
                                        title="비밀번호 변경"
                                      >
                                        <Edit2 className="h-4 w-4" />
                                      </Button>
                                      {userItem.userType !== 'admin' && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleDeleteUser(userItem)}
                                          className="text-red-600 hover:text-red-700"
                                          title="계정 삭제"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      )}
                                    </>
                                  )}
                                  {user?.userType !== 'admin' && userItem.userType !== 'admin' && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleChangePassword(userItem)}
                                      title="비밀번호 변경"
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Users className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">사용자가 없습니다</h3>
                      <p className="mt-1 text-sm text-gray-500">첫 번째 사용자를 추가해보세요.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Change Password Dialog */}
              <Dialog open={changePasswordDialogOpen} onOpenChange={setChangePasswordDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>비밀번호 변경</DialogTitle>
                    <DialogDescription>
                      {selectedUser?.displayName} ({selectedUser?.username})의 비밀번호를 변경합니다.
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...changePasswordForm}>
                    <form onSubmit={changePasswordForm.handleSubmit((data) => {
                      if (data.newPassword !== data.confirmPassword) {
                        toast({
                          title: '오류',
                          description: '새 비밀번호와 확인 비밀번호가 일치하지 않습니다.',
                          variant: 'destructive',
                        });
                        return;
                      }
                      // 계정 타입 결정: userType이 worker면 worker, 아니면 accountType 사용
                      const accountType = selectedUser.userType === 'worker' ? 'worker' : selectedUser.accountType;
                      changePasswordMutation.mutate({
                        userId: selectedUser.id,
                        accountType: accountType,
                        newPassword: data.newPassword
                      });
                    })} className="space-y-4">
                      <FormField
                        control={changePasswordForm.control}
                        name="newPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>새 비밀번호</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="새 비밀번호를 입력하세요" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={changePasswordForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>비밀번호 확인</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="비밀번호를 다시 입력하세요" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={() => setChangePasswordDialogOpen(false)}>
                          취소
                        </Button>
                        <Button type="submit" disabled={changePasswordMutation.isPending}>
                          {changePasswordMutation.isPending ? '변경 중...' : '변경'}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>

              {/* Edit User Dialog */}
              <Dialog open={editUserDialogOpen} onOpenChange={setEditUserDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>사용자 정보 수정</DialogTitle>
                    <DialogDescription>
                      {editingUser?.displayName} ({editingUser?.username}) 사용자의 정보를 수정합니다.
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...editUserForm}>
                    <form onSubmit={editUserForm.handleSubmit((data) => {
                      if (editingUser) {
                        // 역할이 변경되었는지 확인
                        const currentRole = editingUser.accountType === 'admin' ? 'admin' : 
                                          editingUser.accountType === 'sales_manager' ? 'sales_manager' : 'worker';
                        
                        if (data.role !== currentRole) {
                          // 역할 변경
                          changeUserRoleMutation.mutate({
                            userId: editingUser.id,
                            accountType: data.role as 'admin' | 'sales_manager' | 'worker'
                          });
                        } else {
                          // 기본 정보 변경
                          const updateData: any = {};
                          if (data.name !== editingUser.name) updateData.name = data.name;
                          if (data.username !== editingUser.username) updateData.username = data.username;
                          if (data.password) updateData.password = data.password;
                          
                          if (Object.keys(updateData).length > 0) {
                            updateUserMutation.mutate({ id: editingUser.id, data: updateData });
                          } else {
                            setEditUserDialogOpen(false);
                          }
                        }
                      }
                    })} className="space-y-4">
                      <FormField
                        control={editUserForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>이름</FormLabel>
                            <FormControl>
                              <Input placeholder="이름을 입력하세요" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={editUserForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>아이디</FormLabel>
                            <FormControl>
                              <Input type="text" placeholder="아이디를 입력하세요" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={editUserForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>새 비밀번호</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="변경할 경우에만 입력하세요" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={editUserForm.control}
                        name="role"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>계정 유형</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="계정 유형을 선택하세요" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="admin">시스템 관리자</SelectItem>
                                <SelectItem value="sales_manager">영업과장</SelectItem>
                                <SelectItem value="worker">근무자</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={() => setEditUserDialogOpen(false)}>
                          취소
                        </Button>
                        <Button type="submit" disabled={updateUserMutation.isPending}>
                          {updateUserMutation.isPending ? '수정 중...' : '수정'}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>서류 관리</CardTitle>
                  <div className="flex space-x-2">
                    <Input
                      type="date"
                      value={exportStartDate}
                      onChange={(e) => setExportStartDate(e.target.value)}
                      placeholder="시작일"
                      className="w-40"
                    />
                    <Input
                      type="date"
                      value={exportEndDate}
                      onChange={(e) => setExportEndDate(e.target.value)}
                      placeholder="종료일"
                      className="w-40"
                    />
                    <Button 
                      onClick={handleExportActivatedDocuments}
                      disabled={!exportStartDate || !exportEndDate || exportMutation.isPending}
                      className="flex items-center space-x-2"
                    >
                      <Download className="h-4 w-4" />
                      <span>{exportMutation.isPending ? '생성 중...' : '개통서류 엑셀 다운로드'}</span>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {documentsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto"></div>
                  </div>
                ) : documents && documents.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-300">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            접수번호
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            고객명
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            판매점명
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            상태
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            개통상태
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            판매점 메모
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            업로드일
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            파일
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {documents.map((doc) => (
                          <tr key={doc.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {doc.documentNumber}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {doc.customerName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {doc.dealerName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                {getStatusIcon(doc.status)}
                                {getStatusBadge(doc.status)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {getActivationStatusBadge((doc as any).activationStatus || '대기')}
                            </td>
                            <td className="px-6 py-4 text-sm">
                              {(doc as any).dealerNotes ? (
                                <div className="max-w-xs">
                                  <div className="p-2 bg-green-50 border-l-4 border-green-400 rounded-r text-xs">
                                    <div className="font-bold text-green-800 mb-1">💼 판매점 메모</div>
                                    <div className="text-green-700 leading-tight truncate">
                                      {(doc as any).dealerNotes}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-xs">메모 없음</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {format(new Date(doc.uploadedAt), 'yyyy-MM-dd HH:mm', { locale: ko })}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              {doc.filePath && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDocumentDownload(doc.id, getCustomerFileName(doc.customerName, doc.fileName || `document_${doc.id}`))}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">서류가 없습니다</h3>
                    <p className="mt-1 text-sm text-gray-500">업로드된 서류가 없습니다.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Status Update Dialog */}
            <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>서류 상태 변경</DialogTitle>
                </DialogHeader>
                {selectedDocument && (
                  <div className="space-y-4">
                    <div className="text-sm text-gray-600">
                      <p><strong>접수번호:</strong> {selectedDocument.documentNumber}</p>
                      <p><strong>고객명:</strong> {selectedDocument.customerName}</p>
                    </div>
                    <Form {...statusForm}>
                      <form onSubmit={statusForm.handleSubmit(handleUpdateStatus)} className="space-y-4">
                        <FormField
                          control={statusForm.control}
                          name="status"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>상태</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="접수">접수</SelectItem>
                                  <SelectItem value="보완필요">보완필요</SelectItem>
                                  <SelectItem value="완료">완료</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={statusForm.control}
                          name="activationStatus"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>개통 상태</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="대기">대기</SelectItem>
                                  <SelectItem value="개통">개통</SelectItem>
                                  <SelectItem value="취소">취소</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={statusForm.control}
                          name="notes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>메모 (선택사항)</FormLabel>
                              <FormControl>
                                <Input placeholder="메모를 입력하세요" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex justify-end space-x-2">
                          <Button type="button" variant="outline" onClick={() => setStatusDialogOpen(false)}>
                            취소
                          </Button>
                          <Button type="submit" disabled={updateDocumentStatusMutation.isPending}>
                            {updateDocumentStatusMutation.isPending ? '업데이트 중...' : '업데이트'}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Worker Statistics Tab */}
          <TabsContent value="workers">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="mr-2 h-5 w-5" />
                  판매점 성과 통계
                </CardTitle>
                <p className="text-sm text-gray-500">
                  판매점별 개통 실적과 월별 통계를 확인할 수 있습니다.
                </p>
              </CardHeader>
              <CardContent>
                {workerStatsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto"></div>
                    <p className="mt-2 text-sm text-gray-500">통계 로딩 중...</p>
                  </div>
                ) : workerStats && workerStats.length > 0 ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {workerStats.map((stat, index) => (
                        <div key={`${stat.workerName}-${stat.dealerId}`} className="border rounded-lg p-4 bg-white">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center font-medium">
                                {stat.workerName?.charAt(0) || 'W'}
                              </div>
                              <div>
                                <h4 className="font-medium text-gray-900">{stat.workerName || '근무자 정보 없음'}</h4>
                                <p className="text-sm text-gray-500">
                                  {dealers?.find(d => d.id === stat.dealerId)?.name || '대리점 정보 없음'}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-500">순위</p>
                              <p className="text-lg font-bold text-accent">#{index + 1}</p>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">이번 달 개통:</span>
                              <span className="font-semibold text-green-600">{stat.monthlyActivations}건</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">총 개통:</span>
                              <span className="font-semibold text-gray-900">{stat.totalActivations}건</span>
                            </div>
                          </div>
                          
                          <div className="mt-3 pt-3 border-t">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-accent h-2 rounded-full" 
                                style={{ 
                                  width: `${Math.min((stat.monthlyActivations / Math.max(...workerStats.map(s => s.monthlyActivations))) * 100, 100)}%` 
                                }}
                              ></div>
                            </div>
                            <p className="text-xs text-gray-500 mt-1 text-center">월별 성과 비율</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <TrendingUp className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">판매점 통계가 없습니다</h3>
                    <p className="mt-1 text-sm text-gray-500">개통 완료된 서류가 있어야 통계가 표시됩니다.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Document Templates Tab */}
          <TabsContent value="templates">
            <Card>
              <CardHeader>
                <CardTitle>서식지 관리</CardTitle>
                <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Upload className="mr-2 h-4 w-4" />
                      서식지 업로드
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>새 서식지 업로드</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleUploadTemplate} className="space-y-4">
                      <div>
                        <Label htmlFor="templateTitle">제목</Label>
                        <Input
                          id="templateTitle"
                          value={templateTitle}
                          onChange={(e) => setTemplateTitle(e.target.value)}
                          placeholder="서식지 제목을 입력하세요"
                        />
                      </div>
                      <div>
                        <Label htmlFor="templateCategory">카테고리</Label>
                        <Select value={templateCategory} onValueChange={(value: '가입서류' | '변경서류') => setTemplateCategory(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="가입서류">가입서류</SelectItem>
                            <SelectItem value="변경서류">변경서류</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="templateFile">파일</Label>
                        <Input
                          id="templateFile"
                          type="file"
                          accept=".pdf,.doc,.docx,.xlsx,.xls,.jpg,.jpeg,.png,.gif,.bmp,.tiff,.webp"
                          onChange={(e) => setTemplateFile(e.target.files?.[0] || null)}
                          required
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          PDF, DOC, DOCX, XLSX, XLS, JPG, JPEG, PNG, GIF, BMP, TIFF, WEBP 파일 업로드 가능 (최대 50MB)
                        </p>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={() => setTemplateDialogOpen(false)}>
                          취소
                        </Button>
                        <Button type="submit" disabled={uploadTemplateMutation.isPending}>
                          {uploadTemplateMutation.isPending ? '업로드 중...' : '업로드'}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {documentTemplates && documentTemplates.length > 0 ? (
                  <div className="space-y-4">
                    {['가입서류', '변경서류'].map((category) => {
                      const categoryTemplates = documentTemplates.filter(t => t.category === category);
                      if (categoryTemplates.length === 0) return null;
                      
                      return (
                        <div key={category} className="space-y-3">
                          <h4 className="font-medium text-gray-900 border-b pb-2">{category}</h4>
                          {categoryTemplates.map((template) => (
                            <div key={template.id} className="border rounded-lg p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                    <FileText className="w-5 h-5 text-blue-600" />
                                  </div>
                                  <div>
                                    <h4 className="font-medium text-gray-900">{template.title}</h4>
                                    <p className="text-sm text-gray-500">
                                      {format(new Date(template.uploadedAt), 'yyyy-MM-dd HH:mm', { locale: ko })}
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  variant="outline"
                                  onClick={() => handleTemplateDownload(template.id, template.fileName)}
                                >
                                  <Download className="w-4 h-4 mr-2" />
                                  다운로드
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">서식지가 없습니다</h3>
                    <p className="mt-1 text-sm text-gray-500">첫 번째 서식지를 업로드해보세요.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>



          {/* Service Plans Tab */}
          <TabsContent value="service-plans">
            <div className="space-y-6">
              {/* Service Plan Upload Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Excel Template Upload Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileSpreadsheet className="h-5 w-5" />
                      엑셀 요금제 업로드
                    </CardTitle>
                    <CardDescription>
                      대량 요금제 데이터를 Excel 파일로 한번에 업로드할 수 있습니다.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Guidelines */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-900 mb-2">업로드 가이드라인</h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• 1단계: 아래 Excel 양식을 다운로드하세요</li>
                        <li>• 2단계: 양식에 맞춰 요금제 정보를 입력하세요</li>
                        <li>• 3단계: 완성된 파일을 업로드하세요</li>
                        <li>• 지원 형식: .xlsx, .xls, .csv</li>
                        <li>• 필수 컬럼: 요금제명, 통신사, 유형, 데이터, 월요금</li>
                      </ul>
                    </div>

                    {/* Template Download */}
                    <div className="flex flex-col space-y-2">
                      <Button 
                        variant="outline" 
                        onClick={handleDownloadServicePlanTemplate}
                        className="w-full"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Excel 양식 다운로드
                      </Button>
                    </div>

                    {/* File Upload */}
                    <div className="space-y-4">
                      <div>
                        <Label>Excel 파일 선택</Label>
                        <Input
                          id="service-plan-excel"
                          type="file"
                          accept=".xlsx,.xls,.csv"
                          className="mt-1"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setSelectedExcelFile(file);
                            }
                          }}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Excel 파일 (XLSX, XLS) 및 CSV 파일 업로드 가능합니다.
                        </p>
                        {selectedExcelFile && (
                          <p className="text-sm text-green-600 mt-2">
                            ✓ 선택된 파일: {selectedExcelFile.name}
                          </p>
                        )}
                      </div>
                      <Button 
                        className="w-full" 
                        onClick={() => {
                          if (selectedExcelFile) {
                            servicePlanExcelMutation.mutate(selectedExcelFile);
                          }
                        }}
                        disabled={!selectedExcelFile || servicePlanExcelMutation.isPending}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {servicePlanExcelMutation.isPending ? '업로드 중...' : '엑셀 파일 업로드'}
                      </Button>
                      {servicePlanExcelMutation.isPending && (
                        <div className="flex items-center space-x-2 text-sm text-blue-600">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          <span>파일을 처리하고 있습니다...</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Image Upload Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ImageIcon className="h-5 w-5" />
                      이미지 요금제 업로드
                    </CardTitle>
                    <CardDescription>
                      이미지에서 요금제 정보를 읽어 자동으로 추가합니다.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Guidelines */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="font-semibold text-green-900 mb-2">이미지 업로드 가이드</h4>
                      <ul className="text-sm text-green-800 space-y-1">
                        <li>• 요금제표나 가격표 이미지를 업로드하세요</li>
                        <li>• 텍스트가 선명하고 읽기 쉬운 이미지 권장</li>
                        <li>• 지원 형식: JPG, PNG, GIF, BMP, TIFF, WEBP</li>
                        <li>• 업로드 후 자동으로 텍스트를 분석합니다</li>
                        <li>• 분석 후 수동으로 정보를 검토해주세요</li>
                      </ul>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label>통신사 선택</Label>
                        <Select
                          value={servicePlanImageForm.carrier}
                          onValueChange={(value) => setServicePlanImageForm(prev => ({ ...prev, carrier: value }))}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="통신사를 선택하세요" />
                          </SelectTrigger>
                          <SelectContent>
                            {carriersLoading ? (
                              <SelectItem value="loading" disabled>통신사 로딩 중...</SelectItem>
                            ) : carriersData && carriersData.filter(c => c.isActive).length > 0 ? (
                              carriersData.filter(c => c.isActive).map((carrier) => (
                                <SelectItem key={carrier.id} value={carrier.name}>
                                  {carrier.name}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="none" disabled>활성화된 통신사가 없습니다</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>이미지 파일 선택</Label>
                        <Input
                          type="file"
                          accept="image/*"
                          className="mt-1"
                          onChange={(e) => setServicePlanImageForm(prev => ({ ...prev, file: e.target.files?.[0] || null }))}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          JPG, PNG, GIF, BMP, TIFF, WEBP 파일을 업로드하세요.
                        </p>
                        {servicePlanImageForm.file && (
                          <p className="text-sm text-green-600 mt-2">
                            ✓ 선택된 파일: {servicePlanImageForm.file.name}
                          </p>
                        )}
                      </div>
                      <Button 
                        className="w-full" 
                        onClick={() => {
                          if (servicePlanImageForm.carrier && servicePlanImageForm.file) {
                            servicePlanImageMutation.mutate({
                              carrier: servicePlanImageForm.carrier,
                              file: servicePlanImageForm.file
                            });
                          }
                        }}
                        disabled={!servicePlanImageForm.carrier || !servicePlanImageForm.file || servicePlanImageMutation.isPending}
                      >
                        <ImageIcon className="mr-2 h-4 w-4" />
                        {servicePlanImageMutation.isPending ? '분석 중...' : '이미지 업로드'}
                      </Button>
                      {servicePlanImageMutation.isPending && (
                        <div className="flex items-center space-x-2 text-sm text-green-600">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                          <span>이미지를 분석하고 있습니다...</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Service Plans Card */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>요금제 관리</CardTitle>
                    <CardDescription>
                      각 통신사의 요금제를 관리할 수 있습니다.
                    </CardDescription>
                  </div>
                  <Dialog open={servicePlanDialogOpen} onOpenChange={setServicePlanDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        요금제 추가
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>새 요금제 추가</DialogTitle>
                      </DialogHeader>
                      <Form {...servicePlanForm}>
                        <form onSubmit={servicePlanForm.handleSubmit(handleCreateServicePlan)} className="space-y-4">
                          <FormField
                            control={servicePlanForm.control}
                            name="planName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>요금제명</FormLabel>
                                <FormControl>
                                  <Input placeholder="요금제명을 입력하세요" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={servicePlanForm.control}
                            name="carrier"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>통신사</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="통신사를 선택하세요" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {carriersLoading ? (
                                      <SelectItem value="loading" disabled>통신사 로딩 중...</SelectItem>
                                    ) : carriersData && carriersData.filter(c => c.isActive).length > 0 ? (
                                      carriersData.filter(c => c.isActive).map((carrier) => (
                                        <SelectItem key={carrier.id} value={carrier.name}>
                                          {carrier.name}
                                        </SelectItem>
                                      ))
                                    ) : (
                                      <SelectItem value="none" disabled>활성화된 통신사가 없습니다</SelectItem>
                                    )}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={servicePlanForm.control}
                            name="planType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>요금제 유형</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="요금제 유형을 선택하세요" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="5G">5G</SelectItem>
                                    <SelectItem value="LTE">LTE</SelectItem>
                                    <SelectItem value="3G">3G</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={servicePlanForm.control}
                            name="dataAllowance"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>데이터 제공량</FormLabel>
                                <FormControl>
                                  <Input placeholder="예: 무제한, 100GB" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={servicePlanForm.control}
                            name="monthlyFee"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>월 요금 (원)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    placeholder="월 요금을 입력하세요"
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="flex justify-end space-x-2">
                            <Button type="button" variant="outline" onClick={() => setServicePlanDialogOpen(false)}>
                              취소
                            </Button>
                            <Button type="submit" disabled={createServicePlanMutation.isPending}>
                              {createServicePlanMutation.isPending ? '생성 중...' : '생성'}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                  
                  {/* Edit Service Plan Dialog */}
                  <Dialog open={editServicePlanDialogOpen} onOpenChange={setEditServicePlanDialogOpen}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>요금제 편집</DialogTitle>
                      </DialogHeader>
                      <Form {...editServicePlanForm}>
                        <form onSubmit={editServicePlanForm.handleSubmit(handleUpdateServicePlan)} className="space-y-4">
                          <FormField
                            control={editServicePlanForm.control}
                            name="planName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>요금제명</FormLabel>
                                <FormControl>
                                  <Input placeholder="요금제명을 입력하세요" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={editServicePlanForm.control}
                            name="carrier"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>통신사</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
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
                                    <SelectItem value="KT스카이라이프">KT스카이라이프</SelectItem>
                                    <SelectItem value="KT스테이지파이브">KT스테이지파이브</SelectItem>
                                    <SelectItem value="KT코드모바일">KT코드모바일</SelectItem>
                                    <SelectItem value="LG미디어로그">LG미디어로그</SelectItem>
                                    <SelectItem value="LG헬로모바일">LG헬로모바일</SelectItem>
                                    <SelectItem value="LG프리티">LG프리티</SelectItem>
                                    <SelectItem value="LG밸류컴">LG밸류컴</SelectItem>
                                    <SelectItem value="스마텔LG">스마텔LG</SelectItem>
                                    <SelectItem value="KT">KT</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={editServicePlanForm.control}
                            name="planType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>요금제 유형</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="요금제 유형을 선택하세요" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="5G">5G</SelectItem>
                                    <SelectItem value="LTE">LTE</SelectItem>
                                    <SelectItem value="3G">3G</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={editServicePlanForm.control}
                            name="dataAllowance"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>데이터 제공량</FormLabel>
                                <FormControl>
                                  <Input placeholder="예: 무제한, 100GB" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={editServicePlanForm.control}
                            name="monthlyFee"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>월 요금 (원)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    placeholder="월 요금을 입력하세요"
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={editServicePlanForm.control}
                            name="isActive"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                <div className="space-y-0.5">
                                  <FormLabel>활성 상태</FormLabel>
                                  <FormDescription>
                                    요금제를 활성화하거나 비활성화합니다.
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <div className="flex justify-end space-x-2">
                            <Button type="button" variant="outline" onClick={() => setEditServicePlanDialogOpen(false)}>
                              취소
                            </Button>
                            <Button type="submit" disabled={updateServicePlanMutation.isPending}>
                              {updateServicePlanMutation.isPending ? '수정 중...' : '수정'}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  {/* 검색 및 필터 */}
                  <div className="mb-6 space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex-1">
                        <Input
                          placeholder="요금제명, 통신사로 검색..."
                          value={servicePlanSearch}
                          onChange={(e) => setServicePlanSearch(e.target.value)}
                          className="w-full"
                        />
                      </div>
                      <div className="w-full sm:w-48">
                        <Select value={servicePlanCarrierFilter} onValueChange={setServicePlanCarrierFilter}>
                          <SelectTrigger>
                            <SelectValue placeholder="통신사 필터" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">전체 통신사</SelectItem>
                            {carriersData && carriersData.map((carrier: any) => (
                              <SelectItem key={carrier.id} value={carrier.name}>
                                {carrier.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* 선택된 항목 삭제 버튼 */}
                    {selectedServicePlans.length > 0 && (
                      <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                        <span className="text-sm text-red-700 dark:text-red-300">
                          {selectedServicePlans.length}개 항목 선택됨
                        </span>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={handleDeleteSelectedServicePlans}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          선택 항목 삭제
                        </Button>
                      </div>
                    )}
                  </div>

                  {servicePlansLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                      <p className="mt-2 text-sm text-gray-500">요금제를 불러오는 중...</p>
                    </div>
                  ) : filteredServicePlans && filteredServicePlans.length > 0 ? (
                    <div className="space-y-6">
                      {/* 전체 선택 체크박스 */}
                      <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 border-b mb-4">
                        <input
                          type="checkbox"
                          id="selectAllServicePlans"
                          checked={selectAllServicePlans}
                          onChange={(e) => handleSelectAllServicePlans(e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="selectAllServicePlans" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          전체 선택 ({filteredServicePlans.length}개)
                        </label>
                      </div>

                      {(() => {
                        // 통신사별로 그룹화
                        const plansByCarrier = filteredServicePlans
                          .sort((a, b) => {
                            // 먼저 통신사별로 정렬, 그 다음 요금제명으로 정렬
                            if (a.carrier !== b.carrier) {
                              return a.carrier.localeCompare(b.carrier);
                            }
                            return a.planName.localeCompare(b.planName);
                          })
                          .reduce((acc, plan) => {
                            if (!acc[plan.carrier]) {
                              acc[plan.carrier] = [];
                            }
                            acc[plan.carrier].push(plan);
                            return acc;
                          }, {} as Record<string, typeof filteredServicePlans>);

                        return Object.entries(plansByCarrier).map(([carrier, plans]) => (
                          <div key={carrier} className="border rounded-lg overflow-hidden">
                            {/* 통신사 헤더 */}
                            <div className="bg-gray-100 px-6 py-3 border-b">
                              <h3 className="text-lg font-semibold text-gray-900">{carrier}</h3>
                              <p className="text-sm text-gray-600">{plans.length}개 요금제</p>
                            </div>
                            
                            {/* 요금제 테이블 */}
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                                      선택
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      요금제명
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      유형
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      데이터
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      월 요금
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      상태
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      관리
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {plans.map((plan) => (
                                    <tr key={plan.id}>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <input
                                          type="checkbox"
                                          checked={selectedServicePlans.includes(plan.id)}
                                          onChange={(e) => handleSelectServicePlan(plan.id, e.target.checked)}
                                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {plan.planName}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {plan.planType}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {plan.dataAllowance}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {Math.floor(parseFloat(plan.monthlyFee)).toLocaleString()}원
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <Badge variant={plan.isActive ? "default" : "secondary"}>
                                          {plan.isActive ? '활성' : '비활성'}
                                        </Badge>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <div className="flex space-x-2">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => openEditServicePlanDialog(plan)}
                                          >
                                            편집
                                          </Button>
                                          <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => handleDeleteServicePlan(plan.id)}
                                          >
                                            삭제
                                          </Button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  ) : servicePlans && servicePlans.length > 0 ? (
                    <div className="text-center py-8">
                      <Settings className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">검색 결과가 없습니다</h3>
                      <p className="mt-1 text-sm text-gray-500">다른 검색어를 시도해보세요.</p>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Settings className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">요금제가 없습니다</h3>
                      <p className="mt-1 text-sm text-gray-500">첫 번째 요금제를 추가해보세요.</p>
                    </div>
                  )}
                </CardContent>
              </Card>



              {/* Additional Services Card */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>부가서비스 관리</CardTitle>
                    <CardDescription>
                      각종 부가서비스와 결합상품을 관리할 수 있습니다.
                    </CardDescription>
                  </div>
                  <Dialog open={additionalServiceDialogOpen} onOpenChange={setAdditionalServiceDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        부가서비스 추가
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>새 부가서비스 추가</DialogTitle>
                      </DialogHeader>
                      <Form {...additionalServiceForm}>
                        <form onSubmit={additionalServiceForm.handleSubmit(handleCreateAdditionalService)} className="space-y-4">
                          <FormField
                            control={additionalServiceForm.control}
                            name="serviceName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>서비스명</FormLabel>
                                <FormControl>
                                  <Input placeholder="서비스명을 입력하세요" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={additionalServiceForm.control}
                            name="serviceType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>서비스 유형</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="서비스 유형을 선택하세요" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="부가서비스">부가서비스</SelectItem>
                                    <SelectItem value="결합상품">결합상품</SelectItem>
                                    <SelectItem value="콘텐츠">콘텐츠</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={additionalServiceForm.control}
                            name="monthlyFee"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>월 요금 (원)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    placeholder="월 요금을 입력하세요 (할인 서비스는 0)"
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={additionalServiceForm.control}
                            name="description"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>설명</FormLabel>
                                <FormControl>
                                  <Input placeholder="서비스 설명을 입력하세요" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="flex justify-end space-x-2">
                            <Button type="button" variant="outline" onClick={() => setAdditionalServiceDialogOpen(false)}>
                              취소
                            </Button>
                            <Button type="submit" disabled={createAdditionalServiceMutation.isPending}>
                              {createAdditionalServiceMutation.isPending ? '생성 중...' : '생성'}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>

                  {/* Edit Additional Service Dialog */}
                  <Dialog open={editAdditionalServiceDialogOpen} onOpenChange={setEditAdditionalServiceDialogOpen}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>부가서비스 편집</DialogTitle>
                      </DialogHeader>
                      <Form {...editAdditionalServiceForm}>
                        <form onSubmit={editAdditionalServiceForm.handleSubmit(handleUpdateAdditionalService)} className="space-y-4">
                          <FormField
                            control={editAdditionalServiceForm.control}
                            name="serviceName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>서비스명</FormLabel>
                                <FormControl>
                                  <Input placeholder="서비스명을 입력하세요" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={editAdditionalServiceForm.control}
                            name="serviceType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>서비스 유형</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="서비스 유형을 선택하세요" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="부가서비스">부가서비스</SelectItem>
                                    <SelectItem value="결합상품">결합상품</SelectItem>
                                    <SelectItem value="콘텐츠">콘텐츠</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={editAdditionalServiceForm.control}
                            name="monthlyFee"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>월 요금 (원)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    placeholder="월 요금을 입력하세요 (할인 서비스는 0)"
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={editAdditionalServiceForm.control}
                            name="description"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>설명</FormLabel>
                                <FormControl>
                                  <Input placeholder="서비스 설명을 입력하세요" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={editAdditionalServiceForm.control}
                            name="isActive"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                <div className="space-y-0.5">
                                  <FormLabel>활성 상태</FormLabel>
                                  <FormDescription>
                                    서비스를 활성화하거나 비활성화합니다.
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <div className="flex justify-end space-x-2">
                            <Button type="button" variant="outline" onClick={() => setEditAdditionalServiceDialogOpen(false)}>
                              취소
                            </Button>
                            <Button type="submit" disabled={updateAdditionalServiceMutation.isPending}>
                              {updateAdditionalServiceMutation.isPending ? '수정 중...' : '수정'}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  {additionalServicesLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                      <p className="mt-2 text-sm text-gray-500">부가서비스를 불러오는 중...</p>
                    </div>
                  ) : additionalServices && additionalServices.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              서비스명
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              유형
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              월 요금
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              설명
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              상태
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              관리
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {additionalServices.map((service) => (
                            <tr key={service.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {service.serviceName}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {service.serviceType}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {service.monthlyFee.toLocaleString()}원
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {service.description}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <Badge variant={service.isActive ? "default" : "secondary"}>
                                  {service.isActive ? '활성' : '비활성'}
                                </Badge>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <div className="flex space-x-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openEditAdditionalServiceDialog(service)}
                                  >
                                    편집
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleDeleteAdditionalService(service.id)}
                                  >
                                    삭제
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Settings className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">부가서비스가 없습니다</h3>
                      <p className="mt-1 text-sm text-gray-500">첫 번째 부가서비스를 추가해보세요.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Workers Statistics Tab */}
          <TabsContent value="workers" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>근무자 통계</CardTitle>
                <CardDescription>근무자별 성과 및 활동 통계를 확인할 수 있습니다.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <TrendingUp className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">근무자 통계</h3>
                  <p className="mt-1 text-sm text-gray-500">통계 기능이 준비 중입니다.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>서식지 관리</CardTitle>
                <CardDescription>서류 템플릿을 업로드하고 관리할 수 있습니다.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">서식지 관리</h3>
                  <p className="mt-1 text-sm text-gray-500">서식지 업로드 기능이 준비 중입니다.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settlement Unit Pricing Tab */}
          <TabsContent value="pricing" className="space-y-6">
            {/* 접수 방법 가이드 */}
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-blue-700">
                  <Info className="h-5 w-5" />
                  <span>정산단가 관리 가이드</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-blue-600">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">📋 개별 입력 방법</h4>
                    <ol className="list-decimal list-inside space-y-1 text-xs">
                      <li>요금제 목록에서 '설정' 또는 '수정' 버튼 클릭</li>
                      <li>정산단가 입력 후 '저장' 클릭</li>
                      <li>기존 단가 수정 시 신규 정산건부터 적용</li>
                    </ol>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">📊 엑셀 일괄 업로드</h4>
                    <ol className="list-decimal list-inside space-y-1 text-xs">
                      <li>'양식 다운로드'로 템플릿 파일 받기</li>
                      <li>통신사, 요금제명, 정산단가 입력</li>
                      <li>'엑셀 업로드'로 파일 업로드</li>
                    </ol>
                  </div>
                </div>
                <div className="bg-yellow-100 border border-yellow-300 rounded p-2 mt-3">
                  <p className="text-yellow-700 text-xs">
                    ⚠️ <strong>주의사항:</strong> 정산단가 변경 시 기존 정산건은 기존 금액 유지, 신규 정산건부터 새 단가 적용
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>정산단가 설정</CardTitle>
                  <CardDescription>요금제별 정산 단가를 설정하고 관리할 수 있습니다. 단가 변경 시 기존 정산금액은 유지됩니다.</CardDescription>
                </div>
                <div className="space-x-2">
                  <input
                    ref={settlementPricingExcelInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleSettlementPricingExcelUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={handleDownloadSettlementPricingTemplate}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    양식 다운로드
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => settlementPricingExcelInputRef.current?.click()}
                    disabled={settlementPricingExcelUploadMutation.isPending}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {settlementPricingExcelUploadMutation.isPending ? '업로드 중...' : '엑셀 업로드'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {settlementPricesLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                    <p className="mt-2 text-sm text-gray-500">정산단가를 불러오는 중...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* 검색 및 필터 */}
                    <div className="flex flex-col sm:flex-row gap-4 mb-6">
                      <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          placeholder="통신사 또는 요금제명으로 검색..."
                          value={settlementSearchTerm}
                          onChange={(e) => setSettlementSearchTerm(e.target.value)}
                          className="w-full pl-10"
                        />
                      </div>
                      <div className="min-w-[200px]">
                        <Select
                          value={settlementCarrierFilter}
                          onValueChange={setSettlementCarrierFilter}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="통신사 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">전체 통신사</SelectItem>
                            {Array.from(new Set(servicePlans?.map(plan => plan.carrier) || [])).map((carrier) => (
                              <SelectItem key={carrier} value={carrier}>
                                {carrier}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Service Plans with Unit Pricing */}
                    <div className="grid gap-4">
                      {servicePlans?.filter((plan) => {
                        const matchesSearch = plan.planName.toLowerCase().includes(settlementSearchTerm.toLowerCase()) ||
                                            plan.carrier.toLowerCase().includes(settlementSearchTerm.toLowerCase());
                        const matchesCarrier = settlementCarrierFilter === 'all' || plan.carrier === settlementCarrierFilter;
                        return matchesSearch && matchesCarrier;
                      }).map((plan) => {
                        const currentPrice = settlementPrices?.find(p => p.servicePlanId === plan.id);
                        return (
                          <div key={plan.id} className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3">
                                <div>
                                  <h4 className="font-medium text-gray-900">{plan.planName}</h4>
                                  <p className="text-sm text-gray-500">{plan.carrier} • {plan.planType} • {plan.dataAllowance}</p>
                                </div>
                                {plan.isActive ? (
                                  <Badge variant="secondary">활성</Badge>
                                ) : (
                                  <Badge variant="outline">비활성</Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              {currentPrice ? (
                                <div className="text-right">
                                  <p className="font-medium text-gray-900">
                                    신규: {currentPrice.newCustomerPrice.toLocaleString()}원
                                  </p>
                                  <p className="font-medium text-gray-900">
                                    번호이동: {currentPrice.portInPrice.toLocaleString()}원
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {format(currentPrice.effectiveFrom, 'yyyy-MM-dd')}부터 적용
                                  </p>
                                </div>
                              ) : (
                                <p className="text-sm text-gray-500">단가 미설정</p>
                              )}
                              <Button
                                size="sm"
                                variant={currentPrice ? "outline" : "default"}
                                onClick={() => {
                                  setSelectedServicePlan(plan);
                                  settlementPriceForm.reset({
                                    servicePlanId: plan.id,
                                    newCustomerPrice: currentPrice?.newCustomerPrice || 0,
                                    portInPrice: currentPrice?.portInPrice || 0
                                  });
                                  setSettlementPriceDialogOpen(true);
                                }}
                              >
                                {currentPrice ? '수정' : '설정'}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* 검색 결과가 없을 때 */}
                    {servicePlans?.filter((plan) => {
                      const matchesSearch = plan.planName.toLowerCase().includes(settlementSearchTerm.toLowerCase()) ||
                                          plan.carrier.toLowerCase().includes(settlementSearchTerm.toLowerCase());
                      const matchesCarrier = settlementCarrierFilter === 'all' || plan.carrier === settlementCarrierFilter;
                      return matchesSearch && matchesCarrier;
                    }).length === 0 && servicePlans?.length > 0 && (
                      <div className="text-center py-8">
                        <Search className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">검색 결과가 없습니다</h3>
                        <p className="mt-1 text-sm text-gray-500">다른 검색어나 필터를 시도해보세요.</p>
                      </div>
                    )}

                    {servicePlans?.length === 0 && (
                      <div className="text-center py-8">
                        <Calculator className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">등록된 요금제가 없습니다</h3>
                        <p className="mt-1 text-sm text-gray-500">먼저 요금제 관리에서 요금제를 등록해주세요.</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Additional Service Deduction Management Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  부가서비스 차감 정책 관리
                </CardTitle>
                <CardDescription>
                  부가서비스별 차감 금액을 설정하여 정산 시 자동으로 차감할 수 있습니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AdditionalServiceDeductionManagement />
              </CardContent>
            </Card>

            {/* Settlement Unit Price Dialog */}
            <Dialog open={settlementPriceDialogOpen} onOpenChange={setSettlementPriceDialogOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {selectedServicePlan ? `${selectedServicePlan.planName} 정산단가 ${settlementPrices?.find(p => p.servicePlanId === selectedServicePlan.id) ? '수정' : '설정'}` : '정산단가 설정'}
                  </DialogTitle>
                  <DialogDescription>
                    정산단가를 설정하면 해당 요금제의 정산금액이 자동으로 계산됩니다.
                    {settlementPrices?.find(p => p.servicePlanId === selectedServicePlan?.id) && (
                      <span className="block mt-2 text-orange-600 font-medium">
                        ※ 단가 변경 시 기존 정산건은 기존 금액이 유지되고, 신규 정산건부터 새 단가가 적용됩니다.
                      </span>
                    )}
                  </DialogDescription>
                </DialogHeader>
                <Form {...settlementPriceForm}>
                  <form onSubmit={settlementPriceForm.handleSubmit(
                    (data) => {
                      console.log('Form validation passed, calling onSubmitSettlementPrice');
                      onSubmitSettlementPrice(data);
                    },
                    (errors) => {
                      console.log('Form validation errors:', errors);
                    }
                  )} className="space-y-4">
                    <FormField
                      control={settlementPriceForm.control}
                      name="servicePlanId"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              type="hidden"
                              {...field}
                              value={selectedServicePlan?.id || 0}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={settlementPriceForm.control}
                      name="newCustomerPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>신규 정산단가 (원)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="신규 정산단가를 입력하세요"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormDescription>
                            신규 고객 정산 시 적용될 단위 금액을 입력하세요.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={settlementPriceForm.control}
                      name="portInPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>번호이동 정산단가 (원)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="번호이동 정산단가를 입력하세요"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormDescription>
                            번호이동 고객 정산 시 적용될 단위 금액을 입력하세요.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={settlementPriceForm.control}
                      name="memo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>메모</FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              placeholder="몇차 단가인지 등 메모를 입력하세요 (선택사항)"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            정산단가 변경 이력을 관리하기 위한 메모입니다.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => setSettlementPriceDialogOpen(false)}>
                        취소
                      </Button>
                      <Button type="submit" disabled={createSettlementPriceMutation.isPending || updateSettlementPriceMutation.isPending}>
                        {createSettlementPriceMutation.isPending || updateSettlementPriceMutation.isPending ? '처리 중...' : '저장'}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>

        {/* Worker Details Dialog */}
        <Dialog open={workerDetailsOpen} onOpenChange={setWorkerDetailsOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{selectedWorker?.name} 통신사별 개통 현황</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {workerCarrierDetails.length > 0 ? (
                workerCarrierDetails.map((detail, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="font-medium">{detail.carrier}</span>
                    <Badge variant="secondary">{detail.count}건</Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500">
                  개통 내역이 없습니다.
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Carrier Details Dialog */}
        <Dialog open={carrierDetailsOpen} onOpenChange={setCarrierDetailsOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{selectedCarrier} 판매점별 개통 현황</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {carrierDealerDetails.length > 0 ? (
                carrierDealerDetails.map((detail, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="font-medium">{detail.dealerName}</span>
                    <Badge variant="secondary">{detail.count}건</Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500">
                  개통 내역이 없습니다.
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}

// Additional Service Deduction Management Component
function AdditionalServiceDeductionManagement() {
  const [deductionDialogOpen, setDeductionDialogOpen] = useState(false);
  const [editingDeduction, setEditingDeduction] = useState<AdditionalServiceDeduction | null>(null);
  const apiRequest = useApiRequest();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Additional service deductions query
  const { data: deductions = [], isLoading: deductionsLoading } = useQuery({
    queryKey: ['/api/additional-service-deductions'],
    queryFn: () => apiRequest('/api/additional-service-deductions')
  });

  // Additional services query for dropdown
  const { data: additionalServices = [] } = useQuery({
    queryKey: ['/api/additional-services'],
    queryFn: () => apiRequest('/api/additional-services')
  });

  // Create deduction form
  const deductionForm = useForm<CreateAdditionalServiceDeductionForm>({
    resolver: zodResolver(createAdditionalServiceDeductionSchema),
    defaultValues: {
      additionalServiceId: 0,
      deductionAmount: 0,
      effectiveFrom: new Date()
    }
  });

  // Create mutation
  const createDeductionMutation = useMutation({
    mutationFn: (data: CreateAdditionalServiceDeductionForm) => 
      apiRequest('/api/additional-service-deductions', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/additional-service-deductions'] });
      setDeductionDialogOpen(false);
      deductionForm.reset();
      toast({
        title: '성공',
        description: '부가서비스 차감 정책이 성공적으로 생성되었습니다.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: '오류',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update mutation
  const updateDeductionMutation = useMutation({
    mutationFn: ({ additionalServiceId, data }: { additionalServiceId: number; data: UpdateAdditionalServiceDeductionForm }) => 
      apiRequest(`/api/additional-service-deductions/${additionalServiceId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/additional-service-deductions'] });
      setDeductionDialogOpen(false);
      setEditingDeduction(null);
      deductionForm.reset();
      toast({
        title: '성공',
        description: '부가서비스 차감 정책이 성공적으로 수정되었습니다.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: '오류',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete mutation
  const deleteDeductionMutation = useMutation({
    mutationFn: (additionalServiceId: number) => 
      apiRequest(`/api/additional-service-deductions/${additionalServiceId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/additional-service-deductions'] });
      toast({
        title: '성공',
        description: '부가서비스 차감 정책이 성공적으로 삭제되었습니다.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: '오류',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleCreateDeduction = (data: CreateAdditionalServiceDeductionForm) => {
    createDeductionMutation.mutate(data);
  };

  const handleUpdateDeduction = (data: UpdateAdditionalServiceDeductionForm) => {
    if (editingDeduction) {
      updateDeductionMutation.mutate({ 
        additionalServiceId: editingDeduction.additionalServiceId, 
        data 
      });
    }
  };

  const openEditDialog = (deduction: AdditionalServiceDeduction) => {
    setEditingDeduction(deduction);
    deductionForm.reset({
      additionalServiceId: deduction.additionalServiceId,
      deductionAmount: deduction.deductionAmount,
      effectiveFrom: new Date(deduction.effectiveFrom)
    });
    setDeductionDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingDeduction(null);
    deductionForm.reset({
      additionalServiceId: 0,
      deductionAmount: 0,
      effectiveFrom: new Date()
    });
    setDeductionDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">부가서비스 차감 정책</h3>
          <p className="text-sm text-gray-500">부가서비스별로 정산 시 차감할 금액을 설정합니다.</p>
        </div>
        <Dialog open={deductionDialogOpen} onOpenChange={setDeductionDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              차감 정책 추가
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingDeduction ? '차감 정책 수정' : '새 차감 정책 추가'}
              </DialogTitle>
              <DialogDescription>
                부가서비스별로 정산 시 차감할 금액을 설정할 수 있습니다.
              </DialogDescription>
            </DialogHeader>
            <Form {...deductionForm}>
              <form 
                onSubmit={deductionForm.handleSubmit(editingDeduction ? handleUpdateDeduction : handleCreateDeduction)} 
                className="space-y-4"
              >
                <FormField
                  control={deductionForm.control}
                  name="additionalServiceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>부가서비스</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))} 
                        value={field.value.toString()}
                        disabled={!!editingDeduction}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="부가서비스를 선택하세요" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {additionalServices.map((service: AdditionalService) => (
                            <SelectItem key={service.id} value={service.id.toString()}>
                              {service.serviceName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={deductionForm.control}
                  name="deductionAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>차감 금액 (원)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="차감할 금액을 입력하세요" 
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        해당 부가서비스가 포함된 정산 건에서 자동으로 차감될 금액입니다.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={deductionForm.control}
                  name="effectiveFrom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>적용 시작일</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : field.value}
                          onChange={(e) => field.onChange(new Date(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        해당 날짜부터 차감 정책이 적용됩니다.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setDeductionDialogOpen(false)}>
                    취소
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createDeductionMutation.isPending || updateDeductionMutation.isPending}
                  >
                    {createDeductionMutation.isPending || updateDeductionMutation.isPending 
                      ? '처리 중...' 
                      : editingDeduction ? '수정' : '추가'
                    }
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {deductionsLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : deductions.length > 0 ? (
        <div className="space-y-4">
          {deductions.map((deduction: AdditionalServiceDeduction) => (
            <Card key={deduction.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h4 className="font-medium">{deduction.additionalServiceName}</h4>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>차감금액: {deduction.deductionAmount.toLocaleString()}원</span>
                      <span>시작일: {format(deduction.effectiveFrom, 'yyyy-MM-dd')}</span>
                      <Badge variant={deduction.isActive ? 'default' : 'secondary'}>
                        {deduction.isActive ? '활성' : '비활성'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => openEditDialog(deduction)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        if (confirm('정말로 이 차감 정책을 삭제하시겠습니까?')) {
                          deleteDeductionMutation.mutate(deduction.additionalServiceId);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">차감 정책이 없습니다</h3>
          <p className="mt-1 text-sm text-gray-500">첫 번째 차감 정책을 추가해보세요.</p>
        </div>
      )}
    </div>
  );
}
