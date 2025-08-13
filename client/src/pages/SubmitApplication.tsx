import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useAuth, useApiRequest } from '@/lib/auth';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Upload, Loader2, FileText, Phone, User, AlertTriangle, Search, ChevronDown } from 'lucide-react';
import { Carrier } from '@shared/schema';
import { useLocation } from 'wouter';

export function SubmitApplication() {
  const { user } = useAuth();
  const apiRequest = useApiRequest();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [location] = useLocation();

  // 영업과장은 읽기 전용이므로 접수 신청 불가
  if (user?.userType === 'sales_manager') {
    return (
      <Layout title="접수 신청">
        <div className="flex flex-col items-center justify-center h-64">
          <FileText className="h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">접근 권한이 없습니다</h3>
          <p className="text-sm text-gray-500">영업과장은 읽기 전용 권한입니다.</p>
        </div>
      </Layout>
    );
  }
  
  // 폼 데이터 상태 - 기본값으로 초기화 (저장 기능 완전 제거)
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    contactCode: '',
    storeName: '',
    carrier: '',
    previousCarrier: '',
    bundleNumber: '',
    bundleCarrier: '',
    customerType: 'new' as 'new' | 'port-in',
    desiredNumber: '',
    notes: ''
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [duplicateCheckDialog, setDuplicateCheckDialog] = useState(false);
  const [duplicateData, setDuplicateData] = useState<any[]>([]);
  const [contactCodeSuggestions, setContactCodeSuggestions] = useState<any[]>([]);
  const [showContactCodeSuggestions, setShowContactCodeSuggestions] = useState(false);
  const [contactCodeSearchTerm, setContactCodeSearchTerm] = useState('');
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  // 통신사 목록 조회
  const { data: carriers = [] } = useQuery({
    queryKey: ['/api/carriers'],
  });

  // 선택된 통신사 정보
  const selectedCarrier = carriers.find((c: Carrier) => c.name === formData.carrier);

  // 접점코드 검색 함수
  const searchContactCodes = async (query: string) => {
    if (query.length < 1) {
      setContactCodeSuggestions([]);
      setShowContactCodeSuggestions(false);
      return;
    }

    try {
      const response = await apiRequest(`/api/contact-codes/search?q=${encodeURIComponent(query)}`);
      setContactCodeSuggestions(response || []);
      setShowContactCodeSuggestions(true);
    } catch (error) {
      console.warn('접점코드 검색 실패:', error);
      setContactCodeSuggestions([]);
      setShowContactCodeSuggestions(false);
    }
  };

  // 접점코드 변경 시 판매점명 자동 조회 및 실시간 검색
  const handleContactCodeChange = async (contactCode: string) => {
    setFormData(prev => {
      const newData = { ...prev, contactCode };
      
      // 기타 통신사인 경우 즉시 접점코드명을 판매점명으로 설정
      if (newData.carrier.includes('기타') && contactCode.trim()) {
        newData.storeName = contactCode;
      }
      
      return newData;
    });
    
    setContactCodeSearchTerm(contactCode);
    
    // 실시간 검색 제안
    if (contactCode.trim() && !formData.carrier.includes('기타')) {
      await searchContactCodes(contactCode);
      
      // 정확한 코드 일치 시 자동 선택
      try {
        const response = await apiRequest(`/api/contact-codes/search/${contactCode}`);
        if (response?.dealerName) {
          setFormData(prev => ({ ...prev, storeName: response.dealerName }));
        }
      } catch (error) {
        console.warn('접점코드 조회 실패:', error);
      }
    } else {
      setContactCodeSuggestions([]);
      setShowContactCodeSuggestions(false);
    }
  };

  // 접점코드 제안 선택
  const selectContactCodeSuggestion = (suggestion: any) => {
    setFormData(prev => ({ 
      ...prev, 
      contactCode: suggestion.code, 
      storeName: suggestion.dealerName 
    }));
    setContactCodeSearchTerm(suggestion.code);
    setShowContactCodeSuggestions(false);
  };

  // 중복 확인 mutation
  const duplicateCheckMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/documents/check-duplicate', {
        method: 'POST',
        body: {
          customerName: formData.customerName,
          customerPhone: formData.customerPhone,
          carrier: formData.carrier
        }
      });
      return response;
    },
    onSuccess: (data) => {
      if (data.hasDuplicates) {
        setDuplicateData(data.duplicates);
        setDuplicateCheckDialog(true);
      } else {
        // 중복이 없으면 바로 제출
        submitMutation.mutate();
      }
    },
    onError: (error: Error) => {
      toast({
        title: "중복 확인 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // 제출 mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      const formDataObj = new FormData();
      
      // 폼 데이터 추가
      Object.entries(formData).forEach(([key, value]) => {
        formDataObj.append(key, value);
      });
      
      // 파일 추가
      if (selectedFile) {
        formDataObj.append('file', selectedFile);
      }

      const response = await fetch('/api/documents/submit', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sessionId')}`,
        },
        body: formDataObj,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '제출에 실패했습니다.');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "접수 완료",
        description: "문서가 성공적으로 접수되었습니다.",
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      
      // 업로드된 파일만 초기화, 폼 데이터는 보존
      setSelectedFile(null);
      
      // 중복 확인 다이얼로그가 열려있다면 닫기
      setDuplicateCheckDialog(false);
      setDuplicateData([]);
      
      // 접수 완료 후 폼 초기화
      setFormData({
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        contactCode: '',
        storeName: '',
        carrier: '',
        previousCarrier: '',
        bundleNumber: '',
        bundleCarrier: '',
        customerType: 'new',
        desiredNumber: '',
        notes: ''
      });
    },
    onError: (error: Error) => {
      toast({
        title: "접수 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 선택된 통신사의 필수 필드 검증
    if (selectedCarrier) {
      const errors: string[] = [];
      
      if (selectedCarrier.requireCustomerName && !formData.customerName) {
        errors.push("고객명");
      }
      if (selectedCarrier.requireCustomerPhone && !formData.customerPhone) {
        errors.push("연락처");
      }
      if (selectedCarrier.requireCustomerEmail && !formData.customerEmail) {
        errors.push("이메일");
      }
      if (selectedCarrier.requireContactCode && !formData.contactCode) {
        errors.push("개통방명 코드");
      }
      if (selectedCarrier.requireStoreName && !formData.storeName) {
        errors.push("판매점명");
      }
      if (selectedCarrier.requirePreviousCarrier && formData.customerType === 'port-in' && !formData.previousCarrier) {
        errors.push("이전 통신사");
      }
      if (selectedCarrier.requireBundleInfo && !formData.bundleNumber) {
        errors.push("결합 정보");
      }
      
      if (errors.length > 0) {
        toast({
          title: "필수 항목 누락",
          description: `다음 항목을 입력해주세요: ${errors.join(', ')}`,
          variant: "destructive",
        });
        return;
      }
    }

    // 중복 확인 후 제출
    duplicateCheckMutation.mutate();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 10MB 제한
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "파일 크기 초과",
          description: "10MB 이하의 파일만 업로드 가능합니다.",
          variant: "destructive",
        });
        return;
      }
      
      setSelectedFile(file);
    }
  };

  return (
    <Layout title="접수 신청">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              고객 접수 신청
            </CardTitle>
            <CardDescription>
              고객 정보를 입력하고 관련 문서를 업로드해주세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 기본 정보 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customerName">
                    고객명 {selectedCarrier?.requireCustomerName && <span className="text-red-500">*</span>}
                  </Label>
                  <Input
                    id="customerName"
                    value={formData.customerName}
                    onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                    placeholder="고객명을 입력하세요"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customerPhone">
                    연락처 {selectedCarrier?.requireCustomerPhone && <span className="text-red-500">*</span>}
                  </Label>
                  <Input
                    id="customerPhone"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData(prev => ({ ...prev, customerPhone: e.target.value }))}
                    placeholder="010-0000-0000"
                  />
                </div>

                {selectedCarrier?.requireCustomerEmail && (
                  <div className="space-y-2">
                    <Label htmlFor="customerEmail">
                      이메일 <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="customerEmail"
                      type="email"
                      value={formData.customerEmail}
                      onChange={(e) => setFormData(prev => ({ ...prev, customerEmail: e.target.value }))}
                      placeholder="이메일을 입력하세요"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="carrier">통신사 <span className="text-red-500">*</span></Label>
                  <Select
                    value={formData.carrier}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, carrier: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="통신사를 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {carriers.map((carrier: Carrier) => (
                        <SelectItem key={carrier.id} value={carrier.name}>
                          {carrier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* 접점코드 및 판매점명 */}
              {selectedCarrier?.requireContactCode && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 relative">
                    <Label htmlFor="contactCode">
                      개통방명 코드 <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="contactCode"
                      value={formData.contactCode}
                      onChange={(e) => handleContactCodeChange(e.target.value)}
                      placeholder="개통방명 코드를 입력하세요"
                    />
                    
                    {/* 검색 제안 */}
                    {showContactCodeSuggestions && contactCodeSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
                        {contactCodeSuggestions.slice(0, 5).map((suggestion, index) => (
                          <button
                            key={index}
                            type="button"
                            className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b last:border-b-0"
                            onClick={() => selectContactCodeSuggestion(suggestion)}
                          >
                            <div className="font-medium">{suggestion.code}</div>
                            <div className="text-sm text-gray-500">{suggestion.dealerName}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {selectedCarrier?.requireStoreName && (
                    <div className="space-y-2">
                      <Label htmlFor="storeName">
                        판매점명 <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="storeName"
                        value={formData.storeName}
                        onChange={(e) => setFormData(prev => ({ ...prev, storeName: e.target.value }))}
                        placeholder="판매점명을 입력하세요"
                        readOnly={formData.carrier.includes('기타')}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* 고객 유형 */}
              <div className="space-y-2">
                <Label>고객 유형</Label>
                <Select
                  value={formData.customerType}
                  onValueChange={(value: 'new' | 'port-in') => setFormData(prev => ({ ...prev, customerType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">신규</SelectItem>
                    <SelectItem value="port-in">번호이동</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 번호이동인 경우 이전 통신사 */}
              {formData.customerType === 'port-in' && selectedCarrier?.requirePreviousCarrier && (
                <div className="space-y-2">
                  <Label htmlFor="previousCarrier">
                    이전 통신사 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="previousCarrier"
                    value={formData.previousCarrier}
                    onChange={(e) => setFormData(prev => ({ ...prev, previousCarrier: e.target.value }))}
                    placeholder="이전 통신사를 입력하세요"
                  />
                </div>
              )}

              {/* 결합 정보 */}
              {selectedCarrier?.requireBundleInfo && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bundleNumber">
                      결합 번호 <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="bundleNumber"
                      value={formData.bundleNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, bundleNumber: e.target.value }))}
                      placeholder="결합 번호를 입력하세요"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bundleCarrier">결합 통신사</Label>
                    <Input
                      id="bundleCarrier"
                      value={formData.bundleCarrier}
                      onChange={(e) => setFormData(prev => ({ ...prev, bundleCarrier: e.target.value }))}
                      placeholder="결합 통신사를 입력하세요"
                    />
                  </div>
                </div>
              )}

              {/* 희망 번호 */}
              <div className="space-y-2">
                <Label htmlFor="desiredNumber">희망 번호</Label>
                <Input
                  id="desiredNumber"
                  value={formData.desiredNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, desiredNumber: e.target.value }))}
                  placeholder="희망하는 번호가 있다면 입력하세요"
                />
              </div>

              {/* 파일 업로드 */}
              <div className="space-y-2">
                <Label htmlFor="file">문서 첨부</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="file"
                    type="file"
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    className="flex-1"
                  />
                  {selectedFile && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <FileText className="h-4 w-4" />
                      {selectedFile.name}
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  PDF, DOC, DOCX, JPG, PNG 파일만 업로드 가능 (최대 10MB)
                </p>
              </div>

              {/* 메모 */}
              <div className="space-y-2">
                <Label htmlFor="notes">메모</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="추가 메모가 있다면 입력하세요"
                  rows={3}
                />
              </div>

              {/* 제출 버튼 */}
              <div className="flex gap-3">
                <Button 
                  type="submit" 
                  disabled={duplicateCheckMutation.isPending || submitMutation.isPending}
                  className="flex-1"
                >
                  {duplicateCheckMutation.isPending || submitMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      처리 중...
                    </>
                  ) : (
                    '접수 신청'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* 중복 확인 다이얼로그 */}
        <Dialog open={duplicateCheckDialog} onOpenChange={setDuplicateCheckDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                중복 고객 확인
              </DialogTitle>
              <DialogDescription>
                동일한 정보로 등록된 고객이 있습니다. 계속 진행하시겠습니까?
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {duplicateData.map((duplicate, index) => (
                <div key={index} className="p-3 bg-orange-50 rounded border border-orange-200">
                  <div className="font-medium">{duplicate.customerName}</div>
                  <div className="text-sm text-gray-600">{duplicate.customerPhone}</div>
                  <div className="text-sm text-gray-600">{duplicate.carrier}</div>
                  <div className="text-sm text-gray-500">
                    접수일: {new Date(duplicate.createdAt).toLocaleDateString('ko-KR')}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setDuplicateCheckDialog(false)}
                className="flex-1"
              >
                취소
              </Button>
              <Button
                onClick={() => {
                  setDuplicateCheckDialog(false);
                  submitMutation.mutate();
                }}
                className="flex-1"
              >
                계속 진행
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}