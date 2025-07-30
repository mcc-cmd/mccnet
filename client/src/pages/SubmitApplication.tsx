import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth, useApiRequest } from '@/lib/auth';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Upload, Loader2, FileText, Phone, User } from 'lucide-react';

export function SubmitApplication() {
  const { user } = useAuth();
  const apiRequest = useApiRequest();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    contactCode: '',
    storeName: '',
    carrier: '',
    previousCarrier: '',
    notes: ''
  });

  // 접점코드 변경 시 판매점명 자동 조회
  const handleContactCodeChange = async (contactCode: string) => {
    setFormData(prev => ({ ...prev, contactCode }));
    
    if (contactCode.trim() && formData.carrier) {
      try {
        const response = await apiRequest(`/api/contact-codes/search/${contactCode}`);
        if (response?.dealerName) {
          setFormData(prev => ({ ...prev, storeName: response.dealerName }));
        }
      } catch (error) {
        // 접점코드가 없으면 판매점명을 비워둠
        setFormData(prev => ({ ...prev, storeName: '' }));
      }
    }
  };
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  
  // 통신사 목록 (실제 운영 통신사)
  const carriers = [
    'SK텔링크', 'SK프리티', 'SK스테이지파이브', 'KT엠모바일', 'KT스카이라이프', 'KT스테이지파이브', 
    'KT코드모바일', 'LG미디어로그', 'LG헬로모바일', 'LG프리티', 'LG밸류컴', '스마텔LG', 'KT'
  ];
  
  // 이전통신사 목록
  const previousCarriers = [
    'SK', 'KT', 'LG', 'SK알뜰', 'KT알뜰', 'LG알뜰'
  ];
  
  // SK 계열사 체크 (SK텔링크, SK프리티, SK스테이지파이브)
  const isSKCarrier = (carrier: string) => {
    return carrier.startsWith('SK');
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
      setFormData({ customerName: '', customerPhone: '', contactCode: '', storeName: '', carrier: '', notes: '' });
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
    
    if (!formData.customerName || !formData.customerPhone || !formData.contactCode) {
      toast({
        title: "입력 오류",
        description: "고객명, 연락처, 개통방명 코드를 입력하세요.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.carrier) {
      toast({
        title: "입력 오류",
        description: "통신사를 선택하세요.",
        variant: "destructive",
      });
      return;
    }

    // SK 계열사인 경우 파일 업로드 필수
    if (isSKCarrier(formData.carrier) && !selectedFile) {
      toast({
        title: "입력 오류",
        description: "SK 계열사 접수 시 서류 업로드는 필수입니다.",
        variant: "destructive",
      });
      return;
    }

    const data = new FormData();
    data.append('customerName', formData.customerName);
    data.append('customerPhone', formData.customerPhone);
    data.append('contactCode', formData.contactCode);
    data.append('carrier', formData.carrier);
    data.append('previousCarrier', formData.previousCarrier);
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
              {/* 고객 정보 섹션 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <User className="mr-2 h-4 w-4" />
                  고객 정보
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customerName">고객명 *</Label>
                    <Input
                      id="customerName"
                      name="customerName"
                      value={formData.customerName}
                      onChange={handleInputChange}
                      required
                      placeholder="고객명을 입력하세요"
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="customerPhone">연락처 *</Label>
                    <Input
                      id="customerPhone"
                      name="customerPhone"
                      type="tel"
                      value={formData.customerPhone}
                      onChange={handleInputChange}
                      required
                      placeholder="010-0000-0000"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contactCode">개통방명 코드 *</Label>
                    <Input
                      id="contactCode"
                      name="contactCode"
                      value={formData.contactCode}
                      onChange={(e) => handleContactCodeChange(e.target.value)}
                      required
                      placeholder="개통방명 코드를 입력하세요"
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="storeName">판매점명</Label>
                    <Input
                      id="storeName"
                      name="storeName"
                      value={formData.storeName}
                      readOnly
                      placeholder="접점코드 입력 시 자동 설정"
                      className="mt-1 bg-gray-50 text-gray-700"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="carrier">통신사 *</Label>
                    <Select value={formData.carrier} onValueChange={(value) => setFormData(prev => ({ ...prev, carrier: value }))}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="통신사를 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        {carriers.map((carrier) => (
                          <SelectItem key={carrier} value={carrier}>
                            {carrier}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formData.carrier && isSKCarrier(formData.carrier) && (
                      <p className="text-sm text-red-600 mt-1">
                        * SK 계열사 접수 시 서류 업로드는 필수입니다.
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="previousCarrier">이전통신사</Label>
                    <Select value={formData.previousCarrier} onValueChange={(value) => setFormData(prev => ({ ...prev, previousCarrier: value }))}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="이전통신사를 선택하세요 (선택사항)" />
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
      </div>
    </Layout>
  );
}