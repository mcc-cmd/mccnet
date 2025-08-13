import { useState } from "react";
import { DealerLayout } from "@/components/DealerLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChatDialog } from "@/components/ChatDialog";
import { CheckCircle, MessageCircle, Search, Eye, Download, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

// 개통완료된 신청서 목록
const completedApplications = [
  {
    id: 4,
    customerName: "정수민",
    customerPhone: "010-3333-4444",
    carrier: "후불)엠모바일",
    applicationDate: "2025-01-08",
    completedDate: "2025-01-10",
    status: "개통완료",
    contactCode: "MCC004",
    dealerId: "MCC0001",
    activationNumber: "010-3333-4444",
    planName: "5G 프리미엄 무제한",
    monthlyFee: 95000,
    hasChat: true // 채팅 내역 존재 여부
  },
  {
    id: 5,
    customerName: "홍길동",
    customerPhone: "010-6666-7777",
    carrier: "선불)스마텔",
    applicationDate: "2025-01-09",
    completedDate: "2025-01-11",
    status: "개통완료",
    contactCode: "MCC005",
    dealerId: "MCC0001",
    activationNumber: "010-6666-7777",
    planName: "선불 데이터 20GB",
    monthlyFee: 45000,
    hasChat: false
  },
  {
    id: 6,
    customerName: "김미영",
    customerPhone: "010-8888-9999",
    carrier: "후불)중고KT",
    applicationDate: "2025-01-10",
    completedDate: "2025-01-12",
    status: "개통완료",
    contactCode: "MCC006",
    dealerId: "MCC0001",
    activationNumber: "010-8888-9999",
    planName: "무제한 플랜",
    monthlyFee: 75000,
    hasChat: true
  }
];

export function DealerCompletedManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [chatOpen, setChatOpen] = useState(false);

  // 날짜 필터링 로직
  const getFilteredByDate = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    return completedApplications.filter(app => {
      const completedDate = new Date(app.completedDate);
      switch (dateFilter) {
        case "today":
          return completedDate >= today;
        case "week":
          return completedDate >= oneWeekAgo;
        case "month":
          return completedDate >= oneMonthAgo;
        default:
          return true;
      }
    });
  };

  // 검색 및 날짜 필터링
  const filteredApplications = getFilteredByDate().filter(app =>
    app.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.customerPhone.includes(searchTerm) ||
    app.contactCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.activationNumber.includes(searchTerm)
  );

  const handleViewDetails = (application: any) => {
    setSelectedApplication(application);
  };

  const handleOpenChat = (application: any) => {
    setSelectedApplication(application);
    setChatOpen(true);
  };

  const handleDownloadReport = (application: any) => {
    // 개통완료 보고서 다운로드 기능
    console.log("Downloading completion report for:", application.id);
  };

  // 총 월 매출 계산
  const totalMonthlyRevenue = filteredApplications.reduce((sum, app) => sum + app.monthlyFee, 0);

  return (
    <DealerLayout title="개통완료 관리">
      <div className="space-y-6">
        {/* 헤더 카드 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              개통완료 신청서 관리
            </CardTitle>
            <CardDescription>
              성공적으로 개통 완료된 신청서들을 관리하고 채팅 내역을 확인할 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* 필터 및 검색 */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="고객명, 연락처, 콘택코드, 개통번호로 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="기간 필터" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 기간</SelectItem>
                  <SelectItem value="today">오늘</SelectItem>
                  <SelectItem value="week">최근 7일</SelectItem>
                  <SelectItem value="month">최근 30일</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 개통완료 목록 */}
            {filteredApplications.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">
                  개통완료된 신청서가 없습니다
                </h3>
                <p className="text-sm text-muted-foreground">
                  선택한 조건에 맞는 개통완료 내역이 없습니다.
                </p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>고객명</TableHead>
                      <TableHead>개통번호</TableHead>
                      <TableHead>통신사</TableHead>
                      <TableHead>요금제</TableHead>
                      <TableHead>월 요금</TableHead>
                      <TableHead>개통일</TableHead>
                      <TableHead>콘택코드</TableHead>
                      <TableHead className="text-right">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredApplications.map((application) => (
                      <TableRow key={application.id}>
                        <TableCell className="font-medium">
                          {application.customerName}
                        </TableCell>
                        <TableCell>{application.activationNumber}</TableCell>
                        <TableCell>{application.carrier}</TableCell>
                        <TableCell className="max-w-[150px] truncate">
                          {application.planName}
                        </TableCell>
                        <TableCell className="font-medium">
                          {application.monthlyFee.toLocaleString()}원
                        </TableCell>
                        <TableCell>
                          {format(new Date(application.completedDate), "yyyy-MM-dd", { locale: ko })}
                        </TableCell>
                        <TableCell>{application.contactCode}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(application)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            상세
                          </Button>
                          {application.hasChat && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenChat(application)}
                            >
                              <MessageCircle className="h-4 w-4 mr-1" />
                              채팅이력
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadReport(application)}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            보고서
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 통계 요약 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {filteredApplications.length}
              </div>
              <div className="text-sm text-muted-foreground">총 개통건수</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {totalMonthlyRevenue.toLocaleString()}원
              </div>
              <div className="text-sm text-muted-foreground">월 매출 합계</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {filteredApplications.filter(app => app.hasChat).length}
              </div>
              <div className="text-sm text-muted-foreground">채팅이력 보유</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">
                {Math.round(filteredApplications.reduce((sum, app) => sum + app.monthlyFee, 0) / filteredApplications.length || 0).toLocaleString()}원
              </div>
              <div className="text-sm text-muted-foreground">평균 월 요금</div>
            </CardContent>
          </Card>
        </div>

        {/* 개통완료 관리 안내 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              개통완료 관리 안내
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-medium text-green-700 dark:text-green-300 mb-2">
                  채팅 이력 보존
                </div>
                <div className="text-muted-foreground">
                  개통완료 후에도 진행 과정에서의 모든 채팅 내역이 보존되어 언제든 확인할 수 있습니다.
                </div>
              </div>
              <div>
                <div className="font-medium text-blue-700 dark:text-blue-300 mb-2">
                  완료 보고서
                </div>
                <div className="text-muted-foreground">
                  각 개통건에 대한 상세 보고서를 다운로드하여 기록 관리에 활용하세요.
                </div>
              </div>
              <div>
                <div className="font-medium text-purple-700 dark:text-purple-300 mb-2">
                  매출 관리
                </div>
                <div className="text-muted-foreground">
                  개통된 요금제별 월 매출을 확인하여 수익성을 분석할 수 있습니다.
                </div>
              </div>
              <div>
                <div className="font-medium text-orange-700 dark:text-orange-300 mb-2">
                  고객 관리
                </div>
                <div className="text-muted-foreground">
                  개통완료 고객의 정보를 통해 향후 서비스 개선에 활용하세요.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 채팅 다이얼로그 - 읽기 전용으로 설정 */}
      {selectedApplication && (
        <ChatDialog
          open={chatOpen}
          onOpenChange={setChatOpen}
          documentId={selectedApplication.id}
          customerName={selectedApplication.customerName}
          readOnly={true} // 개통완료는 읽기 전용
        />
      )}
    </DealerLayout>
  );
}