import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DealerLayout } from "@/components/DealerLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChatDialog } from "@/components/ChatDialog";
import { Eye, MessageCircle, Search, FileText } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

// 모의 데이터 - 실제로는 API에서 가져올 예정
const mockApplications = [
  {
    id: 1,
    customerName: "김철수",
    customerPhone: "010-1234-5678",
    carrier: "후불)엠모바일",
    applicationDate: "2025-01-10",
    status: "접수완료",
    contactCode: "MCC001",
    dealerId: "MCC0001"
  },
  {
    id: 2,
    customerName: "이영희",
    customerPhone: "010-9876-5432",
    carrier: "선불)스마텔",
    applicationDate: "2025-01-11",
    status: "진행중",
    contactCode: "MCC002",
    dealerId: "MCC0001"
  },
  {
    id: 3,
    customerName: "박민수",
    customerPhone: "010-5555-1234",
    carrier: "후불)중고KT",
    applicationDate: "2025-01-12",
    status: "업무요청중",
    contactCode: "MCC003",
    dealerId: "MCC0001"
  }
];

const statusColors = {
  "접수완료": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "진행중": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  "업무요청중": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  "개통완료": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  "기타완료": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  "개통취소": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  "폐기": "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
};

export function DealerApplications() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [chatOpen, setChatOpen] = useState(false);

  // 필터링된 신청서 목록
  const filteredApplications = mockApplications.filter(app => {
    const matchesSearch = app.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         app.customerPhone.includes(searchTerm) ||
                         app.contactCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || app.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleViewDetails = (application: any) => {
    setSelectedApplication(application);
  };

  const handleOpenChat = (application: any) => {
    setSelectedApplication(application);
    setChatOpen(true);
  };

  return (
    <DealerLayout title="접수관리" description="접수된 신청서 관리 및 상태 확인">
      <div className="p-6 space-y-6">
        {/* 필터 및 검색 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              접수 신청서 목록
            </CardTitle>
            <CardDescription>
              접수된 모든 신청서를 확인하고 관리할 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="고객명, 연락처, 콘택코드로 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="상태 필터" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 상태</SelectItem>
                  <SelectItem value="접수완료">접수완료</SelectItem>
                  <SelectItem value="진행중">진행중</SelectItem>
                  <SelectItem value="업무요청중">업무요청중</SelectItem>
                  <SelectItem value="개통완료">개통완료</SelectItem>
                  <SelectItem value="기타완료">기타완료</SelectItem>
                  <SelectItem value="개통취소">개통취소</SelectItem>
                  <SelectItem value="폐기">폐기</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 신청서 테이블 */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>고객명</TableHead>
                    <TableHead>연락처</TableHead>
                    <TableHead>통신사</TableHead>
                    <TableHead>접수일</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>콘택코드</TableHead>
                    <TableHead className="text-right">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApplications.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                        조건에 맞는 신청서가 없습니다.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredApplications.map((application) => (
                      <TableRow key={application.id}>
                        <TableCell className="font-medium">
                          {application.customerName}
                        </TableCell>
                        <TableCell>{application.customerPhone}</TableCell>
                        <TableCell>{application.carrier}</TableCell>
                        <TableCell>
                          {format(new Date(application.applicationDate), "yyyy-MM-dd", { locale: ko })}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[application.status as keyof typeof statusColors]}>
                            {application.status}
                          </Badge>
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
                          {(application.status === "진행중" || application.status === "개통완료") && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenChat(application)}
                            >
                              <MessageCircle className="h-4 w-4 mr-1" />
                              채팅
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* 통계 요약 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {mockApplications.filter(app => app.status === "접수완료").length}
              </div>
              <div className="text-sm text-muted-foreground">접수완료</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {mockApplications.filter(app => app.status === "진행중").length}
              </div>
              <div className="text-sm text-muted-foreground">진행중</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">
                {mockApplications.filter(app => app.status === "업무요청중").length}
              </div>
              <div className="text-sm text-muted-foreground">업무요청중</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {mockApplications.filter(app => app.status === "개통완료").length}
              </div>
              <div className="text-sm text-muted-foreground">개통완료</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 채팅 다이얼로그 */}
      {selectedApplication && (
        <ChatDialog
          open={chatOpen}
          onOpenChange={setChatOpen}
          documentId={selectedApplication.id}
          customerName={selectedApplication.customerName}
          readOnly={false}
        />
      )}
    </DealerLayout>
  );
}