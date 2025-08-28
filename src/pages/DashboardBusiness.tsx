import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FloatingCard } from "@/components/ui/floating-card";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import { Building2, User, Calendar, Settings, BarChart3, Users } from "lucide-react";

export default function DashboardBusiness() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

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
      <div className="container mx-auto py-8 px-6">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gradient mb-2">
            Бизнес-панель
          </h1>
          <p className="text-xl text-muted-foreground">
            Добро пожаловать, {user?.email}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="card-surface p-6 text-center">
            <AnimatedIcon icon={BarChart3} size={32} className="text-primary mb-4" />
            <div className="text-2xl font-bold mb-1">$0.00</div>
            <div className="text-sm text-muted-foreground">Общие расходы</div>
          </div>

          <div className="card-surface p-6 text-center">
            <AnimatedIcon icon={Users} size={32} className="text-success mb-4" />
            <div className="text-2xl font-bold mb-1">0</div>
            <div className="text-sm text-muted-foreground">Сотрудников</div>
          </div>

          <div className="card-surface p-6 text-center">
            <AnimatedIcon icon={Building2} size={32} className="text-accent mb-4" />
            <div className="text-2xl font-bold mb-1">0</div>
            <div className="text-sm text-muted-foreground">Заказов</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="card-surface p-6 text-center cursor-pointer">
            <div className="flex flex-col items-center gap-4">
              <AnimatedIcon icon={Building2} size={32} className="text-primary" />
              <div>
                <h3 className="font-semibold mb-1">Создать заказ</h3>
                <p className="text-sm text-muted-foreground">Для компании</p>
              </div>
            </div>
          </div>

          <div className="card-surface p-6 text-center cursor-pointer">
            <div className="flex flex-col items-center gap-4">
              <AnimatedIcon icon={Users} size={32} className="text-primary" />
              <div>
                <h3 className="font-semibold mb-1">Сотрудники</h3>
                <p className="text-sm text-muted-foreground">Управление</p>
              </div>
            </div>
          </div>

          <div className="card-surface p-6 text-center cursor-pointer">
            <div className="flex flex-col items-center gap-4">
              <AnimatedIcon icon={BarChart3} size={32} className="text-primary" />
              <div>
                <h3 className="font-semibold mb-1">Отчеты</h3>
                <p className="text-sm text-muted-foreground">Аналитика</p>
              </div>
            </div>
          </div>

          <div className="card-surface p-6 text-center cursor-pointer">
            <div className="flex flex-col items-center gap-4">
              <AnimatedIcon icon={Settings} size={32} className="text-primary" />
              <div>
                <h3 className="font-semibold mb-1">Настройки</h3>
                <p className="text-sm text-muted-foreground">Компания</p>
              </div>
            </div>
          </div>
        </div>

        {/* Company Setup */}
        <div className="card-surface p-8">
          <h2 className="text-2xl font-bold mb-6">Настройка компании</h2>
          <div className="text-center py-12">
            <p className="text-muted-foreground">Настройте данные компании</p>
            <p className="text-sm text-muted-foreground mt-2">Заполните профиль для начала работы</p>
          </div>
        </div>
      </div>
    </main>
  );
}