import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useApiRequest, useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { createDealerSchema, createUserSchema, createAdminSchema, createWorkerSchema, updateDocumentStatusSchema, createServicePlanSchema, createAdditionalServiceSchema, createCarrierSchema, updateCarrierSchema } from '../../../shared/schema';
import type { Dealer, User, Document, ServicePlan, AdditionalService, Carrier, ContactCode } from '../../../shared/schema';
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
  Trash2
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
  email: string;
  password: string;
  name: string;
  role: 'dealer_store' | 'dealer_worker';
};

type CreateAdminForm = {
  email: string;
  password: string;
  name: string;
};

type CreateWorkerForm = {
  email: string;
  password: string;
  name: string;
};

type UpdateDocumentStatusForm = {
  status: '접수' | '보완필요' | '완료';
  activationStatus?: '대기' | '개통' | '취소';
  notes?: string;
};

type ContactCode = {
  carrierId: string;
  carrierName: string;
  contactCode: string;
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
  const apiRequest = useApiRequest();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // 통신사 목록 조회
  const { data: carriers = [], isLoading: carriersLoading } = useQuery({
    queryKey: ['/api/carriers'],
    queryFn: () => apiRequest('/api/carriers')
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
        requireBundleCarrier: editingCarrier.requireBundleCarrier || false
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
      requireBundleCarrier: false
    };
  };

  const carrierForm = useForm({
    resolver: zodResolver(createCarrierSchema),
    mode: 'onChange',
    defaultValues: getDefaultValues(),
    key: formKey // 폼 재초기화를 위한 key
  });

  // 통신사 생성
  const createCarrierMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/carriers', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/carriers'] });
      await queryClient.refetchQueries({ queryKey: ['/api/carriers'] });
      
      setCarrierDialogOpen(false);
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
      // 모든 관련 쿼리 무효화
      await queryClient.invalidateQueries({ queryKey: ['/api/carriers'] });
      await queryClient.refetchQueries({ queryKey: ['/api/carriers'] });
      
      setCarrierDialogOpen(false);
      setEditingCarrier(null);
      carrierForm.reset();
      toast({
        title: "통신사 수정",
        description: "통신사가 성공적으로 수정되었습니다."
      });
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
      await queryClient.invalidateQueries({ queryKey: ['/api/carriers'] });
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
    setFormKey(prev => prev + 1); // 폼 컴포넌트 재렌더링 강제
    setCarrierDialogOpen(true);
  };

  const handleAddCarrier = () => {
    setEditingCarrier(null);
    setFormKey(prev => prev + 1); // 폼 컴포넌트 재렌더링 강제
    setCarrierDialogOpen(true);
  };

  const handleDeleteCarrier = (id: number) => {
    if (confirm('정말로 이 통신사를 삭제하시겠습니까?')) {
      deleteCarrierMutation.mutate(id);
    }
  };

  const handleToggleCarrierStatus = (carrier: Carrier) => {
    updateCarrierMutation.mutate({
      id: carrier.id,
      data: {
        ...carrier,
        isActive: !carrier.isActive
      }
    });
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
                  .sort((a: Carrier, b: Carrier) => a.displayOrder - b.displayOrder)
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
      const defaultCodes = CARRIERS.map(carrier => ({
        carrierId: carrier.id,
        carrierName: carrier.name,
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
        code.carrierId === carrierId 
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
        {(isEditing ? tempContactCodes : contactCodes).map((code) => (
          <div key={code.carrierId} className="space-y-2">
            <Label className="text-sm font-medium">{code.carrierName}</Label>
            {isEditing ? (
              <Input
                value={code.contactCode}
                onChange={(e) => updateContactCode(code.carrierId, e.target.value)}
                placeholder="접점 코드 입력"
                className="text-sm"
              />
            ) : (
              <div className="p-2 bg-gray-50 rounded text-sm min-h-[36px] flex items-center">
                {code.contactCode || '미설정'}
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
  const [pricingDialogOpen, setPricingDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [servicePlanDialogOpen, setServicePlanDialogOpen] = useState(false);
  const [editServicePlanDialogOpen, setEditServicePlanDialogOpen] = useState(false);
  const [editingServicePlan, setEditingServicePlan] = useState<ServicePlan | null>(null);
  const [additionalServiceDialogOpen, setAdditionalServiceDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [selectedDealerForContactCodes, setSelectedDealerForContactCodes] = useState<Dealer | null>(null);
  const [contactCodeDialogOpen, setContactCodeDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [pricingTitle, setPricingTitle] = useState('');
  const [templateTitle, setTemplateTitle] = useState('');
  const [templateCategory, setTemplateCategory] = useState<'가입서류' | '변경서류'>('가입서류');
  
  // 접점코드 관리 상태
  const [newContactCode, setNewContactCode] = useState('');
  const [newDealerName, setNewDealerName] = useState('');
  const [newCarrier, setNewCarrier] = useState('');
  const contactCodeExcelInputRef = useRef<HTMLInputElement>(null);
  
  // Analytics dialog states
  const [workerDetailsOpen, setWorkerDetailsOpen] = useState(false);
  const [carrierDetailsOpen, setCarrierDetailsOpen] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<{ id: number; name: string } | null>(null);
  const [selectedCarrier, setSelectedCarrier] = useState<string>('');
  const [workerCarrierDetails, setWorkerCarrierDetails] = useState<Array<{ carrier: string; count: number }>>([]);
  const [carrierDealerDetails, setCarrierDealerDetails] = useState<Array<{ dealerName: string; count: number }>>([]);
  
  // 요금제 이미지 업로드 관련
  const [servicePlanImageForm, setServicePlanImageForm] = useState({
    carrier: '',
    file: null as File | null
  });
  
  // 엑셀 다운로드 관련
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  
  // 엑셀 업로드 관련 상태
  const excelFileInputRef = useRef<HTMLInputElement>(null);

  // Queries
  const { data: dealers, isLoading: dealersLoading } = useQuery({
    queryKey: ['/api/admin/dealers'],
    queryFn: () => apiRequest('/api/admin/dealers') as Promise<Dealer[]>,
  });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['/api/admin/users'],
    queryFn: () => apiRequest('/api/admin/users') as Promise<Array<User & { dealerName: string }>>,
  });

  const { data: documents, isLoading: documentsLoading } = useQuery({
    queryKey: ['/api/admin/documents'],
    queryFn: () => apiRequest('/api/admin/documents') as Promise<Array<Document & { dealerName: string; userName: string }>>,
  });

  const { data: pricingTables } = useQuery({
    queryKey: ['/api/pricing-tables'],
    queryFn: () => apiRequest('/api/pricing-tables') as Promise<PricingTable[]>,
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
      email: '',
      password: '',
      name: '',
      role: 'dealer_store',
    },
  });

  const adminForm = useForm<CreateAdminForm>({
    resolver: zodResolver(createAdminSchema),
    defaultValues: {
      email: '',
      password: '',
      name: '',
    },
  });

  const workerForm = useForm<CreateWorkerForm>({
    resolver: zodResolver(createWorkerSchema),
    defaultValues: {
      email: '',
      password: '',
      name: '',
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
    createUserMutation.mutate(data);
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

  const handleDeleteUser = async (userId: number) => {
    if (confirm('정말로 이 사용자를 삭제하시겠습니까?')) {
      deleteUserMutation.mutate(userId);
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
      toast({
        title: "업로드 완료",
        description: data.message || "접점코드가 성공적으로 업로드되었습니다.",
      });
      // 파일 입력 초기화
      if (contactCodeExcelInputRef.current) {
        contactCodeExcelInputRef.current.value = '';
      }
    },
    onError: (error: any) => {
      toast({
        title: "업로드 실패",
        description: error.message || "접점코드 업로드에 실패했습니다.",
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

  const servicePlanImageMutation = useMutation({
    mutationFn: async (data: { carrier: string; file: File }) => {
      const formData = new FormData();
      formData.append('carrier', data.carrier);
      formData.append('image', data.file);
      
      const response = await fetch('/api/service-plans/upload-image', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: '이미지 분석에 실패했습니다.' }));
        throw new Error(error.error || '이미지 분석에 실패했습니다.');
      }
      
      return response.json();
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
    mutationFn: (data: { code: string; dealerName: string; carrier: string }) => 
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
    
    if (!newContactCode || !newDealerName || !newCarrier) {
      toast({
        title: '오류',
        description: '모든 필드를 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }

    createContactCodeMutation.mutate({
      code: newContactCode,
      dealerName: newDealerName,
      carrier: newCarrier,
    });
  };

  const handleDeleteContactCode = (id: number) => {
    if (confirm('정말로 이 접점코드를 삭제하시겠습니까?')) {
      deleteContactCodeMutation.mutate(id);
    }
  };



  const handleContactCodeExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      contactCodeExcelUploadMutation.mutate(file);
    }
  };

  const handleDownloadTemplate = () => {
    // 접점코드 엑셀 템플릿 생성
    const templateData = [
      {
        '접점코드': 'LDI672346',
        '판매점명': '샘플판매점',
        '통신사': 'LG미디어로그'
      },
      {
        '접점코드': 'SKT123456',
        '판매점명': '테스트판매점',
        '통신사': 'SK텔링크'
      }
    ];

    // CSV 형태로 다운로드
    const csvContent = '\uFEFF' + // BOM for Excel UTF-8 recognition
      '접점코드,판매점명,통신사\n' +
      'LDI672346,샘플판매점,LG미디어로그\n' +
      'SKT123456,테스트판매점,SK텔링크\n';

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

  const handleUploadPricing = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      toast({
        title: '오류',
        description: '파일을 선택해주세요.',
        variant: 'destructive',
      });
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('title', pricingTitle || selectedFile.name);

    uploadPricingMutation.mutate(formData);
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
              <span>단가표</span>
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
                <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">엑셀 업로드 사용법</h4>
                  <div className="text-sm text-blue-700 dark:text-blue-300">
                    <p className="mb-2">1. 위의 "양식 다운로드" 버튼을 클릭하여 템플릿을 다운로드하세요.</p>
                    <p className="mb-2">2. 다운로드한 파일에 접점코드 데이터를 입력하세요:</p>
                    <ul className="list-disc list-inside ml-4 mb-2">
                      <li><strong>접점코드</strong>: 개통방명 시 사용할 코드</li>
                      <li><strong>판매점명</strong>: 자동으로 설정될 판매점 이름</li>
                      <li><strong>통신사</strong>: 해당 통신사명</li>
                    </ul>
                    <p>3. 작성이 완료되면 "엑셀 업로드" 버튼을 클릭하여 파일을 업로드하세요.</p>
                  </div>
                </div>
                
                {contactCodesLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto"></div>
                    <p className="mt-2 text-sm text-gray-500">접점코드 로딩 중...</p>
                  </div>
                ) : contactCodes && contactCodes.length > 0 ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {contactCodes.map((code) => (
                        <div key={code.id} className="border rounded-lg p-4 bg-white">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h4 className="font-medium text-gray-900">{code.code}</h4>
                              <p className="text-sm text-gray-500">{code.dealerName}</p>
                            </div>
                            <Badge variant="outline">{code.carrier}</Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              code.isActive 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {code.isActive ? '활성' : '비활성'}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteContactCode(code.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
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
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>이메일</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="이메일을 입력하세요" {...field} />
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
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="dealer_store">판매점 (읽기 전용)</SelectItem>
                                  <SelectItem value="dealer_worker">근무자 (개통상태 관리)</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
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
                ) : users && users.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-300">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            이름
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            이메일
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            대리점
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            역할
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
                              {user.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {user.email}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {user.dealerName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <Badge variant="secondary">
                                {user.role === 'dealer_store' ? '판매점' : '근무자'}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {format(new Date(user.createdAt), 'yyyy-MM-dd', { locale: ko })}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteUser(user.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
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
                                  onClick={() => handleWorkerClick({ id: worker.workerId, name: worker.workerName })}
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
                              name="email"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>이메일</FormLabel>
                                  <FormControl>
                                    <Input type="email" placeholder="이메일을 입력하세요" {...field} />
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
                              name="email"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>이메일</FormLabel>
                                  <FormControl>
                                    <Input type="email" placeholder="이메일을 입력하세요" {...field} />
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
                            대리점
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
                        <div key={`${stat.storeName}-${stat.dealerId}`} className="border rounded-lg p-4 bg-white">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center font-medium">
                                {stat.storeName?.charAt(0) || 'S'}
                              </div>
                              <div>
                                <h4 className="font-medium text-gray-900">{stat.storeName || '판매점 정보 없음'}</h4>
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

          {/* Pricing Tab */}
          <TabsContent value="pricing">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>단가표 관리</CardTitle>
                <Dialog open={pricingDialogOpen} onOpenChange={setPricingDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Upload className="mr-2 h-4 w-4" />
                      단가표 업로드
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>새 단가표 업로드</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleUploadPricing} className="space-y-4">
                      <div>
                        <Label htmlFor="pricingTitle">제목</Label>
                        <Input
                          id="pricingTitle"
                          value={pricingTitle}
                          onChange={(e) => setPricingTitle(e.target.value)}
                          placeholder="단가표 제목을 입력하세요"
                        />
                      </div>
                      <div>
                        <Label htmlFor="pricingFile">파일</Label>
                        <Input
                          id="pricingFile"
                          type="file"
                          accept=".xlsx,.xls,.pdf,.jpg,.jpeg"
                          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                          required
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Excel 파일(.xlsx, .xls), PDF, JPG, JPEG 파일 업로드 가능 (최대 50MB)
                        </p>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={() => setPricingDialogOpen(false)}>
                          취소
                        </Button>
                        <Button type="submit" disabled={uploadPricingMutation.isPending}>
                          {uploadPricingMutation.isPending ? '업로드 중...' : '업로드'}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {pricingTables && pricingTables.length > 0 ? (
                  <div className="space-y-4">
                    {pricingTables.map((table) => (
                      <div key={table.id} className={`border rounded-lg p-4 ${table.isActive ? 'ring-2 ring-accent' : ''}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              table.isActive ? 'bg-accent text-white' : 'bg-gray-100 text-gray-400'
                            }`}>
                              <Calculator className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <h4 className="font-medium text-gray-900">{table.title}</h4>
                                {table.isActive && (
                                  <Badge className="bg-accent text-white">활성</Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-500">
                                {format(new Date(table.uploadedAt), 'yyyy-MM-dd HH:mm', { locale: ko })}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            onClick={() => handlePricingDownload(table.id, table.fileName)}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            다운로드
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calculator className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">단가표가 없습니다</h3>
                    <p className="mt-1 text-sm text-gray-500">첫 번째 단가표를 업로드해보세요.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Service Plans Tab */}
          <TabsContent value="service-plans">
            <div className="space-y-6">
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
                  {servicePlansLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                      <p className="mt-2 text-sm text-gray-500">요금제를 불러오는 중...</p>
                    </div>
                  ) : servicePlans && servicePlans.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              요금제명
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              통신사
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
                          {servicePlans.map((plan) => (
                            <tr key={plan.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {plan.planName}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {plan.carrier}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {plan.planType}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {plan.dataAllowance}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {plan.monthlyFee.toLocaleString()}원
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
                  ) : (
                    <div className="text-center py-8">
                      <Settings className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">요금제가 없습니다</h3>
                      <p className="mt-1 text-sm text-gray-500">첫 번째 요금제를 추가해보세요.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 요금제 이미지 업로드 카드 */}
              <Card>
                <CardHeader>
                  <CardTitle>요금제 이미지 업로드</CardTitle>
                  <CardDescription>
                    이미지에서 요금제 정보를 읽어서 자동으로 추가합니다.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleServicePlanImageSubmit} className="space-y-4">
                    <div>
                      <Label>통신사</Label>
                      <Select value={servicePlanImageForm.carrier} onValueChange={(value) => setServicePlanImageForm(prev => ({ ...prev, carrier: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="통신사를 선택하세요" />
                        </SelectTrigger>
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
                    </div>
                    <div>
                      <Label>이미지 파일</Label>
                      <Input
                        type="file"
                        onChange={(e) => setServicePlanImageForm(prev => ({ ...prev, file: e.target.files?.[0] || null }))}
                        accept=".jpg,.jpeg,.png,.gif,.bmp,.tiff,.webp"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        이미지에서 요금제 정보를 읽어 자동으로 추가됩니다
                      </p>
                    </div>
                    <Button type="submit" disabled={servicePlanImageMutation.isPending}>
                      {servicePlanImageMutation.isPending ? '분석 중...' : '요금제 추가'}
                    </Button>
                  </form>
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
