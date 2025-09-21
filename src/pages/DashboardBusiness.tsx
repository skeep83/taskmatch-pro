import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { RoleGuard } from "@/components/RoleGuard";
import { Seo } from "@/components/Seo";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import { NeumorphicIcon } from "@/components/ui/neumorphic-icon";
import { 
  Building2, 
  User, 
  Calendar, 
  Settings, 
  BarChart3, 
  Users, 
  FileText, 
  Briefcase, 
  UserPlus, 
  Gavel, 
  ArrowLeft,
  Plus,
  Crown,
  CreditCard,
  DollarSign,
  MessageSquare,
  Bell
} from "lucide-react";
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
      <Seo title="ServiceHub — Бизнес-панель" description="Управление корпоративным аккаунтом" canonical="/dashboard/business" />
      <main className="min-h-screen">

        {/* Header Section */}
        <section className="container mx-auto py-24 px-6">
        <div className="text-center mb-16">
          <h1 className="text-4xl lg:text-5xl font-display font-bold mb-6 text-gradient">
            Бизнес-панель
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Управление корпоративным аккаунтом, {user?.email}
          </p>
        </div>

        <div className="max-w-7xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 lg:space-y-8">
            {/* Overview Section */}
            <div className="space-y-4 lg:space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                <div className="p-4 lg:p-6 bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] rounded-2xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Общие расходы</p>
                      <p className="text-xl lg:text-2xl font-bold text-black">$0.00</p>
                    </div>
                    <NeumorphicIcon icon={DollarSign} size={isMobile ? 48 : 64} variant="behance" />
                  </div>
                </div>

                <div className="p-4 lg:p-6 bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] rounded-2xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Сотрудников</p>
                      <p className="text-xl lg:text-2xl font-bold text-black">0</p>
                    </div>
                    <NeumorphicIcon icon={Users} size={isMobile ? 48 : 64} variant="behance" />
                  </div>
                </div>

                <div className="p-4 lg:p-6 bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] rounded-2xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Заказов</p>
                      <p className="text-xl lg:text-2xl font-bold text-black">0</p>
                    </div>
                    <NeumorphicIcon icon={Briefcase} size={isMobile ? 48 : 64} variant="behance" />
                  </div>
                </div>
              </div>

              {/* Quick Actions - Business Style */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="p-4 lg:p-6 cursor-pointer transition-all bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] hover:shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] rounded-2xl"
                  onClick={() => navigate("/job/new")}
                >
                  <div className="flex flex-col items-center gap-2 lg:gap-3 text-center">
                    <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] flex items-center justify-center">
                      <Plus className="h-5 w-5 lg:h-6 lg:w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-xs lg:text-sm text-black">Создать заказ</h3>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="p-4 lg:p-6 cursor-pointer transition-all bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] hover:shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] rounded-2xl"
                  onClick={() => setActiveTab("invoices")}
                >
                  <div className="flex flex-col items-center gap-2 lg:gap-3 text-center">
                    <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] flex items-center justify-center">
                      <CreditCard className="h-5 w-5 lg:h-6 lg:w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-xs lg:text-sm text-black">Инвойсы</h3>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="p-4 lg:p-6 cursor-pointer transition-all bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] hover:shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] rounded-2xl"
                  onClick={() => setActiveTab("analytics")}
                >
                  <div className="flex flex-col items-center gap-2 lg:gap-3 text-center">
                    <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] flex items-center justify-center">
                      <BarChart3 className="h-5 w-5 lg:h-6 lg:w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-xs lg:text-sm text-black">Аналитика</h3>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="p-4 lg:p-6 cursor-pointer transition-all bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] hover:shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] rounded-2xl"
                  onClick={() => setActiveTab("company")}
                >
                  <div className="flex flex-col items-center gap-2 lg:gap-3 text-center">
                    <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] flex items-center justify-center">
                      <Building2 className="h-5 w-5 lg:h-6 lg:w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-xs lg:text-sm text-black">Настройки</h3>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Horizontal Tab Navigation */}
            <div className={`overflow-x-auto ${isMobile ? '' : 'hidden'}`}>
              <div className="flex space-x-2 p-2 min-w-max">
                {[
                  { id: 'overview', label: 'Обзор', icon: BarChart3 },
                  { id: 'company', label: 'Компания', icon: Building2 },
                  { id: 'jobs', label: 'Заказы', icon: Briefcase },
                  { id: 'tenders', label: 'Тендеры', icon: Gavel },
                  { id: 'invoices', label: 'Инвойсы', icon: FileText },
                  { id: 'analytics', label: 'Аналитика', icon: BarChart3 }
                ].map((tab) => (
                  <motion.button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap transition-all duration-300 ${
                      activeTab === tab.id
                        ? 'bg-[#E5E7EB] shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] text-black'
                        : 'bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] text-gray-600'
                    }`}
                    whileTap={{ scale: 0.98 }}
                  >
                    <tab.icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{tab.label}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Desktop Tab Navigation */}
            {!isMobile && (
              <div className="p-2 rounded-2xl bg-[#E5E7EB] shadow-[inset_8px_8px_16px_#D1D5DB,inset_-8px_-8px_16px_#F9FAFB]">
                <TabsList className="grid w-full grid-cols-6 bg-transparent">
                  <TabsTrigger value="overview" className="relative flex items-center gap-2 bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] data-[state=active]:shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] rounded-xl transition-all duration-300 text-black data-[state=active]:text-black">
                    <User className="h-5 w-5 text-black" />
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
                  <TabsTrigger value="company" className="relative flex items-center gap-2 bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] data-[state=active]:shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] rounded-xl transition-all duration-300 text-black data-[state=active]:text-black">
                    <Building2 className="h-5 w-5 text-black" />
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
                  <TabsTrigger value="jobs" className="relative flex items-center gap-2 bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] data-[state=active]:shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] rounded-xl transition-all duration-300 text-black data-[state=active]:text-black">
                    <Briefcase className="h-5 w-5 text-black" />
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
                  <TabsTrigger value="tenders" className="relative flex items-center gap-2 bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] data-[state=active]:shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] rounded-xl transition-all duration-300 text-black data-[state=active]:text-black">
                    <Gavel className="h-5 w-5 text-black" />
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
                  <TabsTrigger value="invoices" className="relative flex items-center gap-2 bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] data-[state=active]:shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] rounded-xl transition-all duration-300 text-black data-[state=active]:text-black">
                    <FileText className="h-5 w-5 text-black" />
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
                  <TabsTrigger value="analytics" className="relative flex items-center gap-2 bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] data-[state=active]:shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] rounded-xl transition-all duration-300 text-black data-[state=active]:text-black">
                    <BarChart3 className="h-5 w-5 text-black" />
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
            )}

            <TabsContent value="overview" className="space-y-4 lg:space-y-8">
              {/* Welcome Message */}
              <div className="p-4 lg:p-8 bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] rounded-2xl">
                <h2 className="text-lg lg:text-2xl font-semibold mb-3 lg:mb-4 text-black">Добро пожаловать в ServiceHub Business!</h2>
                <p className="text-muted-foreground mb-4 lg:mb-6 text-sm lg:text-base">
                  Управляйте заказами компании, контролируйте расходы и координируйте команду в одном месте.
                </p>
                <div className="space-y-2 lg:space-y-3">
                  <p className="text-xs lg:text-sm text-muted-foreground"><strong>1.</strong> Настройте данные компании во вкладке "Компания"</p>
                  <p className="text-xs lg:text-sm text-muted-foreground"><strong>2.</strong> Создавайте заказы и отслеживайте прогресс</p>
                  <p className="text-xs lg:text-sm text-muted-foreground"><strong>3.</strong> Контролируйте финансы через инвойсы и аналитику</p>
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