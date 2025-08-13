import { useState } from "react";
import { DealerLayout } from "@/components/DealerLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChatDialog } from "@/components/ChatDialog";
import { Clock, MessageCircle, Search, AlertCircle, Eye } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

// 업무요청중인 신청서 목록
const workRequestApplications = [
  {
    id: 3,
    customerName: "박민수",
    customerPhone: "010-5555-1234",
    carrier: "후불)중고KT",
    applicationDate: "2025-01-12",
    requestDate: "2025-01-13",
    status: "업무요청중",
    contactCode: "MCC003",
    dealerId: "MCC0001",
    requestReason: "고객 추가 서류 필요",
    priority: "보통"
  },
  {
    id: 7,
    customerName: "최유진",
    customerPhone: "010-7777-8888",
    carrier: "후불)엠모바일",
    applicationDate: "2025-01-13",
    requestDate: "2025-01-13",
    status: "업무요청중",
    contactCode: "MCC007",
    dealerId: "MCC0001",
    requestReason: "요금제 변경 요청",
    priority: "긴급"
  }
];

const priorityColors = {
  "긴급": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  "높음": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  "보통": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  "낮음": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
};

export function DealerWorkRequests() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [chatOpen, setChatOpen] = useState(false);

  // 검색 필터링
  const filteredApplications = workRequestApplications.filter(app =>
    app.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.customerPhone.includes(searchTerm) ||
    app.contactCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.requestReason.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewDetails = (application: any) => {
    setSelectedApplication(application);
  };

  const handleOpenChat = (application: any) => {
    setSelectedApplication(application);
    setChatOpen(true);
  };

  return (
    <DealerLayout title="업무요청중" description="업무 요청 중인 신청서 관리">
      <div className="p-2 space-y-2">
        {/* 헤더 카드 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-600" />
              업무요청중인 신청서
            </CardTitle>
            <CardDescription>
              담당자가 추가 처리를 요청한 신청서들입니다. 빠른 응답을 위해 채팅을 활용하세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* 검색 */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="고객명, 연락처, 콘택코드, 요청 사유로 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            {/* 업무요청 목록 */}
            {filteredApplications.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">
                  업무요청중인 신청서가 없습니다
                </h3>
                <p className="text-sm text-muted-foreground">
                  현재 처리가 필요한 업무요청이 없습니다.
                </p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>우선순위</TableHead>
                      <TableHead>고객명</TableHead>
                      <TableHead>연락처</TableHead>
                      <TableHead>통신사</TableHead>
                      <TableHead>요청일</TableHead>
                      <TableHead>요청 사유</TableHead>
                      <TableHead>콘택코드</TableHead>
                      <TableHead className="text-right">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredApplications.map((application) => (
                      <TableRow key={application.id}>
                        <TableCell>
                          <Badge className={priorityColors[application.priority as keyof typeof priorityColors]}>
                            {application.priority}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {application.customerName}
                        </TableCell>
                        <TableCell>{application.customerPhone}</TableCell>
                        <TableCell>{application.carrier}</TableCell>
                        <TableCell>
                          {format(new Date(application.requestDate), "MM-dd HH:mm", { locale: ko })}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {application.requestReason}
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
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleOpenChat(application)}
                          >
                            <MessageCircle className="h-4 w-4 mr-1" />
                            채팅
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

        {/* 우선순위별 통계 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">
                {workRequestApplications.filter(app => app.priority === "긴급").length}
              </div>
              <div className="text-sm text-muted-foreground">긴급</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">
                {workRequestApplications.filter(app => app.priority === "높음").length}
              </div>
              <div className="text-sm text-muted-foreground">높음</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {workRequestApplications.filter(app => app.priority === "보통").length}
              </div>
              <div className="text-sm text-muted-foreground">보통</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {workRequestApplications.filter(app => app.priority === "낮음").length}
              </div>
              <div className="text-sm text-muted-foreground">낮음</div>
            </CardContent>
          </Card>
        </div>

        {/* 업무요청 처리 가이드 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">업무요청 처리 가이드</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <div className="font-medium text-red-700 dark:text-red-300">긴급 요청</div>
                <div className="text-sm text-muted-foreground">
                  즉시 처리가 필요한 요청입니다. 30분 이내 응답해주세요.
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <div className="font-medium text-orange-700 dark:text-orange-300">높음 우선순위</div>
                <div className="text-sm text-muted-foreground">
                  당일 내 처리가 필요한 요청입니다.
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <div className="font-medium text-yellow-700 dark:text-yellow-300">보통 우선순위</div>
                <div className="text-sm text-muted-foreground">
                  2-3일 내 처리하면 되는 일반적인 요청입니다.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
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