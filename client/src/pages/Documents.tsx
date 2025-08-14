import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

import { useApiRequest, useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import type { Document } from '../../../shared/schema';
import { FileText, Upload, Search, Download, Calendar, Settings, Check, ChevronsUpDown, Calculator, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { ChatDialog } from '@/components/ChatDialog';

export function Documents() {
  const apiRequest = useApiRequest();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  

  const [filters, setFilters] = useState({
    status: '',
    search: '',
    contactCode: '',
    carrier: '', // 통신사 검색 필드 추가
    startDate: '',
    endDate: ''
  });
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    customerName: '',
    customerPhone: '',
    notes: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activationDialogOpen, setActivationDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [activationForm, setActivationForm] = useState({
    activationStatus: '',
    notes: '',
    supplementNotes: '',
    dealerNotes: '',
    deviceModel: '',
    simNumber: '',
    subscriptionNumber: '',
    servicePlanId: '',
    additionalServiceIds: [] as string[],
    registrationFeePrepaid: false,
    registrationFeePostpaid: false,
    registrationFeeInstallment: false,
    simFeePrepaid: false,
    simFeePostpaid: false,
    bundleApplied: false,
    bundleNotApplied: false,
    discardReason: ''
  });
  
  const [servicePlanDialogOpen, setServicePlanDialogOpen] = useState(false);
  const [servicePlanComboboxOpen, setServicePlanComboboxOpen] = useState(false);
  const [servicePlanSearchValue, setServicePlanSearchValue] = useState('');
  const [servicePlanForm, setServicePlanForm] = useState({
    servicePlanId: '',
    additionalServiceIds: [] as string[],
    registrationFeePrepaid: false, // 가입비 선납
    registrationFeePostpaid: false, // 가입비 후납
    registrationFeeInstallment: false, // 가입비 분납
    simFeePrepaid: false, // 유심 선납
    simFeePostpaid: false, // 유심 후납
    bundleApplied: false, // 결합
    bundleNotApplied: false, // 미결합
    deviceModel: '',
    simNumber: '',
    subscriptionNumber: ''
  });

  // 등록된 통신사 목록 조회
  const { data: carriers } = useQuery({
    queryKey: ['/api/carriers/from-documents'],
    queryFn: () => apiRequest('/api/carriers/from-documents') as Promise<string[]>,
    staleTime: 5 * 60 * 1000
  });

  const { data: documents, isLoading } = useQuery({
    queryKey: ['/api/documents', filters, user?.id],
    queryFn: () => {
      const params = new URLSearchParams();
      // 접수 관리는 대기/진행중 상태만 표시 (개통완료 제외)
      params.append('activationStatus', '대기,진행중');
      params.append('excludeDeleted', 'true');
      
      // 근무자는 자신이 접수한 문서만 조회, 관리자는 모든 문서 조회, 판매점은 본인 접수건만
      if (user?.userRole === 'dealer_worker') {
        params.append('workerFilter', 'my'); // 자신이 접수한 문서만
      } else if (user?.userType === 'dealer') {
        // 판매점은 별도 필터링 없이 자동으로 본인 문서만 조회됨
      } else {
        params.append('allWorkers', 'true'); // 관리자는 모든 문서
      }
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all' && key !== 'activationStatus') {
          params.append(key, value);
        }
      });
      return apiRequest(`/api/documents?${params}`);
    },
  });

  const { data: servicePlans, isLoading: servicePlansLoading } = useQuery({
    queryKey: ['/api/service-plans', selectedDocument?.carrier || 'all'],
    queryFn: () => {
      const carrier = selectedDocument?.carrier;
      const params = carrier ? `?carrier=${encodeURIComponent(carrier)}` : '';
      return apiRequest(`/api/service-plans${params}`);
    },
    enabled: activationDialogOpen, // 활성화 대화상자가 열렸을 때 실행
  });

  console.log('Service plans data:', { 
    servicePlans: servicePlans?.length, 
    loading: servicePlansLoading 
  });

  // 부가서비스 API 데이터 (통신망별 필터링)
  const { data: additionalServices = [] } = useQuery({
    queryKey: ['/api/additional-services', selectedDocument?.carrier],
    queryFn: () => {
      const carrier = selectedDocument?.carrier;
      const params = carrier ? `?carrier=${encodeURIComponent(carrier)}` : '';
      return apiRequest(`/api/additional-services${params}`);
    },
    enabled: activationDialogOpen, // 활성화 대화상자가 열렸을 때만 실행
  });

  const uploadMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const sessionId = useAuth.getState().sessionId;
      const response = await fetch('/api/documents', {
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
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      setUploadDialogOpen(false);
      setUploadForm({ customerName: '', customerPhone: '', notes: '' });
      setSelectedFile(null);
      toast({
        title: '성공',
        description: '서류가 성공적으로 업로드되었습니다.',
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

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/documents/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      toast({
        title: '성공',
        description: '서류가 삭제되었습니다.',
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

  // 일괄 정산 생성 뮤테이션
  const bulkCreateSettlementMutation = useMutation({
    mutationFn: () => apiRequest('/api/settlements/bulk-from-activated', { method: 'POST' }),
    onSuccess: (data: any) => {
      toast({
        title: "정산 생성 완료",
        description: data.message || "개통 완료된 문서들이 정산으로 변환되었습니다.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "정산 생성 실패",
        description: error.message || "일괄 정산 생성에 실패했습니다.",
        variant: "destructive"
      });
    }
  });

  // Helper function to format date for reception number
  const formatReceptionDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${month}/${day}/${hour}시${minute}분`;
  };

  const handleUpload = async (e: React.FormEvent) => {
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
    formData.append('customerName', uploadForm.customerName);
    formData.append('customerPhone', uploadForm.customerPhone);
    formData.append('notes', uploadForm.notes);

    uploadMutation.mutate(formData);
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

  const handleDownload = async (documentId: number) => {
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
      const contentDisposition = response.headers.get('Content-Disposition');
      const originalFileName = contentDisposition 
        ? decodeURIComponent(contentDisposition.split('filename=')[1]?.replace(/"/g, '') || `document_${documentId}`)
        : `document_${documentId}`;
      
      // 현재 문서의 고객명 찾기
      const currentDoc = documents?.find((doc: any) => doc.id === documentId);
      const customerFileName = currentDoc 
        ? getCustomerFileName(currentDoc.customerName, originalFileName)
        : originalFileName;
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = customerFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "다운로드 완료",
        description: `${customerFileName} 파일이 다운로드되었습니다.`,
      });
    } catch (error) {
      toast({
        title: "다운로드 실패",
        description: error instanceof Error ? error.message : "파일 다운로드 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = (documentId: number) => {
    if (confirm('정말 이 서류를 삭제하시겠습니까?')) {
      deleteMutation.mutate(documentId);
    }
  };

  const handleActivationStatusChange = (doc: Document) => {
    setSelectedDocument(doc);
    
    // additionalServiceIds 안전 파싱
    let parsedServiceIds: string[] = [];
    try {
      const serviceIds = (doc as any).additionalServiceIds;
      console.log('Parsing additionalServiceIds for doc:', doc.id, 'serviceIds:', serviceIds, 'type:', typeof serviceIds);
      
      if (Array.isArray(serviceIds)) {
        parsedServiceIds = serviceIds.map(id => id.toString());
      } else if (typeof serviceIds === 'string' && serviceIds.trim()) {
        parsedServiceIds = JSON.parse(serviceIds);
      }
      
      console.log('Parsed service IDs:', parsedServiceIds);
    } catch (error) {
      console.warn('Failed to parse additionalServiceIds:', (doc as any).additionalServiceIds, error);
      parsedServiceIds = [];
    }
    
    setActivationForm({
      activationStatus: (doc as any).activationStatus || '대기',
      notes: '',
      supplementNotes: '',
      dealerNotes: (doc as any).dealerNotes || '',
      deviceModel: (doc as any).deviceModel || '',
      simNumber: (doc as any).simNumber || '',
      subscriptionNumber: (doc as any).subscriptionNumber || '',
      servicePlanId: (doc as any).servicePlanId?.toString() || '',
      additionalServiceIds: parsedServiceIds,
      registrationFeePrepaid: (doc as any).registrationFeePrepaid || false,
      registrationFeePostpaid: (doc as any).registrationFeePostpaid || false,
      registrationFeeInstallment: (doc as any).registrationFeeInstallment || false,
      simFeePrepaid: (doc as any).simFeePrepaid || false,
      simFeePostpaid: (doc as any).simFeePostpaid || false,
      bundleApplied: (doc as any).bundleApplied || false,
      bundleNotApplied: (doc as any).bundleNotApplied || false,
      discardReason: (doc as any).discardReason || ''
    });
    setActivationDialogOpen(true);
  };

  const canSetServicePlan = (document: any) => {
    // 영업과장은 읽기 전용이므로 요금제 설정 불가
    return (document.activationStatus === '개통' || document.activationStatus === '개통완료') && user?.userType !== 'sales_manager';
  };

  const handleServicePlanChange = (doc: any) => {
    setSelectedDocument(doc);
    setServicePlanForm({
      servicePlanId: doc.servicePlanId?.toString() || '',
      additionalServiceIds: doc.additionalServiceIds || [],
      registrationFeePrepaid: doc.registrationFeePrepaid || false,
      registrationFeePostpaid: doc.registrationFeePostpaid || false,
      registrationFeeInstallment: doc.registrationFeeInstallment || false,
      simFeePrepaid: doc.simFeePrepaid || false,
      simFeePostpaid: doc.simFeePostpaid || false,
      bundleApplied: doc.bundleApplied || false,
      bundleNotApplied: doc.bundleNotApplied || false,
      deviceModel: doc.deviceModel || '',
      simNumber: doc.simNumber || '',
      subscriptionNumber: doc.subscriptionNumber || ''
    });
    setServicePlanDialogOpen(true);
  };

  const handleActivationSubmit = () => {
    if (!selectedDocument) return;
    
    // 개통완료 선택 시 가입번호 필수 체크
    if (activationForm.activationStatus === '개통' && !activationForm.subscriptionNumber?.trim()) {
      toast({
        title: "오류",
        description: "개통완료 처리 시 가입번호는 필수 입력 사항입니다.",
        variant: "destructive"
      });
      return;
    }

    // 폐기 시 폐기 사유 검증
    if (activationForm.activationStatus === '폐기' && !activationForm.discardReason?.trim()) {
      toast({
        title: "오류",
        description: "폐기 처리 시 폐기 사유는 필수 입력 사항입니다.",
        variant: "destructive"
      });
      return;
    }
    
    updateActivationMutation.mutate({
      id: selectedDocument.id,
      data: activationForm
    });
  };

  // Permission check functions
  const canUploadDocuments = () => {
    // 판매점만 접수 가능, 관리자와 근무자는 업로드 불가 (처리만 담당)
    // 영업과장은 읽기 전용이므로 업로드 불가
    return user?.role === 'dealer_store' && user?.userType !== 'sales_manager';
  };

  const canManageActivationStatus = () => {
    // 관리자는 모든 권한, 근무자도 개통상태 관리 가능
    // 영업과장은 읽기 전용이므로 상태 변경 불가
    if (user?.userType === 'sales_manager') return false;
    
    return user?.userType === 'admin' || 
           user?.userType === 'user' || 
           user?.userType === 'worker' || 
           user?.role === 'dealer_worker';
  };

  const canDeleteDocuments = () => {
    // 관리자만 삭제 가능, 영업과장은 읽기 전용이므로 삭제 불가
    return user?.userType === 'admin' && user?.userType !== 'sales_manager';
  };

  const canManageSettlements = () => {
    // 관리자만 정산 관리 가능, 영업과장은 읽기 전용이므로 정산 생성 불가
    return user?.userType === 'admin' && user?.userType !== 'sales_manager';
  };

  // Helper functions for the new table

  const updateActivationMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => {
      return apiRequest(`/api/documents/${id}/activation`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      setActivationDialogOpen(false);
      setSelectedDocument(null);
      setActivationForm({ 
        activationStatus: '', 
        notes: '', 
        supplementNotes: '', 
        dealerNotes: '',
        deviceModel: '', 
        simNumber: '', 
        subscriptionNumber: '',
        servicePlanId: '',
        additionalServiceIds: [],
        registrationFeePrepaid: false,
        registrationFeePostpaid: false,
        registrationFeeInstallment: false,
        simFeePrepaid: false,
        simFeePostpaid: false,
        bundleApplied: false,
        bundleNotApplied: false,
        discardReason: ''
      });
      toast({
        title: "성공",
        description: "개통 상태가 변경되었습니다.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "오류",
        description: error.message || "개통 상태 변경 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case '접수':
        return <Badge className="status-badge-pending text-xs px-1 py-0.5">접수</Badge>;
      case '완료':
        return <Badge className="status-badge-completed text-xs px-1 py-0.5">완료</Badge>;
      case '보완필요':
        return <Badge className="status-badge-needs-review text-xs px-1 py-0.5">보완</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs px-1 py-0.5">{status}</Badge>;
    }
  };

  const getActivationStatusBadge = (status: string) => {
    switch (status) {
      case '대기':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600 text-xs px-1 py-0.5">대기</Badge>;
      case '진행중':
        return <Badge variant="outline" className="text-blue-600 border-blue-600 text-xs px-1 py-0.5">진행</Badge>;
      case '업무요청중':
        return <Badge variant="outline" className="text-purple-600 border-purple-600 text-xs px-1 py-0.5">업무요청</Badge>;
      case '기타완료':
        return <Badge variant="outline" className="text-purple-600 border-purple-600 text-xs px-1 py-0.5">기타완료</Badge>;
      case '개통':
        return <Badge variant="outline" className="text-green-600 border-green-600 text-xs px-1 py-0.5">개통</Badge>;
      case '취소':
        return <Badge variant="outline" className="text-red-600 border-red-600 text-xs px-1 py-0.5">취소</Badge>;
      case '폐기':
        return <Badge variant="outline" className="text-gray-600 border-gray-600 text-xs px-1 py-0.5">폐기</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs px-1 py-0.5">{status}</Badge>;
    }
  };

  const isAdmin = user?.userType === 'admin';
  const isWorker = user?.userType === 'user' && user?.role === 'worker';

  const openServicePlanDialog = (doc: Document) => {
    setSelectedDocument(doc);
    setServicePlanForm({
      servicePlanId: (doc as any).servicePlanId?.toString() || '',
      additionalServiceIds: (doc as any).additionalServiceIds ? JSON.parse((doc as any).additionalServiceIds) : [],
      registrationFeePrepaid: (doc as any).registrationFeePrepaid || false,
      registrationFeePostpaid: (doc as any).registrationFeePostpaid || false,
      registrationFeeInstallment: (doc as any).registrationFeeInstallment || false,
      simFeePrepaid: (doc as any).simFeePrepaid || false,
      simFeePostpaid: (doc as any).simFeePostpaid || false,
      bundleApplied: (doc as any).bundleApplied || false,
      bundleNotApplied: (doc as any).bundleNotApplied || false,
      deviceModel: (doc as any).deviceModel || '',
      simNumber: (doc as any).simNumber || '',
      subscriptionNumber: (doc as any).subscriptionNumber || ''
    });
    setServicePlanDialogOpen(true);
  };

  const servicePlanMutation = useMutation({
    mutationFn: async (data: any) => {
      const sessionId = useAuth.getState().sessionId;
      const response = await fetch(`/api/documents/${selectedDocument?.id}/service-plan`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionId}`,
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: '요금제 정보 저장에 실패했습니다.' }));
        throw new Error(error.error || '요금제 정보 저장에 실패했습니다.');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      setServicePlanDialogOpen(false);
      setSelectedDocument(null);
      // 폼 초기화하지 않음 - 저장된 상태 유지
      toast({
        title: "성공",
        description: "요금제 정보가 저장되었습니다.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "오류",
        description: error.message || "요금제 정보 저장 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleServicePlanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDocument) return;
    
    const data = {
      servicePlanId: servicePlanForm.servicePlanId || null,
      additionalServiceIds: JSON.stringify(servicePlanForm.additionalServiceIds),
      registrationFeePrepaid: servicePlanForm.registrationFeePrepaid,
      registrationFeePostpaid: servicePlanForm.registrationFeePostpaid,
      simFeePrepaid: servicePlanForm.simFeePrepaid,
      simFeePostpaid: servicePlanForm.simFeePostpaid,
      bundleApplied: servicePlanForm.bundleApplied,
      bundleNotApplied: servicePlanForm.bundleNotApplied,
      deviceModel: servicePlanForm.deviceModel || null,
      simNumber: servicePlanForm.simNumber || null,
      subscriptionNumber: servicePlanForm.subscriptionNumber || null
    };
    
    console.log('Submitting service plan data:', data);
    servicePlanMutation.mutate(data);
  };

  return (
    <Layout title="접수 관리">
      <div className="space-y-2">
        {/* Header with Upload Button */}
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium text-gray-900">서류 목록</h3>
            <p className="text-sm text-gray-500">
              업로드된 서류를 관리하고 상태를 확인할 수 있습니다.
            </p>
          </div>
          {canUploadDocuments() && (
            <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Upload className="mr-2 h-4 w-4" />
                  서류 업로드
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>서류 업로드</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleUpload} className="space-y-4">
                  <div>
                    <Label htmlFor="customerName">고객명</Label>
                    <Input
                      id="customerName"
                      value={uploadForm.customerName}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, customerName: e.target.value }))}
                      required
                      placeholder="고객명을 입력하세요"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="customerPhone">연락처</Label>
                    <Input
                      id="customerPhone"
                      value={uploadForm.customerPhone}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, customerPhone: e.target.value }))}
                      required
                      placeholder="연락처를 입력하세요"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="file">파일</Label>
                    <Input
                      id="file"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      PDF, 이미지, Word 문서만 업로드 가능 (최대 10MB) - 선택사항
                    </p>
                  </div>
                  
                  <div>
                    <Label htmlFor="notes">메모 (선택사항)</Label>
                    <Textarea
                      id="notes"
                      value={uploadForm.notes}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="추가 메모가 있다면 입력하세요"
                      rows={3}
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setUploadDialogOpen(false)}>
                      취소
                    </Button>
                    <Button type="submit" disabled={uploadMutation.isPending}>
                      {uploadMutation.isPending ? '업로드 중...' : '업로드'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>



        {/* Activation Status Dialog */}
        <Dialog open={activationDialogOpen} onOpenChange={setActivationDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" aria-describedby="activation-dialog-description">
            <DialogHeader>
              <DialogTitle>개통 상태 변경</DialogTitle>
            </DialogHeader>
            <div id="activation-dialog-description" className="text-sm text-gray-600 mb-4">
              선택된 문서의 개통 상태를 변경할 수 있습니다.
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="activationStatus">개통 상태</Label>
                <Select
                  value={activationForm.activationStatus}
                  onValueChange={(value) => setActivationForm(prev => ({ ...prev, activationStatus: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="개통 상태를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="대기">대기</SelectItem>
                    <SelectItem value="진행중">진행중</SelectItem>
                    <SelectItem value="업무요청중">업무요청중</SelectItem>
                    <SelectItem value="보완필요">보완필요</SelectItem>
                    <SelectItem value="개통">개통완료</SelectItem>
                    {/* 기타 통신사에 대해서만 기타완료 옵션 표시 */}
                    {selectedDocument?.carrier?.includes('기타') && (
                      <SelectItem value="기타완료">기타완료</SelectItem>
                    )}
                    <SelectItem value="취소">취소</SelectItem>
                    <SelectItem value="폐기">폐기</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* 폐기가 아닌 경우에만 일반 메모 필드 표시 */}
              {activationForm.activationStatus !== '폐기' && (
                <div>
                  <Label htmlFor="notes">메모</Label>
                  <Textarea
                    id="notes"
                    placeholder="변경 사유나 메모를 입력하세요..."
                    value={activationForm.notes}
                    onChange={(e) => setActivationForm(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                  />
                </div>
              )}
              
              {/* 기타완료 시 간단한 정보 입력 */}
              {activationForm.activationStatus === '기타완료' && (
                <div className="bg-purple-50 p-4 rounded-lg space-y-4">
                  <h4 className="font-medium text-purple-900">기타 완료 정보</h4>
                  
                  {/* 기기 모델 */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>기기 모델</Label>
                      <Input
                        value={activationForm.deviceModel}
                        onChange={(e) => setActivationForm(prev => ({ ...prev, deviceModel: e.target.value }))}
                        placeholder="기기 모델을 입력하세요"
                      />
                    </div>
                    <div>
                      <Label>유심 번호</Label>
                      <Input
                        value={activationForm.simNumber}
                        onChange={(e) => setActivationForm(prev => ({ ...prev, simNumber: e.target.value }))}
                        placeholder="유심 번호를 입력하세요"
                      />
                    </div>
                    <div>
                      <Label>가입 번호</Label>
                      <Input
                        value={activationForm.subscriptionNumber}
                        onChange={(e) => setActivationForm(prev => ({ ...prev, subscriptionNumber: e.target.value }))}
                        placeholder="가입 번호를 입력하세요"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 폐기 시 폐기 사유 입력 */}
              {activationForm.activationStatus === '폐기' && (
                <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                  <h4 className="font-medium text-gray-900">폐기 정보</h4>
                  
                  <div>
                    <Label htmlFor="discardReason">폐기 사유 (필수)</Label>
                    <Textarea
                      id="discardReason"
                      placeholder="폐기 사유를 상세히 입력하세요..."
                      value={activationForm.discardReason || ''}
                      onChange={(e) => setActivationForm(prev => ({ ...prev, discardReason: e.target.value }))}
                      rows={3}
                      required
                      className="mt-2"
                    />
                    <p className="text-sm text-gray-600 mt-1">
                      문서 폐기 사유를 반드시 기록해주세요.
                    </p>
                  </div>
                </div>
              )}

              {/* 개통완료 시에만 요금제 정보 및 개통 정보 입력 */}
              {activationForm.activationStatus === '개통' && (
                <div className="bg-blue-50 p-4 rounded-lg space-y-4">
                  <h4 className="font-medium text-blue-900">개통 정보 입력</h4>
                  
                  {/* 요금제 선택 */}
                  <div>
                    <Label>요금제 선택</Label>
                    <Popover open={servicePlanComboboxOpen} onOpenChange={setServicePlanComboboxOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={servicePlanComboboxOpen}
                          className="w-full justify-between"
                        >
                          {activationForm.servicePlanId
                            ? servicePlans?.find(plan => plan.id.toString() === activationForm.servicePlanId)?.planName
                            : "요금제를 선택하세요..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput 
                            placeholder="요금제 검색..." 
                            value={servicePlanSearchValue}
                            onValueChange={setServicePlanSearchValue}
                          />
                          <CommandList>
                            <CommandEmpty>요금제를 찾을 수 없습니다.</CommandEmpty>
                            <CommandGroup>
                              {servicePlans?.filter(plan => {
                                const searchTerm = servicePlanSearchValue.toLowerCase();
                                const planName = plan.planName.toLowerCase();
                                
                                // 숫자가 포함된 검색어는 GB 용량으로 검색
                                if (/\d/.test(searchTerm)) {
                                  return planName.includes(searchTerm);
                                }
                                
                                return planName.includes(searchTerm);
                              })
                              // 중복 제거 - ID를 기준으로 고유한 플랜만 표시
                              .filter((plan, index, array) => 
                                array.findIndex(p => p.id === plan.id) === index
                              )
                              .map((plan) => (
                                <CommandItem
                                  key={plan.id}
                                  value={plan.planName}
                                  onSelect={() => {
                                    setActivationForm(prev => ({ ...prev, servicePlanId: plan.id.toString() }));
                                    setServicePlanComboboxOpen(false);
                                    setServicePlanSearchValue('');
                                  }}
                                >
                                  <Check
                                    className={`mr-2 h-4 w-4 ${
                                      activationForm.servicePlanId === plan.id.toString() ? "opacity-100" : "opacity-0"
                                    }`}
                                  />
                                  {plan.planName}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* 부가서비스 선택 */}
                  <div>
                    <Label>부가서비스 (복수 선택 가능)</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                      {additionalServices.map((service) => (
                        <label key={service.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={activationForm.additionalServiceIds.includes(service.id.toString())}
                            onChange={(e) => {
                              const serviceId = service.id.toString();
                              if (e.target.checked) {
                                setActivationForm(prev => ({
                                  ...prev,
                                  additionalServiceIds: [...prev.additionalServiceIds, serviceId]
                                }));
                              } else {
                                setActivationForm(prev => ({
                                  ...prev,
                                  additionalServiceIds: prev.additionalServiceIds.filter(id => id !== serviceId)
                                }));
                              }
                            }}
                            className="rounded"
                          />
                          <span className="text-sm">{service.serviceName}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* 가입비 옵션 */}
                  <div>
                    <Label>가입비</Label>
                    <div className="flex space-x-4 mt-2">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={activationForm.registrationFeePrepaid}
                          onChange={(e) => {
                            setActivationForm(prev => ({
                              ...prev,
                              registrationFeePrepaid: e.target.checked,
                              registrationFeePostpaid: e.target.checked ? false : prev.registrationFeePostpaid,
                              registrationFeeInstallment: e.target.checked ? false : (prev.registrationFeeInstallment || false)
                            }));
                          }}
                          className="rounded"
                        />
                        <span className="text-sm">선납</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={activationForm.registrationFeePostpaid}
                          onChange={(e) => {
                            setActivationForm(prev => ({
                              ...prev,
                              registrationFeePostpaid: e.target.checked,
                              registrationFeePrepaid: e.target.checked ? false : prev.registrationFeePrepaid,
                              registrationFeeInstallment: e.target.checked ? false : (prev.registrationFeeInstallment || false)
                            }));
                          }}
                          className="rounded"
                        />
                        <span className="text-sm">후납</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={activationForm.registrationFeeInstallment || false}
                          onChange={(e) => {
                            setActivationForm(prev => ({
                              ...prev,
                              registrationFeeInstallment: e.target.checked,
                              registrationFeePrepaid: e.target.checked ? false : prev.registrationFeePrepaid,
                              registrationFeePostpaid: e.target.checked ? false : prev.registrationFeePostpaid
                            }));
                          }}
                          className="rounded"
                        />
                        <span className="text-sm">분납</span>
                      </label>
                    </div>
                  </div>

                  {/* 유심비 옵션 */}
                  <div>
                    <Label>유심비</Label>
                    <div className="flex space-x-4 mt-2">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={activationForm.simFeePrepaid}
                          onChange={(e) => {
                            setActivationForm(prev => ({
                              ...prev,
                              simFeePrepaid: e.target.checked,
                              simFeePostpaid: e.target.checked ? false : prev.simFeePostpaid
                            }));
                          }}
                          className="rounded"
                        />
                        <span className="text-sm">선납</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={activationForm.simFeePostpaid}
                          onChange={(e) => {
                            setActivationForm(prev => ({
                              ...prev,
                              simFeePostpaid: e.target.checked,
                              simFeePrepaid: e.target.checked ? false : prev.simFeePrepaid
                            }));
                          }}
                          className="rounded"
                        />
                        <span className="text-sm">후납</span>
                      </label>
                    </div>
                  </div>

                  {/* 결합 옵션 - 선택된 요금제가 결합 가능한 경우에만 표시 */}
                  {(() => {
                    const selectedPlan = servicePlans?.find(plan => plan.id.toString() === activationForm.servicePlanId);
                    return selectedPlan?.combinationEligible ? (
                      <div>
                        <Label>결합</Label>
                        <div className="flex space-x-4 mt-2">
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={activationForm.bundleApplied}
                              onChange={(e) => {
                                setActivationForm(prev => ({
                                  ...prev,
                                  bundleApplied: e.target.checked,
                                  bundleNotApplied: e.target.checked ? false : prev.bundleNotApplied
                                }));
                              }}
                              className="rounded"
                            />
                            <span className="text-sm">결합</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={activationForm.bundleNotApplied}
                              onChange={(e) => {
                                setActivationForm(prev => ({
                                  ...prev,
                                  bundleNotApplied: e.target.checked,
                                  bundleApplied: e.target.checked ? false : prev.bundleApplied
                                }));
                              }}
                              className="rounded"
                            />
                            <span className="text-sm">미결합</span>
                          </label>
                        </div>
                      </div>
                    ) : null;
                  })()}
                  
                  {/* 기기/유심/가입번호 정보 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="deviceModel">기기모델</Label>
                      <Input
                        id="deviceModel"
                        placeholder="기기모델을 입력하세요"
                        value={activationForm.deviceModel || ''}
                        onChange={(e) => setActivationForm(prev => ({ ...prev, deviceModel: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="simNumber">유심번호</Label>
                      <Input
                        id="simNumber"
                        placeholder="유심번호를 입력하세요"
                        value={activationForm.simNumber || ''}
                        onChange={(e) => setActivationForm(prev => ({ ...prev, simNumber: e.target.value }))}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="subscriptionNumber">가입번호/계약번호</Label>
                      <Input
                        id="subscriptionNumber"
                        placeholder="가입번호 또는 계약번호를 입력하세요"
                        value={activationForm.subscriptionNumber || ''}
                        onChange={(e) => setActivationForm(prev => ({ ...prev, subscriptionNumber: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              )}
              
              {/* 보완 내용 - 보완필요 상태에서만 작성 */}
              {activationForm.activationStatus === '보완필요' && (
                <div>
                  <Label htmlFor="supplementNotes">보완 상세 내용</Label>
                  <Textarea
                    id="supplementNotes"
                    placeholder="판매점에서 확인할 보완 내용을 자세히 입력하세요..."
                    value={activationForm.supplementNotes}
                    onChange={(e) => setActivationForm(prev => ({ ...prev, supplementNotes: e.target.value }))}
                    rows={4}
                    className="border-orange-200 focus:border-orange-400"
                  />
                  <div className="text-xs mt-1 text-orange-600">
                    이 내용은 판매점에서 확인할 수 있습니다.
                  </div>
                </div>
              )}
              


              {/* 판매점 전달 메모 - 개통완료 또는 기타완료 상태에서만 작성 */}
              {(activationForm.activationStatus === '개통' || activationForm.activationStatus === '기타완료') && (
                <div>
                  <Label htmlFor="dealerNotes">판매점 전달 메모</Label>
                  <Textarea
                    id="dealerNotes"
                    placeholder="판매점에게 전달할 메모나 특이사항을 입력하세요..."
                    value={activationForm.dealerNotes || ''}
                    onChange={(e) => setActivationForm(prev => ({ ...prev, dealerNotes: e.target.value }))}
                    rows={3}
                    className="border-green-200 focus:border-green-400"
                  />
                  <div className="text-xs mt-1 text-green-600">
                    이 내용은 판매점에서 확인할 수 있습니다.
                  </div>
                </div>
              )}
              
              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => setActivationDialogOpen(false)}
                >
                  취소
                </Button>
                <Button 
                  onClick={handleActivationSubmit}
                  disabled={!activationForm.activationStatus || updateActivationMutation.isPending}
                >
                  {updateActivationMutation.isPending ? '처리 중...' : '변경'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Service Plan Dialog */}
        <Dialog open={servicePlanDialogOpen} onOpenChange={setServicePlanDialogOpen}>
          <DialogContent className="sm:max-w-[500px]" aria-describedby="service-plan-dialog-description">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">요금제 관리</DialogTitle>
            </DialogHeader>
            <div id="service-plan-dialog-description" className="text-sm text-gray-600 mb-6">
              <span className="font-medium">{selectedDocument?.customerName}</span>님의 요금제 정보를 입력해주세요.
              {selectedDocument && (
                <div className="mt-2 p-2 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">통신사:</span>
                    <span className="text-sm font-bold text-blue-700">{(selectedDocument as any).carrier}</span>
                    <span className="text-xs text-blue-600">
                      (해당 통신사의 요금제만 표시됩니다)
                    </span>
                  </div>
                </div>
              )}
            </div>
            
            <form onSubmit={handleServicePlanSubmit} className="space-y-6">
              {/* 요금제 선택 */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <Label className="text-lg font-semibold mb-3 block">기본 요금제</Label>
                <Popover open={servicePlanComboboxOpen} onOpenChange={setServicePlanComboboxOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={servicePlanComboboxOpen}
                      className="w-full h-12 justify-between text-left font-normal"
                    >
                      {servicePlanForm.servicePlanId
                        ? servicePlans?.find((plan) => plan.id.toString() === servicePlanForm.servicePlanId)?.planName
                        : "요금제를 선택하세요"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput 
                        placeholder="숫자나 요금제명으로 검색하세요..." 
                        value={servicePlanSearchValue}
                        onValueChange={setServicePlanSearchValue}
                      />
                      <CommandEmpty>검색 결과가 없습니다.</CommandEmpty>
                      <CommandList className="max-h-64">
                        <CommandGroup>
                          {servicePlans?.filter((plan) => {
                            if (!servicePlanSearchValue) return true;
                            
                            const searchLower = servicePlanSearchValue.toLowerCase();
                            const planNameLower = plan.planName.toLowerCase();
                            
                            // 숫자로 시작하는 검색어는 데이터 용량이나 숫자와 매칭
                            if (/^\d/.test(searchLower)) {
                              // GB, MB 등의 용량 검색 지원
                              return planNameLower.includes(searchLower + 'gb') || 
                                     planNameLower.includes(searchLower + 'mb') ||
                                     planNameLower.includes(searchLower);
                            }
                            
                            // 일반 텍스트 검색
                            return planNameLower.includes(searchLower);
                          })
                          // 중복 제거 - ID를 기준으로 고유한 플랜만 표시
                          .filter((plan, index, array) => 
                            array.findIndex(p => p.id === plan.id) === index
                          )
                          .map((plan) => (
                            <CommandItem
                              key={plan.id}
                              value={plan.planName}
                              onSelect={() => {
                                setServicePlanForm(prev => ({ ...prev, servicePlanId: plan.id.toString() }));
                                setServicePlanComboboxOpen(false);
                                setServicePlanSearchValue('');
                              }}
                            >
                              {plan.planName}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* 부가서비스 선택 */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <Label className="text-lg font-semibold mb-3 block">부가서비스</Label>
                <div className="grid grid-cols-2 gap-3">
                  {additionalServices.map((service) => (
                    <div key={service.id} className="flex items-center space-x-3 p-3 bg-white rounded-lg border hover:bg-gray-50">
                      <input
                        type="checkbox"
                        id={`service-${service.id}`}
                        checked={servicePlanForm.additionalServiceIds.includes(service.id.toString())}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setServicePlanForm(prev => ({
                              ...prev,
                              additionalServiceIds: [...prev.additionalServiceIds, service.id.toString()]
                            }));
                          } else {
                            setServicePlanForm(prev => ({
                              ...prev,
                              additionalServiceIds: prev.additionalServiceIds.filter(id => id !== service.id.toString())
                            }));
                          }
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor={`service-${service.id}`} className="flex-1 cursor-pointer">
                        <div className="font-medium text-gray-900">{service.serviceName}</div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* 비용 정보 */}
              <div className="bg-green-50 p-4 rounded-lg">
                <Label className="text-lg font-semibold mb-3 block">비용 정보</Label>
                <div className="grid grid-cols-3 gap-6">
                  {/* 가입비 */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">가입비</Label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="registrationFeePrepaid"
                          checked={servicePlanForm.registrationFeePrepaid}
                          onChange={(e) => setServicePlanForm(prev => ({ 
                            ...prev, 
                            registrationFeePrepaid: e.target.checked,
                            registrationFeePostpaid: e.target.checked ? false : prev.registrationFeePostpaid
                          }))}
                          className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                        />
                        <label htmlFor="registrationFeePrepaid" className="text-sm text-gray-700">선납</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="registrationFeePostpaid"
                          checked={servicePlanForm.registrationFeePostpaid}
                          onChange={(e) => setServicePlanForm(prev => ({ 
                            ...prev, 
                            registrationFeePostpaid: e.target.checked,
                            registrationFeePrepaid: e.target.checked ? false : prev.registrationFeePrepaid
                          }))}
                          className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                        />
                        <label htmlFor="registrationFeePostpaid" className="text-sm text-gray-700">후납</label>
                      </div>
                    </div>
                  </div>

                  {/* 유심비 */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">유심비</Label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="simFeePrepaid"
                          checked={servicePlanForm.simFeePrepaid}
                          onChange={(e) => setServicePlanForm(prev => ({ 
                            ...prev, 
                            simFeePrepaid: e.target.checked,
                            simFeePostpaid: e.target.checked ? false : prev.simFeePostpaid
                          }))}
                          className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                        />
                        <label htmlFor="simFeePrepaid" className="text-sm text-gray-700">선납</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="simFeePostpaid"
                          checked={servicePlanForm.simFeePostpaid}
                          onChange={(e) => setServicePlanForm(prev => ({ 
                            ...prev, 
                            simFeePostpaid: e.target.checked,
                            simFeePrepaid: e.target.checked ? false : prev.simFeePrepaid
                          }))}
                          className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                        />
                        <label htmlFor="simFeePostpaid" className="text-sm text-gray-700">후납</label>
                      </div>
                    </div>
                  </div>

                  {/* 결합 */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">결합</Label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="bundleApplied"
                          checked={servicePlanForm.bundleApplied}
                          onChange={(e) => setServicePlanForm(prev => ({ 
                            ...prev, 
                            bundleApplied: e.target.checked,
                            bundleNotApplied: e.target.checked ? false : prev.bundleNotApplied
                          }))}
                          className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                        />
                        <label htmlFor="bundleApplied" className="text-sm text-gray-700">결합</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="bundleNotApplied"
                          checked={servicePlanForm.bundleNotApplied}
                          onChange={(e) => setServicePlanForm(prev => ({ 
                            ...prev, 
                            bundleNotApplied: e.target.checked,
                            bundleApplied: e.target.checked ? false : prev.bundleApplied
                          }))}
                          className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                        />
                        <label htmlFor="bundleNotApplied" className="text-sm text-gray-700">미결합</label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 단말기 정보 */}
              <div className="bg-purple-50 p-4 rounded-lg">
                <Label className="text-lg font-semibold mb-3 block">단말기 정보</Label>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="deviceModel" className="text-sm font-medium">단말기 기종</Label>
                    <Input
                      id="deviceModel"
                      type="text"
                      placeholder="예: iPhone 15 Pro"
                      value={servicePlanForm.deviceModel || ''}
                      onChange={(e) => setServicePlanForm(prev => ({ ...prev, deviceModel: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="simNumber" className="text-sm font-medium">유심번호</Label>
                    <Input
                      id="simNumber"
                      type="text"
                      placeholder="예: 8982050000000000000"
                      value={servicePlanForm.simNumber || ''}
                      onChange={(e) => setServicePlanForm(prev => ({ ...prev, simNumber: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="subscriptionNumber" className="text-sm font-medium">가입번호</Label>
                    <Input
                      id="subscriptionNumber"
                      type="text"
                      placeholder="가입번호/계약번호"
                      value={servicePlanForm.subscriptionNumber || ''}
                      onChange={(e) => setServicePlanForm(prev => ({ ...prev, subscriptionNumber: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setServicePlanDialogOpen(false)}>
                  취소
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={servicePlanMutation.isPending}>
                  {servicePlanMutation.isPending ? '저장 중...' : '저장'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* 서류 목록 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>서류 목록</CardTitle>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">검색:</span>
                  <Input
                    placeholder="고객명 또는 연락처 검색"
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="w-48"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">개통방명코드:</span>
                  <Input
                    placeholder="개통방명코드 검색"
                    value={filters.contactCode}
                    onChange={(e) => setFilters(prev => ({ ...prev, contactCode: e.target.value }))}
                    className="w-48"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">통신사:</span>
                  <Select
                    value={filters.carrier}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, carrier: value }))}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="통신사 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">전체</SelectItem>
                      {carriers?.map((carrier) => (
                        <SelectItem key={carrier} value={carrier}>
                          {carrier}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">상태:</span>
                  <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="전체 상태" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체 상태</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Badge variant="outline" className="text-sm">
                  총 {documents?.length || 0}건
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto"></div>
                <p className="mt-2 text-sm text-gray-500">로딩 중...</p>
              </div>
            ) : documents && documents.length > 0 ? (
              <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                <table className="w-full divide-y divide-gray-300 text-sm" style={{ minWidth: '1000px' }}>
                  <colgroup>
                    <col style={{ width: '100px' }} />
                    <col style={{ width: '80px' }} />
                    <col style={{ width: '100px' }} />
                    <col style={{ width: '100px' }} />
                    <col style={{ width: '60px' }} />
                    <col style={{ width: '60px' }} />
                    <col style={{ width: '60px' }} />
                    <col style={{ width: '90px' }} />
                    <col style={{ width: '90px' }} />
                    <col style={{ width: '110px' }} />
                    <col style={{ width: '100px' }} />
                  </colgroup>
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        접수일시
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        고객명
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        연락처
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        판매점명
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        통신사
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        유형
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        상태
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        개통상태
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        가입번호
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        요금제
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        작업
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {documents.map((doc) => (
                      <tr key={doc.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-xs font-medium text-gray-900">
                          <div className="leading-relaxed">
                            {formatReceptionDateTime(doc.uploadedAt)}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-900">
                          <div className="leading-relaxed">
                            {doc.customerName}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-900">
                          <div className="leading-relaxed">
                            {doc.customerPhone}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-900">
                          <div className="leading-relaxed">
                            {(doc as any).storeName || (doc as any).contactCode || '-'}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-700">
                          <div className="leading-relaxed">
                            {(doc as any).carrier || '-'}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-xs">
                          <Badge variant={
                            (doc as any).customerType === 'port-in' ? 'destructive' : 'default'
                          }>
                            {(doc as any).customerType === 'port-in' ? '번호이동' : '신규'}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">
                          {getStatusBadge(doc.status)}
                        </td>
                        <td className="px-3 py-2">
                          <div className="space-y-2">
                            {getActivationStatusBadge((doc as any).activationStatus || '대기')}
                            
                            {/* 보완 메모 표시 */}
                            {(doc as any).supplementNotes && (
                              <div className="p-2 bg-orange-50 border-l-4 border-orange-400 rounded-r text-xs">
                                <div className="font-bold text-orange-800 mb-1">📝 보완 요청</div>
                                <div className="text-orange-700 leading-tight">
                                  {(doc as any).supplementNotes.length > 80 
                                    ? `${(doc as any).supplementNotes.substring(0, 80)}...` 
                                    : (doc as any).supplementNotes
                                  }
                                </div>
                              </div>
                            )}

                            {/* 판매점 전달 메모 표시 */}
                            {(doc as any).dealerNotes && (
                              <div className="p-2 bg-green-50 border-l-4 border-green-400 rounded-r text-xs">
                                <div className="font-bold text-green-800 mb-1">💼 판매점 메모</div>
                                <div className="text-green-700 leading-tight">
                                  {(doc as any).dealerNotes.length > 80 
                                    ? `${(doc as any).dealerNotes.substring(0, 80)}...` 
                                    : (doc as any).dealerNotes
                                  }
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-700">
                          <div className="leading-relaxed">
                            {(doc as any).subscriptionNumber || '-'}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-700">
                          <div className="leading-relaxed">
                            {(doc as any).servicePlanName || '-'}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-col space-y-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownload(doc.id)}
                              className="h-7 text-xs"
                            >
                              <Download className="mr-1 h-3 w-3" />
                              다운로드
                            </Button>
                            
                            {canManageActivationStatus() && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleActivationStatusChange(doc)}
                                className="h-7 text-xs"
                              >
                                <Settings className="mr-1 h-3 w-3" />
                                상태변경
                              </Button>
                            )}
                            
                            {canSetServicePlan(doc) && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleServicePlanChange(doc)}
                                className="h-7 text-xs"
                              >
                                <Calculator className="mr-1 h-3 w-3" />
                                요금제
                              </Button>
                            )}

                            {(doc as any).activationStatus === '진행중' && (
                              <ChatDialog 
                                documentId={doc.id} 
                                onTrigger={(
                                  <Button size="sm" variant="outline" className="h-7 text-xs">
                                    <MessageCircle className="mr-1 h-3 w-3" />
                                    채팅
                                  </Button>
                                )}
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">서류가 없습니다</h3>
                <p className="mt-1 text-sm text-gray-500">해당 조건에 맞는 서류가 없습니다.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
