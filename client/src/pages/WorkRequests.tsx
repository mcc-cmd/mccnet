import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateActivationStatusSchema } from '@shared/schema';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, FileText, User, Calendar, Phone, Building, CheckCircle } from 'lucide-react';
import { Document } from '@shared/schema';
import { z } from 'zod';

export default function WorkRequests() {
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [showCompletionMessage, setShowCompletionMessage] = useState(false);
  const { user } = useAuth();

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // 업무 요청중 상태의 서류들 조회
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['/api/documents', { activationStatus: '업무요청중' }],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/documents?activationStatus=업무요청중`);
      return response.json();
    }
  });

  // 서비스 플랜 조회
  const { data: servicePlans = [] } = useQuery({
    queryKey: ['/api/service-plans'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/service-plans');
      return response.json();
    }
  });

  // 부가 서비스 조회
  const { data: additionalServices = [] } = useQuery({
    queryKey: ['/api/additional-services'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/additional-services');
      return response.json();
    }  
  });

  // 활성화 상태 변경 폼
  const statusForm = useForm<z.infer<typeof updateActivationStatusSchema>>({
    resolver: zodResolver(updateActivationStatusSchema),
    defaultValues: {
      activationStatus: '개통',
      notes: '',
      deviceModel: '',
      simNumber: '',
      subscriptionNumber: ''
    }
  });

  // 활성화 상태 변경 mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await apiRequest('PUT', `/api/documents/${id}/activation-status`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      setStatusDialogOpen(false);
      setSelectedDocument(null);
      statusForm.reset();
      toast({
        title: "처리 완료",
        description: "업무가 성공적으로 처리되었습니다."
      });
    },
    onError: (error: any) => {
      toast({
        title: "처리 실패",
        description: error.message || "업무 처리에 실패했습니다.",
        variant: "destructive"
      });
    }
  });

  const handleStatusUpdate = (document: Document) => {
    setSelectedDocument(document);
    statusForm.reset({
      activationStatus: '개통',
      notes: '',
      deviceModel: document.deviceModel || '',
      simNumber: document.simNumber || '',
      subscriptionNumber: document.subscriptionNumber || ''
    });
    setStatusDialogOpen(true);
  };

  const onSubmitStatus = (data: z.infer<typeof updateActivationStatusSchema>) => {
    if (!selectedDocument) return;
    
    updateStatusMutation.mutate({
      id: selectedDocument.id,
      data: {
        ...data,
        activatedBy: user?.id
      }
    });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case '업무요청중': return 'secondary';
      default: return 'default';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">업무 요청 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">업무 요청중</h1>
          <p className="text-muted-foreground mt-1">
            업무 요청중인 서류들을 확인하고 완료 처리할 수 있습니다.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-lg px-3 py-1">
            총 {documents.length}건
          </Badge>
        </div>
      </div>

      {documents.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <div className="text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">업무 요청중인 서류가 없습니다</h3>
              <p className="mt-1 text-sm text-gray-500">현재 처리 대기중인 업무가 없습니다.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {documents.map((document: Document) => (
            <Card key={document.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center space-x-3">
                      <Badge variant={getStatusBadgeVariant(document.activationStatus)}>
                        {document.activationStatus}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(document.uploadedAt), { 
                          addSuffix: true, 
                          locale: ko 
                        })}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{document.customerName}</p>
                          <p className="text-xs text-muted-foreground">고객명</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{document.customerPhone}</p>
                          <p className="text-xs text-muted-foreground">연락처</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{document.carrier}</p>
                          <p className="text-xs text-muted-foreground">통신사</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">
                            {new Date(document.uploadedAt).toLocaleDateString('ko-KR')}
                          </p>
                          <p className="text-xs text-muted-foreground">접수일</p>
                        </div>
                      </div>
                    </div>

                    {document.dealerNotes && (
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                        <div className="flex items-start space-x-2">
                          <MessageSquare className="h-4 w-4 text-green-600 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-green-800">판매점 메모</p>
                            <p className="text-sm text-green-700 mt-1">{document.dealerNotes}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="ml-4">
                    <Button 
                      onClick={() => handleStatusUpdate(document)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      완료 처리
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 완료 처리 다이얼로그 */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>업무 완료 처리</DialogTitle>
          </DialogHeader>
          
          {selectedDocument && (
            <Form {...statusForm}>
              <form onSubmit={statusForm.handleSubmit(onSubmitStatus)} className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium mb-2">고객 정보</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><strong>고객명:</strong> {selectedDocument.customerName}</div>
                    <div><strong>연락처:</strong> {selectedDocument.customerPhone}</div>
                    <div><strong>통신사:</strong> {selectedDocument.carrier}</div>
                    <div><strong>접수일:</strong> {new Date(selectedDocument.uploadedAt).toLocaleDateString('ko-KR')}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={statusForm.control}
                    name="deviceModel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>기기 모델</FormLabel>
                        <FormControl>
                          <Input placeholder="기기 모델을 입력하세요" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={statusForm.control}
                    name="simNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>유심 번호</FormLabel>
                        <FormControl>
                          <Input placeholder="유심 번호를 입력하세요" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={statusForm.control}
                    name="subscriptionNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>가입 번호 *</FormLabel>
                        <FormControl>
                          <Input placeholder="가입 번호를 입력하세요" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={statusForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>완료 메모</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="완료 처리 관련 메모를 입력하세요 (선택사항)"
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2 pt-4 border-t">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setStatusDialogOpen(false)}
                  >
                    취소
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={updateStatusMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {updateStatusMutation.isPending ? '처리 중...' : '완료 처리'}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}