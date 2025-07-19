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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { createDealerSchema, createUserSchema, createAdminSchema, createWorkerSchema, updateDocumentStatusSchema, createServicePlanSchema, createAdditionalServiceSchema } from '../../../shared/schema';
import type { Dealer, User, Document, PricingTable, ServicePlan, AdditionalService } from '../../../shared/schema';
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
  const [additionalServiceDialogOpen, setAdditionalServiceDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [selectedDealerForContactCodes, setSelectedDealerForContactCodes] = useState<Dealer | null>(null);
  const [contactCodeDialogOpen, setContactCodeDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [pricingTitle, setPricingTitle] = useState('');
  const [templateTitle, setTemplateTitle] = useState('');
  const [templateCategory, setTemplateCategory] = useState<'가입서류' | '변경서류'>('가입서류');
  
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

  const handleCreateServicePlan = (data: any) => {
    createServicePlanMutation.mutate(data);
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
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="contact-codes" className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>접점코드</span>
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
                  <CardTitle>접점 코드 관리</CardTitle>
                  <CardDescription>
                    대리점별 통신사 접점 코드를 설정하여 자동으로 서류에 할당되도록 관리합니다.
                  </CardDescription>
                </div>
                <div className="space-x-2">
                  <input
                    ref={excelFileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleExcelUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => excelFileInputRef.current?.click()}
                    disabled={excelUploadMutation.isPending}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {excelUploadMutation.isPending ? '업로드 중...' : '엑셀 업로드'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {dealers && dealers.length > 0 ? (
                  <div className="grid gap-4">
                    {dealers.map((dealer) => (
                      <ContactCodeManagement key={dealer.id} dealer={dealer} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Settings className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">대리점이 없습니다</h3>
                    <p className="mt-1 text-sm text-gray-500">먼저 대리점을 추가해주세요.</p>
                  </div>
                )}
              </CardContent>
            </Card>
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
                                {worker.workerName}
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
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {format(new Date(doc.uploadedAt), 'yyyy-MM-dd HH:mm', { locale: ko })}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              {doc.filePath && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(`/api/files/documents/${doc.id}`, '_blank')}
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
                                {stat.storeName.charAt(0)}
                              </div>
                              <div>
                                <h4 className="font-medium text-gray-900">{stat.storeName}</h4>
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
                                  onClick={() => window.open(`/api/document-templates/${template.id}/download`, '_blank')}
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
                            onClick={() => window.open(`/api/files/pricing/${table.id}`, '_blank')}
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
                                    <SelectItem value="SK텔레콤">SK텔레콤</SelectItem>
                                    <SelectItem value="KT">KT</SelectItem>
                                    <SelectItem value="LG U+">LG U+</SelectItem>
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
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteServicePlan(plan.id)}
                                >
                                  삭제
                                </Button>
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
                          <SelectItem value="선불">선불</SelectItem>
                          <SelectItem value="KT">KT</SelectItem>
                          <SelectItem value="SK텔레콤">SK텔레콤</SelectItem>
                          <SelectItem value="미래엔">미래엔</SelectItem>
                          <SelectItem value="엠모바일">엠모바일</SelectItem>
                          <SelectItem value="중외할부통신">중외할부통신</SelectItem>
                          <SelectItem value="텔레콤">텔레콤</SelectItem>
                          <SelectItem value="헬로모바일">헬로모바일</SelectItem>
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
      </div>
    </Layout>
  );
}
