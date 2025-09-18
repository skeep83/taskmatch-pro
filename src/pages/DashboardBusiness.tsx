import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { RoleGuard } from "@/components/RoleGuard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import { NeumorphicIcon } from "@/components/ui/neumorphic-icon";
import { Building2, User, Calendar, Settings, BarChart3, Users, FileText, Briefcase, UserPlus, Gavel } from "lucide-react";
import { BusinessAccountForm } from "@/components/business/BusinessAccountForm";
import { BusinessMembers } from "@/components/business/BusinessMembers";
import { BusinessJobs } from "@/components/business/BusinessJobs";
import { BusinessInvoices } from "@/components/business/BusinessInvoices";
import { BusinessAnalytics } from "@/components/business/BusinessAnalytics";
import { BusinessTenders } from "@/components/business/BusinessTenders";

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
    <RoleGuard requiredRole="business">
      <main className="min-h-screen mobile-container">
        
        {/* Mobile Header */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b md:hidden">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                  <Building2 className="h-4 w-4 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold">Бизнес-панель</h1>
                  <p className="text-xs text-muted-foreground">Управление компанией</p>
                </div>
              </div>
              <button className="p-2 rounded-full bg-secondary/50">
                <Settings className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Desktop Header */}
        <section className="hidden md:block container mx-auto py-24 px-6">
          <div className="text-center mb-16">
            <h1 className="text-4xl lg:text-5xl font-display font-bold mb-6 text-gradient">
              Бизнес-панель
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Управление корпоративным аккаунтом
            </p>
          </div>
        </section>

        <div className="container mx-auto px-4">
          {/* Mobile Stats */}
          <div className="md:hidden mb-4">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <div className="flex-shrink-0 w-28 bg-card rounded-xl p-3 shadow-sm border">
                <div className="flex items-center gap-1 mb-1">
                  <div className="h-6 w-6 rounded-lg bg-blue-100 flex items-center justify-center">
                    <BarChart3 className="h-3 w-3 text-blue-600" />
                  </div>
                  <span className="text-xs text-muted-foreground">Расходы</span>
                </div>
                <p className="text-sm font-bold">$0.00</p>
              </div>
              
              <div className="flex-shrink-0 w-28 bg-card rounded-xl p-3 shadow-sm border">
                <div className="flex items-center gap-1 mb-1">
                  <div className="h-6 w-6 rounded-lg bg-green-100 flex items-center justify-center">
                    <Users className="h-3 w-3 text-green-600" />
                  </div>
                  <span className="text-xs text-muted-foreground">Команда</span>
                </div>
                <p className="text-sm font-bold">0</p>
              </div>
              
              <div className="flex-shrink-0 w-28 bg-card rounded-xl p-3 shadow-sm border">
                <div className="flex items-center gap-1 mb-1">
                  <div className="h-6 w-6 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Briefcase className="h-3 w-3 text-purple-600" />
                  </div>
                  <span className="text-xs text-muted-foreground">Заказы</span>
                </div>
                <p className="text-sm font-bold">0</p>
              </div>
            </div>
          </div>

          {/* Mobile Quick Actions */}
          <div className="md:hidden mb-4">
            <div className="grid grid-cols-4 gap-2">
              <button 
                onClick={() => navigate("/job/new")}
                className="flex flex-col items-center p-2 rounded-lg hover:bg-secondary/50 transition-colors touch-manipulation"
              >
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center mb-1">
                  <Briefcase className="h-4 w-4 text-blue-600" />
                </div>
                <span className="text-xs font-medium text-center">Заказ</span>
              </button>
              
              <button 
                onClick={() => setActiveTab("company")}
                className="flex flex-col items-center p-2 rounded-lg hover:bg-secondary/50 transition-colors touch-manipulation"
              >
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center mb-1">
                  <Building2 className="h-4 w-4 text-green-600" />
                </div>
                <span className="text-xs font-medium text-center">Компания</span>
              </button>
              
              <button 
                onClick={() => setActiveTab("analytics")}
                className="flex flex-col items-center p-2 rounded-lg hover:bg-secondary/50 transition-colors touch-manipulation"
              >
                <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center mb-1">
                  <BarChart3 className="h-4 w-4 text-purple-600" />
                </div>
                <span className="text-xs font-medium text-center">Отчеты</span>
              </button>
              
              <button 
                onClick={() => setActiveTab("invoices")}
                className="flex flex-col items-center p-2 rounded-lg hover:bg-secondary/50 transition-colors touch-manipulation"
              >
                <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center mb-1">
                  <FileText className="h-4 w-4 text-orange-600" />
                </div>
                <span className="text-xs font-medium text-center">Инвойсы</span>
              </button>
            </div>
          </div>

          {/* Desktop Content */}
          <div className="hidden md:block max-w-7xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            <div className="p-2 rounded-2xl bg-[#E5E7EB] shadow-[inset_8px_8px_16px_#D1D5DB,inset_-8px_-8px_16px_#F9FAFB]">
              <TabsList className="grid w-full grid-cols-5 bg-transparent">
                <TabsTrigger value="overview" className="relative flex items-center gap-2 bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] data-[state=active]:shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] rounded-xl transition-all duration-300 text-gray-700 data-[state=active]:text-gray-800">
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden sm:inline">Обзор</span>
                  {activeTab === "overview" && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
                      style={{ backgroundColor: "#22D3EE" }}
                    />
                  )}
                </TabsTrigger>
                <TabsTrigger value="company" className="relative flex items-center gap-2 bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] data-[state=active]:shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] rounded-xl transition-all duration-300 text-gray-700 data-[state=active]:text-gray-800">
                  <Building2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Компания</span>
                  {activeTab === "company" && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
                      style={{ backgroundColor: "#22D3EE" }}
                    />
                  )}
                </TabsTrigger>
                <TabsTrigger value="jobs" className="relative flex items-center gap-2 bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] data-[state=active]:shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] rounded-xl transition-all duration-300 text-gray-700 data-[state=active]:text-gray-800">
                  <Briefcase className="h-4 w-4" />
                  <span className="hidden sm:inline">Заказы</span>
                  {activeTab === "jobs" && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
                      style={{ backgroundColor: "#22D3EE" }}
                    />
                  )}
                </TabsTrigger>
                <TabsTrigger value="tenders" className="relative flex items-center gap-2 bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] data-[state=active]:shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] rounded-xl transition-all duration-300 text-gray-700 data-[state=active]:text-gray-800">
                  <Gavel className="h-4 w-4" />
                  <span className="hidden sm:inline">Тендеры</span>
                  {activeTab === "tenders" && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
                      style={{ backgroundColor: "#22D3EE" }}
                    />
                  )}
                </TabsTrigger>
                <TabsTrigger value="invoices" className="relative flex items-center gap-2 bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] data-[state=active]:shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] rounded-xl transition-all duration-300 text-gray-700 data-[state=active]:text-gray-800">
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">Инвойсы</span>
                  {activeTab === "invoices" && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
                      style={{ backgroundColor: "#22D3EE" }}
                    />
                  )}
                </TabsTrigger>
                <TabsTrigger value="analytics" className="relative flex items-center gap-2 bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] data-[state=active]:shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] rounded-xl transition-all duration-300 text-gray-700 data-[state=active]:text-gray-800">
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden sm:inline">Аналитика</span>
                  {activeTab === "analytics" && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
                      style={{ backgroundColor: "#22D3EE" }}
                    />
                  )}
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
                    <NeumorphicIcon icon={BarChart3} size={64} variant="behance" />
                  </div>
                </div>

                <div className="card-surface p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Сотрудников</p>
                      <p className="text-2xl font-bold">0</p>
                    </div>
                    <NeumorphicIcon icon={Users} size={64} variant="behance" />
                  </div>
                </div>

                <div className="card-surface p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Заказов</p>
                      <p className="text-2xl font-bold">0</p>
                    </div>
                    <NeumorphicIcon icon={Briefcase} size={64} variant="behance" />
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <button 
                  className="p-6 cursor-pointer transition-all bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] hover:shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] rounded-2xl"
                  onClick={() => navigate("/job/new")}
                >
                  <div className="flex flex-col items-center gap-4 text-center">
                    <div className="w-16 h-16 rounded-full bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] flex items-center justify-center">
                      <Building2 className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1 text-gray-800">Создать заказ</h3>
                      <p className="text-sm text-gray-600">Для компании</p>
                    </div>
                  </div>
                </button>


                <button 
                  className="p-6 cursor-pointer transition-all bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] hover:shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] rounded-2xl"
                  onClick={() => setActiveTab("invoices")}
                >
                  <div className="flex flex-col items-center gap-4 text-center">
                    <div className="w-16 h-16 rounded-full bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] flex items-center justify-center">
                      <FileText className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1 text-gray-800">Создать инвойс</h3>
                      <p className="text-sm text-gray-600">Финансы</p>
                    </div>
                  </div>
                </button>

                <button 
                  className="p-6 cursor-pointer transition-all bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] hover:shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] rounded-2xl"
                  onClick={() => setActiveTab("analytics")}
                >
                  <div className="flex flex-col items-center gap-4 text-center">
                    <div className="w-16 h-16 rounded-full bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] flex items-center justify-center">
                      <BarChart3 className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1 text-gray-800">Посмотреть отчеты</h3>
                      <p className="text-sm text-gray-600">Аналитика</p>
                    </div>
                  </div>
                </button>
              </div>

              {/* Welcome Message */}
              <div className="card-surface p-8">
                <h2 className="text-2xl font-semibold mb-4">Добро пожаловать в ServiceHub Business!</h2>
                <p className="text-muted-foreground mb-6">
                  Управляйте заказами компании, контролируйте расходы и координируйте команду в одном месте.
                </p>
                <div className="space-y-3">
                  <p className="text-sm"><strong>1.</strong> Настройте данные компании во вкладке "Компания"</p>
                  <p className="text-sm"><strong>2.</strong> Создавайте заказы и отслеживайте прогресс</p>
                  <p className="text-sm"><strong>3.</strong> Контролируйте финансы через инвойсы и аналитику</p>
                  
                </div>
              </div>
            </TabsContent>

            <TabsContent value="company">
              <BusinessAccountForm />
            </TabsContent>


            <TabsContent value="jobs">
              <BusinessJobs />
            </TabsContent>

            <TabsContent value="tenders">
              <BusinessTenders />
            </TabsContent>

            <TabsContent value="invoices">
              <BusinessInvoices />
            </TabsContent>

            <TabsContent value="analytics">
              <BusinessAnalytics />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </main>
    </RoleGuard>
  );
}