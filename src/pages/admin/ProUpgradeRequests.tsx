import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Eye, 
  FileText,
  User,
  Calendar,
  ExternalLink
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

interface ProUpgradeRequest {
  id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  rejection_reason?: string;
  profile_data: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    city?: string;
    bio?: string;
  };
  kyc_documents: Array<{
    id: string;
    doc_type: string;
    file_url: string;
    status: string;
  }>;
  profiles?: {
    first_name?: string;
    last_name?: string;
    full_name?: string;
    avatar_url?: string;
    city?: string;
    phone?: string;
  };
}

interface ReviewModalData {
  isOpen: boolean;
  request: ProUpgradeRequest | null;
  action: 'approve' | 'reject' | null;
}

export default function ProUpgradeRequests() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<ProUpgradeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [reviewModal, setReviewModal] = useState<ReviewModalData>({
    isOpen: false,
    request: null,
    action: null
  });
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    loadRequests();
  }, [filter]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('pro_upgrade_requests')
        .select(`
          *,
          profiles!inner(first_name, last_name, full_name, avatar_url, city, phone)
        `)
        .order('submitted_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setRequests(data || []);
    } catch (error: any) {
      console.error('Error loading requests:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить заявки",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (action: 'approve' | 'reject') => {
    if (!reviewModal.request) return;
    
    try {
      setProcessing(reviewModal.request.id);
      
      let result;
      if (action === 'approve') {
        const { data, error } = await supabase.rpc('approve_pro_upgrade_request', {
          _request_id: reviewModal.request.id
        });
        result = { data, error };
      } else {
        const { data, error } = await supabase.rpc('reject_pro_upgrade_request', {
          _request_id: reviewModal.request.id,
          _reason: rejectionReason || null
        });
        result = { data, error };
      }

      if (result.error) throw result.error;

      toast({
        title: action === 'approve' ? "Заявка одобрена" : "Заявка отклонена",
        description: action === 'approve' 
          ? "Пользователь получил статус специалиста" 
          : "Заявка была отклонена"
      });

      setReviewModal({ isOpen: false, request: null, action: null });
      setRejectionReason('');
      loadRequests();
    } catch (error: any) {
      console.error('Error processing request:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось обработать заявку",
        variant: "destructive"
      });
    } finally {
      setProcessing(null);
    }
  };

  const openReviewModal = (request: ProUpgradeRequest, action: 'approve' | 'reject') => {
    setReviewModal({
      isOpen: true,
      request,
      action
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600"><Clock className="w-3 h-3 mr-1" />Ожидает</Badge>;
      case 'approved':
        return <Badge variant="default" className="text-green-600"><CheckCircle className="w-3 h-3 mr-1" />Одобрено</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Отклонено</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getFilteredCount = (status: string) => {
    return requests.filter(req => status === 'all' || req.status === status).length;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Заявки на статус специалиста</h2>
        <div className="text-center py-8">Загрузка заявок...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Заявки на статус специалиста</h2>
        <Button onClick={loadRequests} variant="outline" size="sm">
          Обновить
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {[
          { key: 'pending', label: 'Ожидают', count: getFilteredCount('pending') },
          { key: 'approved', label: 'Одобрены', count: getFilteredCount('approved') },
          { key: 'rejected', label: 'Отклонены', count: getFilteredCount('rejected') },
          { key: 'all', label: 'Все', count: requests.length }
        ].map(({ key, label, count }) => (
          <Button
            key={key}
            variant={filter === key ? "default" : "outline"}
            onClick={() => setFilter(key as any)}
            size="sm"
          >
            {label} ({count})
          </Button>
        ))}
      </div>

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Список заявок</CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Заявки не найдены
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Пользователь</TableHead>
                  <TableHead>Контакты</TableHead>
                  <TableHead>Подано</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Документы</TableHead>
                  <TableHead>Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">
                            {request.profiles?.full_name || 
                             `${request.profiles?.first_name || ''} ${request.profiles?.last_name || ''}`.trim() ||
                             'Не указано'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {request.profiles?.city || 'Город не указан'}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="text-sm">
                        <p>{request.profiles?.phone || 'Телефон не указан'}</p>
                        {request.profile_data.bio && (
                          <p className="text-muted-foreground truncate max-w-xs">
                            {request.profile_data.bio}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="w-3 h-3" />
                        {formatDistanceToNow(new Date(request.submitted_at), { 
                          addSuffix: true, 
                          locale: ru 
                        })}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      {getStatusBadge(request.status)}
                      {request.status === 'rejected' && request.rejection_reason && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {request.rejection_reason}
                        </p>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        <span className="text-sm">
                          {request.kyc_documents.length} док.
                        </span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex gap-2">
                        {request.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => openReviewModal(request, 'approve')}
                              disabled={processing === request.id}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Одобрить
                            </Button>
                            
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => openReviewModal(request, 'reject')}
                              disabled={processing === request.id}
                            >
                              <XCircle className="w-3 h-3 mr-1" />
                              Отклонить
                            </Button>
                          </>
                        )}
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setReviewModal({
                              isOpen: true,
                              request,
                              action: null
                            });
                          }}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Просмотр
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Review Modal */}
      <Dialog 
        open={reviewModal.isOpen} 
        onOpenChange={(open) => {
          if (!open) {
            setReviewModal({ isOpen: false, request: null, action: null });
            setRejectionReason('');
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {reviewModal.action === 'approve' && 'Одобрить заявку'}
              {reviewModal.action === 'reject' && 'Отклонить заявку'}
              {!reviewModal.action && 'Просмотр заявки'}
            </DialogTitle>
            <DialogDescription>
              Заявка на статус специалиста от {reviewModal.request?.profiles?.full_name}
            </DialogDescription>
          </DialogHeader>

          {reviewModal.request && (
            <div className="space-y-4">
              {/* Profile Data */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Данные профиля</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Имя:</strong> {reviewModal.request.profile_data.first_name || 'Не указано'}
                    </div>
                    <div>
                      <strong>Фамилия:</strong> {reviewModal.request.profile_data.last_name || 'Не указано'}
                    </div>
                    <div>
                      <strong>Телефон:</strong> {reviewModal.request.profile_data.phone || 'Не указан'}
                    </div>
                    <div>
                      <strong>Город:</strong> {reviewModal.request.profile_data.city || 'Не указан'}
                    </div>
                  </div>
                  
                  {reviewModal.request.profile_data.bio && (
                    <div className="text-sm">
                      <strong>Описание услуг:</strong>
                      <p className="mt-1 p-2 bg-gray-50 rounded">{reviewModal.request.profile_data.bio}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* KYC Documents */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">KYC документы</CardTitle>
                </CardHeader>
                <CardContent>
                  {reviewModal.request.kyc_documents.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Документы не загружены</p>
                  ) : (
                    <div className="space-y-2">
                      {reviewModal.request.kyc_documents.map((doc, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            <span className="text-sm">{doc.doc_type}</span>
                            <Badge variant="outline">{doc.status}</Badge>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(doc.file_url, '_blank')}
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Открыть
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Rejection Reason Input */}
              {reviewModal.action === 'reject' && (
                <div className="space-y-2">
                  <Label htmlFor="rejectionReason">Причина отклонения</Label>
                  <Textarea
                    id="rejectionReason"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Укажите причину отклонения заявки"
                    rows={3}
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {reviewModal.action && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setReviewModal({ isOpen: false, request: null, action: null });
                    setRejectionReason('');
                  }}
                >
                  Отмена
                </Button>
                
                <Button
                  onClick={() => handleReview(reviewModal.action!)}
                  disabled={processing === reviewModal.request?.id}
                  variant={reviewModal.action === 'approve' ? 'default' : 'destructive'}
                >
                  {processing === reviewModal.request?.id ? 'Обрабатываем...' : (
                    reviewModal.action === 'approve' ? 'Одобрить' : 'Отклонить'
                  )}
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}