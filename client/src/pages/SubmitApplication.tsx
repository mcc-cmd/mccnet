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
import { Upload, Loader2, FileText, Phone, User, AlertTriangle } from 'lucide-react';
import { Carrier } from '@shared/schema';

export function SubmitApplication() {
  const { user } = useAuth();
  const apiRequest = useApiRequest();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
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
    notes: ''
  });

  // 접점코드 변경 시 판매점명 자동 조회
  const handleContactCodeChange = async (contactCode: string) => {
    setFormData(prev => {
      const newData = { ...prev, contactCode };
      
      // 기타 통신사인 경우 즉시 접점코드명을 판매점명으로 설정
      if (newData.carrier.includes('기타') && contactCode.trim()) {
        newData.storeName = contactCode;
      }
      
      return newData;
    });
    
    if (contactCode.trim() && !formData.carrier.includes('기타')) {
      try {
        const response = await apiRequest(`/api/contact-codes/search/${contactCode}`);
        if (response?.dealerName) {
          setFormData(prev => ({ ...prev, storeName: response.dealerName }));
        } else {
          setFormData(prev => ({ ...prev, storeName: '' }));
        }
      } catch (error) {
        setFormData(prev => ({ ...prev, storeName: '' }));
      }
    } else if (!contactCode.trim() && !formData.carrier.includes('기타')) {
      setFormData(prev => ({ ...prev, storeName: '' }));
    }
  };
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [duplicateCheckDialog, setDuplicateCheckDialog] = useState(false);
  const [duplicateData, setDuplicateData] = useState<any[]>([]);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  
  // 통신사 목록을 데이터베이스에서 가져오기
  const { data: carriers = [], isLoading: carriersLoading } = useQuery<Carrier[]>({
    queryKey: ['/api/carriers'],
    queryFn: () => apiRequest('/api/carriers'),
    staleTime: 0, // 항상 최신 데이터를 가져오도록 설정
    refetchOnWindowFocus: true // 창 포커스 시 새로고침
  });
  
  // 이전통신사 목록
  const previousCarriers = [
    'SK', 'KT', 'LG', 'SK알뜰', 'KT알뜰', 'LG알뜰'
  ];
  
  // 선택된 통신사의 정보 가져오기
  const selectedCarrier = carriers.find(c => c.name === formData.carrier);

  // 중복 체크 함수
  const checkDuplicate = async () => {
    if (!formData.customerName || !formData.customerPhone || (!formData.storeName && !formData.contactCode)) {
      return false; // 필수 정보가 없으면 중복 체크하지 않음
    }

    setIsCheckingDuplicate(true);
    try {
      const response = await apiRequest('/api/documents/check-duplicate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customerName: formData.customerName,
          customerPhone: formData.customerPhone,
          storeName: formData.storeName,
          contactCode: formData.contactCode
        })
      });

      if (response.duplicates && response.duplicates.length > 0) {
        setDuplicateData(response.duplicates);
        setDuplicateCheckDialog(true);
        return true; // 중복 발견
      }
      return false; // 중복 없음
    } catch (error) {
      console.error('중복 체크 오류:', error);
      return false;
    } finally {
      setIsCheckingDuplicate(false);
    }
  };

  const uploadMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return apiRequest('/api/documents', {
        method: 'POST',
        body: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      
      toast({
        title: "접수 완료",
        description: "서류가 성공적으로 접수되었습니다.",
      });

      // Reset form
      setFormData({ customerName: '', customerPhone: '', customerEmail: '', contactCode: '', storeName: '', carrier: '', previousCarrier: '', bundleNumber: '', bundleCarrier: '', notes: '' });
      setSelectedFile(null);
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
      if (selectedCarrier.requireCarrier && !formData.carrier) {
        errors.push("통신사");
      }
      if (selectedCarrier.requirePreviousCarrier && !formData.previousCarrier) {
        errors.push("이전통신사");
      }
      if (selectedCarrier.requireBundleNumber && !formData.bundleNumber) {
        errors.push("결합번호");
      }
      if (selectedCarrier.requireBundleCarrier && !formData.bundleCarrier) {
        errors.push("결합통신사");
      }
      if (selectedCarrier.requireDocumentUpload && !selectedFile) {
        errors.push("서류 첨부");
      }
      
      if (errors.length > 0) {
        toast({
          title: "입력 오류",
          description: `다음 필드를 입력해주세요: ${errors.join(", ")}`,
          variant: "destructive",
        });
        return;
      }
    }

    // 중복 체크 수행
    const hasDuplicate = await checkDuplicate();
    if (hasDuplicate) {
      return; // 중복이 있으면 팝업에서 사용자 결정을 기다림
    }

    // 중복이 없으면 바로 제출
    submitForm();
  };

  const submitForm = () => {
    const data = new FormData();
    data.append('customerName', formData.customerName);
    data.append('customerPhone', formData.customerPhone);
    data.append('customerEmail', formData.customerEmail);
    data.append('contactCode', formData.contactCode);
    data.append('storeName', formData.storeName);
    data.append('carrier', formData.carrier);
    data.append('previousCarrier', formData.previousCarrier);
    data.append('bundleNumber', formData.bundleNumber);
    data.append('bundleCarrier', formData.bundleCarrier);
    data.append('notes', formData.notes);
    
    if (selectedFile) {
      data.append('file', selectedFile);
    }

    uploadMutation.mutate(data);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Layout title="접수 신청">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">새 접수 신청</h2>
          <p className="text-gray-600">
            고객 정보와 필요한 서류를 업로드하여 접수를 신청하세요.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              접수 정보 입력
            </CardTitle>
            <CardDescription>
              정확한 정보를 입력해주세요. 모든 필수 항목을 작성해야 합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 통신사 선택 섹션 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <Phone className="mr-2 h-4 w-4" />
                  통신사 선택
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="carrier">통신사 *</Label>
                    <Select value={formData.carrier} onValueChange={(value) => setFormData(prev => ({ ...prev, carrier: value }))}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="통신사를 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        {carriersLoading ? (
                          <SelectItem value="loading" disabled>로딩 중...</SelectItem>
                        ) : (
                          carriers.map((carrier) => (
                            <SelectItem key={carrier.id} value={carrier.name}>
                              {carrier.name}
                              {carrier.requireDocumentUpload && " (서류 필수)"}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {selectedCarrier?.requireDocumentUpload && (
                      <Alert className="mt-2">
                        <AlertDescription>
                          {formData.carrier} 접수 시 서류 업로드는 필수입니다.
                        </AlertDescription>
                      </Alert>
                    )}
                    {selectedCarrier?.bundleNumber && (
                      <Alert className="mt-2">
                        <AlertDescription>
                          결합 번호: {selectedCarrier.bundleNumber}
                          {selectedCarrier.bundleCarrier && ` (${selectedCarrier.bundleCarrier})`}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                  
                  {selectedCarrier?.requirePreviousCarrier && (
                    <div>
                      <Label htmlFor="previousCarrier">
                        이전통신사 *
                      </Label>
                      <Select value={formData.previousCarrier} onValueChange={(value) => setFormData(prev => ({ ...prev, previousCarrier: value }))}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="이전통신사를 선택하세요" />
                        </SelectTrigger>
                        <SelectContent>
                          {previousCarriers.map((carrier) => (
                            <SelectItem key={carrier} value={carrier}>
                              {carrier}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>

              {/* 고객 정보 섹션 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <User className="mr-2 h-4 w-4" />
                  고객 정보
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(!selectedCarrier || selectedCarrier.requireCustomerName) && (
                    <div>
                      <Label htmlFor="customerName">
                        고객명 {selectedCarrier?.requireCustomerName && "*"}
                      </Label>
                      <Input
                        id="customerName"
                        name="customerName"
                        value={formData.customerName}
                        onChange={handleInputChange}
                        placeholder="고객명을 입력하세요"
                        className="mt-1"
                      />
                    </div>
                  )}
                  
                  {(!selectedCarrier || selectedCarrier.requireCustomerPhone) && (
                    <div>
                      <Label htmlFor="customerPhone">
                        연락처 {selectedCarrier?.requireCustomerPhone && "*"}
                      </Label>
                      <Input
                        id="customerPhone"
                        name="customerPhone"
                        type="tel"
                        value={formData.customerPhone}
                        onChange={handleInputChange}
                        placeholder="010-0000-0000"
                        className="mt-1"
                      />
                    </div>
                  )}
                  
                  {selectedCarrier?.requireCustomerEmail && (
                    <div>
                      <Label htmlFor="customerEmail">
                        이메일 *
                      </Label>
                      <Input
                        id="customerEmail"
                        name="customerEmail"
                        type="email"
                        value={formData.customerEmail}
                        onChange={handleInputChange}
                        placeholder="email@example.com"
                        className="mt-1"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(!selectedCarrier || selectedCarrier.requireContactCode) && (
                    <div>
                      <Label htmlFor="contactCode">
                        개통방명 코드 {selectedCarrier?.requireContactCode && "*"}
                      </Label>
                      <Input
                        id="contactCode"
                        name="contactCode"
                        value={formData.contactCode}
                        onChange={(e) => handleContactCodeChange(e.target.value)}
                        placeholder="개통방명 코드를 입력하세요"
                        className="mt-1"
                      />
                    </div>
                  )}
                  
                  <div>
                    <Label htmlFor="storeName">판매점명</Label>
                    <Input
                      id="storeName"
                      name="storeName"
                      value={formData.storeName}
                      readOnly={!formData.carrier.includes('기타')}
                      placeholder={formData.carrier.includes('기타') ? "판매점명을 입력하세요" : "접점코드 입력 시 자동 설정"}
                      className={`mt-1 ${!formData.carrier.includes('기타') ? 'bg-gray-50 text-gray-700' : ''}`}
                      onChange={formData.carrier.includes('기타') ? handleInputChange : undefined}
                    />
                  </div>
                  
                  {selectedCarrier?.requireBundleNumber && (
                    <div>
                      <Label htmlFor="bundleNumber">
                        결합번호 *
                      </Label>
                      <Input
                        id="bundleNumber"
                        name="bundleNumber"
                        value={formData.bundleNumber}
                        onChange={handleInputChange}
                        placeholder="결합번호를 입력하세요"
                        className="mt-1"
                      />
                    </div>
                  )}
                  
                  {selectedCarrier?.requireBundleCarrier && (
                    <div>
                      <Label htmlFor="bundleCarrier">
                        결합통신사 *
                      </Label>
                      <Input
                        id="bundleCarrier"
                        name="bundleCarrier"
                        value={formData.bundleCarrier}
                        onChange={handleInputChange}
                        placeholder="결합통신사를 입력하세요"
                        className="mt-1"
                      />
                    </div>
                  )}
                </div>



                <div>
                  <Label htmlFor="notes">메모</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    placeholder="추가 메모사항이 있으면 입력하세요"
                    className="mt-1"
                    rows={3}
                  />
                </div>
              </div>

              {/* 파일 업로드 섹션 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <Upload className="mr-2 h-4 w-4" />
                  서류 업로드 (선택사항)
                </h3>
                
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    dragActive
                      ? 'border-blue-400 bg-blue-50'
                      : selectedFile
                      ? 'border-green-400 bg-green-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                >
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    onChange={handleFileSelect}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  />
                  
                  {selectedFile ? (
                    <div className="space-y-2">
                      <FileText className="mx-auto h-12 w-12 text-green-500" />
                      <div>
                        <p className="text-sm font-medium text-green-700">
                          {selectedFile.name}
                        </p>
                        <p className="text-xs text-green-600">
                          {formatFileSize(selectedFile.size)}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedFile(null)}
                      >
                        파일 변경
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <div>
                        <label htmlFor="file-upload" className="cursor-pointer">
                          <span className="text-blue-600 hover:text-blue-500 font-medium">
                            파일을 선택
                          </span>
                          <span className="text-gray-600"> 하거나 드래그하여 업로드</span>
                        </label>
                      </div>
                      <p className="text-xs text-gray-500">
                        PDF, DOC, DOCX, JPG, JPEG, PNG 파일만 업로드 가능 (최대 10MB)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* 제출 버튼 */}
              <div className="flex justify-end space-x-3 pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setFormData({ customerName: '', customerPhone: '', storeName: user?.dealerName || '', notes: '' });
                    setSelectedFile(null);
                  }}
                >
                  초기화
                </Button>
                <Button
                  type="submit"
                  disabled={uploadMutation.isPending}
                >
                  {uploadMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  접수 신청
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* 안내사항 */}
        <Alert className="mt-6">
          <FileText className="h-4 w-4" />
          <AlertDescription>
            <strong>접수 안내:</strong> 업로드된 서류는 관리자 검토 후 처리됩니다. 
            접수 상태는 '접수 관리' 페이지에서 확인할 수 있습니다.
          </AlertDescription>
        </Alert>

        {/* 중복 확인 다이얼로그 */}
        <Dialog open={duplicateCheckDialog} onOpenChange={setDuplicateCheckDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center text-orange-600">
                <AlertTriangle className="mr-2 h-5 w-5" />
                기존 접수건이 발견되었습니다
              </DialogTitle>
              <DialogDescription>
                동일한 고객 정보로 이미 접수된 건이 있습니다. 계속 진행하시겠습니까?
              </DialogDescription>
            </DialogHeader>
            
            <div className="max-h-60 overflow-y-auto">
              {duplicateData.map((doc, index) => (
                <div key={doc.id} className="p-3 border rounded-lg mb-2 bg-orange-50">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><strong>고객명:</strong> {doc.customerName}</div>
                    <div><strong>연락처:</strong> {doc.customerPhone}</div>
                    <div><strong>판매점:</strong> {doc.storeName || doc.dealerName}</div>
                    <div><strong>통신사:</strong> {doc.carrier}</div>
                    <div><strong>접수일:</strong> {new Date(doc.uploadedAt).toLocaleDateString()}</div>
                    <div><strong>상태:</strong> 
                      <span className={`ml-1 px-2 py-1 rounded text-xs ${
                        doc.activationStatus === '대기' ? 'bg-yellow-100 text-yellow-700' :
                        doc.activationStatus === '진행중' ? 'bg-blue-100 text-blue-700' :
                        doc.activationStatus === '업무요청중' ? 'bg-purple-100 text-purple-700' :
                        doc.activationStatus === '개통' ? 'bg-green-100 text-green-700' :
                        doc.activationStatus === '보완필요' ? 'bg-orange-100 text-orange-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {doc.activationStatus}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => setDuplicateCheckDialog(false)}
                disabled={uploadMutation.isPending}
              >
                취소
              </Button>
              <Button 
                onClick={() => {
                  setDuplicateCheckDialog(false);
                  submitForm();
                }}
                disabled={uploadMutation.isPending}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {uploadMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                계속 진행
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}