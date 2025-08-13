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
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<DealerLoginForm>({
    resolver: zodResolver(dealerLoginSchema),
    defaultValues: {
      username: "",
      password: ""
    },
  });

  async function handleLogin() {
    if (!username || !password) {
      toast({
        title: "입력 오류",
        description: "아이디와 비밀번호를 모두 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiRequest("POST", "/api/dealer-login", {
        username,
        password
      });
      const data = await response.json();
      
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
    } catch (error: any) {
      toast({
        title: "로그인 실패",
        description: error.message || "로그인 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function onSubmit(data: DealerLoginForm) {
    await handleLogin();
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
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      아이디
                    </label>
                    <Input 
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="아이디를 입력하세요"
                      autoComplete="username"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      비밀번호
                    </label>
                    <Input 
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="비밀번호를 입력하세요"
                      autoComplete="current-password"
                      className="mt-1"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleLogin();
                        }
                      }}
                    />
                  </div>

                  <Button 
                    type="button" 
                    className="w-full" 
                    disabled={isLoading}
                    onClick={handleLogin}
                  >
                    <LogIn className="mr-2 h-4 w-4" />
                    {isLoading ? "로그인 중..." : "로그인"}
                  </Button>
                </div>
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