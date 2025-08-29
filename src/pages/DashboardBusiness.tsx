import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import { Building2, User, Calendar, Settings, BarChart3, Users, FileText, Briefcase, UserPlus } from "lucide-react";
import { BusinessAccountForm } from "@/components/business/BusinessAccountForm";
import { BusinessMembers } from "@/components/business/BusinessMembers";
import { BusinessJobs } from "@/components/business/BusinessJobs";
import { BusinessInvoices } from "@/components/business/BusinessInvoices";
import { BusinessAnalytics } from "@/components/business/BusinessAnalytics";

export default function DashboardBusiness() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      console.log('Checking authentication...');
      const { data: session } = await supabase.auth.getSession();
      
      if (!session.session?.user) {
        console.log('No user session found, redirecting to auth');
        navigate("/auth");
        return;
      }

      console.log('User authenticated:', session.session.user.email);
      setUser(session.session.user);
      setLoading(false);
    } catch (error: any) {
      console.error('Auth check error:', error);
      toast({ 
        title: "Ошибка", 
        description: error.message || "Ошибка аутентификации", 
        variant: "destructive" 
      });
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="card-surface p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Загружаем бизнес-панель...</h1>
          <div className="animate-spin">⏳</div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      {/* Header Section */}
      <section className="container mx-auto py-24 px-6">
        <div className="text-center mb-16">
          <h1 className="text-4xl lg:text-5xl font-display font-bold mb-6 text-gradient">
            Бизнес-панель
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Управление корпоративным аккаунтом
          </p>
        </div>

        {/* Main Content with Tabs */}
        <div className="max-w-7xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            <div className="card-surface p-2 rounded-2xl">
              <TabsList className="grid w-full grid-cols-6 bg-transparent">
                <TabsTrigger value="overview" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden sm:inline">Обзор</span>
                </TabsTrigger>
                <TabsTrigger value="company" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <Building2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Компания</span>
                </TabsTrigger>
                <TabsTrigger value="employees" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <UserPlus className="h-4 w-4" />
                  <span className="hidden sm:inline">Команда</span>
                </TabsTrigger>
                <TabsTrigger value="jobs" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <Briefcase className="h-4 w-4" />
                  <span className="hidden sm:inline">Заказы</span>
                </TabsTrigger>
                <TabsTrigger value="invoices" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">Инвойсы</span>
                </TabsTrigger>
                <TabsTrigger value="analytics" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden sm:inline">Аналитика</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview" className="space-y-8">
              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card-surface p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Общие расходы</p>
                      <p className="text-2xl font-bold">$0.00</p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-primary" />
                  </div>
                </div>

                <div className="card-surface p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Сотрудников</p>
                      <p className="text-2xl font-bold">0</p>
                    </div>
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                </div>

                <div className="card-surface p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Заказов</p>
                      <p className="text-2xl font-bold">0</p>
                    </div>
                    <Briefcase className="h-8 w-8 text-primary" />
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div 
                  className="card-surface p-6 cursor-pointer hover:shadow-lg transition-all hover:scale-105 hover:bg-accent/5"
                  onClick={() => navigate("/job/new")}
                >
                  <div className="flex flex-col items-center gap-4 text-center">
                    <AnimatedIcon icon={Building2} className="h-8 w-8 text-primary" />
                    <div>
                      <h3 className="font-semibold mb-1">Создать заказ</h3>
                      <p className="text-sm text-muted-foreground">Для компании</p>
                    </div>
                  </div>
                </div>

                <div 
                  className="card-surface p-6 cursor-pointer hover:shadow-lg transition-all hover:scale-105 hover:bg-accent/5"
                  onClick={() => setActiveTab("employees")}
                >
                  <div className="flex flex-col items-center gap-4 text-center">
                    <AnimatedIcon icon={UserPlus} className="h-8 w-8 text-primary" />
                    <div>
                      <h3 className="font-semibold mb-1">Пригласить сотрудника</h3>
                      <p className="text-sm text-muted-foreground">Расширить команду</p>
                    </div>
                  </div>
                </div>

                <div 
                  className="card-surface p-6 cursor-pointer hover:shadow-lg transition-all hover:scale-105 hover:bg-accent/5"
                  onClick={() => setActiveTab("invoices")}
                >
                  <div className="flex flex-col items-center gap-4 text-center">
                    <AnimatedIcon icon={FileText} className="h-8 w-8 text-primary" />
                    <div>
                      <h3 className="font-semibold mb-1">Создать инвойс</h3>
                      <p className="text-sm text-muted-foreground">Финансы</p>
                    </div>
                  </div>
                </div>

                <div 
                  className="card-surface p-6 cursor-pointer hover:shadow-lg transition-all hover:scale-105 hover:bg-accent/5"
                  onClick={() => setActiveTab("analytics")}
                >
                  <div className="flex flex-col items-center gap-4 text-center">
                    <AnimatedIcon icon={BarChart3} className="h-8 w-8 text-primary" />
                    <div>
                      <h3 className="font-semibold mb-1">Посмотреть отчеты</h3>
                      <p className="text-sm text-muted-foreground">Аналитика</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Welcome Message */}
              <div className="card-surface p-8">
                <h2 className="text-2xl font-semibold mb-4">Добро пожаловать в ServiceHub Business!</h2>
                <p className="text-muted-foreground mb-6">
                  Управляйте заказами компании, контролируйте расходы и координируйте команду в одном месте.
                </p>
                <div className="space-y-3">
                  <p className="text-sm"><strong>1.</strong> Настройте данные компании во вкладке "Компания"</p>
                  <p className="text-sm"><strong>2.</strong> Добавьте сотрудников во вкладке "Команда"</p>
                  <p className="text-sm"><strong>3.</strong> Создавайте заказы и отслеживайте прогресс</p>
                  <p className="text-sm"><strong>4.</strong> Контролируйте финансы через инвойсы и аналитику</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="company">
              <BusinessAccountForm />
            </TabsContent>

            <TabsContent value="employees">
              <BusinessMembers />
            </TabsContent>

            <TabsContent value="jobs">
              <BusinessJobs />
            </TabsContent>

            <TabsContent value="invoices">
              <BusinessInvoices />
            </TabsContent>

            <TabsContent value="analytics">
              <BusinessAnalytics />
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </main>
  );
}