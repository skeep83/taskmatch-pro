import { useEffect, useMemo, useState } from "react";
import { Seo } from "@/components/Seo";
import { FloatingCard } from "@/components/ui/floating-card";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import { useI18n } from "@/i18n";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import {
  Building2, Users, TrendingUp, FileText, Settings, Bell,
  DollarSign, Calendar, BarChart3, Shield, Clock, Award,
  Target, Briefcase, CheckCircle, AlertTriangle, Plus, Star
} from "lucide-react";
import businessDashboard from "@/assets/business-dashboard.jpg";

const DashboardBusiness = () => {
  const { t } = useI18n();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [biz, setBiz] = useState<any | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [totalSpent, setTotalSpent] = useState<number>(0);
  const [activeJobs, setActiveJobs] = useState<number>(0);
  const [completedJobs, setCompletedJobs] = useState<number>(0);
  const [avgSla, setAvgSla] = useState<string>('99.2%');
  const [monthlyBudget, setMonthlyBudget] = useState<number>(50000);
  const [budgetUsed, setBudgetUsed] = useState<number>(32450);

  // form states
  const [companyName, setCompanyName] = useState("");
  const [vat, setVat] = useState("");
  const [idno, setIdno] = useState("");
  const [addr, setAddr] = useState("");
  const [mult, setMult] = useState<number>(1.0);
  const [memberUserId, setMemberUserId] = useState("");

  type OrderRow = { category_id: string | null; description: string; min?: number; max?: number; when?: string };
  const [rows, setRows] = useState<OrderRow[]>([{ category_id: null, description: "Уборка офиса", min: 1000, max: 2000 }]);

  const businessId = useMemo(() => biz?.id as string | undefined, [biz]);

  useEffect(() => {
    (async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: s } = await supabase.auth.getSession();
      const uid = s.session?.user?.id || null;
      if (!uid) { window.location.href = '/auth'; return; }
      setUserId(uid);

      // load categories
      const { data: cats } = await supabase.from('categories').select('id, key, label_ru, label_ro').order('key');
      setCategories(cats || []);

      // find owned business account
      const { data: owned } = await supabase
        .from('business_accounts')
        .select('*')
        .eq('owner_id', uid)
        .maybeSingle();

      if (owned) {
        setBiz(owned);
        setCompanyName(owned.company_name);
        setVat(owned.vat_number || '');
        setIdno(owned.idno || '');
        setAddr(owned.legal_address || '');
        setMult(Number(owned.rate_multiplier || 1));
        
        const { data: mems } = await supabase
          .from('business_members')
          .select('id, user_id, role, created_at')
          .eq('business_id', owned.id)
          .order('created_at', { ascending: false });
        setMembers(mems || []);

        // Load business analytics
        await loadBusinessAnalytics(owned.id, supabase);
      }

      setLoading(false);
    })();
  }, []);

  const loadBusinessAnalytics = async (businessId: string, supabase: any) => {
    // Load business jobs and calculate metrics
    const { data: businessJobs } = await supabase
      .from('business_jobs')
      .select(`
        job_id,
        jobs (
          id, status, budget_max_cents, created_at
        )
      `)
      .eq('business_id', businessId);

    if (businessJobs) {
      const jobs = businessJobs.map((bj: any) => bj.jobs).filter(Boolean);
      setActiveJobs(jobs.filter((j: any) => ['new', 'accepted', 'in_progress'].includes(j.status)).length);
      setCompletedJobs(jobs.filter((j: any) => j.status === 'done').length);
      
      const spent = jobs
        .filter((j: any) => j.status === 'done')
        .reduce((sum: number, j: any) => sum + (j.budget_max_cents || 0), 0);
      setTotalSpent(spent);
    }
  };

  // add row
  const addRow = () => {
    setRows([...rows, { category_id: null, description: "", min: undefined, max: undefined }]);
  };

  // remove row
  const removeRow = (index: number) => {
    const newRows = [...rows];
    newRows.splice(index, 1);
    setRows(newRows);
  };

  // update row
  const updateRow = (index: number, field: string, value: any) => {
    const newRows = [...rows];
    newRows[index][field] = value;
    setRows(newRows);
  };

  if (loading) return (
    <main className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${businessDashboard})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-background/95 via-background/80 to-background/95" />
      <FloatingCard className="p-8 text-center animate-pulse-glow">
        <h1 className="text-2xl font-display font-bold text-gradient mb-4">Загружаем бизнес-кабинет...</h1>
        <div className="flex items-center justify-center gap-2">
          <AnimatedIcon icon={Clock} className="animate-spin" />
        </div>
      </FloatingCard>
    </main>
  );

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${businessDashboard})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-background/95 via-background/80 to-background/95" />
      
      <Seo title={`${t('app.name')} — Бизнес-кабинет`} description="Business dashboard" canonical="/business/dashboard" />
      
      <div className="container mx-auto py-8 px-6 relative z-10">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-12">
          <div className="animate-fade-in">
            <h1 className="text-4xl lg:text-5xl font-display font-bold text-gradient mb-2">
              {biz?.company_name || 'Бизнес-кабинет'}
            </h1>
            <p className="text-xl text-muted-foreground">
              Управление корпоративными заказами и командой
            </p>
          </div>
          
          <div className="flex items-center gap-4 animate-fade-in" style={{ animationDelay: '200ms' }}>
            <button className="btn-hero flex items-center gap-2 animate-pulse-glow">
              <AnimatedIcon icon={Plus} size={20} />
              Массовый заказ
            </button>
            <button className="btn-ghost flex items-center gap-2">
              <AnimatedIcon icon={Bell} size={20} />
              Уведомления
            </button>
          </div>
        </div>

        {!biz ? (
          <div className="max-w-4xl mx-auto">
            <FloatingCard className="p-8" delay={100} hover>
              <div className="text-center mb-8">
                <AnimatedIcon icon={Building2} size={48} className="text-primary mb-4" />
                <h2 className="text-2xl font-display font-bold mb-2">Создайте бизнес-аккаунт</h2>
                <p className="text-muted-foreground">
                  Получите доступ к корпоративным функциям и централизованному управлению
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Название компании *</label>
                  <input 
                    className="w-full border-2 border-border/50 rounded-xl px-4 py-3 bg-background/80 transition-all hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20" 
                    placeholder="ООО Рога и Копыта" 
                    value={companyName} 
                    onChange={(e)=>setCompanyName(e.target.value)} 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">VAT/НДС номер</label>
                  <input 
                    className="w-full border-2 border-border/50 rounded-xl px-4 py-3 bg-background/80 transition-all hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20" 
                    placeholder="1234567890" 
                    value={vat} 
                    onChange={(e)=>setVat(e.target.value)} 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">IDNO/Регистрационный номер</label>
                  <input 
                    className="w-full border-2 border-border/50 rounded-xl px-4 py-3 bg-background/80 transition-all hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20" 
                    placeholder="0987654321" 
                    value={idno} 
                    onChange={(e)=>setIdno(e.target.value)} 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Мультипликатор тарифа</label>
                  <input 
                    className="w-full border-2 border-border/50 rounded-xl px-4 py-3 bg-background/80 transition-all hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20" 
                    type="number" 
                    min={0.1} 
                    step={0.1} 
                    value={mult} 
                    onChange={(e)=>setMult(Number(e.target.value))} 
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">Юридический адрес</label>
                  <input 
                    className="w-full border-2 border-border/50 rounded-xl px-4 py-3 bg-background/80 transition-all hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20" 
                    placeholder="г. Москва, ул. Примерная, д. 123" 
                    value={addr} 
                    onChange={(e)=>setAddr(e.target.value)} 
                  />
                </div>
              </div>

              <div className="mt-8 text-center">
                <button className="btn-hero text-lg px-8 py-4 animate-pulse-glow">
                  Создать бизнес-аккаунт
                </button>
              </div>
            </FloatingCard>
          </div>
        ) : (
          <>
            {/* Business Stats */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-12">
              <FloatingCard className="p-6 text-center" delay={100} hover glow>
                <AnimatedIcon icon={DollarSign} size={32} className="text-success mb-4" />
                <div className="text-2xl font-bold text-success mb-1">
                  ${(totalSpent/100).toFixed(0)}
                </div>
                <div className="text-sm text-muted-foreground">Потрачено всего</div>
              </FloatingCard>
              
              <FloatingCard className="p-6 text-center" delay={200} hover glow>
                <AnimatedIcon icon={Briefcase} size={32} className="text-primary mb-4" />
                <div className="text-2xl font-bold text-primary mb-1">{activeJobs}</div>
                <div className="text-sm text-muted-foreground">Активных заказов</div>
              </FloatingCard>
              
              <FloatingCard className="p-6 text-center" delay={300} hover glow>
                <AnimatedIcon icon={CheckCircle} size={32} className="text-accent mb-4" />
                <div className="text-2xl font-bold text-accent mb-1">{completedJobs}</div>
                <div className="text-sm text-muted-foreground">Завершено</div>
              </FloatingCard>
              
              <FloatingCard className="p-6 text-center" delay={400} hover glow>
                <AnimatedIcon icon={Users} size={32} className="text-purple-500 mb-4" />
                <div className="text-2xl font-bold text-purple-500 mb-1">{members.length}</div>
                <div className="text-sm text-muted-foreground">Сотрудников</div>
              </FloatingCard>
              
              <FloatingCard className="p-6 text-center" delay={500} hover glow>
                <AnimatedIcon icon={Target} size={32} className="text-amber-500 mb-4" />
                <div className="text-2xl font-bold text-amber-500 mb-1">{avgSla}</div>
                <div className="text-sm text-muted-foreground">SLA</div>
              </FloatingCard>
            </div>

            {/* Budget Overview */}
            <FloatingCard className="p-8 mb-8" delay={100} hover>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <AnimatedIcon icon={BarChart3} size={28} className="text-primary" />
                  <h2 className="text-2xl font-display font-bold">Бюджет и расходы</h2>
                </div>
                <div className="text-sm text-muted-foreground">
                  Текущий месяц
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary mb-2">
                    ${(monthlyBudget/100).toFixed(0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Месячный бюджет</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-accent mb-2">
                    ${(budgetUsed/100).toFixed(0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Использовано</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-success mb-2">
                    ${((monthlyBudget - budgetUsed)/100).toFixed(0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Остается</div>
                </div>
              </div>

              <div className="mt-6">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span>Использование бюджета</span>
                  <span>{((budgetUsed / monthlyBudget) * 100).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-primary to-accent h-3 rounded-full transition-all duration-1000"
                    style={{ width: `${(budgetUsed / monthlyBudget) * 100}%` }}
                  />
                </div>
              </div>
            </FloatingCard>

            <div className="grid lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-8">
                {/* Company Profile */}
                <FloatingCard className="p-8" delay={200} hover>
                  <div className="flex items-center gap-3 mb-6">
                    <AnimatedIcon icon={Building2} size={28} className="text-primary" />
                    <h2 className="text-2xl font-display font-bold">Профиль компании</h2>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium mb-2">Название компании</label>
                      <input 
                        className="w-full border-2 border-border/50 rounded-xl px-4 py-3 bg-background/80 transition-all hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20" 
                        value={companyName} 
                        onChange={(e)=>setCompanyName(e.target.value)} 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">VAT/НДС номер</label>
                      <input 
                        className="w-full border-2 border-border/50 rounded-xl px-4 py-3 bg-background/80 transition-all hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20" 
                        value={vat} 
                        onChange={(e)=>setVat(e.target.value)} 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">IDNO/Рег. номер</label>
                      <input 
                        className="w-full border-2 border-border/50 rounded-xl px-4 py-3 bg-background/80 transition-all hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20" 
                        value={idno} 
                        onChange={(e)=>setIdno(e.target.value)} 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Мультипликатор тарифа</label>
                      <input 
                        className="w-full border-2 border-border/50 rounded-xl px-4 py-3 bg-background/80 transition-all hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20" 
                        type="number" 
                        min={0.1} 
                        step={0.1} 
                        value={mult} 
                        onChange={(e)=>setMult(Number(e.target.value))} 
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-2">Юридический адрес</label>
                      <input 
                        className="w-full border-2 border-border/50 rounded-xl px-4 py-3 bg-background/80 transition-all hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20" 
                        value={addr} 
                        onChange={(e)=>setAddr(e.target.value)} 
                      />
                    </div>
                  </div>

                  <div className="mt-6 flex gap-4">
                    <button className="btn-hero">Сохранить изменения</button>
                    <button className="btn-ghost">Загрузить договор</button>
                  </div>
                </FloatingCard>

                {/* Team Management */}
                <FloatingCard className="p-8" delay={300} hover>
                  <div className="flex items-center gap-3 mb-6">
                    <AnimatedIcon icon={Users} size={28} className="text-primary" />
                    <h2 className="text-2xl font-display font-bold">Управление командой</h2>
                  </div>

                  <div className="flex gap-4 mb-6">
                    <input 
                      className="flex-1 border-2 border-border/50 rounded-xl px-4 py-3 bg-background/80 transition-all hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20" 
                      placeholder="ID пользователя" 
                      value={memberUserId} 
                      onChange={(e)=>setMemberUserId(e.target.value)} 
                    />
                    <button className="btn-hero px-6">Добавить сотрудника</button>
                  </div>

                  <div className="space-y-3">
                    {members.length === 0 && (
                      <div className="text-center py-8">
                        <AnimatedIcon icon={Users} size={32} className="text-muted-foreground mb-3" />
                        <p className="text-muted-foreground">Пока нет сотрудников</p>
                      </div>
                    )}

                    {members.map((m, index) => (
                      <FloatingCard key={m.id} className="p-4" delay={index * 50} hover>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <AnimatedIcon icon={Users} size={20} className="text-primary" />
                            </div>
                            <div>
                              <div className="font-medium">{String(m.user_id).slice(0, 8)}...</div>
                              <div className="text-sm text-muted-foreground capitalize">{m.role}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button className="btn-ghost text-sm">Лимиты</button>
                            <button className="btn-ghost text-sm text-destructive">Удалить</button>
                          </div>
                        </div>
                      </FloatingCard>
                    ))}
                  </div>
                </FloatingCard>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Quick Actions */}
                <FloatingCard className="p-6" delay={400} hover>
                  <h3 className="font-semibold mb-4">Быстрые действия</h3>
                  <div className="space-y-3">
                    <button className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors w-full text-left">
                      <AnimatedIcon icon={Plus} size={20} className="text-primary" />
                      <span className="text-sm">Массовый заказ</span>
                    </button>
                    <button className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors w-full text-left">
                      <AnimatedIcon icon={FileText} size={20} className="text-primary" />
                      <span className="text-sm">Создать счет</span>
                    </button>
                    <button className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors w-full text-left">
                      <AnimatedIcon icon={BarChart3} size={20} className="text-primary" />
                      <span className="text-sm">Отчеты</span>
                    </button>
                    <button className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors w-full text-left">
                      <AnimatedIcon icon={Settings} size={20} className="text-primary" />
                      <span className="text-sm">Настройки</span>
                    </button>
                  </div>
                </FloatingCard>

                {/* SLA Dashboard */}
                <FloatingCard className="p-6" delay={500} hover>
                  <div className="flex items-center gap-3 mb-4">
                    <AnimatedIcon icon={Target} size={24} className="text-primary" />
                    <h3 className="font-semibold">SLA Мониторинг</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Время ответа</span>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-sm font-medium">&lt; 2 часа</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Качество выполнения</span>
                      <div className="flex items-center gap-1">
                        <AnimatedIcon icon={Star} size={14} className="text-amber-500" />
                        <span className="text-sm font-medium">4.8/5.0</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Соблюдение сроков</span>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-sm font-medium">98.5%</span>
                      </div>
                    </div>
                  </div>
                </FloatingCard>

                {/* Recent Invoices */}
                <FloatingCard className="p-6" delay={600} hover>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Последние счета</h3>
                    <button className="text-sm text-primary hover:underline">Все счета</button>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <div className="font-medium text-sm">#INV-001</div>
                        <div className="text-xs text-muted-foreground">15 января</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-sm">$1,250.00</div>
                        <div className="text-xs text-success">Оплачен</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <div className="font-medium text-sm">#INV-002</div>
                        <div className="text-xs text-muted-foreground">10 января</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-sm">$850.00</div>
                        <div className="text-xs text-amber-500">Ожидает</div>
                      </div>
                    </div>
                  </div>
                </FloatingCard>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
};

export default DashboardBusiness;
