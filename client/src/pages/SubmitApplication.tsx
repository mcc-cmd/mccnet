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

export function SubmitApplication() {
  const { user } = useAuth();
  const apiRequest = useApiRequest();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // 초기 상태를 localStorage에서 복원하거나 기본값 사용
  const [formData, setFormData] = useState(() => {
    try {
      const saved = localStorage.getItem('submitApplication_formData');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.warn('폼 데이터 복원 실패:', error);
    }
    return {
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      contactCode: '',
      storeName: '',
      carrier: '',
      previousCarrier: '',
      bundleNumber: '',
      bundleCarrier: '',
      customerType: 'new', // 'new' 또는 'port-in'
      desiredNumber: '',
      notes: ''
    };
  });

  // 폼 데이터가 변경될 때마다 localStorage에 저장
  useEffect(() => {
    try {
      localStorage.setItem('submitApplication_formData', JSON.stringify(formData));
    } catch (error) {
      console.warn('폼 데이터 저장 실패:', error);
    }
  }, [formData]);

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
        }
        // 응답이 없어도 기존 데이터는 보존 - 초기화하지 않음
      } catch (error) {
        // 오류가 있어도 기존 데이터는 보존 - 초기화하지 않음
        console.warn('접점코드 조회 실패:', error);
      }
    }
    // 접점코드가 비어있어도 기존 데이터는 보존 - 초기화하지 않음
  };
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [duplicateCheckDialog, setDuplicateCheckDialog] = useState(false);
  const [duplicateData, setDuplicateData] = useState<any[]>([]);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  
  // 활성화된 통신사 목록만 가져오기
  const { data: allCarriers = [], isLoading: carriersLoading } = useQuery<Carrier[]>({
    queryKey: ['/api/carriers'],
    queryFn: () => apiRequest('/api/carriers'),
    staleTime: 5 * 60 * 1000, // 5분간 캐시 유지
    refetchOnWindowFocus: false // 창 포커스 시 새로고침 비활성화 - 사용자 입력 보호
  });

  // 활성화된 통신사만 필터링
  const carriers = allCarriers.filter(carrier => carrier.isActive);

  // 통신사 검색 상태
  const [carrierSearchTerm, setCarrierSearchTerm] = useState('');
  
  // 검색된 통신사 목록
  const filteredCarriers = carriers.filter(carrier => 
    carrier.name.toLowerCase().includes(carrierSearchTerm.toLowerCase())
  );
  
  // 이전통신사 목록
  const previousCarriers = [
    'SK', 'KT', 'LG', 'SK알뜰', 'KT알뜰', 'LG알뜰'
  ];
  
  // 선택된 통신사의 정보 가져오기 (Boolean 값 변환) - 활성화된 통신사에서만 검색
  const selectedCarrier = carriers.find(c => c.name === formData.carrier);
  const carrierSettings = selectedCarrier ? {
    ...selectedCarrier,
    requireCustomerName: Boolean(selectedCarrier.requireCustomerName),
    requireCustomerPhone: Boolean(selectedCarrier.requireCustomerPhone),
    requireCustomerEmail: Boolean(selectedCarrier.requireCustomerEmail),
    requireContactCode: Boolean(selectedCarrier.requireContactCode),
    requireCarrier: Boolean(selectedCarrier.requireCarrier),
    requirePreviousCarrier: Boolean(selectedCarrier.requirePreviousCarrier),
    requireDocumentUpload: Boolean(selectedCarrier.requireDocumentUpload),
    requireBundleNumber: Boolean(selectedCarrier.requireBundleNumber),
    requireBundleCarrier: Boolean(selectedCarrier.requireBundleCarrier),
    requireDesiredNumber: Boolean(selectedCarrier.requireDesiredNumber),
    allowNewCustomer: Boolean(selectedCarrier.allowNewCustomer),
    allowPortIn: Boolean(selectedCarrier.allowPortIn)
  } : null;

  // 필드 스타일 헬퍼 함수
  const getFieldStyle = (isRequired: boolean) => {
    return isRequired 
      ? "border-red-500 focus:border-red-600 focus:ring-red-500" 
      : "border-input focus:border-primary focus:ring-primary";
  };

  const getLabelStyle = (isRequired: boolean) => {
    return isRequired 
      ? "text-red-700 dark:text-red-400 font-medium" 
      : "text-foreground";
  };
  
  // 통신사 설정에 따른 고객 유형 필터링
  const availableCustomerTypes = {
    new: carrierSettings?.allowNewCustomer !== false,
    portIn: carrierSettings?.allowPortIn !== false
  };

  // 자동 초기화 로직 제거 - 사용자 입력 보존

  // 고객 유형 변경 (필드 초기화 없음)
  const handleCustomerTypeChange = (newType: 'new' | 'port-in') => {
    setFormData(prev => ({ ...prev, customerType: newType }));
  };

  // 중복 체크 함수
  const checkDuplicate = async () => {
    if (!formData.customerName || !formData.customerPhone || !formData.carrier || !formData.storeName) {
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
          carrier: formData.carrier,
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
      // 접수 성공 후에만 관련 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      
      toast({
        title: "접수 완료",
        description: "서류가 성공적으로 접수되었습니다.",
      });

      // 업로드된 파일만 초기화, 폼 데이터는 보존
      setSelectedFile(null);
      
      // 중복 확인 다이얼로그가 열려있다면 닫기
      setDuplicateCheckDialog(false);
      setDuplicateData([]);
      
      // 성공적으로 접수된 후에만 localStorage의 폼 데이터 초기화
      localStorage.removeItem('submitApplication_formData');
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
      if (selectedCarrier.requirePreviousCarrier && formData.customerType === 'port-in' && !formData.previousCarrier) {
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
      if (selectedCarrier.requireDesiredNumber && formData.customerType === 'new' && !formData.desiredNumber) {
        errors.push("희망번호");
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
    data.append('customerType', formData.customerType);
    data.append('desiredNumber', formData.desiredNumber);
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
              {/* 고객 유형 선택 섹션 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
                  <User className="mr-2 h-4 w-4" />
                  고객 유형
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="customer-type-new"
                      name="customerType"
                      value="new"
                      checked={formData.customerType === 'new'}
                      onChange={(e) => handleCustomerTypeChange(e.target.value as 'new' | 'port-in')}
                      disabled={!availableCustomerTypes.new}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <Label 
                      htmlFor="customer-type-new" 
                      className={`text-sm font-medium ${availableCustomerTypes.new ? 'text-gray-700' : 'text-gray-400'}`}
                    >
                      신규
                      {!availableCustomerTypes.new && " (지원안함)"}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="customer-type-port-in"
                      name="customerType"
                      value="port-in"
                      checked={formData.customerType === 'port-in'}
                      onChange={(e) => handleCustomerTypeChange(e.target.value as 'new' | 'port-in')}
                      disabled={!availableCustomerTypes.portIn}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <Label 
                      htmlFor="customer-type-port-in" 
                      className={`text-sm font-medium ${availableCustomerTypes.portIn ? 'text-gray-700' : 'text-gray-400'}`}
                    >
                      번호이동
                      {!availableCustomerTypes.portIn && " (지원안함)"}
                    </Label>
                  </div>
                </div>
                
                {/* 희망번호 입력 (신규 선택 시에만 표시) */}
                {formData.customerType === 'new' && carrierSettings?.requireDesiredNumber && (
                  <div className="relative">
                    <Label 
                      htmlFor="desiredNumber" 
                      className={getLabelStyle(true)}
                    >
                      희망번호 *
                    </Label>
                    <Input
                      id="desiredNumber"
                      type="text"
                      value={formData.desiredNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, desiredNumber: e.target.value }))}
                      placeholder="희망하는 전화번호를 입력하세요 (예: 010-1234-5678)"
                      className={`mt-1 ${getFieldStyle(true)}`}
                      required
                    />
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-medium">
                      이 통신사는 신규 고객의 희망번호 입력이 필수입니다.
                    </p>
                  </div>
                )}
              </div>

              {/* 통신사 선택 섹션 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
                  <Phone className="mr-2 h-4 w-4" />
                  통신사 선택
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="carrier">통신사 *</Label>
                    <div className="relative mt-1">
                      <Select 
                        value={formData.carrier} 
                        onValueChange={(value) => {
                          setFormData(prev => {
                            const newData = { ...prev, carrier: value };
                            // 기타 통신사 선택 시 접점코드를 판매점명으로 설정
                            if (value.includes('기타') && newData.contactCode.trim()) {
                              newData.storeName = newData.contactCode;
                            } else if (!value.includes('기타')) {
                              // 기타가 아닌 통신사 선택 시 기존 로직대로 처리
                              if (newData.contactCode.trim()) {
                                // 접점코드가 있으면 자동 조회 시도
                                handleContactCodeChange(newData.contactCode);
                              }
                            }
                            return newData;
                          });
                          setCarrierSearchTerm(''); // 선택 후 검색어 초기화
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="통신사를 선택하세요" />
                        </SelectTrigger>
                        <SelectContent>
                          {/* 검색 입력 필드 */}
                          <div className="flex items-center px-3 py-2 border-b">
                            <Search className="h-4 w-4 text-gray-400 mr-2" />
                            <Input
                              placeholder="통신사 검색..."
                              value={carrierSearchTerm}
                              onChange={(e) => setCarrierSearchTerm(e.target.value)}
                              className="border-0 focus:ring-0 p-0 h-auto"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          
                          {carriersLoading ? (
                            <SelectItem value="loading" disabled>
                              <div className="flex items-center">
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                로딩 중...
                              </div>
                            </SelectItem>
                          ) : filteredCarriers.length > 0 ? (
                            filteredCarriers.map((carrier) => (
                              <SelectItem key={carrier.id} value={carrier.name}>
                                <div className="flex items-center justify-between w-full">
                                  <span>{carrier.name}</span>
                                  <div className="flex items-center space-x-1 text-xs text-gray-500">
                                    {Boolean(carrier.requireDocumentUpload) && (
                                      <span className="px-1 py-0.5 bg-red-100 text-red-600 rounded">서류필수</span>
                                    )}
                                    {Boolean(carrier.isWired) && (
                                      <span className="px-1 py-0.5 bg-blue-100 text-blue-600 rounded">유선</span>
                                    )}
                                  </div>
                                </div>
                              </SelectItem>
                            ))
                          ) : (
                            <div className="px-3 py-2 text-sm text-gray-500">
                              {carrierSearchTerm ? '검색 결과가 없습니다.' : '활성화된 통신사가 없습니다.'}
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    {carrierSettings?.requireDocumentUpload && (
                      <Alert className="mt-2">
                        <AlertDescription>
                          {formData.carrier} 접수 시 서류 업로드는 필수입니다.
                        </AlertDescription>
                      </Alert>
                    )}
                    {carrierSettings?.bundleNumber && (
                      <Alert className="mt-2">
                        <AlertDescription>
                          결합 번호: {carrierSettings.bundleNumber}
                          {carrierSettings.bundleCarrier && ` (${carrierSettings.bundleCarrier})`}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                  
                  {/* 이전통신사는 번호이동 고객에게만 표시 */}
                  {formData.customerType === 'port-in' && carrierSettings?.requirePreviousCarrier && (
                    <div className="relative">
                      <Label 
                        htmlFor="previousCarrier" 
                        className={getLabelStyle(true)}
                      >
                        이전통신사 *
                      </Label>
                      <Select value={formData.previousCarrier} onValueChange={(value) => setFormData(prev => ({ ...prev, previousCarrier: value }))}>
                        <SelectTrigger className={`mt-1 ${getFieldStyle(true)}`}>
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
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    </div>
                  )}
                </div>
              </div>

              {/* 고객 정보 섹션 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
                  <User className="mr-2 h-4 w-4" />
                  고객 정보
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {carrierSettings?.requireCustomerName && (
                    <div className="relative">
                      <Label 
                        htmlFor="customerName" 
                        className={getLabelStyle(true)}
                      >
                        고객명 *
                      </Label>
                      <Input
                        id="customerName"
                        name="customerName"
                        value={formData.customerName}
                        onChange={handleInputChange}
                        placeholder="고객명을 입력하세요"
                        className={`mt-1 ${getFieldStyle(true)}`}
                        required
                      />
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    </div>
                  )}
                  
                  {carrierSettings?.requireCustomerPhone && (
                    <div className="relative">
                      <Label 
                        htmlFor="customerPhone" 
                        className={getLabelStyle(true)}
                      >
                        연락처 *
                      </Label>
                      <Input
                        id="customerPhone"
                        name="customerPhone"
                        type="tel"
                        value={formData.customerPhone}
                        onChange={handleInputChange}
                        placeholder="010-0000-0000"
                        className={`mt-1 ${getFieldStyle(true)}`}
                        required
                      />
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    </div>
                  )}
                  
                  {carrierSettings?.requireCustomerEmail && (
                    <div className="relative">
                      <Label 
                        htmlFor="customerEmail" 
                        className={getLabelStyle(true)}
                      >
                        이메일 *
                      </Label>
                      <Input
                        id="customerEmail"
                        name="customerEmail"
                        type="email"
                        value={formData.customerEmail}
                        onChange={handleInputChange}
                        placeholder="email@example.com"
                        className={`mt-1 ${getFieldStyle(true)}`}
                        required
                      />
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {carrierSettings?.requireContactCode && (
                    <div className="relative">
                      <Label 
                        htmlFor="contactCode" 
                        className={getLabelStyle(true)}
                      >
                        개통방명 코드 *
                      </Label>
                      <Input
                        id="contactCode"
                        name="contactCode"
                        value={formData.contactCode}
                        onChange={(e) => handleContactCodeChange(e.target.value)}
                        placeholder="개통방명 코드를 입력하세요"
                        className={`mt-1 ${getFieldStyle(true)}`}
                        required
                      />
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    </div>
                  )}
                  
                  <div>
                    <Label 
                      htmlFor="storeName" 
                      className={getLabelStyle(false)}
                    >
                      판매점명
                    </Label>
                    <Input
                      id="storeName"
                      name="storeName"
                      value={formData.storeName}
                      readOnly={!formData.carrier.includes('기타')}
                      placeholder={formData.carrier.includes('기타') ? "판매점명을 입력하세요" : "접점코드 입력 시 자동 설정"}
                      className={`mt-1 ${getFieldStyle(false)} ${!formData.carrier.includes('기타') ? 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300' : ''}`}
                      onChange={formData.carrier.includes('기타') ? handleInputChange : undefined}
                    />
                  </div>
                  
                  {carrierSettings?.requireBundleNumber && (
                    <div className="relative">
                      <Label 
                        htmlFor="bundleNumber" 
                        className={getLabelStyle(true)}
                      >
                        결합번호 *
                      </Label>
                      <Input
                        id="bundleNumber"
                        name="bundleNumber"
                        value={formData.bundleNumber}
                        onChange={handleInputChange}
                        placeholder="결합번호를 입력하세요"
                        className={`mt-1 ${getFieldStyle(true)}`}
                        required
                      />
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    </div>
                  )}
                  
                  {carrierSettings?.requireBundleCarrier && (
                    <div className="relative">
                      <Label 
                        htmlFor="bundleCarrier" 
                        className={getLabelStyle(true)}
                      >
                        결합통신사 *
                      </Label>
                      <Input
                        id="bundleCarrier"
                        name="bundleCarrier"
                        value={formData.bundleCarrier}
                        onChange={handleInputChange}
                        placeholder="결합통신사를 입력하세요"
                        className={`mt-1 ${getFieldStyle(true)}`}
                        required
                      />
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    </div>
                  )}
                </div>



                <div>
                  <Label 
                    htmlFor="notes" 
                    className={getLabelStyle(false)}
                  >
                    메모
                  </Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    placeholder="추가 메모사항이 있으면 입력하세요"
                    className={`mt-1 ${getFieldStyle(false)}`}
                    rows={3}
                  />
                </div>
              </div>

              {/* 파일 업로드 섹션 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
                  <Upload className="mr-2 h-4 w-4" />
                  서류 업로드
                  {carrierSettings?.requireDocumentUpload ? (
                    <span className="ml-1 text-red-600 dark:text-red-400">*</span>
                  ) : (
                    <span className="ml-1 text-gray-500 text-sm">(선택사항)</span>
                  )}
                </h3>
                
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    carrierSettings?.requireDocumentUpload 
                      ? (dragActive
                          ? 'border-red-400 bg-red-50 dark:bg-red-900/20'
                          : selectedFile
                          ? 'border-green-400 bg-green-50 dark:bg-green-900/20'
                          : 'border-red-300 hover:border-red-400 bg-red-50/50 dark:bg-red-900/10')
                      : (dragActive
                          ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                          : selectedFile
                          ? 'border-green-400 bg-green-50 dark:bg-green-900/20'
                          : 'border-gray-300 hover:border-gray-400 dark:border-gray-600')
                  } ${carrierSettings?.requireDocumentUpload ? 'ring-1 ring-red-200 dark:ring-red-800' : ''}`}
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
                    if (window.confirm('정말로 모든 입력 내용을 초기화하시겠습니까?')) {
                      const initialData = { 
                        customerName: '', customerPhone: '', customerEmail: '', contactCode: '', storeName: '', 
                        carrier: '', previousCarrier: '', bundleNumber: '', bundleCarrier: '', 
                        customerType: 'new', desiredNumber: '', notes: '' 
                      };
                      setFormData(initialData);
                      setSelectedFile(null);
                      
                      // localStorage에서도 제거
                      localStorage.removeItem('submitApplication_formData');
                    }
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
                같은 달에 동일한 판매점, 통신사, 명의로 접수관리 또는 개통완료된 건이 있습니다. 계속 진행하시겠습니까?
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