import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, 
  MessageCircle, 
  Clock, 
  CheckCircle, 
  AlertCircle
} from "lucide-react";
import { Link } from "wouter";
import { DealerLayout } from "@/components/DealerLayout";

// 임시 데이터 구조 (실제로는 API에서 가져올 예정)
interface DealerApplication {
  id: number;
  documentNumber: string;
  customerName: string;
  carrier: string;
  serviceType: string;
  status: string;
  submittedAt: string;
  lastUpdated: string;
  hasUnreadMessages?: boolean;
}

export function DealerDashboard() {
  
  // 판매점의 신청 문서 목록 조회 (추후 구현)
  // const { data: applications = [], isLoading } = useQuery({
  //   queryKey: ["/api/dealer/applications"],
  //   enabled: false // 추후 API 구현 시 활성화
  // });

  // 임시 데이터
  const mockApplications: DealerApplication[] = [
    {
      id: 1,
      documentNumber: "D2025010001",
      customerName: "김고객",
      carrier: "KT",
      serviceType: "신규",
      status: "대기",
      submittedAt: "2025-01-12 09:30",
      lastUpdated: "2025-01-12 09:30",
      hasUnreadMessages: false
    },
    {
      id: 2,
      documentNumber: "D2025010002", 
      customerName: "이고객",
      carrier: "SKT",
      serviceType: "번호이동",
      status: "진행중",
      submittedAt: "2025-01-12 10:15",
      lastUpdated: "2025-01-12 14:20",
      hasUnreadMessages: true
    },
    {
      id: 3,
      documentNumber: "D2025010003",
      customerName: "박고객", 
      carrier: "LGU+",
      serviceType: "신규",
      status: "개통완료",
      submittedAt: "2025-01-11 16:40",
      lastUpdated: "2025-01-12 11:30",
      hasUnreadMessages: false
    }
  ];



  const getStatusCount = (status: string) => {
    return mockApplications.filter(app => app.status === status).length;
  };

  return (
    <DealerLayout title="대시보드" description="접수 현황 및 관리">
      <div className="p-4 space-y-4">
          {/* 통계 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">전체 신청</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{mockApplications.length}</div>
                <p className="text-xs text-muted-foreground">총 신청 건수</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">대기중</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{getStatusCount("대기")}</div>
                <p className="text-xs text-muted-foreground">처리 대기</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">진행중</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{getStatusCount("진행중")}</div>
                <p className="text-xs text-muted-foreground">처리 진행중</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">완료</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{getStatusCount("개통완료")}</div>
                <p className="text-xs text-muted-foreground">개통 완료</p>
              </CardContent>
            </Card>
          </div>

          {/* 신청 목록 */}
          <Card>
            <CardHeader>
              <CardTitle>신청 현황</CardTitle>
              <CardDescription>
                고객 신청서 처리 현황을 확인하실 수 있습니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="all">전체 ({mockApplications.length})</TabsTrigger>
                  <TabsTrigger value="pending">대기 ({getStatusCount("대기")})</TabsTrigger>
                  <TabsTrigger value="processing">진행중 ({getStatusCount("진행중")})</TabsTrigger>
                  <TabsTrigger value="completed">완료 ({getStatusCount("개통완료")})</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="space-y-4">
                  <ApplicationList applications={mockApplications} />
                </TabsContent>

                <TabsContent value="pending" className="space-y-4">
                  <ApplicationList applications={mockApplications.filter(app => app.status === "대기")} />
                </TabsContent>

                <TabsContent value="processing" className="space-y-4">
                  <ApplicationList applications={mockApplications.filter(app => app.status === "진행중")} />
                </TabsContent>

                <TabsContent value="completed" className="space-y-4">
                  <ApplicationList applications={mockApplications.filter(app => app.status === "개통완료")} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
    </DealerLayout>
  );
}

// 상태 배지 생성 함수 (컴포넌트 외부에서 사용 가능)
function getStatusBadge(status: string) {
  switch (status) {
    case "대기":
      return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />대기</Badge>;
    case "진행중":
      return <Badge variant="default"><AlertCircle className="w-3 h-3 mr-1" />진행중</Badge>;
    case "개통완료":
      return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
        <CheckCircle className="w-3 h-3 mr-1" />완료
      </Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

interface ApplicationListProps {
  applications: DealerApplication[];
}

function ApplicationList({ applications }: ApplicationListProps) {
  if (applications.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        해당하는 신청이 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {applications.map((app) => (
        <Card key={app.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{app.documentNumber}</span>
                  {getStatusBadge(app.status)}
                  {app.hasUnreadMessages && (
                    <Badge variant="destructive" className="text-xs">
                      <MessageCircle className="w-3 h-3 mr-1" />
                      새 메시지
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  고객: {app.customerName} | {app.carrier} {app.serviceType}
                </div>
                <div className="text-xs text-muted-foreground">
                  신청: {app.submittedAt} | 최종 업데이트: {app.lastUpdated}
                </div>
              </div>
              <div className="flex gap-2">
                {(app.status === "진행중" || app.status === "개통완료") && (
                  <Link href={`/dealer-chat/${app.id}`}>
                    <Button size="sm" variant="outline">
                      <MessageCircle className="w-4 h-4 mr-1" />
                      채팅
                    </Button>
                  </Link>
                )}
                <Button size="sm" variant="outline">
                  상세보기
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}