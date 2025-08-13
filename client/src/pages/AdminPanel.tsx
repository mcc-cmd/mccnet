import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { BarChart3, FileText, Users, Settings, Phone, Mail, MapPin, Calendar, Search, Download, Edit, Trash2, Plus, Upload, CheckCircle, XCircle, Clock, AlertCircle, Eye, MessageSquare, Building, User, CheckCircle2, PlusCircle, UserPlus } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Layout from '@/components/Layout';

// Schema definitions
const createUserSchema = z.object({
  username: z.string().min(1, '사용자명은 필수입니다'),
  password: z.string().min(4, '비밀번호는 최소 4자리입니다'),
  name: z.string().min(1, '이름은 필수입니다'),
  role: z.enum(['admin', 'sales_manager', 'worker']),
  team: z.string().optional()
});

const createCarrierSchema = z.object({
  name: z.string().min(1, '통신사 이름은 필수입니다'),
  shortName: z.string().min(1, '줄임말은 필수입니다'),
  description: z.string().optional()
});

const createServicePlanSchema = z.object({
  carrier: z.string().min(1, '통신사 선택은 필수입니다'),
  category: z.string().min(1, '카테고리는 필수입니다'),
  name: z.string().min(1, '요금제 이름은 필수입니다'),
  monthlyFee: z.number().min(0, '월 이용료는 0원 이상이어야 합니다'),
  data: z.string().min(1, '데이터 제공량은 필수입니다'),
  isUnlimited: z.boolean(),
  description: z.string().optional()
});

const createAdditionalServiceSchema = z.object({
  carrier: z.string().min(1, '통신사 선택은 필수입니다'),
  name: z.string().min(1, '서비스 이름은 필수입니다'),
  monthlyFee: z.number().min(0, '월 이용료는 0원 이상이어야 합니다'),
  description: z.string().optional(),
  isRequired: z.boolean()
});

const createSettlementSchema = z.object({
  carrier: z.string().min(1, '통신사 선택은 필수입니다'),
  planName: z.string().min(1, '요금제명은 필수입니다'),
  baseCommission: z.number().min(0, '기본 수수료는 0원 이상이어야 합니다'),
  additionalCommission: z.number().min(0, '추가 수수료는 0원 이상이어야 합니다')
});

const editDealerSchema = z.object({
  name: z.string().min(1, '판매점명은 필수입니다'),
  username: z.string().min(1, '사용자명은 필수입니다'),
  password: z.string().optional(),
  contactEmail: z.string().email('유효한 이메일을 입력하세요').optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  location: z.string().optional()
});

export default function AdminPanel() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [carrierFilter, setCarrierFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Dialog states
  const [createUserDialogOpen, setCreateUserDialogOpen] = useState(false);
  const [createCarrierDialogOpen, setCreateCarrierDialogOpen] = useState(false);
  const [createServicePlanDialogOpen, setCreateServicePlanDialogOpen] = useState(false);
  const [createAdditionalServiceDialogOpen, setCreateAdditionalServiceDialogOpen] = useState(false);
  const [createSettlementDialogOpen, setCreateSettlementDialogOpen] = useState(false);
  const [editDealerDialogOpen, setEditDealerDialogOpen] = useState(false);
  const [selectedDealer, setSelectedDealer] = useState<any>(null);

  // Form instances
  const createUserForm = useForm<z.infer<typeof createUserSchema>>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      username: '',
      password: '',
      name: '',
      role: 'worker',
      team: ''
    }
  });

  const editDealerForm = useForm<z.infer<typeof editDealerSchema>>({
    resolver: zodResolver(editDealerSchema),
    defaultValues: {
      name: '',
      username: '',
      password: '',
      contactEmail: '',
      contactPhone: '',
      location: ''
    }
  });

  // Data fetching queries
  const { data: stats } = useQuery({
    queryKey: ['/api/admin/stats'],
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['/api/admin/documents'],
  });

  const { data: users = [] } = useQuery({
    queryKey: ['/api/admin/users'],
  });

  const { data: dealers = [] } = useQuery({
    queryKey: ['/api/admin/dealers'],
  });

  const { data: carriers = [] } = useQuery({
    queryKey: ['/api/carriers'],
  });

  const { data: servicePlans = [] } = useQuery({
    queryKey: ['/api/service-plans'],
  });

  const { data: additionalServices = [] } = useQuery({
    queryKey: ['/api/additional-services'],
  });

  const { data: settlements = [] } = useQuery({
    queryKey: ['/api/admin/settlements'],
  });

  // Mutation for updating dealer
  const updateDealerMutation = useMutation({
    mutationFn: async (data: { id: number; dealerData: any }) => {
      return apiRequest(`/api/admin/dealers/${data.id}`, {
        method: 'PUT',
        body: JSON.stringify(data.dealerData)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dealers'] });
      toast({
        title: '수정 완료',
        description: '판매점 정보가 성공적으로 수정되었습니다.',
      });
      setEditDealerDialogOpen(false);
      editDealerForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: '수정 실패',
        description: error.message || '판매점 수정 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    },
  });

  // Mutation for deleting dealer
  const deleteDealerMutation = useMutation({
    mutationFn: async (dealerId: number) => {
      return apiRequest(`/api/admin/dealers/${dealerId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dealers'] });
      toast({
        title: '삭제 완료',
        description: '판매점이 성공적으로 삭제되었습니다.',
      });
    },
    onError: (error: any) => {
      toast({
        title: '삭제 실패',
        description: error.message || '판매점 삭제 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    },
  });

  // Handle dealer edit
  const handleEditDealer = (dealer: any) => {
    setSelectedDealer(dealer);
    editDealerForm.reset({
      name: dealer.businessName || dealer.name || '',
      username: dealer.username || '',
      password: '',
      contactEmail: dealer.contactEmail || '',
      contactPhone: dealer.contactPhone || '',
      location: dealer.address || dealer.location || ''
    });
    setEditDealerDialogOpen(true);
  };

  // Handle dealer delete
  const handleDeleteDealer = async (dealerId: number, dealerName: string) => {
    if (confirm(`정말로 "${dealerName}" 판매점을 삭제하시겠습니까?`)) {
      deleteDealerMutation.mutate(dealerId);
    }
  };

  // Submit dealer edit form
  const onEditDealerSubmit = (values: z.infer<typeof editDealerSchema>) => {
    if (selectedDealer) {
      updateDealerMutation.mutate({
        id: selectedDealer.id,
        dealerData: values
      });
    }
  };

  const filteredDocuments = documents.filter((doc: any) => {
    const matchesSearch = searchTerm === '' || 
      doc.applicationNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.customerPhone?.includes(searchTerm);
    
    const matchesCarrier = carrierFilter === 'all' || doc.carrier === carrierFilter;
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    
    return matchesSearch && matchesCarrier && matchesStatus;
  });

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case '접수':
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/20 dark:text-yellow-300';
      case '진행중':
      case '업무요청중':
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-800/20 dark:text-blue-300';
      case '완료':
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-300';
      case '취소':
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800/20 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case '접수':
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case '진행중':
      case '업무요청중':
      case 'in_progress':
        return <AlertCircle className="h-4 w-4" />;
      case '완료':
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case '취소':
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <Layout title="관리자 패널">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">관리자 패널</h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">대시보드</TabsTrigger>
            <TabsTrigger value="documents">문서 관리</TabsTrigger>
            <TabsTrigger value="dealers">판매점 관리</TabsTrigger>
            <TabsTrigger value="users">사용자 관리</TabsTrigger>
            <TabsTrigger value="carriers">통신사 관리</TabsTrigger>
            <TabsTrigger value="settings">시스템 설정</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">총 문서 수</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalDocuments || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    전체 접수된 문서
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">활성 판매점</CardTitle>
                  <Building className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.activeDealers || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    승인된 판매점 수
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">등록 사용자</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    전체 사용자 계정
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">완료 문서</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.completedDocuments || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    처리 완료된 문서
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="문서 번호, 고객명, 전화번호로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={carrierFilter} onValueChange={setCarrierFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="통신사 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 통신사</SelectItem>
                  {carriers.map((carrier: any) => (
                    <SelectItem key={carrier.id} value={carrier.name}>
                      {carrier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="상태 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 상태</SelectItem>
                  <SelectItem value="접수">접수</SelectItem>
                  <SelectItem value="진행중">진행중</SelectItem>
                  <SelectItem value="업무요청중">업무요청중</SelectItem>
                  <SelectItem value="완료">완료</SelectItem>
                  <SelectItem value="취소">취소</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>문서 목록</CardTitle>
                <CardDescription>
                  총 {filteredDocuments.length}개의 문서가 있습니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-4 font-medium">문서번호</th>
                        <th className="text-left p-4 font-medium">고객명</th>
                        <th className="text-left p-4 font-medium">연락처</th>
                        <th className="text-left p-4 font-medium">통신사</th>
                        <th className="text-left p-4 font-medium">상태</th>
                        <th className="text-left p-4 font-medium">접수일</th>
                        <th className="text-left p-4 font-medium">작업</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDocuments.map((doc: any, index: number) => (
                        <tr key={doc.id || index} className="border-t">
                          <td className="p-4 font-mono text-sm">{doc.applicationNumber}</td>
                          <td className="p-4">{doc.customerName}</td>
                          <td className="p-4">{doc.customerPhone}</td>
                          <td className="p-4">{doc.carrier}</td>
                          <td className="p-4">
                            <Badge className={`${getStatusBadgeColor(doc.status)} flex items-center gap-1 w-fit`}>
                              {getStatusIcon(doc.status)}
                              {doc.status}
                            </Badge>
                          </td>
                          <td className="p-4 text-sm text-muted-foreground">
                            {doc.submittedAt ? format(new Date(doc.submittedAt), 'MM/dd HH:mm', { locale: ko }) : '-'}
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Dealers Tab */}
          <TabsContent value="dealers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>판매점 관리</CardTitle>
                <CardDescription>
                  등록된 판매점 목록을 관리합니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-4 font-medium">판매점명</th>
                        <th className="text-left p-4 font-medium">사용자명</th>
                        <th className="text-left p-4 font-medium">연락처</th>
                        <th className="text-left p-4 font-medium">이메일</th>
                        <th className="text-left p-4 font-medium">상태</th>
                        <th className="text-left p-4 font-medium">등록일</th>
                        <th className="text-left p-4 font-medium">작업</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dealers.map((dealer: any, index: number) => (
                        <tr key={dealer.id || index} className="border-t">
                          <td className="p-4 font-medium">{dealer.businessName || dealer.name}</td>
                          <td className="p-4 font-mono text-sm">{dealer.username}</td>
                          <td className="p-4">{dealer.contactPhone}</td>
                          <td className="p-4">{dealer.contactEmail}</td>
                          <td className="p-4">
                            <Badge variant={dealer.status === '승인' ? 'default' : 'secondary'}>
                              {dealer.status}
                            </Badge>
                          </td>
                          <td className="p-4 text-sm text-muted-foreground">
                            {dealer.createdAt ? format(new Date(dealer.createdAt), 'MM/dd HH:mm', { locale: ko }) : '-'}
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleEditDealer(dealer)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleDeleteDealer(dealer.id, dealer.businessName || dealer.name)}
                                disabled={deleteDealerMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <div className="flex justify-between">
              <h3 className="text-lg font-medium">사용자 관리</h3>
              <Dialog open={createUserDialogOpen} onOpenChange={setCreateUserDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="h-4 w-4 mr-2" />
                    사용자 추가
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>새 사용자 추가</DialogTitle>
                  </DialogHeader>
                  <Form {...createUserForm}>
                    <form onSubmit={createUserForm.handleSubmit(() => {})} className="space-y-4">
                      <FormField
                        control={createUserForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>사용자명</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={createUserForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>비밀번호</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={createUserForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>이름</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={createUserForm.control}
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
                                <SelectItem value="admin">관리자</SelectItem>
                                <SelectItem value="sales_manager">영업과장</SelectItem>
                                <SelectItem value="worker">근무자</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={() => setCreateUserDialogOpen(false)}>
                          취소
                        </Button>
                        <Button type="submit">
                          추가
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-4 font-medium">사용자명</th>
                        <th className="text-left p-4 font-medium">이름</th>
                        <th className="text-left p-4 font-medium">역할</th>
                        <th className="text-left p-4 font-medium">팀</th>
                        <th className="text-left p-4 font-medium">등록일</th>
                        <th className="text-left p-4 font-medium">작업</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user: any, index: number) => (
                        <tr key={user.id || index} className="border-t">
                          <td className="p-4 font-mono text-sm">{user.username}</td>
                          <td className="p-4">{user.name}</td>
                          <td className="p-4">
                            <Badge variant="outline">{user.role}</Badge>
                          </td>
                          <td className="p-4">{user.team || '-'}</td>
                          <td className="p-4 text-sm text-muted-foreground">
                            {user.createdAt ? format(new Date(user.createdAt), 'MM/dd HH:mm', { locale: ko }) : '-'}
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Carriers Tab */}
          <TabsContent value="carriers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>통신사 관리</CardTitle>
                <CardDescription>통신사 정보를 관리합니다.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-4 font-medium">통신사명</th>
                        <th className="text-left p-4 font-medium">줄임말</th>
                        <th className="text-left p-4 font-medium">설명</th>
                        <th className="text-left p-4 font-medium">작업</th>
                      </tr>
                    </thead>
                    <tbody>
                      {carriers.map((carrier: any, index: number) => (
                        <tr key={carrier.id || index} className="border-t">
                          <td className="p-4 font-medium">{carrier.name}</td>
                          <td className="p-4">{carrier.shortName}</td>
                          <td className="p-4">{carrier.description}</td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>시스템 설정</CardTitle>
                <CardDescription>시스템 전반적인 설정을 관리합니다.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium">자동 백업</h4>
                      <p className="text-sm text-muted-foreground">데이터베이스 자동 백업 기능</p>
                    </div>
                    <Button variant="outline">설정</Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium">알림 설정</h4>
                      <p className="text-sm text-muted-foreground">시스템 알림 및 이메일 설정</p>
                    </div>
                    <Button variant="outline">설정</Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium">보안 정책</h4>
                      <p className="text-sm text-muted-foreground">비밀번호 정책 및 세션 관리</p>
                    </div>
                    <Button variant="outline">설정</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Dealer Dialog */}
        <Dialog open={editDealerDialogOpen} onOpenChange={setEditDealerDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>판매점 정보 수정</DialogTitle>
              <DialogDescription>
                판매점의 기본 정보를 수정할 수 있습니다.
              </DialogDescription>
            </DialogHeader>
            <Form {...editDealerForm}>
              <form onSubmit={editDealerForm.handleSubmit(onEditDealerSubmit)} className="space-y-4">
                <FormField
                  control={editDealerForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>판매점명</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editDealerForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>사용자명</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editDealerForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>비밀번호 (변경 시에만 입력)</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} placeholder="변경하지 않으려면 비워두세요" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editDealerForm.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>이메일</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editDealerForm.control}
                  name="contactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>연락처</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editDealerForm.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>주소</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setEditDealerDialogOpen(false)}>
                    취소
                  </Button>
                  <Button type="submit" disabled={updateDealerMutation.isPending}>
                    {updateDealerMutation.isPending ? '수정 중...' : '수정'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}