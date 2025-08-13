import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { User, Building } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { DealerLayout } from "@/components/DealerLayout";

// 접수 신청 폼 스키마
const applicationSchema = z.object({
  customerName: z.string().min(1, "고객명을 입력해주세요"),
  customerPhone: z.string().min(1, "연락처를 입력해주세요"),
  customerIdNumber: z.string().min(1, "주민등록번호를 입력해주세요"),
  carrier: z.string().min(1, "통신사를 선택해주세요"),
  serviceType: z.string().min(1, "서비스 유형을 선택해주세요"),
  servicePlan: z.string().min(1, "요금제를 선택해주세요"),
  memo: z.string().optional(),
});

type ApplicationFormData = z.infer<typeof applicationSchema>;

export function SubmitApplication() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      customerName: "",
      customerPhone: "",
      customerIdNumber: "",
      carrier: "",
      serviceType: "",
      servicePlan: "",
      memo: "",
    },
  });

  const onSubmit = async (data: ApplicationFormData) => {
    setIsSubmitting(true);
    try {
      // TODO: API 호출로 접수 신청 제출
      console.log("접수 신청 데이터:", data);
      
      toast({
        title: "접수 신청 완료",
        description: "고객 접수가 성공적으로 신청되었습니다.",
      });
      
      // 폼 초기화
      form.reset();
    } catch (error) {
      console.error("접수 신청 오류:", error);
      toast({
        title: "접수 신청 실패",
        description: "접수 신청 중 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DealerLayout title="접수 신청" description="새로운 고객 접수 신청">
      <div className="p-2">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                고객 접수 신청서
              </CardTitle>
              <CardDescription>
                고객 정보와 서비스 요청 사항을 입력해주세요.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* 고객 정보 섹션 */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium flex items-center gap-2">
                      <User className="h-4 w-4" />
                      고객 정보
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            <FormLabel>연락처 *</FormLabel>
                            <FormControl>
                              <Input placeholder="010-0000-0000" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="customerIdNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>주민등록번호 *</FormLabel>
                          <FormControl>
                            <Input placeholder="000000-0000000" type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* 서비스 정보 섹션 */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      서비스 정보
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="carrier"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>통신사 *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="통신사를 선택하세요" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="SKT">SKT</SelectItem>
                                <SelectItem value="KT">KT</SelectItem>
                                <SelectItem value="LGU+">LG U+</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="serviceType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>서비스 유형 *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="서비스 유형을 선택하세요" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="신규">신규</SelectItem>
                                <SelectItem value="번호이동">번호이동</SelectItem>
                                <SelectItem value="기기변경">기기변경</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="servicePlan"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>요금제 *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="요금제를 선택하세요" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="5G 스페셜">5G 스페셜</SelectItem>
                              <SelectItem value="5G 슬림">5G 슬림</SelectItem>
                              <SelectItem value="LTE 프리미엄">LTE 프리미엄</SelectItem>
                              <SelectItem value="LTE 라이트">LTE 라이트</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* 추가 정보 섹션 */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">추가 정보</h3>
                    
                    <FormField
                      control={form.control}
                      name="memo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>메모</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="추가 요청사항이나 특이사항을 입력하세요"
                              className="min-h-[100px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* 제출 버튼 */}
                  <div className="flex gap-3 pt-6">
                    <Link href="/dealer" className="flex-1">
                      <Button type="button" variant="outline" className="w-full">
                        취소
                      </Button>
                    </Link>
                    <Button 
                      type="submit" 
                      className="flex-1"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "신청 중..." : "접수 신청"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
    </DealerLayout>
  );
}