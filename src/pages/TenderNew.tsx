import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Seo } from "@/components/Seo";
import { useEnhancedI18n } from "@/i18n/enhanced";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Calendar, DollarSign, Gavel, AlertTriangle } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";
import { RoleGuard } from "@/components/RoleGuard";
import { Alert, AlertDescription } from "@/components/ui/alert";

const TenderNew = () => {
  const { t } = useEnhancedI18n();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();
  const [loading, setLoading] = useState(false);
  const [businessAccount, setBusinessAccount] = useState<any>(null);
  const [businessAccountLoading, setBusinessAccountLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    budget_max_cents: '',
    deadline: '',
    category_id: ''
  });

  const [categories] = useState([
    { id: '1', name: 'Сантехника' },
    { id: '2', name: 'Электрика' },
    { id: '3', name: 'Ремонт' },
    { id: '4', name: 'Уборка' },
    { id: '5', name: 'Другое' }
  ]);

  // Load business account on component mount
  useEffect(() => {
    const loadBusinessAccount = async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        
        if (!session.session?.user) {
          navigate('/auth');
          return;
        }

        // Check if user has business account
        const { data: businessData, error } = await supabase
          .from('business_accounts')
          .select('*')
          .eq('owner_id', session.session.user.id)
          .maybeSingle();

        if (error) {
          console.error('Error checking business account:', error);
          toast({ 
            title: 'Ошибка', 
            description: 'Не удалось проверить бизнес-аккаунт', 
            variant: 'destructive' 
          });
          return;
        }

        setBusinessAccount(businessData);
      } catch (error: any) {
        console.error('Error loading business account:', error);
        toast({ 
          title: 'Ошибка', 
          description: 'Не удалось загрузить бизнес-аккаунт', 
          variant: 'destructive' 
        });
      } finally {
        setBusinessAccountLoading(false);
      }
    };

    loadBusinessAccount();
  }, [navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast({ title: 'Ошибка', description: 'Введите название тендера', variant: 'destructive' });
      return;
    }
    
    if (!formData.description.trim()) {
      toast({ title: 'Ошибка', description: 'Введите описание тендера', variant: 'destructive' });
      return;
    }
    
    if (!formData.budget_max_cents) {
      toast({ title: 'Ошибка', description: 'Укажите максимальный бюджет', variant: 'destructive' });
      return;
    }
    
    if (!formData.deadline) {
      toast({ title: 'Ошибка', description: 'Укажите срок подачи заявок', variant: 'destructive' });
      return;
    }

    setLoading(true);
    
    try {
      const { data: session } = await supabase.auth.getSession();
      
      if (!session.session?.user) {
        toast({ title: 'Ошибка', description: 'Необходимо войти в систему', variant: 'destructive' });
        navigate('/auth');
        return;
      }

      if (!businessAccount) {
        toast({ 
          title: 'Ошибка', 
          description: 'У вас нет бизнес-аккаунта. Только бизнес-аккаунты могут создавать тендеры.', 
          variant: 'destructive' 
        });
        return;
      }

      const { data, error } = await supabase
        .from('tenders')
        .insert({
          client_id: session.session.user.id,
          business_id: businessAccount.id,
          title: formData.title,
          description: formData.description,
          budget_max_cents: parseInt(formData.budget_max_cents) * 100, // Convert to cents
          deadline: new Date(formData.deadline).toISOString(),
          category_id: formData.category_id || null,
          status: 'open'
        })
        .select()
        .single();

      if (error) throw error;

      toast({ title: 'Успех', description: 'Тендер создан успешно' });
      navigate(`/tenders/${data.id}`);
      
    } catch (error: any) {
      console.error('Error creating tender:', error);
      toast({ 
        title: 'Ошибка', 
        description: error.message || 'Не удалось создать тендер', 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  if (businessAccountLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Загрузка...</h2>
          <p className="text-muted-foreground">Проверяем ваш бизнес-аккаунт</p>
        </div>
      </main>
    );
  }

  return (
    <RoleGuard requiredRole="business">
      <main className="min-h-screen">
        <Seo 
          title={`${t('app.name')} — Создать тендер`} 
          description="Создайте тендер для получения предложений от специалистов" 
          canonical="/tenders/new" 
        />
        
        {/* Header */}
        <section className="container mx-auto py-12 px-6">
          <div className="max-w-2xl mx-auto">
            
            {!businessAccount && (
              <Alert className="mb-6">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Для создания тендеров необходим бизнес-аккаунт. Тендеры доступны только для корпоративных клиентов.
                  <Button 
                    variant="link" 
                    className="p-0 h-auto ml-2"
                    onClick={() => navigate('/dashboard/business')}
                  >
                    Создать бизнес-аккаунт
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex items-center gap-4 mb-8">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/dashboard/business?tab=tenders')}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Назад к тендерам
              </Button>
              <div>
                <h1 className="text-3xl font-display font-bold text-gradient">
                  Создать тендер
                </h1>
                <p className="text-muted-foreground">
                  Опишите задачу и получите предложения от специалистов
                </p>
              </div>
            </div>

            <Card className="card-surface">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gavel className="h-5 w-5 text-primary" />
                  Информация о тендере
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {businessAccount && (
                    <div className="p-4 bg-accent/10 rounded-lg border">
                      <p className="text-sm text-muted-foreground">
                        <strong>Бизнес-аккаунт:</strong> {businessAccount.company_name}
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="title">Название тендера *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Например: Ремонт крана в ванной комнате"
                      maxLength={200}
                    />
                    <p className="text-xs text-muted-foreground">
                      {formData.title.length}/200 символов
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Описание работ *</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Опишите подробно что нужно сделать, требования к материалам, сроки выполнения..."
                      rows={4}
                      maxLength={1000}
                    />
                    <p className="text-xs text-muted-foreground">
                      {formData.description.length}/1000 символов
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Категория услуги</Label>
                    <Select value={formData.category_id} onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите категорию" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="budget" className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Максимальный бюджет *
                    </Label>
                    <Input
                      id="budget"
                      type="number"
                      min="1"
                      value={formData.budget_max_cents}
                      onChange={(e) => setFormData(prev => ({ ...prev, budget_max_cents: e.target.value }))}
                      placeholder="1000"
                    />
                    {formData.budget_max_cents && (
                      <p className="text-sm text-muted-foreground">
                        Сумма: {formatPrice(parseInt(formData.budget_max_cents) * 100)}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="deadline" className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Срок подачи заявок *
                    </Label>
                    <Input
                      id="deadline"
                      type="datetime-local"
                      value={formData.deadline}
                      onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
                      min={new Date().toISOString().slice(0, 16)}
                    />
                    <p className="text-xs text-muted-foreground">
                      После этого времени подача заявок будет закрыта
                    </p>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => navigate('/dashboard/business?tab=tenders')}
                      className="flex-1"
                    >
                      Отмена
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={loading || !businessAccount}
                      className="flex-1"
                    >
                      {loading ? 'Создание...' : 'Создать тендер'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </RoleGuard>
  );
};

export default TenderNew;