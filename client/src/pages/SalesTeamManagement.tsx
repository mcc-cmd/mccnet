import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createSalesTeamSchema, createSalesManagerSchema, createContactCodeMappingSchema } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Plus, Users, User, Settings } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SalesTeam {
  id: number;
  teamName: string;
  teamCode: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SalesManager {
  id: number;
  teamId: number;
  managerName: string;
  managerCode: string;
  username: string;
  contactPhone?: string;
  email?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ContactCodeMapping {
  id: number;
  managerId: number;
  carrier: string;
  contactCode: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function SalesTeamManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false);
  const [isManagerDialogOpen, setIsManagerDialogOpen] = useState(false);
  const [isMappingDialogOpen, setIsMappingDialogOpen] = useState(false);

  // 영업팀 목록 조회
  const { data: teams = [], isLoading: teamsLoading } = useQuery({
    queryKey: ['/api/admin/sales-teams'],
    queryFn: () => apiRequest('/api/admin/sales-teams')
  });

  // 영업과장 목록 조회
  const { data: managers = [], isLoading: managersLoading } = useQuery({
    queryKey: ['/api/admin/sales-managers'],
    queryFn: () => apiRequest('/api/admin/sales-managers')
  });

  // 접점 코드 매핑 목록 조회
  const { data: mappings = [], isLoading: mappingsLoading } = useQuery({
    queryKey: ['/api/admin/contact-code-mappings'],
    queryFn: () => apiRequest('/api/admin/contact-code-mappings')
  });

  // 영업팀 생성 폼
  const teamForm = useForm({
    resolver: zodResolver(createSalesTeamSchema),
    defaultValues: {
      teamName: '',
      teamCode: '',
      description: ''
    }
  });

  // 영업과장 생성 폼
  const managerForm = useForm({
    resolver: zodResolver(createSalesManagerSchema),
    defaultValues: {
      teamId: 0,
      managerName: '',
      managerCode: '',
      username: '',
      password: '',
      contactPhone: '',
      email: ''
    }
  });

  // 접점 코드 매핑 생성 폼
  const mappingForm = useForm({
    resolver: zodResolver(createContactCodeMappingSchema),
    defaultValues: {
      managerId: 0,
      carrier: '',
      contactCode: ''
    }
  });

  // 영업팀 생성 뮤테이션
  const createTeamMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/admin/sales-teams', { method: 'POST', data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sales-teams'] });
      toast({ title: "성공", description: "영업팀이 생성되었습니다." });
      setIsTeamDialogOpen(false);
      teamForm.reset();
    },
    onError: (error: any) => {
      toast({ 
        title: "오류", 
        description: error.message || "영업팀 생성 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  });

  // 영업과장 생성 뮤테이션
  const createManagerMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/admin/sales-managers', { method: 'POST', data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sales-managers'] });
      toast({ title: "성공", description: "영업과장이 생성되었습니다." });
      setIsManagerDialogOpen(false);
      managerForm.reset();
    },
    onError: (error: any) => {
      toast({ 
        title: "오류", 
        description: error.message || "영업과장 생성 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  });

  // 접점 코드 매핑 생성 뮤테이션
  const createMappingMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/admin/contact-code-mappings', { method: 'POST', data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/contact-code-mappings'] });
      toast({ title: "성공", description: "접점 코드 매핑이 생성되었습니다." });
      setIsMappingDialogOpen(false);
      mappingForm.reset();
    },
    onError: (error: any) => {
      toast({ 
        title: "오류", 
        description: error.message || "접점 코드 매핑 생성 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  });

  const onTeamSubmit = (data: any) => {
    createTeamMutation.mutate(data);
  };

  const onManagerSubmit = (data: any) => {
    createManagerMutation.mutate(data);
  };

  const onMappingSubmit = (data: any) => {
    createMappingMutation.mutate(data);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">영업조직 관리</h1>
      </div>

      <Tabs defaultValue="teams" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="teams" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            영업팀 관리
          </TabsTrigger>
          <TabsTrigger value="managers" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            영업과장 관리
          </TabsTrigger>
          <TabsTrigger value="mappings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            접점 코드 매핑
          </TabsTrigger>
        </TabsList>

        {/* 영업팀 관리 탭 */}
        <TabsContent value="teams">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>영업팀 목록</CardTitle>
              <Dialog open={isTeamDialogOpen} onOpenChange={setIsTeamDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    영업팀 추가
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>새 영업팀 추가</DialogTitle>
                  </DialogHeader>
                  <Form {...teamForm}>
                    <form onSubmit={teamForm.handleSubmit(onTeamSubmit)} className="space-y-4">
                      <FormField
                        control={teamForm.control}
                        name="teamName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>팀명</FormLabel>
                            <FormControl>
                              <Input placeholder="예: 1영업팀" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={teamForm.control}
                        name="teamCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>팀 코드</FormLabel>
                            <FormControl>
                              <Input placeholder="예: TEAM01" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={teamForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>설명 (선택사항)</FormLabel>
                            <FormControl>
                              <Textarea placeholder="팀 설명을 입력하세요" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" disabled={createTeamMutation.isPending}>
                        {createTeamMutation.isPending ? '생성 중...' : '생성'}
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {teamsLoading ? (
                <div>로딩 중...</div>
              ) : (
                <div className="grid gap-4">
                  {teams.map((team: SalesTeam) => (
                    <Card key={team.id}>
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold">{team.teamName}</h3>
                            <p className="text-sm text-muted-foreground">코드: {team.teamCode}</p>
                            {team.description && (
                              <p className="text-sm mt-2">{team.description}</p>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            생성일: {new Date(team.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 영업과장 관리 탭 */}
        <TabsContent value="managers">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>영업과장 목록</CardTitle>
              <Dialog open={isManagerDialogOpen} onOpenChange={setIsManagerDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    영업과장 추가
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>새 영업과장 추가</DialogTitle>
                  </DialogHeader>
                  <Form {...managerForm}>
                    <form onSubmit={managerForm.handleSubmit(onManagerSubmit)} className="space-y-4">
                      <FormField
                        control={managerForm.control}
                        name="teamId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>소속 팀</FormLabel>
                            <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="팀을 선택하세요" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {teams.map((team: SalesTeam) => (
                                  <SelectItem key={team.id} value={team.id.toString()}>
                                    {team.teamName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={managerForm.control}
                        name="managerName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>과장명</FormLabel>
                            <FormControl>
                              <Input placeholder="예: 홍길동" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={managerForm.control}
                        name="managerCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>과장 코드</FormLabel>
                            <FormControl>
                              <Input placeholder="예: MGR001" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={managerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>로그인 ID</FormLabel>
                            <FormControl>
                              <Input placeholder="로그인에 사용할 ID" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={managerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>비밀번호</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="비밀번호" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" disabled={createManagerMutation.isPending}>
                        {createManagerMutation.isPending ? '생성 중...' : '생성'}
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {managersLoading ? (
                <div>로딩 중...</div>
              ) : (
                <div className="grid gap-4">
                  {managers.map((manager: SalesManager) => (
                    <Card key={manager.id}>
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold">{manager.managerName}</h3>
                            <p className="text-sm text-muted-foreground">
                              코드: {manager.managerCode} | ID: {manager.username}
                            </p>
                            {manager.contactPhone && (
                              <p className="text-sm">연락처: {manager.contactPhone}</p>
                            )}
                            {manager.email && (
                              <p className="text-sm">이메일: {manager.email}</p>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            생성일: {new Date(manager.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 접점 코드 매핑 탭 */}
        <TabsContent value="mappings">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>접점 코드 매핑</CardTitle>
              <Dialog open={isMappingDialogOpen} onOpenChange={setIsMappingDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    매핑 추가
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>새 접점 코드 매핑 추가</DialogTitle>
                  </DialogHeader>
                  <Form {...mappingForm}>
                    <form onSubmit={mappingForm.handleSubmit(onMappingSubmit)} className="space-y-4">
                      <FormField
                        control={mappingForm.control}
                        name="managerId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>영업과장</FormLabel>
                            <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="영업과장을 선택하세요" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {managers.map((manager: SalesManager) => (
                                  <SelectItem key={manager.id} value={manager.id.toString()}>
                                    {manager.managerName} ({manager.managerCode})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={mappingForm.control}
                        name="carrier"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>통신사</FormLabel>
                            <FormControl>
                              <Input placeholder="예: SKT, KT, LGU+" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={mappingForm.control}
                        name="contactCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>접점 코드</FormLabel>
                            <FormControl>
                              <Input placeholder="접점 코드를 입력하세요" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" disabled={createMappingMutation.isPending}>
                        {createMappingMutation.isPending ? '생성 중...' : '생성'}
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {mappingsLoading ? (
                <div>로딩 중...</div>
              ) : (
                <div className="grid gap-4">
                  {mappings.map((mapping: ContactCodeMapping) => (
                    <Card key={mapping.id}>
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold">{mapping.carrier}</h3>
                            <p className="text-sm text-muted-foreground">
                              접점 코드: {mapping.contactCode}
                            </p>
                            <p className="text-sm">담당자 ID: {mapping.managerId}</p>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            생성일: {new Date(mapping.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}