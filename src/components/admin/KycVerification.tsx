import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  User, 
  FileText, 
  Camera, 
  CheckCircle, 
  XCircle,
  Clock,
  Eye,
  Search,
  Filter,
  Calendar,
  MapPin,
  Phone,
  Mail,
  AlertTriangle,
  Download,
  MessageSquare
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

interface KycSubmission {
  id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  rejection_reason?: string;
  profile_data: any;
  kyc_documents: any[];
  user: {
    email: string;
    profiles: {
      first_name: string;
      last_name: string;
      phone: string;
      city: string;
      avatar_url: string;
    };
  };
}

interface KycDocument {
  id: string;
  doc_type: string;
  file_url: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export const AdminKycVerification = () => {
  const [submissions, setSubmissions] = useState<KycSubmission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<KycSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [rejectionReason, setRejectionReason] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadSubmissions();
  }, []);

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      
      // Use edge function to get submissions with user data
      const { data, error } = await supabase.functions.invoke('admin-kyc-submissions');

      if (error) throw error;
      setSubmissions(data.submissions || []);
    } catch (error) {
      console.error('Error loading submissions:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить заявки KYC",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const moderateDocument = async (userId: string, status: 'approved' | 'rejected', notes: string = '') => {
    try {
      setProcessing(true);
      
      const { data, error } = await supabase.functions.invoke('admin-kyc', {
        body: {
          action: 'moderate',
          userId,
          status,
          notes
        }
      });

      if (error) throw error;

      toast({
        title: status === 'approved' ? "Документы одобрены" : "Документы отклонены",
        description: `KYC документы пользователя ${status === 'approved' ? 'одобрены' : 'отклонены'}`
      });

      await loadSubmissions();
      if (selectedSubmission) {
        const updated = submissions.find(s => s.id === selectedSubmission.id);
        if (updated) setSelectedSubmission(updated);
      }
    } catch (error) {
      console.error('Error moderating document:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось модерировать документ",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
      setRejectionReason("");
    }
  };

  const approveSubmission = async (submissionId: string) => {
    try {
      setProcessing(true);
      
      const { error } = await supabase.rpc('approve_pro_upgrade_request', {
        _request_id: submissionId
      });

      if (error) throw error;

      toast({
        title: "Заявка одобрена",
        description: "Пользователь получил статус специалиста"
      });

      await loadSubmissions();
    } catch (error) {
      console.error('Error approving submission:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось одобрить заявку",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const rejectSubmission = async (submissionId: string, reason: string) => {
    try {
      setProcessing(true);
      
      const { error } = await supabase.rpc('reject_pro_upgrade_request', {
        _request_id: submissionId,
        _reason: reason
      });

      if (error) throw error;

      toast({
        title: "Заявка отклонена",
        description: "Пользователь получил уведомление об отклонении"
      });

      await loadSubmissions();
      setRejectionReason("");
    } catch (error) {
      console.error('Error rejecting submission:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось отклонить заявку",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const filteredSubmissions = submissions.filter(submission => {
    const matchesSearch = 
      submission.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.user?.profiles?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.user?.profiles?.last_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || submission.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-300"><Clock className="w-3 h-3 mr-1" />Ожидает</Badge>;
      case 'approved':
        return <Badge variant="default" className="text-green-600 border-green-300"><CheckCircle className="w-3 h-3 mr-1" />Одобрено</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Отклонено</Badge>;
      default:
        return <Badge variant="outline">Неизвестно</Badge>;
    }
  };

  const getDocumentStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600">На проверке</Badge>;
      case 'approved':
        return <Badge variant="default" className="text-green-600">Одобрено</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Отклонено</Badge>;
      default:
        return <Badge variant="outline">Неизвестно</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Верификация KYC</h2>
          <p className="text-muted-foreground">Управление заявками на верификацию пользователей</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            Всего заявок: {submissions.length}
          </Badge>
          <Badge variant="outline" className="text-yellow-600">
            Ожидают: {submissions.filter(s => s.status === 'pending').length}
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Поиск по имени или email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-input bg-background rounded-md text-sm"
        >
          <option value="all">Все статусы</option>
          <option value="pending">Ожидают</option>
          <option value="approved">Одобрено</option>
          <option value="rejected">Отклонено</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Submissions List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Заявки на верификацию
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {filteredSubmissions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Заявки не найдены
                </p>
              ) : (
                filteredSubmissions.map((submission) => (
                  <motion.div
                    key={submission.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                      selectedSubmission?.id === submission.id ? 'border-primary bg-primary/5' : ''
                    }`}
                    onClick={() => setSelectedSubmission(submission)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        {submission.user?.profiles?.avatar_url ? (
                          <img 
                            src={submission.user.profiles.avatar_url} 
                            alt="Avatar"
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            <User className="w-5 h-5" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">
                            {submission.user?.profiles?.first_name} {submission.user?.profiles?.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">{submission.user?.email}</p>
                        </div>
                      </div>
                      {getStatusBadge(submission.status)}
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDistanceToNow(new Date(submission.submitted_at), { addSuffix: true, locale: ru })}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {submission.kyc_documents?.length || 0} документов
                      </span>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Submission Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Детали заявки
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedSubmission ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedSubmission.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  {/* User Info */}
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Информация о пользователе
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Email:</span>
                        <p className="font-medium">{selectedSubmission.user?.email}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Телефон:</span>
                        <p className="font-medium">{selectedSubmission.user?.profiles?.phone || 'Не указан'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Город:</span>
                        <p className="font-medium">{selectedSubmission.user?.profiles?.city || 'Не указан'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Статус заявки:</span>
                        <div className="mt-1">{getStatusBadge(selectedSubmission.status)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Personal Data */}
                  {selectedSubmission.profile_data && (
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Личные данные
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Имя:</span>
                          <p className="font-medium">{selectedSubmission.profile_data.firstName}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Фамилия:</span>
                          <p className="font-medium">{selectedSubmission.profile_data.lastName}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Дата рождения:</span>
                          <p className="font-medium">{selectedSubmission.profile_data.dateOfBirth}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Гражданство:</span>
                          <p className="font-medium">{selectedSubmission.profile_data.nationality || 'Не указано'}</p>
                        </div>
                        {selectedSubmission.profile_data.address && (
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Адрес:</span>
                            <p className="font-medium">{selectedSubmission.profile_data.address}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Documents */}
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Camera className="w-4 h-4" />
                      Документы ({selectedSubmission.kyc_documents?.length || 0})
                    </h4>
                    {selectedSubmission.kyc_documents && selectedSubmission.kyc_documents.length > 0 ? (
                      <div className="space-y-3">
                        {selectedSubmission.kyc_documents.map((doc: KycDocument) => (
                          <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              {doc.doc_type === 'selfie' ? (
                                <Camera className="w-4 h-4" />
                              ) : (
                                <FileText className="w-4 h-4" />
                              )}
                              <div>
                                <p className="text-sm font-medium">
                                  {doc.doc_type === 'id_card' ? 'Документ удостоверения личности' : 
                                   doc.doc_type === 'selfie' ? 'Селфи' : doc.doc_type}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true, locale: ru })}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {getDocumentStatusBadge(doc.status)}
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => {
                                  // Create a signed URL for viewing the document
                                  supabase.storage
                                    .from('kyc')
                                    .createSignedUrl(doc.file_url.split('/kyc/')[1], 300)
                                    .then(({ data, error }) => {
                                      if (error) {
                                        console.error('Error creating signed URL:', error);
                                        // Fallback to direct URL
                                        window.open(doc.file_url, '_blank');
                                      } else {
                                        window.open(data.signedUrl, '_blank');
                                      }
                                    });
                                }}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Документы не загружены</p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  {selectedSubmission.status === 'pending' && (
                    <div className="space-y-4">
                      <div className="flex gap-3">
                        <Button 
                          onClick={() => approveSubmission(selectedSubmission.id)}
                          disabled={processing}
                          className="flex-1"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          {processing ? "Обработка..." : "Одобрить заявку"}
                        </Button>
                      </div>
                      
                      <div className="space-y-3">
                        <Label htmlFor="rejection-reason">Причина отклонения (опционально):</Label>
                        <Textarea
                          id="rejection-reason"
                          placeholder="Укажите причину отклонения заявки..."
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          rows={3}
                        />
                        <Button 
                          variant="destructive"
                          onClick={() => rejectSubmission(selectedSubmission.id, rejectionReason)}
                          disabled={processing}
                          className="w-full"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          {processing ? "Обработка..." : "Отклонить заявку"}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Rejection Reason */}
                  {selectedSubmission.status === 'rejected' && selectedSubmission.rejection_reason && (
                    <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
                      <h4 className="font-medium text-red-800 mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Причина отклонения
                      </h4>
                      <p className="text-sm text-red-700">{selectedSubmission.rejection_reason}</p>
                    </div>
                  )}

                  {/* Review Info */}
                  {selectedSubmission.reviewed_at && (
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Информация о проверке</h4>
                      <p className="text-sm text-muted-foreground">
                        Рассмотрено: {formatDistanceToNow(new Date(selectedSubmission.reviewed_at), { addSuffix: true, locale: ru })}
                      </p>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Выберите заявку для просмотра деталей</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};