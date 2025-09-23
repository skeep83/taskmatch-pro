import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  AlertTriangle, 
  Upload, 
  FileText, 
  Image, 
  MessageCircle, 
  Clock,
  Shield
} from 'lucide-react';

interface DisputeFormProps {
  jobId: string;
  jobTitle: string;
  respondentId: string;
  respondentName: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
}

export const DisputeForm: React.FC<DisputeFormProps> = ({
  jobId,
  jobTitle,
  respondentId,
  respondentName,
  onSuccess,
  onCancel,
  className
}) => {
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState('reason');
  const [formData, setFormData] = useState({
    reason: '',
    description: '',
    evidence: [] as File[],
    chatMessages: ''
  });
  const [loading, setLoading] = useState(false);

  const disputeReasons = [
    { 
      id: 'quality', 
      title: 'Низкое качество работы',
      description: 'Работа выполнена не в соответствии с договоренностями'
    },
    { 
      id: 'deadline', 
      title: 'Нарушение сроков',
      description: 'Работа не завершена в оговоренные сроки'
    },
    { 
      id: 'scope', 
      title: 'Неполный объем работ',
      description: 'Выполнена только часть оговоренных работ'
    },
    { 
      id: 'materials', 
      title: 'Проблемы с материалами',
      description: 'Использованы некачественные или неподходящие материалы'
    },
    { 
      id: 'damage', 
      title: 'Причинен ущерб',
      description: 'В процессе работы было повреждено имущество'
    },
    { 
      id: 'communication', 
      title: 'Проблемы с коммуникацией',
      description: 'Специалист перестал отвечать или ведет себя неадекватно'
    },
    { 
      id: 'payment', 
      title: 'Финансовые разногласия',
      description: 'Несогласие по стоимости или условиям оплаты'
    },
    { 
      id: 'other', 
      title: 'Другая причина',
      description: 'Опишите проблему в деталях'
    }
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      const isValidType = file.type.startsWith('image/') || file.type === 'application/pdf';
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB
      return isValidType && isValidSize;
    });

    if (validFiles.length !== files.length) {
      toast({
        title: 'Внимание',
        description: 'Некоторые файлы не были добавлены. Поддерживаются только изображения и PDF до 10MB.',
        variant: 'destructive'
      });
    }

    setFormData({
      ...formData,
      evidence: [...formData.evidence, ...validFiles].slice(0, 5) // Максимум 5 файлов
    });
  };

  const removeFile = (index: number) => {
    setFormData({
      ...formData,
      evidence: formData.evidence.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = async () => {
    if (!formData.reason || !formData.description) {
      toast({
        title: 'Ошибка',
        description: 'Выберите причину и опишите проблему',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Пользователь не авторизован');

      // Загружаем файлы доказательств
      const evidenceUrls: string[] = [];
      
      for (const file of formData.evidence) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('evidence')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('evidence')
          .getPublicUrl(fileName);
          
        evidenceUrls.push(publicUrl);
      }

      // Создаем запись спора
      const { error } = await supabase
        .from('disputes')
        .insert({
          job_id: jobId,
          initiator_id: user.id,
          respondent_id: respondentId,
          reason: `${formData.reason}: ${formData.description}`,
          evidence_urls: evidenceUrls,
          status: 'Open'
        });

      if (error) throw error;

      // Обновляем статус работы на "Dispute"
      await supabase.rpc('transition_job_status', {
        _job_id: jobId,
        _new_status: 'Dispute',
        _reason: 'dispute_opened'
      });

      toast({
        title: 'Спор открыт',
        description: 'Ваше обращение передано на рассмотрение. Мы свяжемся с вами в течение 48 часов.'
      });

      onSuccess?.();
    } catch (error) {
      console.error('Error creating dispute:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось создать спор',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
          <AlertTriangle size={20} className="text-red-600 dark:text-red-400" />
        </div>
        <div>
          <h3 className="text-xl font-semibold">Открыть спор</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Заказ: {jobTitle}
          </p>
        </div>
      </div>

      <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800 mb-6">
        <div className="flex items-start gap-3">
          <Clock size={16} className="text-yellow-600 dark:text-yellow-400 mt-0.5" />
          <div className="text-sm text-yellow-700 dark:text-yellow-300">
            <p className="font-medium mb-1">Важная информация:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Рассмотрение спора займет до 48 часов</li>
              <li>Администрация изучит все доказательства</li>
              <li>Решение будет принято справедливо для обеих сторон</li>
              <li>До разрешения спора платеж заблокирован</li>
            </ul>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="reason">1. Причина</TabsTrigger>
          <TabsTrigger value="evidence">2. Доказательства</TabsTrigger>
          <TabsTrigger value="summary">3. Отправка</TabsTrigger>
        </TabsList>

        <TabsContent value="reason" className="space-y-4">
          <div>
            <h4 className="font-medium mb-4">Выберите причину спора:</h4>
            <div className="grid gap-3">
              {disputeReasons.map(reason => (
                <div
                  key={reason.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                    formData.reason === reason.id
                      ? 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-700'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                  onClick={() => setFormData({ ...formData, reason: reason.id })}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-gray-100">
                        {reason.title}
                      </h5>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {reason.description}
                      </p>
                    </div>
                    {formData.reason === reason.id && (
                      <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Детальное описание проблемы *
            </label>
            <Textarea
              placeholder="Опишите в деталях, что произошло. Чем больше информации вы предоставите, тем быстрее мы сможем разрешить спор."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={6}
              required
            />
          </div>

          <div className="flex justify-end">
            <Button 
              onClick={() => setActiveTab('evidence')}
              disabled={!formData.reason || !formData.description}
            >
              Далее: Доказательства
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="evidence" className="space-y-4">
          <div>
            <h4 className="font-medium mb-4">Приложите доказательства (необязательно):</h4>
            
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
              <input
                type="file"
                multiple
                accept="image/*,.pdf"
                onChange={handleFileUpload}
                className="hidden"
                id="evidence-upload"
              />
              <label htmlFor="evidence-upload" className="cursor-pointer">
                <Upload size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Загрузите файлы
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Фотографии, документы, скриншоты (до 5 файлов, максимум 10MB каждый)
                </p>
              </label>
            </div>

            {formData.evidence.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                {formData.evidence.map((file, index) => (
                  <div key={index} className="relative group">
                    <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                      {file.type.startsWith('image/') ? (
                        <Image size={32} className="text-gray-400" />
                      ) : (
                        <FileText size={32} className="text-gray-400" />
                      )}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 truncate">
                      {file.name}
                    </p>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2 w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeFile(index)}
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Фрагменты переписки (необязательно)
            </label>
            <Textarea
              placeholder="Скопируйте важные сообщения из чата с исполнителем, которые могут помочь в разрешении спора"
              value={formData.chatMessages}
              onChange={(e) => setFormData({ ...formData, chatMessages: e.target.value })}
              rows={4}
            />
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setActiveTab('reason')}>
              Назад
            </Button>
            <Button onClick={() => setActiveTab('summary')}>
              Далее: Отправка
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="summary" className="space-y-6">
          <div>
            <h4 className="font-medium mb-4">Проверьте данные перед отправкой:</h4>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <AlertTriangle size={20} className="text-red-500 mt-0.5" />
                <div>
                  <p className="font-medium">Причина спора:</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {disputeReasons.find(r => r.id === formData.reason)?.title}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <MessageCircle size={20} className="text-blue-500 mt-0.5" />
                <div>
                  <p className="font-medium">Описание:</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {formData.description}
                  </p>
                </div>
              </div>

              {formData.evidence.length > 0 && (
                <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <FileText size={20} className="text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Доказательства:</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Загружено файлов: {formData.evidence.length}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <Shield size={20} className="text-purple-500 mt-0.5" />
                <div>
                  <p className="font-medium">Ответчик:</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {respondentName}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <Clock size={16} className="text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="text-sm text-blue-700 dark:text-blue-300">
                <p className="font-medium mb-1">Что происходит дальше:</p>
                <ol className="list-decimal list-inside space-y-0.5">
                  <li>Спор передается на рассмотрение администрации</li>
                  <li>Обе стороны получат уведомления</li>
                  <li>Платеж по заказу блокируется до решения</li>
                  <li>Решение принимается в течение 48 часов</li>
                </ol>
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setActiveTab('evidence')}>
              Назад
            </Button>
            <div className="flex gap-3">
              {onCancel && (
                <Button variant="outline" onClick={onCancel}>
                  Отмена
                </Button>
              )}
              <Button onClick={handleSubmit} disabled={loading} className="gap-2">
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Отправка...
                  </>
                ) : (
                  <>
                    <AlertTriangle size={16} />
                    Открыть спор
                  </>
                )}
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
};