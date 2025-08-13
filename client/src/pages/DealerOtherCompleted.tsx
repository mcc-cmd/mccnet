import { useState } from "react";
import { DealerLayout } from "@/components/DealerLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileCheck, Search, Eye, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

// 기타완료된 신청서 목록
const otherCompletedApplications = [
  {
    id: 10,
    customerName: "이지훈",
    customerPhone: "010-2222-3333",
    carrier: "후불)엠모바일",
    applicationDate: "2025-01-05",
    completedDate: "2025-01-07",
    status: "기타완료",
    completionType: "고객취소",
    contactCode: "MCC010",
    dealerId: "MCC0001",
    reason: "고객 개인사정으로 인한 신청 취소",
    note: "다음달 재신청 예정"
  },
  {
    id: 11,
    customerName: "박서영",
    customerPhone: "010-4444-5555",
    carrier: "선불)스마텔",
    applicationDate: "2025-01-06",
    completedDate: "2025-01-08",
    status: "기타완료",
    completionType: "서류미비",
    contactCode: "MCC011",
    dealerId: "MCC0001",
    reason: "신분증 사본 미제출",
    note: "서류 보완 후 재처리 요망"
  },
  {
    id: 12,
    customerName: "김태현",
    customerPhone: "010-7777-8888",
    carrier: "후불)중고KT",
    applicationDate: "2025-01-07",
    completedDate: "2025-01-09",
    status: "기타완료",
    completionType: "시스템오류",
    contactCode: "MCC012",
    dealerId: "MCC0001",
    reason: "통신사 시스템 점검으로 인한 처리 불가",
    note: "시스템 정상화 후 재처리 완료"
  }
];

const completionTypeColors = {
  "고객취소": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  "서류미비": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  "시스템오류": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  "요금제변경": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "기타": "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
};

export function DealerOtherCompleted() {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  // 날짜 필터링 로직
  const getFilteredByDate = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    return otherCompletedApplications.filter(app => {
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

  // 검색 및 필터링
  const filteredApplications = getFilteredByDate().filter(app => {
    const matchesSearch = app.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         app.customerPhone.includes(searchTerm) ||
                         app.contactCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         app.reason.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || app.completionType === typeFilter;
    
    return matchesSearch && matchesType;
  });

  const handleViewDetails = (application: any) => {
    console.log("View details for:", application.id);
  };

  return (
    <DealerLayout title="기타완료" description="기타 사유로 완료된 신청서 관리">
      <div className="p-1 space-y-2">
        {/* 헤더 카드 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-purple-600" />
              기타완료 신청서 관리
            </CardTitle>
            <CardDescription>
              개통 이외의 사유로 완료 처리된 신청서들을 관리합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* 필터 및 검색 */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="고객명, 연락처, 콘택코드, 완료 사유로 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="완료 유형" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 유형</SelectItem>
                  <SelectItem value="고객취소">고객취소</SelectItem>
                  <SelectItem value="서류미비">서류미비</SelectItem>
                  <SelectItem value="시스템오류">시스템오류</SelectItem>
                  <SelectItem value="요금제변경">요금제변경</SelectItem>
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

            {/* 기타완료 목록 */}
            {filteredApplications.length === 0 ? (
              <div className="text-center py-12">
                <FileCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">
                  기타완료된 신청서가 없습니다
                </h3>
                <p className="text-sm text-muted-foreground">
                  선택한 조건에 맞는 기타완료 내역이 없습니다.
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
                      <TableHead>완료유형</TableHead>
                      <TableHead>완료사유</TableHead>
                      <TableHead>완료일</TableHead>
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
                          <Badge className={completionTypeColors[application.completionType as keyof typeof completionTypeColors]}>
                            {application.completionType}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {application.reason}
                        </TableCell>
                        <TableCell>
                          {format(new Date(application.completedDate), "yyyy-MM-dd", { locale: ko })}
                        </TableCell>
                        <TableCell>{application.contactCode}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(application)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            상세
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

        {/* 완료 유형별 통계 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">
                {otherCompletedApplications.filter(app => app.completionType === "고객취소").length}
              </div>
              <div className="text-sm text-muted-foreground">고객취소</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">
                {otherCompletedApplications.filter(app => app.completionType === "서류미비").length}
              </div>
              <div className="text-sm text-muted-foreground">서류미비</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {otherCompletedApplications.filter(app => app.completionType === "시스템오류").length}
              </div>
              <div className="text-sm text-muted-foreground">시스템오류</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {otherCompletedApplications.filter(app => app.completionType === "요금제변경").length}
              </div>
              <div className="text-sm text-muted-foreground">요금제변경</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-600">
                {otherCompletedApplications.filter(app => app.completionType === "기타").length}
              </div>
              <div className="text-sm text-muted-foreground">기타</div>
            </CardContent>
          </Card>
        </div>

        {/* 기타완료 관리 안내 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              기타완료 처리 안내
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-medium text-orange-700 dark:text-orange-300 mb-2">
                  고객취소 처리
                </div>
                <div className="text-muted-foreground">
                  고객의 개인 사정으로 인한 신청 취소는 향후 재신청 가능성을 고려하여 처리합니다.
                </div>
              </div>
              <div>
                <div className="font-medium text-red-700 dark:text-red-300 mb-2">
                  서류미비 처리
                </div>
                <div className="text-muted-foreground">
                  필수 서류 미제출 시 고객에게 안내 후 서류 보완 요청을 진행합니다.
                </div>
              </div>
              <div>
                <div className="font-medium text-purple-700 dark:text-purple-300 mb-2">
                  시스템오류 처리
                </div>
                <div className="text-muted-foreground">
                  통신사 시스템 문제로 인한 처리 불가 시 시스템 정상화 후 재처리를 진행합니다.
                </div>
              </div>
              <div>
                <div className="font-medium text-blue-700 dark:text-blue-300 mb-2">
                  재처리 관리
                </div>
                <div className="text-muted-foreground">
                  기타완료된 건 중 재처리가 필요한 경우 새로운 신청서로 등록하여 관리합니다.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DealerLayout>
  );
}