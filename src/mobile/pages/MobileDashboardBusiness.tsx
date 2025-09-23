import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { RoleGuard } from "@/components/RoleGuard";
import { MobileCard } from "@/mobile/components/ui/MobileCard";
import { MobileHeader } from "@/mobile/components/navigation/MobileHeader";
import { NeumorphicIcon } from "@/components/ui/neumorphic-icon";
import { useMobile } from "@/mobile/providers/MobileProvider";
import { 
  Building2, 
  Users, 
  Briefcase, 
  BarChart3, 
  FileText, 
  Gavel, 
  Plus,
  Settings,
  DollarSign,
  CreditCard
} from "lucide-react";
import { BusinessAccountForm } from "@/components/business/BusinessAccountForm";
import { BusinessMembers } from "@/components/business/BusinessMembers";
import { BusinessJobs } from "@/components/business/BusinessJobs";
import { BusinessInvoices } from "@/components/business/BusinessInvoices";
import { BusinessAnalytics } from "@/components/business/BusinessAnalytics";
import { BusinessTenders } from "@/components/business/BusinessTenders";

const tabItems = [
  { id: 'overview', label: 'Обзор', icon: BarChart3 },
  { id: 'company', label: 'Компания', icon: Building2 },
  { id: 'jobs', label: 'Заказы', icon: Briefcase },
  { id: 'tenders', label: 'Тендеры', icon: Gavel },
  { id: 'invoices', label: 'Инвойсы', icon: FileText },
  { id: 'analytics', label: 'Аналитика', icon: BarChart3 }
];

export default function MobileDashboardBusiness() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { safeAreaInsets } = useMobile();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      
      if (!session.session?.user) {
        navigate("/auth");
        return;
      }

      setUser(session.session.user);
      setLoading(false);
    } catch (error: any) {
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
      <div className="min-h-screen flex items-center justify-center p-4">
        <MobileCard className="text-center">
          <h1 className="text-xl font-bold mb-4">Загружаем бизнес-панель...</h1>
          <div className="animate-spin">⏳</div>
        </MobileCard>
      </div>
    );
  }

  const renderOverview = () => (
    <div className="space-y-4">
      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <MobileCard className="text-center">
          <div className="space-y-2">
            <p className="text-xs text-gray-600">Расходы</p>
            <p className="text-lg font-bold text-black">$0.00</p>
            <NeumorphicIcon icon={DollarSign} size={32} variant="behance" />
          </div>
        </MobileCard>
        
        <MobileCard className="text-center">
          <div className="space-y-2">
            <p className="text-xs text-gray-600">Сотрудники</p>
            <p className="text-lg font-bold text-black">0</p>
            <NeumorphicIcon icon={Users} size={32} variant="behance" />
          </div>
        </MobileCard>
        
        <MobileCard className="text-center">
          <div className="space-y-2">
            <p className="text-xs text-gray-600">Заказы</p>
            <p className="text-lg font-bold text-black">0</p>
            <NeumorphicIcon icon={Briefcase} size={32} variant="behance" />
          </div>
        </MobileCard>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <MobileCard 
          pressable 
          onPress={() => navigate("/job/new")}
          className="text-center"
        >
          <div className="space-y-2">
            <div className="w-10 h-10 mx-auto rounded-full bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] flex items-center justify-center">
              <Plus className="h-5 w-5 text-primary" />
            </div>
            <p className="text-sm font-medium text-black">Создать заказ</p>
          </div>
        </MobileCard>

        <MobileCard 
          pressable 
          onPress={() => setActiveTab('invoices')}
          className="text-center"
        >
          <div className="space-y-2">
            <div className="w-10 h-10 mx-auto rounded-full bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <p className="text-sm font-medium text-black">Инвойсы</p>
          </div>
        </MobileCard>
      </div>

      {/* Welcome Message */}
      <MobileCard>
        <h2 className="text-lg font-semibold mb-2 text-black">Добро пожаловать в ServiceHub Business!</h2>
        <p className="text-sm text-gray-600 mb-3">
          Управляйте заказами компании, контролируйте расходы и координируйте команду в одном месте.
        </p>
        <div className="space-y-1">
          <p className="text-xs text-gray-600"><strong>1.</strong> Настройте данные компании</p>
          <p className="text-xs text-gray-600"><strong>2.</strong> Создавайте заказы</p>
          <p className="text-xs text-gray-600"><strong>3.</strong> Контролируйте финансы</p>
        </div>
      </MobileCard>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'company':
        return <BusinessAccountForm />;
      case 'jobs':
        return <BusinessJobs />;
      case 'tenders':
        return <BusinessTenders />;
      case 'invoices':
        return <BusinessInvoices />;
      case 'analytics':
        return <BusinessAnalytics />;
      default:
        return renderOverview();
    }
  };

  return (
    <RoleGuard requiredRole="business">
      <div className="min-h-screen bg-[#E5E7EB]">
        <MobileHeader 
          title="Бизнес-панель"
          showBack={false}
          showLogout={true}
          showNotifications={true}
        />
        
        <div 
          className="pt-20 pb-24 px-4"
          style={{ paddingTop: `${80 + safeAreaInsets.top}px` }}
        >

          {/* Horizontal Tab Navigation */}
          <div className="overflow-x-auto mb-6">
            <div className="flex space-x-2 p-3 bg-[#E5E7EB] shadow-[inset_8px_8px_16px_#D1D5DB,inset_-8px_-8px_16px_#F9FAFB] rounded-2xl min-w-max">
              {tabItems.map((tab) => (
                <motion.button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl whitespace-nowrap transition-all duration-300 font-medium ${
                    activeTab === tab.id
                      ? 'bg-[#E5E7EB] shadow-[inset_4px_4px_8px_#D1D5DB,inset_-4px_-4px_8px_#F9FAFB] text-primary'
                      : 'bg-[#E5E7EB] shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] text-gray-600 hover:shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB]'
                  }`}
                  whileTap={{ scale: 0.98 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <tab.icon className="h-4 w-4" />
                  <span className="text-sm">{tab.label}</span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="pb-4">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}