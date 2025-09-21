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
import { Building2, User, Calendar, Settings, BarChart3, Users, FileText, Briefcase, UserPlus, Gavel, ArrowLeft } from "lucide-react";
import { BusinessAccountForm } from "@/components/business/BusinessAccountForm";
import { BusinessMembers } from "@/components/business/BusinessMembers";
import { BusinessJobs } from "@/components/business/BusinessJobs";
import { BusinessInvoices } from "@/components/business/BusinessInvoices";
import { BusinessAnalytics } from "@/components/business/BusinessAnalytics";
import { BusinessTenders } from "@/components/business/BusinessTenders";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

export default function DashboardBusiness() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
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
      <main className="min-h-screen bg-background">
        {/* Mobile Header */}
        {isMobile && (
          <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b px-4 py-3">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate(-1)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-lg font-semibold">Бизнес-панель</h1>
            </div>
          </div>
        )}

        {/* Header Section */}
        <section className="container mx-auto py-4 lg:py-24 px-4 lg:px-6">
        {!isMobile && (
          <div className="text-center mb-16">
            <h1 className="text-4xl lg:text-5xl font-display font-bold mb-6 text-gradient">
              Бизнес-панель
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Управление корпоративным аккаунтом
            </p>
          </div>
        )}

        {/* Main Content with Tabs */}
        <div className="max-w-7xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 lg:space-y-8">
            <div className={`p-2 rounded-2xl bg-[#E5E7EB] shadow-[inset_8px_8px_16px_#D1D5DB,inset_-8px_-8px_16px_#F9FAFB] ${isMobile ? 'overflow-x-auto' : ''}`}>
              <TabsList className={`${isMobile ? 'flex w-max min-w-full' : 'grid w-full grid-cols-6'} bg-transparent gap-1`}>
                <TabsTrigger value="overview" className={`relative flex items-center gap-2 bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] data-[state=active]:shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] rounded-xl transition-all duration-300 text-gray-700 data-[state=active]:text-gray-800 ${isMobile ? 'flex-shrink-0 px-3 py-2' : ''}`}>
                  <BarChart3 className="h-4 w-4" />
                  <span className={isMobile ? "text-sm" : "hidden sm:inline"}>Обзор</span>
                  {activeTab === "overview" && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
                      style={{ backgroundColor: "#22D3EE" }}
                    />
                  )}
                </TabsTrigger>
                <TabsTrigger value="company" className={`relative flex items-center gap-2 bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] data-[state=active]:shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] rounded-xl transition-all duration-300 text-gray-700 data-[state=active]:text-gray-800 ${isMobile ? 'flex-shrink-0 px-3 py-2' : ''}`}>
                  <Building2 className="h-4 w-4" />
                  <span className={isMobile ? "text-sm" : "hidden sm:inline"}>Компания</span>
                  {activeTab === "company" && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
                      style={{ backgroundColor: "#22D3EE" }}
                    />
                  )}
                </TabsTrigger>
                <TabsTrigger value="jobs" className={`relative flex items-center gap-2 bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] data-[state=active]:shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] rounded-xl transition-all duration-300 text-gray-700 data-[state=active]:text-gray-800 ${isMobile ? 'flex-shrink-0 px-3 py-2' : ''}`}>
                  <Briefcase className="h-4 w-4" />
                  <span className={isMobile ? "text-sm" : "hidden sm:inline"}>Заказы</span>
                  {activeTab === "jobs" && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
                      style={{ backgroundColor: "#22D3EE" }}
                    />
                  )}
                </TabsTrigger>
                <TabsTrigger value="tenders" className={`relative flex items-center gap-2 bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] data-[state=active]:shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] rounded-xl transition-all duration-300 text-gray-700 data-[state=active]:text-gray-800 ${isMobile ? 'flex-shrink-0 px-3 py-2' : ''}`}>
                  <Gavel className="h-4 w-4" />
                  <span className={isMobile ? "text-sm" : "hidden sm:inline"}>Тендеры</span>
                  {activeTab === "tenders" && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
                      style={{ backgroundColor: "#22D3EE" }}
                    />
                  )}
                </TabsTrigger>
                <TabsTrigger value="invoices" className={`relative flex items-center gap-2 bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] data-[state=active]:shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] rounded-xl transition-all duration-300 text-gray-700 data-[state=active]:text-gray-800 ${isMobile ? 'flex-shrink-0 px-3 py-2' : ''}`}>
                  <FileText className="h-4 w-4" />
                  <span className={isMobile ? "text-sm" : "hidden sm:inline"}>Инвойсы</span>
                  {activeTab === "invoices" && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
                      style={{ backgroundColor: "#22D3EE" }}
                    />
                  )}
                </TabsTrigger>
                <TabsTrigger value="analytics" className={`relative flex items-center gap-2 bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] data-[state=active]:shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] rounded-xl transition-all duration-300 text-gray-700 data-[state=active]:text-gray-800 ${isMobile ? 'flex-shrink-0 px-3 py-2' : ''}`}>
                  <BarChart3 className="h-4 w-4" />
                  <span className={isMobile ? "text-sm" : "hidden sm:inline"}>Аналитика</span>
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

            <TabsContent value="overview" className="space-y-4 lg:space-y-8">
              {/* Quick Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                <div className="card-surface p-4 lg:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Общие расходы</p>
                      <p className="text-xl lg:text-2xl font-bold">$0.00</p>
                    </div>
                    <NeumorphicIcon icon={BarChart3} size={isMobile ? 48 : 64} variant="behance" />
                  </div>
                </div>

                <div className="card-surface p-4 lg:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Сотрудников</p>
                      <p className="text-xl lg:text-2xl font-bold">0</p>
                    </div>
                    <NeumorphicIcon icon={Users} size={isMobile ? 48 : 64} variant="behance" />
                  </div>
                </div>

                <div className="card-surface p-4 lg:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Заказов</p>
                      <p className="text-xl lg:text-2xl font-bold">0</p>
                    </div>
                    <NeumorphicIcon icon={Briefcase} size={isMobile ? 48 : 64} variant="behance" />
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                <button 
                  className="p-4 lg:p-6 cursor-pointer transition-all bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] hover:shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] rounded-2xl"
                  onClick={() => navigate("/job/new")}
                >
                  <div className="flex flex-col items-center gap-3 lg:gap-4 text-center">
                    <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-full bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] flex items-center justify-center">
                      <Building2 className="h-6 w-6 lg:h-8 lg:w-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1 text-gray-800 text-sm lg:text-base">Создать заказ</h3>
                      <p className="text-xs lg:text-sm text-gray-600">Для компании</p>
                    </div>
                  </div>
                </button>

                <button 
                  className="p-4 lg:p-6 cursor-pointer transition-all bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] hover:shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] rounded-2xl"
                  onClick={() => setActiveTab("invoices")}
                >
                  <div className="flex flex-col items-center gap-3 lg:gap-4 text-center">
                    <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-full bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] flex items-center justify-center">
                      <FileText className="h-6 w-6 lg:h-8 lg:w-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1 text-gray-800 text-sm lg:text-base">Создать инвойс</h3>
                      <p className="text-xs lg:text-sm text-gray-600">Финансы</p>
                    </div>
                  </div>
                </button>

                <button 
                  className="p-4 lg:p-6 cursor-pointer transition-all bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] hover:shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] rounded-2xl"
                  onClick={() => setActiveTab("analytics")}
                >
                  <div className="flex flex-col items-center gap-3 lg:gap-4 text-center">
                    <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-full bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] flex items-center justify-center">
                      <BarChart3 className="h-6 w-6 lg:h-8 lg:w-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1 text-gray-800 text-sm lg:text-base">Посмотреть отчеты</h3>
                      <p className="text-xs lg:text-sm text-gray-600">Аналитика</p>
                    </div>
                  </div>
                </button>
              </div>

              {/* Welcome Message */}
              <div className="card-surface p-4 lg:p-8">
                <h2 className="text-lg lg:text-2xl font-semibold mb-3 lg:mb-4">Добро пожаловать в ServiceHub Business!</h2>
                <p className="text-muted-foreground mb-4 lg:mb-6 text-sm lg:text-base">
                  Управляйте заказами компании, контролируйте расходы и координируйте команду в одном месте.
                </p>
                <div className="space-y-2 lg:space-y-3">
                  <p className="text-xs lg:text-sm"><strong>1.</strong> Настройте данные компании во вкладке "Компания"</p>
                  <p className="text-xs lg:text-sm"><strong>2.</strong> Создавайте заказы и отслеживайте прогресс</p>
                  <p className="text-xs lg:text-sm"><strong>3.</strong> Контролируйте финансы через инвойсы и аналитику</p>
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
      </section>
    </main>
    </RoleGuard>
  );
}