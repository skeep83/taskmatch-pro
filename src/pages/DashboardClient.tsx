import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FloatingCard } from "@/components/ui/floating-card";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import { Briefcase, User, Calendar, Settings } from "lucide-react";

export default function DashboardClient() {
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
        <FloatingCard className="p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Загружаем кабинет клиента...</h1>
          <div className="animate-spin">⏳</div>
        </FloatingCard>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background/95 to-background">
      <div className="container mx-auto py-8 px-6">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gradient mb-2">
            Кабинет клиента
          </h1>
          <p className="text-xl text-muted-foreground">
            Добро пожаловать, {user?.email}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <FloatingCard className="p-6 text-center cursor-pointer hover:scale-105 transition-all">
            <div className="flex flex-col items-center gap-4">
              <AnimatedIcon icon={Briefcase} size={32} className="text-primary" />
              <div>
                <h3 className="font-semibold mb-1">Создать заказ</h3>
                <p className="text-sm text-muted-foreground">Найти специалиста</p>
              </div>
            </div>
          </FloatingCard>

          <FloatingCard className="p-6 text-center cursor-pointer hover:scale-105 transition-all">
            <div className="flex flex-col items-center gap-4">
              <AnimatedIcon icon={Calendar} size={32} className="text-primary" />
              <div>
                <h3 className="font-semibold mb-1">Мои заказы</h3>
                <p className="text-sm text-muted-foreground">История заказов</p>
              </div>
            </div>
          </FloatingCard>

          <FloatingCard className="p-6 text-center cursor-pointer hover:scale-105 transition-all">
            <div className="flex flex-col items-center gap-4">
              <AnimatedIcon icon={User} size={32} className="text-primary" />
              <div>
                <h3 className="font-semibold mb-1">Профиль</h3>
                <p className="text-sm text-muted-foreground">Настройки аккаунта</p>
              </div>
            </div>
          </FloatingCard>

          <FloatingCard className="p-6 text-center cursor-pointer hover:scale-105 transition-all">
            <div className="flex flex-col items-center gap-4">
              <AnimatedIcon icon={Settings} size={32} className="text-primary" />
              <div>
                <h3 className="font-semibold mb-1">Настройки</h3>
                <p className="text-sm text-muted-foreground">Уведомления</p>
              </div>
            </div>
          </FloatingCard>
        </div>

        {/* Recent Activity */}
        <FloatingCard className="p-8">
          <h2 className="text-2xl font-bold mb-6">Недавняя активность</h2>
          <div className="text-center py-12">
            <p className="text-muted-foreground">Пока нет активности</p>
            <p className="text-sm text-muted-foreground mt-2">Создайте свой первый заказ</p>
          </div>
        </FloatingCard>
      </div>
    </main>
  );
}