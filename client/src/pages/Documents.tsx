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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useApiRequest, useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import type { Document } from '../../../shared/schema';
import { FileText, Upload, Search, Download, Calendar, Settings } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

export function Documents() {
  const apiRequest = useApiRequest();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [filters, setFilters] = useState({
    status: '',
    search: '',
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
    supplementNotes: ''
  });
  
  const [servicePlanDialogOpen, setServicePlanDialogOpen] = useState(false);
  const [servicePlanForm, setServicePlanForm] = useState({
    servicePlanId: '',
    additionalServiceIds: [] as string[],
    registrationFee: 0,
    bundleDiscount: 0,
    totalMonthlyFee: 0,
    deviceModel: '',
    simNumber: ''
  });

  const { data: documents, isLoading } = useQuery({
    queryKey: ['/api/documents', filters],
    queryFn: () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') params.append(key, value);
      });
      return apiRequest(`/api/documents?${params}`) as Promise<Document[]>;
    },
  });

  const { data: servicePlans } = useQuery({
    queryKey: ['/api/service-plans'],
    queryFn: () => apiRequest('/api/service-plans') as Promise<any[]>,
  });

  // 부가서비스 고정 데이터 (필링, 캐치콜, 링투유, 통화중대기, 00700)
  const additionalServices = [
    { id: 1, serviceName: '필링', serviceType: '부가서비스', monthlyFee: 3000 },
    { id: 2, serviceName: '캐치콜', serviceType: '부가서비스', monthlyFee: 2000 },
    { id: 3, serviceName: '링투유', serviceType: '부가서비스', monthlyFee: 1500 },
    { id: 4, serviceName: '통화중대기', serviceType: '부가서비스', monthlyFee: 1000 },
    { id: 5, serviceName: '00700', serviceType: '부가서비스', monthlyFee: 0 }
  ];

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

  const handleDownload = (documentId: number) => {
    window.open(`/api/files/documents/${documentId}`, '_blank');
  };

  const handleDelete = (documentId: number) => {
    if (confirm('정말 이 서류를 삭제하시겠습니까?')) {
      deleteMutation.mutate(documentId);
    }
  };

  const handleActivationStatusChange = (doc: Document) => {
    setSelectedDocument(doc);
    setActivationForm({
      activationStatus: (doc as any).activationStatus || '대기',
      notes: ''
    });
    setActivationDialogOpen(true);
  };

  const handleActivationSubmit = () => {
    if (!selectedDocument) return;
    
    updateActivationMutation.mutate({
      id: selectedDocument.id,
      data: activationForm
    });
  };

  // Permission check functions
  const canUploadDocuments = () => {
    // 판매점만 접수 가능, 관리자와 근무자는 업로드 불가 (처리만 담당)
    return user?.role === 'dealer_store';
  };

  const canManageActivationStatus = () => {
    // 관리자와 근무자만 개통상태 관리 가능 (같은 회사에서 개통 업무 처리)
    return user?.role === 'dealer_worker' || user?.userType === 'admin';
  };

  const updateActivationMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const sessionId = useAuth.getState().sessionId;
      const response = await fetch(`/api/documents/${id}/activation`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionId}`,
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: '개통 상태 변경에 실패했습니다.' }));
        throw new Error(error.error || '개통 상태 변경에 실패했습니다.');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      setActivationDialogOpen(false);
      setSelectedDocument(null);
      setActivationForm({ activationStatus: '', notes: '' });
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
      case '개통':
        return <Badge variant="outline" className="text-green-600 border-green-600 text-xs px-1 py-0.5">개통</Badge>;
      case '취소':
        return <Badge variant="outline" className="text-red-600 border-red-600 text-xs px-1 py-0.5">취소</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs px-1 py-0.5">{status}</Badge>;
    }
  };

  const isAdmin = user?.userType === 'admin';

  const openServicePlanDialog = (doc: Document) => {
    setSelectedDocument(doc);
    setServicePlanForm({
      servicePlanId: (doc as any).servicePlanId?.toString() || '',
      additionalServiceIds: (doc as any).additionalServiceIds ? JSON.parse((doc as any).additionalServiceIds) : [],
      registrationFee: (doc as any).registrationFee || 0,
      bundleDiscount: (doc as any).bundleDiscount || 0,
      totalMonthlyFee: (doc as any).totalMonthlyFee || 0,
      deviceModel: (doc as any).deviceModel || '',
      simNumber: (doc as any).simNumber || ''
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
      registrationFee: servicePlanForm.registrationFee,
      bundleDiscount: servicePlanForm.bundleDiscount,
      totalMonthlyFee: servicePlanForm.totalMonthlyFee
    };
    
    servicePlanMutation.mutate(data);
  };

  return (
    <Layout title="접수 관리">
      <div className="space-y-6">
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

        {/* Filters */}
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="sm:col-span-2 lg:col-span-1">
                <Label htmlFor="search">검색</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="고객명 또는 접수번호 검색"
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="status">상태</Label>
                <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="전체 상태" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 상태</SelectItem>
                    <SelectItem value="접수">접수</SelectItem>
                    <SelectItem value="보완필요">보완필요</SelectItem>
                    <SelectItem value="완료">완료</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="startDate">시작일</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="endDate">종료일</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Documents Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto"></div>
                <p className="mt-2 text-sm text-gray-500">로딩 중...</p>
              </div>
            ) : documents && documents.length > 0 ? (
              <>
                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full table-fixed divide-y divide-gray-300 text-sm">
                    <colgroup>
                      <col className="w-20" />
                      <col className="w-16" />
                      <col className="w-20" />
                      <col className="w-16" />
                      <col className="w-14" />
                      <col className="w-12" />
                      <col className="w-16" />
                      <col className="w-18" />
                      <col className="w-18" />
                      {isAdmin && <col className="w-16" />}
                      <col className="w-16" />
                    </colgroup>
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-1 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider truncate">
                          접수번호
                        </th>
                        <th className="px-1 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider truncate">
                          고객명
                        </th>
                        <th className="px-1 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider truncate">
                          연락처
                        </th>
                        <th className="px-1 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider truncate">
                          판매점명
                        </th>
                        <th className="px-1 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider truncate">
                          통신사
                        </th>
                        <th className="px-1 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider truncate">
                          상태
                        </th>
                        <th className="px-1 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider truncate">
                          개통상태
                        </th>
                        <th className="px-1 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider truncate">
                          요금제정보
                        </th>
                        <th className="px-1 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider truncate">
                          업로드일
                        </th>
                        {isAdmin && (
                          <th className="px-1 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider truncate">
                            대리점
                          </th>
                        )}
                        <th className="px-1 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider truncate">
                          작업
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {documents.map((doc) => (
                        <tr key={doc.id} className="hover:bg-gray-50">
                          <td className="px-1 py-1 text-xs font-medium text-gray-900 truncate">
                            {doc.documentNumber}
                          </td>
                          <td className="px-1 py-1 text-xs text-gray-900 truncate">
                            {doc.customerName}
                          </td>
                          <td className="px-1 py-1 text-xs text-gray-900 truncate">
                            {doc.customerPhone}
                          </td>
                          <td className="px-1 py-1 text-xs text-gray-500 truncate">
                            {(doc as any).storeName || '-'}
                          </td>
                          <td className="px-1 py-1 text-xs text-gray-700 truncate">
                            {(doc as any).carrier || '-'}
                          </td>
                          <td className="px-1 py-1">
                            {getStatusBadge(doc.status)}
                          </td>
                          <td className="px-1 py-1">
                            {getActivationStatusBadge((doc as any).activationStatus || '대기')}
                          </td>
                          <td className="px-1 py-1 text-xs text-gray-700">
                            {(doc as any).activationStatus === '개통' ? (
                              <div className="space-y-0.5">
                                {(doc as any).servicePlanName && (
                                  <div className="font-medium text-blue-600 text-xs truncate">
                                    {(doc as any).servicePlanName}
                                  </div>
                                )}
                                {(doc as any).additionalServices && (
                                  <div className="text-xs text-gray-500 truncate">
                                    부가: {(doc as any).additionalServices}
                                  </div>
                                )}
                                {(doc as any).totalMonthlyFee && (
                                  <div className="text-xs font-medium text-green-600">
                                    월 {(doc as any).totalMonthlyFee.toLocaleString()}원
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div>
                                <span className="text-gray-400">-</span>
                                {/* 보완 메모 표시 */}
                                {(doc as any).supplementNotes && (
                                  <div className="mt-1 p-2 bg-orange-50 border border-orange-200 rounded text-xs">
                                    <div className="font-medium text-orange-700 mb-1">보완요청</div>
                                    <div className="text-orange-800 text-xs leading-tight">
                                      {(doc as any).supplementNotes.length > 50 
                                        ? `${(doc as any).supplementNotes.substring(0, 50)}...` 
                                        : (doc as any).supplementNotes
                                      }
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-1 py-1 text-xs text-gray-500 truncate">
                            {format(new Date(doc.uploadedAt), 'MM-dd HH:mm', { locale: ko })}
                          </td>
                          {isAdmin && (
                            <td className="px-1 py-1 text-xs text-gray-500 truncate">
                              {(doc as any).dealerName}
                            </td>
                          )}
                          <td className="px-1 py-1">
                            <div className="flex flex-wrap gap-1">
                              {doc.filePath && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDownload(doc.id)}
                                  title="파일 다운로드"
                                  className="h-5 w-5 p-0"
                                >
                                  <Download className="h-3 w-3" />
                                </Button>
                              )}
                              {canManageActivationStatus() && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleActivationStatusChange(doc)}
                                  title="개통상태 변경"
                                  className="h-5 px-1 text-xs"
                                >
                                  개통
                                </Button>
                              )}
                              {(doc as any).activationStatus === '개통' && canManageActivationStatus() && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openServicePlanDialog(doc)}
                                  title="요금제 선택"
                                  className="h-5 px-1 text-xs"
                                >
                                  요금제
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="lg:hidden space-y-4">
                  {documents.map((doc) => (
                    <div key={doc.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">{doc.documentNumber}</h3>
                          <p className="text-sm text-gray-600">{doc.customerName}</p>
                        </div>
                        <div className="flex space-x-1">
                          {getStatusBadge(doc.status)}
                          {getActivationStatusBadge((doc as any).activationStatus || '대기')}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                        <div>
                          <span className="text-gray-500">연락처:</span>
                          <span className="ml-1 text-gray-900">{doc.customerPhone}</span>
                        </div>
                        {(doc as any).storeName && (
                          <div>
                            <span className="text-gray-500">판매점:</span>
                            <span className="ml-1 text-gray-900">{(doc as any).storeName}</span>
                          </div>
                        )}
                        {(doc as any).carrier && (
                          <div>
                            <span className="text-gray-500">통신사:</span>
                            <span className="ml-1 text-gray-900">{(doc as any).carrier}</span>
                          </div>
                        )}
                        {isAdmin && (
                          <div className="col-span-2">
                            <span className="text-gray-500">대리점:</span>
                            <span className="ml-1 text-gray-900">{(doc as any).dealerName}</span>
                          </div>
                        )}
                        {(doc as any).activationStatus === '개통' && (
                          <div className="col-span-2">
                            <span className="text-gray-500">요금제:</span>
                            <div className="ml-1 mt-1 space-y-1">
                              {(doc as any).servicePlanName && (
                                <div className="text-sm font-medium text-blue-600">
                                  {(doc as any).servicePlanName}
                                </div>
                              )}
                              {(doc as any).additionalServices && (
                                <div className="text-xs text-gray-500">
                                  부가: {(doc as any).additionalServices}
                                </div>
                              )}
                              {(doc as any).totalMonthlyFee && (
                                <div className="text-xs font-medium text-green-600">
                                  월 {(doc as any).totalMonthlyFee.toLocaleString()}원
                                </div>
                              )}
                              {((doc as any).deviceModel || (doc as any).simNumber) && (
                                <div className="text-xs text-gray-500">
                                  {(doc as any).deviceModel && `단말기: ${(doc as any).deviceModel}`}
                                  {(doc as any).deviceModel && (doc as any).simNumber && ' | '}
                                  {(doc as any).simNumber && `유심: ${(doc as any).simNumber}`}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* 보완 메모 표시 */}
                        {(doc as any).supplementNotes && (
                          <div className="col-span-2 mt-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                            <div className="text-xs font-medium text-orange-700 mb-1">보완 요청 사항</div>
                            <div className="text-sm text-orange-800">{(doc as any).supplementNotes}</div>
                            {(doc as any).supplementRequiredAt && (
                              <div className="text-xs text-orange-600 mt-1">
                                {format(new Date((doc as any).supplementRequiredAt), 'yyyy-MM-dd HH:mm', { locale: ko })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">
                          {format(new Date(doc.uploadedAt), 'yyyy-MM-dd HH:mm', { locale: ko })}
                        </span>
                        <div className="flex space-x-2">
                          {doc.filePath && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownload(doc.id)}
                              title="파일 다운로드"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                          {canManageActivationStatus() && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleActivationStatusChange(doc)}
                              title="개통상태 변경"
                            >
                              개통상태
                            </Button>
                          )}
                          {(doc as any).activationStatus === '개통' && canManageActivationStatus() && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openServicePlanDialog(doc)}
                              title="요금제 선택"
                            >
                              요금제
                            </Button>
                          )}
                          {user?.userType === 'admin' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(doc.id)}
                              disabled={doc.status !== '접수'}
                              title="서류 삭제"
                            >
                              삭제
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">서류가 없습니다</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {!isAdmin ? '첫 번째 서류를 업로드해보세요.' : '업로드된 서류가 없습니다.'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activation Status Dialog */}
        <Dialog open={activationDialogOpen} onOpenChange={setActivationDialogOpen}>
          <DialogContent className="sm:max-w-[425px]" aria-describedby="activation-dialog-description">
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
                    <SelectItem value="보완필요">보완필요</SelectItem>
                    <SelectItem value="개통">개통완료</SelectItem>
                    <SelectItem value="취소">취소</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
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
                  <div className="text-xs text-orange-600 mt-1">
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
            </div>
            
            <form onSubmit={handleServicePlanSubmit} className="space-y-6">
              {/* 요금제 선택 */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <Label className="text-lg font-semibold mb-3 block">기본 요금제</Label>
                <Select 
                  value={servicePlanForm.servicePlanId} 
                  onValueChange={(value) => setServicePlanForm(prev => ({ ...prev, servicePlanId: value }))}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="요금제를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {servicePlans?.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id.toString()}>
                        {plan.planName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="registrationFee" className="text-sm font-medium">가입비</Label>
                    <Input
                      id="registrationFee"
                      type="number"
                      value={servicePlanForm.registrationFee}
                      onChange={(e) => setServicePlanForm(prev => ({ ...prev, registrationFee: parseInt(e.target.value) || 0 }))}
                      placeholder="0"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="bundleDiscount" className="text-sm font-medium">결합 할인</Label>
                    <Input
                      id="bundleDiscount"
                      type="number"
                      value={servicePlanForm.bundleDiscount}
                      onChange={(e) => setServicePlanForm(prev => ({ ...prev, bundleDiscount: parseInt(e.target.value) || 0 }))}
                      placeholder="0"
                      className="mt-1"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <Label htmlFor="totalMonthlyFee" className="text-sm font-medium">총 월 요금</Label>
                  <Input
                    id="totalMonthlyFee"
                    type="number"
                    value={servicePlanForm.totalMonthlyFee}
                    onChange={(e) => setServicePlanForm(prev => ({ ...prev, totalMonthlyFee: parseInt(e.target.value) || 0 }))}
                    placeholder="0"
                    className="mt-1 text-lg font-bold"
                  />
                </div>
              </div>

              {/* 단말기 정보 */}
              <div className="bg-purple-50 p-4 rounded-lg">
                <Label className="text-lg font-semibold mb-3 block">단말기 정보</Label>
                <div className="grid grid-cols-2 gap-4">
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
      </div>
    </Layout>
  );
}
