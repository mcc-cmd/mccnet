import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { 
  BarChart3, 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock, 
  TrendingUp,
  LogOut
} from 'lucide-react';

interface PerformanceData {
  totalDocuments: number;
  activatedCount: number;
  canceledCount: number;
  pendingCount: number;
  contactCodes: string[];
  teamId: number;
  managerId: number;
}

export default function SalesManagerDashboard() {
  const { toast } = useToast();
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user_data');
    if (storedUser) {
      setUserData(JSON.parse(storedUser));
    }
  }, []);

  // 영업과장 실적 데이터 조회
  const { data: performance, isLoading } = useQuery<PerformanceData>({
    queryKey: ['/api/sales-manager/performance'],
    queryFn: () => apiRequest('/api/sales-manager/performance'),
    enabled: !!userData
  });

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    window.location.href = '/sales-manager-login';
  };

  if (!userData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">로그인이 필요합니다</h2>
          <Button onClick={() => window.location.href = '/sales-manager-login'}>
            로그인 페이지로 이동
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 헤더 */}
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                영업 실적 대시보드
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                안녕하세요, {userData.name}님
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={handleLogout}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              로그아웃
            </Button>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-lg">실적 데이터를 불러오는 중...</div>
          </div>
        ) : (
          <>
            {/* 실적 요약 카드 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="flex items-center p-6">
                  <div className="flex-shrink-0">
                    <BarChart3 className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      총 접수건수
                    </p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {performance?.totalDocuments || 0}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="flex items-center p-6">
                  <div className="flex-shrink-0">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      개통완료
                    </p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {performance?.activatedCount || 0}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="flex items-center p-6">
                  <div className="flex-shrink-0">
                    <XCircle className="h-8 w-8 text-red-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      개통취소
                    </p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {performance?.canceledCount || 0}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="flex items-center p-6">
                  <div className="flex-shrink-0">
                    <Clock className="h-8 w-8 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      처리대기
                    </p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {performance?.pendingCount || 0}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 담당 접점 코드 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    담당 접점 코드
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {performance?.contactCodes && performance.contactCodes.length > 0 ? (
                    <div className="space-y-2">
                      {performance.contactCodes.map((code, index) => (
                        <div 
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                        >
                          <span className="font-mono font-medium">{code}</span>
                          <span className="text-sm text-gray-600 dark:text-gray-300">
                            접점 코드
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>등록된 접점 코드가 없습니다.</p>
                      <p className="text-sm">관리자에게 접점 코드 등록을 요청하세요.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    성과 분석
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>개통 성공률</span>
                      <span className="font-semibold">
                        {performance?.totalDocuments 
                          ? Math.round((performance.activatedCount / performance.totalDocuments) * 100)
                          : 0}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ 
                          width: `${performance?.totalDocuments 
                            ? (performance.activatedCount / performance.totalDocuments) * 100
                            : 0}%`
                        }}
                      ></div>
                    </div>
                    
                    <div className="pt-4 text-sm text-gray-600 dark:text-gray-300">
                      <p>• 총 {performance?.totalDocuments || 0}건 중 {performance?.activatedCount || 0}건 개통완료</p>
                      <p>• {performance?.canceledCount || 0}건 취소, {performance?.pendingCount || 0}건 대기중</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 추가 정보 */}
            <div className="mt-8">
              <Card>
                <CardHeader>
                  <CardTitle>시스템 안내</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                    <p>• 이 대시보드는 귀하에게 할당된 접점 코드를 기반으로 실적을 표시합니다.</p>
                    <p>• 실적 데이터는 실시간으로 업데이트되며, 문의사항이 있으시면 관리자에게 문의하세요.</p>
                    <p>• 접점 코드 추가나 변경이 필요한 경우 관리자에게 요청하세요.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}