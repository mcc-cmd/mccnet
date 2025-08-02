import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { salesManagerLoginSchema } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { User, Lock, Building2 } from 'lucide-react';

export default function SalesManagerLogin() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm({
    resolver: zodResolver(salesManagerLoginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    try {
      const response = await apiRequest('POST', '/api/auth/manager-login', data);
      const result = await response.json();

      if (result.success) {
        // auth 스토어에 저장
        const authStore = {
          state: {
            sessionId: result.sessionId,
            user: result.user,
            isAuthenticated: true
          }
        };
        localStorage.setItem('auth-storage', JSON.stringify(authStore));
        
        toast({
          title: "로그인 성공",
          description: `${result.user.name}님, 환영합니다!`,
        });

        // 영업과장 대시보드로 리다이렉트
        window.location.href = '/sales-manager-dashboard';
      } else {
        toast({
          title: "로그인 실패",
          description: result.error || "로그인에 실패했습니다.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "로그인 오류",
        description: error.message || "로그인 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Building2 className="mx-auto h-12 w-12 text-primary" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
            영업과장 로그인
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            영업 실적 관리 시스템
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">로그인</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        아이디
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="아이디를 입력하세요" 
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        비밀번호
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="비밀번호를 입력하세요" 
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading}
                >
                  {isLoading ? '로그인 중...' : '로그인'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            관리자 로그인은{' '}
            <a href="/login" className="font-medium text-primary hover:text-primary/80">
              여기를 클릭하세요
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}