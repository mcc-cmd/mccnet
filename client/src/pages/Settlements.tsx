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
  DialogTrigger,
  DialogDescription
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useApiRequest, useAuth } from '@/lib/auth';
import { apiRequest } from '@/lib/queryClient';
import { Users, Clock, CheckCircle, Download, FileText, Calendar, Plus, Search, Calculator, Settings, Trash2, Edit } from 'lucide-react';

interface CompletedDocument {
  id: number;
  documentNumber: string;
  customerName: string;
  customerPhone: string;
  storeName: string;
  carrier: string;
  previousCarrier?: string;
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

// 통신사별 부가서비스 정책 타입
interface CarrierServicePolicy {
  id: number;
  carrier: string;
  policyName: string;
  policyType: 'deduction' | 'addition';
  serviceCategory: string;
  amount: number;
  description?: string;
  isActive: boolean;
  effectiveFrom: string;
  effectiveUntil?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: number;
}

// 서비스 카테고리 상수
const SERVICE_CATEGORIES = {
  internet: '인터넷',
  tv: 'TV',
  security: '보안',
  mobile: '모바일',
  bundle: '결합상품',
  other: '기타',
};

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

// 통신사별 부가서비스 정책 등록 스키마
const servicePolicySchema = z.object({
  carrier: z.string().min(1, '통신사를 선택해주세요'),
  policyName: z.string().min(1, '정책명을 입력해주세요'),
  policyType: z.enum(['deduction', 'addition'], { 
    errorMap: () => ({ message: '정책 유형을 선택해주세요' }) 
  }),
  serviceCategory: z.enum(['internet', 'tv', 'security', 'mobile', 'bundle', 'other'], {
    errorMap: () => ({ message: '서비스 카테고리를 선택해주세요' })
  }),
  amount: z.number().min(0, '금액은 0 이상이어야 합니다'),
  description: z.string().optional(),
});

type ServicePolicyForm = z.infer<typeof servicePolicySchema>;

export function Settlements() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const apiRequestHook = useApiRequest();
  
  // 당월 시작일과 종료일 계산
  const getCurrentMonthDates = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0);
    return {
      start: startOfMonth.toISOString().split('T')[0],
      end: endOfMonth.toISOString().split('T')[0]
    };
  };

  const currentMonthDates = getCurrentMonthDates();
  const [startDate, setStartDate] = useState(currentMonthDates.start);
  const [endDate, setEndDate] = useState(currentMonthDates.end);
  const [searchQuery, setSearchQuery] = useState('');
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [policyDialogOpen, setPolicyDialogOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<CarrierServicePolicy | null>(null);
  const [activeTab, setActiveTab] = useState('settlements');
  const [editAmountDialogOpen, setEditAmountDialogOpen] = useState(false);
  const [selectedDocumentForEdit, setSelectedDocumentForEdit] = useState<CompletedDocument | null>(null);
  const [editAmount, setEditAmount] = useState('');


  // 관리자 권한 확인
  if (user?.userType !== 'admin') {
    return (
      <Layout title="정산 관리">
        <div className="container mx-auto p-6">
          <div className="text-center py-20">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              접근 권한이 없습니다
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              정산 관리는 관리자만 접근할 수 있습니다.
            </p>
          </div>
        </div>
      </Layout>
    );
  }
  
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

  // 통신사별 부가서비스 정책 조회
  const { data: carrierPolicies, refetch: refetchPolicies } = useQuery({
    queryKey: ['/api/carrier-service-policies'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/carrier-service-policies');
      return response.json();
    },
  });

  // 통신사 목록 조회
  const { data: carriers } = useQuery({
    queryKey: ['/api/carriers'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/carriers');
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

  // 통신사별 부가서비스 정책 폼
  const policyForm = useForm<ServicePolicyForm>({
    resolver: zodResolver(servicePolicySchema),
    defaultValues: {
      carrier: '',
      policyName: '',
      policyType: 'deduction',
      serviceCategory: 'internet',
      amount: 0,
      description: '',
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

  // 통신사별 부가서비스 정책 생성 mutation
  const createPolicyMutation = useMutation({
    mutationFn: async (data: ServicePolicyForm) => {
      const response = await apiRequest('POST', '/api/carrier-service-policies', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "정책 등록 완료",
        description: "부가서비스 정책이 성공적으로 등록되었습니다.",
      });
      setPolicyDialogOpen(false);
      policyForm.reset();
      refetchPolicies();
    },
    onError: (error: any) => {
      toast({
        title: "등록 실패", 
        description: error.message || "정책 등록 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // 통신사별 부가서비스 정책 수정 mutation
  const updatePolicyMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ServicePolicyForm }) => {
      const response = await apiRequest('PUT', `/api/carrier-service-policies/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "정책 수정 완료",
        description: "부가서비스 정책이 성공적으로 수정되었습니다.",
      });
      setPolicyDialogOpen(false);
      setEditingPolicy(null);
      policyForm.reset();
      refetchPolicies();
    },
    onError: (error: any) => {
      toast({
        title: "수정 실패",
        description: error.message || "정책 수정 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // 통신사별 부가서비스 정책 삭제 mutation
  const deletePolicyMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/carrier-service-policies/${id}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "정책 삭제 완료",
        description: "부가서비스 정책이 성공적으로 삭제되었습니다.",
      });
      refetchPolicies();
    },
    onError: (error: any) => {
      toast({
        title: "삭제 실패",
        description: error.message || "정책 삭제 중 오류가 발생했습니다.",
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

  // 정산단가 조회
  const { data: settlementPrices } = useQuery({
    queryKey: ['/api/settlement-unit-prices'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/settlement-unit-prices');
      return response.json();
    },
  });

  // 부가서비스 차감 정책 조회
  const { data: deductionPolicies } = useQuery({
    queryKey: ['/api/additional-service-deductions'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/additional-service-deductions');
      return response.json();
    },
  });

  // 정산 금액 계산 함수
  const calculateSettlementAmount = (doc: CompletedDocument, settlementPrices: any[], deductionPolicies?: any[]) => {
    if (!doc.servicePlanId) return 0;
    
    // 1. 우선적으로 저장된 정산단가 사용 (개통 완료 시점에 저장된 단가)
    if ((doc as any).settlementNewCustomerPrice !== undefined && (doc as any).settlementPortInPrice !== undefined) {
      let baseAmount = 0;
      if (doc.previousCarrier && doc.previousCarrier !== doc.carrier) {
        baseAmount = (doc as any).settlementPortInPrice || 0;
      } else {
        baseAmount = (doc as any).settlementNewCustomerPrice || 0;
      }
      
      // 부가서비스 차감 적용
      let totalDeduction = 0;
      if (doc.additionalServiceIds && doc.additionalServiceIds !== '[]' && deductionPolicies) {
        try {
          const additionalServiceIds = JSON.parse(doc.additionalServiceIds || '[]');
          if (Array.isArray(additionalServiceIds) && additionalServiceIds.length > 0) {
            additionalServiceIds.forEach(serviceId => {
              const deduction = deductionPolicies.find(d => 
                d.additionalServiceId === parseInt(serviceId) && d.isActive
              );
              if (deduction) {
                totalDeduction += deduction.deductionAmount;
              }
            });
          }
        } catch (error) {
          console.warn('Error parsing additional service IDs for document:', doc.id, error);
        }
      }
      
      return Math.max(0, baseAmount - totalDeduction);
    }
    
    // 2. 저장된 단가가 없는 경우 기존 로직 사용 (이전 버전 호환성)
    if (!settlementPrices || !doc.activatedAt) return 0;
    
    // 개통일시 기준으로 해당 시점에 유효한 정산단가 찾기
    const activatedDate = new Date(doc.activatedAt);
    const applicablePrices = settlementPrices.filter(p => 
      p.servicePlanId === doc.servicePlanId && 
      new Date(p.effectiveFrom) <= activatedDate &&
      (!p.effectiveUntil || new Date(p.effectiveUntil) > activatedDate)
    );
    
    // 가장 최근 유효한 단가 선택 (effective_from 기준 내림차순)
    const price = applicablePrices.sort((a, b) => 
      new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime()
    )[0];
    
    if (!price) {
      // Fallback: 가장 최근 단가 사용
      const fallbackPrice = settlementPrices
        .filter(p => p.servicePlanId === doc.servicePlanId)
        .sort((a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime())[0];
      
      if (!fallbackPrice) return 0;
      
      let baseAmount = 0;
      const customerType = (doc as any).customerType;
      if (customerType === 'port-in' || (!customerType && doc.previousCarrier && doc.previousCarrier !== doc.carrier)) {
        baseAmount = fallbackPrice.portInPrice || 0;
      } else {
        baseAmount = fallbackPrice.newCustomerPrice || 0;
      }
      
      // 부가서비스 차감 적용
      let totalDeduction = 0;
      if (doc.additionalServiceIds && doc.additionalServiceIds !== '[]' && deductionPolicies) {
        try {
          const additionalServiceIds = JSON.parse(doc.additionalServiceIds || '[]');
          if (Array.isArray(additionalServiceIds) && additionalServiceIds.length > 0) {
            additionalServiceIds.forEach(serviceId => {
              const deduction = deductionPolicies.find(d => 
                d.additionalServiceId === parseInt(serviceId) && d.isActive
              );
              if (deduction) {
                totalDeduction += deduction.deductionAmount;
              }
            });
          }
        } catch (error) {
          console.warn('Error parsing additional service IDs for document:', doc.id, error);
        }
      }
      
      return Math.max(0, baseAmount - totalDeduction);
    }
    
    // customerType 필드가 있으면 우선 사용, 없으면 previousCarrier로 판단 (이전 버전 호환성)
    let baseAmount = 0;
    const customerType = (doc as any).customerType;
    if (customerType === 'port-in' || (!customerType && doc.previousCarrier && doc.previousCarrier !== doc.carrier)) {
      baseAmount = price.portInPrice || 0;
    } else {
      baseAmount = price.newCustomerPrice || 0;
    }
    
    // 부가서비스 차감 적용 - 부가서비스가 실제로 있을 때만 차감
    let totalDeduction = 0;
    if (doc.additionalServiceIds && doc.additionalServiceIds !== '[]' && deductionPolicies) {
      try {
        const additionalServiceIds = JSON.parse(doc.additionalServiceIds || '[]');
        if (Array.isArray(additionalServiceIds) && additionalServiceIds.length > 0) {
          additionalServiceIds.forEach(serviceId => {
            const deduction = deductionPolicies.find(d => 
              d.additionalServiceId === parseInt(serviceId) && d.isActive
            );
            if (deduction) {
              totalDeduction += deduction.deductionAmount;
            }
          });
        }
      } catch (error) {
        console.warn('Error parsing additional service IDs for document:', doc.id, error);
      }
    }
    
    return Math.max(0, baseAmount - totalDeduction); // 음수가 되지 않도록 보장
  };

  const stats: SettlementStats = React.useMemo(() => {
    if (!completedDocuments || !Array.isArray(completedDocuments)) return { total: 0, thisMonth: 0, lastMonth: 0, totalAmount: 0 };
    
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    
    let thisMonth = 0;
    let lastMonth = 0;
    let totalAmount = 0;
    
    completedDocuments.forEach(doc => {
      // 백엔드에서 계산한 정산금액을 우선 사용
      let amount = 0;
      const backendAmount = (doc as any).calculatedSettlementAmount;
      const manualAmount = (doc as any).settlementAmount;
      
      console.log(`Document ${doc.id}: backendAmount=${backendAmount}, manualAmount=${manualAmount}, type of backendAmount: ${typeof backendAmount}`);
      
      if (backendAmount !== undefined && backendAmount !== null) {
        amount = typeof backendAmount === 'number' ? backendAmount : parseFloat(backendAmount);
        if (!isNaN(amount)) {
          console.log(`Document ${doc.id}: Using backend calculated amount ${amount}`);
        } else {
          amount = 0;
          console.log(`Document ${doc.id}: Backend amount is NaN, using 0`);
        }
      } else if (manualAmount) {
        const parsedAmount = parseFloat((doc as any).settlementAmount);
        if (!isNaN(parsedAmount)) {
          amount = parsedAmount;
          console.log(`Document ${doc.id}: Using manual amount ${amount}`);
        }
      } else if (settlementPrices && settlementPrices.length > 0) {
        amount = calculateSettlementAmount(doc, settlementPrices, deductionPolicies);
        console.log(`Document ${doc.id}: Using frontend calculated amount ${amount}`);
      }
      totalAmount += amount;
      
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
    
    console.log('Settlement stats calculation:', {
      totalDocuments: completedDocuments.length,
      totalAmount,
      thisMonth,
      lastMonth
    });
    
    return {
      total: completedDocuments.length,
      thisMonth,
      lastMonth,
      totalAmount
    };
  }, [completedDocuments, settlementPrices, deductionPolicies]);

  // 검색 실행
  const handleSearch = () => {
    refetch();
  };

  // 필터 초기화 (당월로 재설정)
  const handleClearFilters = () => {
    const currentMonthDates = getCurrentMonthDates();
    setStartDate(currentMonthDates.start);
    setEndDate(currentMonthDates.end);
    setSearchQuery('');
  };

  // 수기 정산 등록 제출
  const onSubmit = (data: ManualSettlementForm) => {
    createManualSettlement.mutate(data);
  };

  // 정산 금액 수정 핸들러
  const handleEditAmount = (doc: CompletedDocument) => {
    setSelectedDocumentForEdit(doc);
    // 현재 표시되는 정산금액 (백엔드 계산값 우선, 수동값, 프론트엔드 계산값 순)
    let currentAmount = '';
    const backendAmount = (doc as any).calculatedSettlementAmount;
    const manualAmount = (doc as any).settlementAmount;
    
    if (backendAmount !== undefined && backendAmount !== null) {
      const amount = typeof backendAmount === 'number' ? backendAmount : parseFloat(backendAmount);
      currentAmount = !isNaN(amount) ? amount.toString() : '0';
    } else if (manualAmount) {
      currentAmount = manualAmount.toString();
    } else if (settlementPrices) {
      currentAmount = calculateSettlementAmount(doc, settlementPrices, deductionPolicies).toString();
    } else {
      currentAmount = '0';
    }
    setEditAmount(currentAmount);
    setEditAmountDialogOpen(true);
  };

  // 정산 금액 업데이트 mutation
  const updateSettlementAmount = useMutation({
    mutationFn: async ({ documentId, amount }: { documentId: number; amount: number }) => {
      console.log('Updating settlement amount:', documentId, amount);
      const response = await apiRequest('PATCH', `/api/documents/${documentId}/settlement-amount`, { settlementAmount: amount });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "정산 금액 수정 완료",
        description: "정산 금액이 성공적으로 수정되었습니다.",
      });
      setEditAmountDialogOpen(false);
      setSelectedDocumentForEdit(null);
      setEditAmount('');
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
    },
    onError: (error: any) => {
      toast({
        title: "수정 실패",
        description: error.message || "정산 금액 수정 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // 정산 금액 수정 제출
  const handleUpdateAmount = () => {
    if (!selectedDocumentForEdit) return;
    
    const amount = parseFloat(editAmount);
    if (isNaN(amount) || amount < 0) {
      toast({
        title: "유효하지 않은 금액",
        description: "올바른 금액을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    updateSettlementAmount.mutate({ 
      documentId: selectedDocumentForEdit.id, 
      amount 
    });
  };



  // 엑셀 다운로드 함수
  const handleExcelDownload = async () => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      // useAuth를 통한 인증 처리
      const sessionId = useAuth.getState().sessionId;
      
      const response = await fetch(`/api/settlements/export?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${sessionId}`
        }
      });
      
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

  // 통신사별 부가서비스 정책 관련 핸들러들
  const handleCreatePolicy = () => {
    setEditingPolicy(null);
    policyForm.reset();
    setPolicyDialogOpen(true);
  };

  const handleEditPolicy = (policy: CarrierServicePolicy) => {
    setEditingPolicy(policy);
    policyForm.reset({
      carrier: policy.carrier,
      policyName: policy.policyName,
      policyType: policy.policyType,
      serviceCategory: policy.serviceCategory as 'internet' | 'tv' | 'security' | 'mobile' | 'bundle' | 'other',
      amount: policy.amount,
      description: policy.description || '',
    });
    setPolicyDialogOpen(true);
  };

  const handleDeletePolicy = (id: number) => {
    if (confirm('정말로 이 정책을 삭제하시겠습니까?')) {
      deletePolicyMutation.mutate(id);
    }
  };

  const onPolicySubmit = (data: ServicePolicyForm) => {
    if (editingPolicy) {
      updatePolicyMutation.mutate({ id: editingPolicy.id, data });
    } else {
      createPolicyMutation.mutate(data);
    }
  };

  // 부가서비스 정책 재계산
  const recalculateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/settlements/recalculate', {});
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/completed-documents'] });
      toast({
        title: "재계산 완료",
        description: `${data.updatedDocuments}건의 정산 금액이 부가서비스 정책을 반영하여 업데이트되었습니다.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "재계산 실패",
        description: error.message || "정산 재계산에 실패했습니다.",
        variant: "destructive",
      });
    }
  });

  const handleRecalculate = () => {
    if (confirm('모든 정산 데이터에 부가서비스 정책을 적용하여 재계산하시겠습니까?')) {
      recalculateMutation.mutate();
    }
  };

  return (
    <Layout title="정산 관리">
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">정산 관리</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              정산 데이터 관리 및 통신사별 부가서비스 정책을 설정합니다.
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="settlements">정산 관리</TabsTrigger>
            <TabsTrigger value="policies">부가서비스 정책</TabsTrigger>
          </TabsList>

          <TabsContent value="settlements" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">정산 데이터</h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                  개통 완료 데이터를 기반으로 정산 정보를 관리합니다.
                </p>
              </div>
              <div className="flex gap-3">
                <Button 
                  onClick={handleRecalculate}
                  disabled={recalculateMutation.isPending}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <Calculator className="w-4 h-4 mr-2" />
                  {recalculateMutation.isPending ? '재계산 중...' : '부가서비스 정책 재계산'}
                </Button>
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
                    <DialogDescription>
                      개통 완료된 고객 정보를 수기로 등록합니다.
                    </DialogDescription>
                  </DialogHeader>
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
                                    {plan.planName || `Plan ${plan.id}`}
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
            </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">총 개통건수</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-teal-600">{stats.total}</div>
              <p className="text-xs text-muted-foreground">전체 개통 완료</p>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">이번달 개통</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.thisMonth}</div>
              <p className="text-xs text-muted-foreground">이번달 개통</p>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow sm:col-span-2 lg:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">지난달 개통</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.lastMonth}</div>
              <p className="text-xs text-muted-foreground">지난달 개통</p>
            </CardContent>
          </Card>
        </div>

        {/* 정산 금액 검증 및 다운로드 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calculator className="h-5 w-5 text-teal-600" />
              <span>정산 데이터 검증 및 다운로드</span>
            </CardTitle>
            <CardDescription>
              개통날짜를 기준으로 정산 데이터를 필터링하고 정산 금액을 확인할 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* 필터링 옵션 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">필터링 옵션</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start-date">시작 날짜</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="end-date">종료 날짜</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="search-query">검색 (고객명/연락처/판매점명)</Label>
                  <Input
                    id="search-query"
                    type="text"
                    placeholder="고객명, 연락처 또는 판매점명을 입력하세요"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    onClick={handleSearch}
                    className="bg-blue-600 hover:bg-blue-700 flex-1"
                  >
                    <Search className="w-4 h-4 mr-2" />
                    검색
                  </Button>
                  <Button
                    onClick={handleClearFilters}
                    variant="outline"
                    className="flex-1"
                  >
                    필터 초기화
                  </Button>
                </div>
              </div>

              {/* 정산 금액 요약 */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">정산 금액 요약</h3>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {startDate === currentMonthDates.start && endDate === currentMonthDates.end 
                      ? `${new Date().getFullYear()}년 ${new Date().getMonth() + 1}월 (당월)`
                      : startDate && endDate 
                        ? `${startDate} ~ ${endDate}`
                        : '전체 기간'
                    }
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
                    <div className="text-sm text-blue-600 dark:text-blue-400">검색 결과 건수</div>
                    <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                      {completedDocuments?.length || 0}건
                    </div>
                  </div>
                  <div className="bg-teal-50 dark:bg-teal-900 p-4 rounded-lg">
                    <div className="text-sm text-teal-600 dark:text-teal-400">예상 정산액</div>
                    <div className="text-2xl font-bold text-teal-900 dark:text-teal-100">
                      {completedDocuments ? 
                        completedDocuments
                          .reduce((sum, doc) => {
                            // 백엔드에서 계산한 정산금액을 우선 사용
                            let amount = 0;
                            const backendAmount = (doc as any).calculatedSettlementAmount;
                            const manualAmount = (doc as any).settlementAmount;
                            
                            if (backendAmount !== undefined && backendAmount !== null) {
                              amount = typeof backendAmount === 'number' ? backendAmount : parseFloat(backendAmount);
                              if (isNaN(amount)) amount = 0;
                            } else if (manualAmount) {
                              const parsedAmount = parseFloat(manualAmount);
                              if (!isNaN(parsedAmount)) {
                                amount = parsedAmount;
                              }
                            } else if (settlementPrices && settlementPrices.length > 0) {
                              amount = calculateSettlementAmount(doc, settlementPrices, deductionPolicies);
                            }
                            return sum + amount;
                          }, 0)
                          .toLocaleString()
                        : '0'
                      }원
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">정산단가 적용 현황</div>
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span>신규 가입:</span>
                      <span className="font-mono">
                        {completedDocuments?.filter(doc => !doc.previousCarrier || doc.previousCarrier === doc.carrier).length || 0}건
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>번호이동:</span>
                      <span className="font-mono">
                        {completedDocuments?.filter(doc => doc.previousCarrier && doc.previousCarrier !== doc.carrier).length || 0}건
                      </span>
                    </div>
                    <div className="flex justify-between text-orange-600 dark:text-orange-400">
                      <span>단가 미설정:</span>
                      <span className="font-mono">
                        {completedDocuments?.filter(doc => 
                          !settlementPrices?.find((p: any) => p.servicePlanId === doc.servicePlanId && p.isActive)
                        ).length || 0}건
                      </span>
                    </div>
                  </div>
                </div>
                <Button onClick={handleExcelDownload} className="bg-teal-600 hover:bg-teal-700 w-full">
                  <Download className="w-4 h-4 mr-2" />
                  엑셀 다운로드
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 기존 필터링 및 다운로드 섹션은 위에 통합됨 */}

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
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-500">로딩 중...</p>
              </div>
            ) : completedDocuments && Array.isArray(completedDocuments) && completedDocuments.length > 0 ? (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block">
                  <div className="overflow-x-auto">
                    <Table className="min-w-full">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[80px] text-xs font-medium">개통날짜</TableHead>
                          <TableHead className="min-w-[80px] text-xs font-medium">고객명</TableHead>
                          <TableHead className="min-w-[120px] text-xs font-medium">연락처</TableHead>
                          <TableHead className="min-w-[120px] text-xs font-medium">판매점명</TableHead>
                          <TableHead className="min-w-[120px] text-xs font-medium">실판매POS</TableHead>
                          <TableHead className="min-w-[80px] text-xs font-medium">통신사</TableHead>
                          <TableHead className="min-w-[60px] text-xs font-medium">유형</TableHead>
                          <TableHead className="min-w-[140px] text-xs font-medium">요금제</TableHead>
                          <TableHead className="min-w-[80px] text-xs font-medium">부가서비스</TableHead>
                          <TableHead className="min-w-[80px] text-xs font-medium">결합여부</TableHead>
                          <TableHead className="min-w-[80px] text-xs font-medium">가입비</TableHead>
                          <TableHead className="min-w-[80px] text-xs font-medium">유심비</TableHead>
                          <TableHead className="min-w-[100px] text-xs font-medium">정산금액</TableHead>
                          <TableHead className="min-w-[120px] text-xs font-medium">가입번호</TableHead>
                          <TableHead className="min-w-[100px] text-xs font-medium">기기/유심</TableHead>
                        </TableRow>
                      </TableHeader>
                  <TableBody>
                    {completedDocuments.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="whitespace-nowrap text-xs">
                          {doc.activatedAt ? (() => {
                            try {
                              const date = new Date(doc.activatedAt);
                              return isValid(date) ? format(date, 'MM-dd', { locale: ko }) : '-';
                            } catch (e) {
                              return '-';
                            }
                          })() : '-'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">{doc.customerName}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm">{doc.customerPhone}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm max-w-[120px] truncate">{doc.storeName || doc.dealerName}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm max-w-[120px] truncate">
                          {(doc as any).realSalesPOS || '-'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge variant="outline" className="text-xs">{doc.carrier}</Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge variant={
                            (doc as any).customerType === 'port-in' ? 'destructive' : 'default'
                          } className="text-xs">
                            {(doc as any).customerType === 'port-in' ? '번호이동' : '신규'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm max-w-[140px] break-words leading-tight">
                          <div className="min-h-[2.5rem] flex items-center">
                            {doc.servicePlanName || '-'}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {doc.additionalServices ? (
                            <div className="flex gap-1">
                              {typeof doc.additionalServices === 'string' ? (
                                doc.additionalServices.split(', ').slice(0, 1).map((service, index) => (
                                  <Badge key={index} variant="secondary" className="text-xs">
                                    {service}
                                  </Badge>
                                ))
                              ) : (
                                doc.additionalServices.slice(0, 1).map((service, index) => (
                                  <Badge key={index} variant="secondary" className="text-xs">
                                    {service}
                                  </Badge>
                                ))
                              )}
                              {((typeof doc.additionalServices === 'string' ? doc.additionalServices.split(', ').length : doc.additionalServices.length) > 1) && (
                                <Badge variant="secondary" className="text-xs">
                                  +{(typeof doc.additionalServices === 'string' ? doc.additionalServices.split(', ').length : doc.additionalServices.length) - 1}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">없음</span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {getStatusBadge(doc.bundleApplied, doc.bundleNotApplied)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs">
                          {Number(doc.registrationFeePrepaid) === 1 || Number(doc.registrationFeePostpaid) === 1 ? '적용' : '미적용'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs">
                          {Number(doc.simFeePrepaid) === 1 || Number(doc.simFeePostpaid) === 1 ? '적용' : '미적용'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <button
                            onClick={() => handleEditAmount(doc)}
                            className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition-colors"
                            title="클릭하여 정산 금액 수정"
                          >
                            {(() => {
                              const backendAmount = (doc as any).calculatedSettlementAmount;
                              const manualAmount = (doc as any).settlementAmount;
                              
                              console.log(`Settlement render - Doc ${doc.id}: backend=${backendAmount}, manual=${manualAmount}`);
                              
                              if (backendAmount !== undefined && backendAmount !== null && backendAmount > 0) {
                                const amount = typeof backendAmount === 'number' ? backendAmount : parseFloat(backendAmount);
                                const result = !isNaN(amount) ? `${amount.toLocaleString()}원` : '0원';
                                console.log(`Settlement render - Doc ${doc.id}: Using backend ${amount} -> ${result}`);
                                return result;
                              } else if (manualAmount && parseFloat(manualAmount) > 0) {
                                const amount = parseFloat(manualAmount);
                                const result = !isNaN(amount) ? `${amount.toLocaleString()}원` : '0원';
                                console.log(`Settlement render - Doc ${doc.id}: Using manual ${amount} -> ${result}`);
                                return result;
                              } else if (settlementPrices) {
                                const amount = calculateSettlementAmount(doc, settlementPrices, deductionPolicies);
                                const result = `${amount.toLocaleString()}원`;
                                console.log(`Settlement render - Doc ${doc.id}: Using calculated ${amount} -> ${result}`);
                                return result;
                              } else {
                                console.log(`Settlement render - Doc ${doc.id}: No amount found -> 0원`);
                                return '0원';
                              }
                            })()}
                          </button>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <span className="text-xs font-mono">
                            {doc.subscriptionNumber || '-'}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="text-xs space-y-0">
                            {doc.deviceModel && <div className="truncate max-w-[100px]">{doc.deviceModel}</div>}
                            {doc.simNumber && <div className="truncate max-w-[100px]">{doc.simNumber}</div>}
                            {!doc.deviceModel && !doc.simNumber && <span className="text-muted-foreground">-</span>}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    </TableBody>
                  </Table>
                  </div>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                  {completedDocuments.map((doc) => (
                    <Card key={doc.id} className="border border-gray-200">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-medium text-sm">{doc.customerName}</h3>
                            <p className="text-xs text-muted-foreground">{doc.customerPhone}</p>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline" className="text-xs mb-1">{doc.carrier}</Badge>
                            <div className="text-xs text-muted-foreground">
                              {doc.activatedAt ? (() => {
                                try {
                                  const date = new Date(doc.activatedAt);
                                  return isValid(date) ? format(date, 'MM-dd', { locale: ko }) : '-';
                                } catch (e) {
                                  return '-';
                                }
                              })() : '-'}
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-muted-foreground">판매점:</span>
                            <p className="font-medium text-xs truncate">{doc.storeName || doc.dealerName}</p>
                          </div>
                          {(doc as any).realSalesPOS && (
                            <div>
                              <span className="text-muted-foreground">실판매POS:</span>
                              <p className="font-medium text-xs truncate">{(doc as any).realSalesPOS}</p>
                            </div>
                          )}
                          <div>
                            <span className="text-muted-foreground">유형:</span>
                            <Badge variant={
                              (doc as any).customerType === 'port-in' ? 'destructive' : 'default'
                            } className="text-xs mt-1">
                              {(doc as any).customerType === 'port-in' ? '번호이동' : '신규'}
                            </Badge>
                          </div>
                          <div>
                            <span className="text-muted-foreground">정산금액:</span>
                            <button
                              onClick={() => handleEditAmount(doc)}
                              className="font-medium text-xs text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition-colors ml-1"
                              title="클릭하여 정산 금액 수정"
                            >
                              {(() => {
                                const backendAmount = (doc as any).calculatedSettlementAmount;
                                const manualAmount = (doc as any).settlementAmount;
                                
                                if (backendAmount !== undefined && backendAmount !== null) {
                                  const amount = typeof backendAmount === 'number' ? backendAmount : parseFloat(backendAmount);
                                  return !isNaN(amount) ? `${amount.toLocaleString()}원` : '0원';
                                } else if (manualAmount) {
                                  const amount = parseInt(manualAmount);
                                  return !isNaN(amount) ? `${amount.toLocaleString()}원` : '0원';
                                } else if (settlementPrices) {
                                  return `${calculateSettlementAmount(doc, settlementPrices, deductionPolicies).toLocaleString()}원`;
                                } else {
                                  return '0원';
                                }
                              })()}
                            </button>
                          </div>
                          <div>
                            <span className="text-muted-foreground">요금제:</span>
                            <p className="font-medium text-xs break-words leading-tight min-h-[2.5rem] flex items-center">{doc.servicePlanName || '-'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">결합여부:</span>
                            <div className="mt-1">{getStatusBadge(doc.bundleApplied, doc.bundleNotApplied)}</div>
                          </div>
                        </div>
                        
                        {doc.subscriptionNumber && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <span className="text-muted-foreground text-xs">가입번호:</span>
                            <p className="font-mono text-xs">{doc.subscriptionNumber}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium">개통 완료된 문서가 없습니다</h3>
                <p className="mt-1 text-xs">선택된 기간에 개통 완료된 문서가 없습니다.</p>
              </div>
            )}
          </CardContent>
        </Card>

            {/* 정산 금액 수정 다이얼로그 */}
            <Dialog open={editAmountDialogOpen} onOpenChange={setEditAmountDialogOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>정산 금액 수정</DialogTitle>
                </DialogHeader>
                {selectedDocumentForEdit && (
                  <div className="space-y-4">
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="text-sm">
                        <div className="font-medium">{selectedDocumentForEdit.customerName}</div>
                        <div className="text-gray-600 dark:text-gray-400">{selectedDocumentForEdit.customerPhone}</div>
                        <div className="text-gray-600 dark:text-gray-400">{selectedDocumentForEdit.storeName || selectedDocumentForEdit.dealerName}</div>
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="editAmount">정산 금액 (원)</Label>
                      <Input
                        id="editAmount"
                        type="number"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        placeholder="정산 금액을 입력하세요"
                        min="0"
                        step="1000"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        현재 자동 계산된 금액: {settlementPrices ? 
                          calculateSettlementAmount(selectedDocumentForEdit, settlementPrices, deductionPolicies).toLocaleString() : '0'
                        }원
                      </p>
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setEditAmountDialogOpen(false)}
                      >
                        취소
                      </Button>
                      <Button
                        type="button"
                        onClick={handleUpdateAmount}
                        className="bg-blue-600 hover:bg-blue-700"
                        disabled={updateSettlementAmount.isPending}
                      >
                        {updateSettlementAmount.isPending ? '수정 중...' : '수정'}
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* 통신사별 부가서비스 정책 관리 탭 */}
          <TabsContent value="policies" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">통신사별 부가서비스 정책</h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                  통신사별로 부가서비스 차감/추가 정책을 관리합니다.
                </p>
              </div>
              <Dialog open={policyDialogOpen} onOpenChange={setPolicyDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleCreatePolicy}>
                    <Settings className="w-4 h-4 mr-2" />
                    정책 추가
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>
                      {editingPolicy ? '정책 수정' : '부가서비스 정책 추가'}
                    </DialogTitle>
                    <DialogDescription>
                      통신사별 부가서비스 차감/추가 정책을 설정합니다.
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...policyForm}>
                    <form onSubmit={policyForm.handleSubmit(onPolicySubmit)} className="space-y-4">
                      <FormField
                        control={policyForm.control}
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
                                {carriers?.map((carrier: any, index: number) => {
                                  const carrierName = typeof carrier === 'object' ? carrier.name : carrier;
                                  const carrierKey = typeof carrier === 'object' ? carrier.id || index : carrier;
                                  return (
                                    <SelectItem key={carrierKey} value={carrierName}>
                                      {carrierName}
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={policyForm.control}
                        name="policyName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>정책명 *</FormLabel>
                            <FormControl>
                              <Input placeholder="예: 인터넷결합 미유치 시 차감" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={policyForm.control}
                          name="policyType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>정책 유형 *</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="정책 유형 선택" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="deduction">차감</SelectItem>
                                  <SelectItem value="addition">추가</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={policyForm.control}
                          name="serviceCategory"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>서비스 카테고리 *</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="카테고리 선택" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {Object.entries(SERVICE_CATEGORIES).map(([key, value]) => (
                                    <SelectItem key={key} value={key}>
                                      {value}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={policyForm.control}
                        name="amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>금액 (원) *</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="0"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={policyForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>설명</FormLabel>
                            <FormControl>
                              <Input placeholder="정책에 대한 설명을 입력하세요" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={() => setPolicyDialogOpen(false)}>
                          취소
                        </Button>
                        <Button
                          type="submit"
                          disabled={createPolicyMutation.isPending || updatePolicyMutation.isPending}
                        >
                          {createPolicyMutation.isPending || updatePolicyMutation.isPending
                            ? '처리 중...'
                            : editingPolicy
                            ? '수정'
                            : '등록'}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            {/* 정책 목록 테이블 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  부가서비스 정책 목록
                </CardTitle>
                <CardDescription>
                  등록된 통신사별 부가서비스 정책을 관리합니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>통신사</TableHead>
                      <TableHead>정책명</TableHead>
                      <TableHead>유형</TableHead>
                      <TableHead>카테고리</TableHead>
                      <TableHead>금액</TableHead>
                      <TableHead>등록일</TableHead>
                      <TableHead>작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {carrierPolicies?.map((policy: any) => (
                      <TableRow key={policy.id}>
                        <TableCell>{policy.carrier}</TableCell>
                        <TableCell className="font-medium">{policy.policyName}</TableCell>
                        <TableCell>
                          <Badge variant={policy.policyType === 'deduction' ? 'destructive' : 'default'}>
                            {policy.policyType === 'deduction' ? '차감' : '추가'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {SERVICE_CATEGORIES[policy.serviceCategory as keyof typeof SERVICE_CATEGORIES] || policy.serviceCategory}
                        </TableCell>
                        <TableCell className="font-mono">
                          {policy.policyType === 'deduction' ? '-' : '+'}
                          {policy.amount.toLocaleString()}원
                        </TableCell>
                        <TableCell>
                          {format(new Date(policy.createdAt), 'yy.MM.dd', { locale: ko })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditPolicy(policy)}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeletePolicy(policy.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {!carrierPolicies || carrierPolicies.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    등록된 부가서비스 정책이 없습니다.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}