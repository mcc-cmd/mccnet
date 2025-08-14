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
    carrier?.name?.toLowerCase().includes(carrierSearchTerm?.toLowerCase() || '') || false
  );

  // 딜러의 접점코드 자동 조회 - 통신사 선택 시
  useEffect(() => {
    if (formData.carrier && user?.userType === 'dealer') {
      fetchDealerContactCodes();
    }
  }, [formData.carrier, user]);

  const fetchDealerContactCodes = async () => {
    if (!formData.carrier) return;
    
    try {
      const dealerCodes = await apiRequest(`/api/dealer/contact-codes/${encodeURIComponent(formData.carrier)}`);
      console.log('Dealer contact codes for carrier:', formData.carrier, dealerCodes);
      
      // 첫 번째 접점코드를 자동으로 설정
      if (dealerCodes && dealerCodes.length > 0) {
        const firstCode = dealerCodes[0];
        setFormData(prev => ({
          ...prev,
          contactCode: firstCode.contactCode,
          storeName: firstCode.storeName || firstCode.dealerName
        }));
      }
    } catch (error) {
      console.warn('딜러 접점코드 조회 실패:', error);
    }
  };
  
  // 이전통신사 목록
  const previousCarriers = [
    'SK', 'KT', 'LG', 'SK알뜰', 'KT알뜰', 'LG알뜰'
  ];

  // 접점코드 목록 가져오기
  const { data: contactCodes = [] } = useQuery({
    queryKey: ['/api/contact-codes'],
    queryFn: () => apiRequest('/api/contact-codes')
  });

  // 필터링된 접점코드 목록
  const filteredContactCodes = contactCodes.filter((contact: any) => {
    if (!contact?.contactCode || !contact?.storeName || !formData.contactCode) return false;
    const searchTerm = formData.contactCode.toLowerCase();
    return contact.contactCode.toLowerCase().includes(searchTerm) ||
           contact.storeName.toLowerCase().includes(searchTerm);
  });
  
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

  // 고객 유형 변경 (필드 초기화 없음)
  const handleCustomerTypeChange = (newType: 'new' | 'port-in') => {
    setFormData(prev => ({ ...prev, customerType: newType }));
  };

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
      
      // 접수 완료 후 폼 초기화
      setFormData({
        customerName: '',
        customerPhone: '',
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
                      placeholder="희망하는 전화번호를 입력하세요"
                      className={getFieldStyle(true)}
                      required
                    />
                  </div>
                )}

                {/* 이전 통신사 입력 (번호이동 선택 시에만 표시) */}
                {formData.customerType === 'port-in' && carrierSettings?.requirePreviousCarrier && (
                  <div className="relative">
                    <Label 
                      htmlFor="previousCarrier" 
                      className={getLabelStyle(true)}
                    >
                      이전 통신사 *
                    </Label>
                    <Select 
                      value={formData.previousCarrier} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, previousCarrier: value }))}
                    >
                      <SelectTrigger className={getFieldStyle(true)}>
                        <SelectValue placeholder="이전 통신사를 선택하세요" />
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

              {/* 고객 정보 섹션 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
                  <Phone className="mr-2 h-4 w-4" />
                  고객 정보
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <Label 
                      htmlFor="customerName" 
                      className={getLabelStyle(carrierSettings?.requireCustomerName)}
                    >
                      고객명 {carrierSettings?.requireCustomerName && "*"}
                    </Label>
                    <Input
                      id="customerName"
                      name="customerName"
                      type="text"
                      value={formData.customerName}
                      onChange={handleInputChange}
                      placeholder="고객명을 입력하세요"
                      className={getFieldStyle(carrierSettings?.requireCustomerName || false)}
                      required={carrierSettings?.requireCustomerName}
                    />
                  </div>
                  
                  <div className="relative">
                    <Label 
                      htmlFor="customerPhone" 
                      className={getLabelStyle(carrierSettings?.requireCustomerPhone)}
                    >
                      연락처 {carrierSettings?.requireCustomerPhone && "*"}
                    </Label>
                    <Input
                      id="customerPhone"
                      name="customerPhone"
                      type="tel"
                      value={formData.customerPhone}
                      onChange={handleInputChange}
                      placeholder="010-0000-0000"
                      className={getFieldStyle(carrierSettings?.requireCustomerPhone || false)}
                      required={carrierSettings?.requireCustomerPhone}
                    />
                  </div>
                </div>
              </div>

              {/* 통신사/판매점 정보 섹션 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
                  <Search className="mr-2 h-4 w-4" />
                  통신사 정보
                </h3>
                
                <div className="relative">
                  <Label 
                    htmlFor="carrier" 
                    className={getLabelStyle(true)}
                  >
                    통신사 *
                  </Label>
                  <div className="relative">
                    <Input
                      id="carrier"
                      type="text"
                      value={carrierSearchTerm}
                      onChange={(e) => setCarrierSearchTerm(e.target.value)}
                      placeholder="통신사를 검색하고 선택하세요"
                      className={getFieldStyle(true)}
                    />
                    {carrierSearchTerm && filteredCarriers.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
                        {filteredCarriers.map((carrier) => (
                          <div
                            key={carrier.id}
                            className="px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 border-b last:border-b-0"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, carrier: carrier.name }));
                              // 검색 내용을 유지 - carrierSearchTerm을 초기화하지 않음
                            }}
                          >
                            {carrier.name}
                          </div>
                        ))}
                      </div>
                    )}
                    {formData.carrier && (
                      <div className="mt-2 text-sm text-green-600 dark:text-green-400">
                        선택됨: {formData.carrier}
                      </div>
                    )}
                  </div>
                </div>
                
                {carrierSettings?.requireContactCode && (
                  <div className="relative">
                    <Label 
                      htmlFor="contactCode" 
                      className={getLabelStyle(true)}
                    >
                      개통방명 코드 *
                    </Label>
                    <div className="relative">
                      <Input
                        id="contactCode"
                        name="contactCode"
                        type="text"
                        value={formData.contactCode}
                        onChange={(e) => handleContactCodeChange(e.target.value)}
                        placeholder="개통방명 코드를 검색하고 선택하세요"
                        className={getFieldStyle(true)}
                        required
                      />
                      {formData.contactCode && filteredContactCodes.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
                          {filteredContactCodes.slice(0, 5).map((contact: any, index: number) => (
                            <div
                              key={index}
                              className="px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 border-b last:border-b-0"
                              onClick={() => {
                                setFormData(prev => ({ 
                                  ...prev, 
                                  contactCode: contact.contactCode,
                                  storeName: contact.storeName
                                }));
                              }}
                            >
                              <div className="font-medium">{contact.contactCode}</div>
                              <div className="text-sm text-gray-500">{contact.storeName}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="relative">
                  <Label 
                    htmlFor="storeName" 
                    className={getLabelStyle(carrierSettings?.requireContactCode)}
                  >
                    판매점명 {carrierSettings?.requireContactCode && "*"}
                  </Label>
                  <Input
                    id="storeName"
                    name="storeName"
                    type="text"
                    value={formData.storeName}
                    onChange={handleInputChange}
                    placeholder="판매점명이 자동으로 입력됩니다"
                    className={getFieldStyle(carrierSettings?.requireContactCode || false)}
                    readOnly
                  />
                </div>
              </div>

              {/* 결합 정보 섹션 */}
              {(carrierSettings?.requireBundleNumber || carrierSettings?.requireBundleCarrier) && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    결합 정보
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          type="text"
                          value={formData.bundleNumber}
                          onChange={handleInputChange}
                          placeholder="결합번호를 입력하세요"
                          className={getFieldStyle(true)}
                          required
                        />
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
                          type="text"
                          value={formData.bundleCarrier}
                          onChange={handleInputChange}
                          placeholder="결합통신사를 입력하세요"
                          className={getFieldStyle(true)}
                          required
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 파일 업로드 섹션 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
                  <Upload className="mr-2 h-4 w-4" />
                  서류 첨부 {carrierSettings?.requireDocumentUpload && <span className="text-red-500 ml-1">*</span>}
                </h3>
                
                <div
                  className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
                    dragActive
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                >
                  <div className="text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="mt-4">
                      <Label htmlFor="file-upload" className="cursor-pointer">
                        <span className="mt-2 block text-sm font-medium text-gray-900">
                          파일을 드래그하거나 클릭하여 업로드
                        </span>
                        <span className="mt-1 block text-xs text-gray-500">
                          PDF, DOC, DOCX, JPG, PNG (최대 10MB)
                        </span>
                      </Label>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        className="sr-only"
                        onChange={handleFileSelect}
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      />
                    </div>
                  </div>
                </div>

                {selectedFile && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 text-gray-500 mr-2" />
                        <span className="text-sm font-medium">{selectedFile.name}</span>
                        <span className="text-xs text-gray-500 ml-2">
                          ({formatFileSize(selectedFile.size)})
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedFile(null)}
                      >
                        삭제
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* 비고 섹션 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  비고
                </h3>
                
                <Textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="추가 정보나 특이사항이 있으면 입력하세요"
                  rows={3}
                />
              </div>

              {/* 제출 버튼 */}
              <div className="flex justify-end space-x-3">
                <Button
                  type="submit"
                  disabled={uploadMutation.isPending || isCheckingDuplicate}
                  className="min-w-[120px]"
                >
                  {uploadMutation.isPending || isCheckingDuplicate ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isCheckingDuplicate ? '중복 확인 중...' : '접수 중...'}
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
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <AlertTriangle className="mr-2 h-5 w-5 text-amber-500" />
                중복 데이터 발견
              </DialogTitle>
              <DialogDescription>
                동일한 고객 정보로 등록된 접수가 있습니다. 계속 진행하시겠습니까?
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="max-h-60 overflow-y-auto">
                {duplicateData.map((item, index) => (
                  <div key={index} className="p-3 border rounded-md bg-gray-50">
                    <div className="text-sm">
                      <div><strong>고객명:</strong> {item.customerName}</div>
                      <div><strong>연락처:</strong> {item.customerPhone}</div>
                      <div><strong>통신사:</strong> {item.carrier}</div>
                      <div><strong>상태:</strong> {item.status}</div>
                      <div><strong>등록일:</strong> {new Date(item.createdAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setDuplicateCheckDialog(false)}
                >
                  취소
                </Button>
                <Button
                  onClick={() => {
                    setDuplicateCheckDialog(false);
                    submitForm();
                  }}
                >
                  계속 진행
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}