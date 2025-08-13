import { useState } from "react";
import { DealerLayout } from "@/components/DealerLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { XCircle, Search, Eye, AlertCircle, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

// 개통취소된 신청서 목록
const cancelledApplications = [
  {
    id: 15,
    customerName: "조민호",
    customerPhone: "010-1111-2222",
    carrier: "후불)엠모바일",
    applicationDate: "2025-01-04",
    cancelledDate: "2025-01-06",
    status: "개통취소",
    cancelReason: "고객요청",
    contactCode: "MCC015",
    dealerId: "MCC0001",
    cancelledBy: "이지원 직원",
    note: "타사 조건 더 유리하여 고객이 취소 요청",
    refundAmount: 50000
  },
  {
    id: 16,
    customerName: "윤서진",
    customerPhone: "010-3333-4444",
    carrier: "선불)스마텔",
    applicationDate: "2025-01-05",
    cancelledDate: "2025-01-07",
    status: "개통취소",
    cancelReason: "신용불량",
    contactCode: "MCC016",
    dealerId: "MCC0001",
    cancelledBy: "김수민 직원",
    note: "신용조회 결과 개통 불가 판정",
    refundAmount: 30000
  },
  {
    id: 17,
    customerName: "한지민",
    customerPhone: "010-5555-6666",
    carrier: "후불)중고KT",
    applicationDate: "2025-01-06",
    cancelledDate: "2025-01-08",
    status: "개통취소",
    cancelReason: "서류위조",
    contactCode: "MCC017",
    dealerId: "MCC0001",
    cancelledBy: "박영수 직원",
    note: "제출 서류 위조 발견으로 개통 취소",
    refundAmount: 0
  },
  {
    id: 18,
    customerName: "정현우",
    customerPhone: "010-7777-8888",
    carrier: "후불)엠모바일",
    applicationDate: "2025-01-08",
    cancelledDate: "2025-01-10",
    status: "개통취소",
    cancelReason: "중복가입",
    contactCode: "MCC018",
    dealerId: "MCC0001",
    cancelledBy: "최민영 직원",
    note: "동일 고객의 중복 가입 발견",
    refundAmount: 25000
  }
];

const cancelReasonColors = {
  "고객요청": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "신용불량": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  "서류위조": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  "중복가입": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  "기타": "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
};

export function DealerCancelledHistory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [reasonFilter, setReasonFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  // 날짜 필터링 로직
  const getFilteredByDate = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    return cancelledApplications.filter(app => {
      const cancelledDate = new Date(app.cancelledDate);
      switch (dateFilter) {
        case "today":
          return cancelledDate >= today;
        case "week":
          return cancelledDate >= oneWeekAgo;
        case "month":
          return cancelledDate >= oneMonthAgo;
        default:
          return true;
      }
    });
  };

  // 검색 및 필터링
  const filteredApplications = getFilteredByDate().filter(app => {
    const matchesSearch = app.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         app.customerPhone.includes(searchTerm) ||
                         app.contactCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         app.note.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesReason = reasonFilter === "all" || app.cancelReason === reasonFilter;
    
    return matchesSearch && matchesReason;
  });

  const handleViewDetails = (application: any) => {
    console.log("View details for:", application.id);
  };

  const handleRetryApplication = (application: any) => {
    console.log("Retry application for:", application.id);
    // 재신청 처리 로직 (고객요청 취소의 경우만)
  };

  // 총 환불 금액 계산
  const totalRefundAmount = filteredApplications.reduce((sum, app) => sum + app.refundAmount, 0);

  return (
    <DealerLayout title="개통취소내역">
      <div className="space-y-6">
        {/* 헤더 카드 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              개통취소 신청서 내역
            </CardTitle>
            <CardDescription>
              각종 사유로 개통이 취소된 신청서들의 상세 내역을 확인할 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* 필터 및 검색 */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="고객명, 연락처, 콘택코드, 취소 사유로 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={reasonFilter} onValueChange={setReasonFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="취소 사유" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 사유</SelectItem>
                  <SelectItem value="고객요청">고객요청</SelectItem>
                  <SelectItem value="신용불량">신용불량</SelectItem>
                  <SelectItem value="서류위조">서류위조</SelectItem>
                  <SelectItem value="중복가입">중복가입</SelectItem>
                  <SelectItem value="기타">기타</SelectItem>
                </SelectContent>
              </Select>
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

            {/* 개통취소 목록 */}
            {filteredApplications.length === 0 ? (
              <div className="text-center py-12">
                <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">
                  개통취소된 신청서가 없습니다
                </h3>
                <p className="text-sm text-muted-foreground">
                  선택한 조건에 맞는 개통취소 내역이 없습니다.
                </p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>고객명</TableHead>
                      <TableHead>연락처</TableHead>
                      <TableHead>통신사</TableHead>
                      <TableHead>취소사유</TableHead>
                      <TableHead>취소일</TableHead>
                      <TableHead>처리자</TableHead>
                      <TableHead>환불금액</TableHead>
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
                        <TableCell>{application.customerPhone}</TableCell>
                        <TableCell>{application.carrier}</TableCell>
                        <TableCell>
                          <Badge className={cancelReasonColors[application.cancelReason as keyof typeof cancelReasonColors]}>
                            {application.cancelReason}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(application.cancelledDate), "yyyy-MM-dd", { locale: ko })}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {application.cancelledBy}
                        </TableCell>
                        <TableCell className="font-medium">
                          {application.refundAmount > 0 ? 
                            `${application.refundAmount.toLocaleString()}원` : 
                            "-"
                          }
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
                          {application.cancelReason === "고객요청" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRetryApplication(application)}
                            >
                              <RefreshCw className="h-4 w-4 mr-1" />
                              재신청
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 취소 사유별 통계 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {cancelledApplications.filter(app => app.cancelReason === "고객요청").length}
              </div>
              <div className="text-sm text-muted-foreground">고객요청</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">
                {cancelledApplications.filter(app => app.cancelReason === "신용불량").length}
              </div>
              <div className="text-sm text-muted-foreground">신용불량</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {cancelledApplications.filter(app => app.cancelReason === "서류위조").length}
              </div>
              <div className="text-sm text-muted-foreground">서류위조</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">
                {cancelledApplications.filter(app => app.cancelReason === "중복가입").length}
              </div>
              <div className="text-sm text-muted-foreground">중복가입</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {totalRefundAmount.toLocaleString()}원
              </div>
              <div className="text-sm text-muted-foreground">총 환불금액</div>
            </CardContent>
          </Card>
        </div>

        {/* 개통취소 관리 안내 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              개통취소 처리 안내
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-medium text-blue-700 dark:text-blue-300 mb-2">
                  고객요청 취소
                </div>
                <div className="text-muted-foreground">
                  고객의 단순 변심이나 타사 이동 요청으로 인한 취소. 재신청 가능합니다.
                </div>
              </div>
              <div>
                <div className="font-medium text-red-700 dark:text-red-300 mb-2">
                  신용불량 취소
                </div>
                <div className="text-muted-foreground">
                  신용조회 결과 개통 불가 판정 시 취소. 신용 상태 개선 후 재신청 가능합니다.
                </div>
              </div>
              <div>
                <div className="font-medium text-purple-700 dark:text-purple-300 mb-2">
                  서류위조 취소
                </div>
                <div className="text-muted-foreground">
                  제출 서류의 위조가 발견된 경우 즉시 취소. 환불 불가 및 재신청 제한됩니다.
                </div>
              </div>
              <div>
                <div className="font-medium text-orange-700 dark:text-orange-300 mb-2">
                  중복가입 취소
                </div>
                <div className="text-muted-foreground">
                  동일 고객의 중복 가입이 발견된 경우 후순위 신청건을 취소합니다.
                </div>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                    취소 처리 시 주의사항
                  </div>
                  <div className="text-sm text-yellow-700 dark:text-yellow-300">
                    • 환불 처리는 취소 사유에 따라 달라질 수 있습니다<br/>
                    • 고객요청 취소의 경우 재신청 시 우선 처리됩니다<br/>
                    • 모든 취소 건은 본사 승인 후 최종 처리됩니다
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DealerLayout>
  );
}