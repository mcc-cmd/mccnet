import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Building, LogIn, UserPlus } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import mccLogoPath from "@assets/image_1755075135342.png";

const dealerLoginSchema = z.object({
  username: z.string().min(1, "아이디를 입력해주세요"),
  password: z.string().min(1, "비밀번호를 입력해주세요")
});

type DealerLoginForm = z.infer<typeof dealerLoginSchema>;

export function DealerLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { checkAuth } = useAuth();

  const form = useForm<DealerLoginForm>({
    resolver: zodResolver(dealerLoginSchema),
    defaultValues: {
      username: "",
      password: ""
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: DealerLoginForm) => {
      console.log('Making API request to /api/dealer-login with data:', data);
      const response = await apiRequest("POST", "/api/dealer-login", data);
      console.log('API response received:', response);
      return response.json();
    },
    onSuccess: async (data) => {
      console.log("Dealer login successful:", data);
      
      // 세션ID 저장
      if (data.sessionId) {
        localStorage.setItem('sessionId', data.sessionId);
      }
      
      // auth 상태 업데이트
      await checkAuth();
      
      toast({
        title: "로그인 성공",
        description: `${data.user.name}님, 환영합니다!`,
      });
      
      // 페이지 새로고침으로 확실한 리디렉션
      setTimeout(() => {
        window.location.replace("/dealer");
      }, 1500);
    },
    onError: (error: any) => {
      console.error("Dealer login error:", error);
      toast({
        title: "로그인 실패",
        description: error.message || "로그인 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  function onSubmit(data: DealerLoginForm) {
    console.log('Form submitted with data:', data);
    console.log('Form errors:', form.formState.errors);
    loginMutation.mutate(data);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md space-y-6">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex items-center justify-center">
              <img 
                src={mccLogoPath} 
                alt="MCC 로고" 
                className="h-16 w-auto object-contain"
              />
            </div>
            <CardTitle className="text-2xl">판매점 로그인</CardTitle>
            <CardDescription>
              MCC네트월드 판매점 계정으로 로그인하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>아이디</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="아이디를 입력하세요"
                          autoComplete="username"
                          {...field} 
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
                      <FormLabel>비밀번호</FormLabel>
                      <FormControl>
                        <Input 
                          type="password"
                          placeholder="비밀번호를 입력하세요"
                          autoComplete="current-password"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loginMutation.isPending}
                  onClick={(e) => {
                    console.log('Button clicked!');
                    console.log('Form valid:', form.formState.isValid);
                    console.log('Form values:', form.getValues());
                  }}
                >
                  <LogIn className="mr-2 h-4 w-4" />
                  {loginMutation.isPending ? "로그인 중..." : "로그인"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>



        {/* 직원 로그인 링크 */}
        <div className="text-center">
          <Link href="/login" className="text-sm text-muted-foreground hover:text-primary">
            직원 로그인 →
          </Link>
        </div>
      </div>
    </div>
  );
}