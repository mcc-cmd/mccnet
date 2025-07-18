import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { createDealerSchema, createUserSchema, updateDocumentStatusSchema } from '../../../shared/schema';
import type { Dealer, User, Document, PricingTable } from '../../../shared/schema';
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
  TrendingUp
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
  dealerId: number;
  email: string;
  password: string;
  name: string;
  role: 'dealer_admin' | 'dealer_staff';
};

type UpdateDocumentStatusForm = {
  status: '접수' | '보완필요' | '완료';
  activationStatus?: '대기' | '개통' | '취소';
  notes?: string;
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
  const [pricingDialogOpen, setPricingDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pricingTitle, setPricingTitle] = useState('');

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

  const { data: workerStats, isLoading: workerStatsLoading } = useQuery({
    queryKey: ['/api/worker-stats'],
    queryFn: () => apiRequest('/api/worker-stats') as Promise<Array<{
      workerName: string;
      totalActivations: number;
      monthlyActivations: number;
      dealerId: number;
    }>>,
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
      dealerId: 0,
      email: '',
      password: '',
      name: '',
      role: 'dealer_staff',
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

  const uploadPricingMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch('/api/admin/pricing-tables', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sessionId')}`,
        },
        body: data,
      });
      
      if (!response.ok) {
        const error = await response.json();
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
        <Tabs defaultValue="dealers" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="dealers" className="flex items-center space-x-2">
              <Building2 className="h-4 w-4" />
              <span>대리점</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>사용자</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>서류 관리</span>
            </TabsTrigger>
            <TabsTrigger value="workers" className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4" />
              <span>판매점 통계</span>
            </TabsTrigger>
            <TabsTrigger value="pricing" className="flex items-center space-x-2">
              <Calculator className="h-4 w-4" />
              <span>단가표</span>
            </TabsTrigger>
          </TabsList>

          {/* Dealers Tab */}
          <TabsContent value="dealers">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>대리점 관리</CardTitle>
                <Dialog open={dealerDialogOpen} onOpenChange={setDealerDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      대리점 추가
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>새 대리점 추가</DialogTitle>
                    </DialogHeader>
                    <Form {...dealerForm}>
                      <form onSubmit={dealerForm.handleSubmit(handleCreateDealer)} className="space-y-4">
                        <FormField
                          control={dealerForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>대리점명</FormLabel>
                              <FormControl>
                                <Input placeholder="대리점명을 입력하세요" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={dealerForm.control}
                          name="location"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>위치</FormLabel>
                              <FormControl>
                                <Input placeholder="위치를 입력하세요" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={dealerForm.control}
                          name="contactEmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>연락처 이메일</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="이메일을 입력하세요" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={dealerForm.control}
                          name="contactPhone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>연락처</FormLabel>
                              <FormControl>
                                <Input placeholder="연락처를 입력하세요" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex justify-end space-x-2">
                          <Button type="button" variant="outline" onClick={() => setDealerDialogOpen(false)}>
                            취소
                          </Button>
                          <Button type="submit" disabled={createDealerMutation.isPending}>
                            {createDealerMutation.isPending ? '생성 중...' : '생성'}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {dealersLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto"></div>
                  </div>
                ) : dealers && dealers.length > 0 ? (
                  <div className="grid gap-4">
                    {dealers.map((dealer) => (
                      <div key={dealer.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">{dealer.name}</h4>
                            <p className="text-sm text-gray-500">{dealer.location}</p>
                            <div className="flex items-center space-x-4 mt-1 text-xs text-gray-400">
                              <span>{dealer.contactEmail}</span>
                              <span>{dealer.contactPhone}</span>
                              <span>{format(new Date(dealer.createdAt), 'yyyy-MM-dd', { locale: ko })}</span>
                            </div>
                          </div>
                          <Building2 className="h-8 w-8 text-gray-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Building2 className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">대리점이 없습니다</h3>
                    <p className="mt-1 text-sm text-gray-500">첫 번째 대리점을 추가해보세요.</p>
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
                          name="dealerId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>대리점</FormLabel>
                              <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="대리점을 선택하세요" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {dealers?.map((dealer) => (
                                    <SelectItem key={dealer.id} value={dealer.id.toString()}>
                                      {dealer.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
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
                                  <SelectItem value="dealer_admin">대리점 관리자</SelectItem>
                                  <SelectItem value="dealer_staff">대리점 직원</SelectItem>
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
                                {user.role === 'dealer_admin' ? '관리자' : '직원'}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {format(new Date(user.createdAt), 'yyyy-MM-dd', { locale: ko })}
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

          {/* Documents Tab */}
          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <CardTitle>서류 관리</CardTitle>
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
                            작업
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
                              <div className="flex space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(`/api/files/documents/${doc.id}`, '_blank')}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openStatusDialog(doc)}
                                >
                                  상태 변경
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
                          accept=".xlsx,.xls,.pdf"
                          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                          required
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Excel 파일(.xlsx, .xls) 또는 PDF 파일만 업로드 가능 (최대 50MB)
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
        </Tabs>
      </div>
    </Layout>
  );
}
