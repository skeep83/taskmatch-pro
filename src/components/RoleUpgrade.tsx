import { useState } from "react";
import { motion } from "framer-motion";
import { upgradeUserRole, canUpgradeTo, UserRole } from "@/lib/userRoles";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Briefcase, Building2, ArrowRight, Star } from "lucide-react";

interface RoleUpgradeProps {
  userId: string;
  currentRole: UserRole;
  onRoleUpgraded: (newRole: UserRole) => void;
}

const roleConfig = {
  pro: {
    title: "Специалист", 
    description: "Предоставляйте услуги и зарабатывайте",
    icon: Briefcase,
    gradient: "from-purple-400 via-pink-500 to-indigo-600",
    benefits: ["Получайте заказы", "Мгновенные выплаты", "Рейтинг и отзывы"]
  },
  business: {
    title: "Бизнес",
    description: "Корпоративный аккаунт для команды",
    icon: Building2,
    gradient: "from-emerald-400 via-teal-500 to-blue-600",
    benefits: ["Управление командой", "E-инвойсы", "Лимиты и отчеты"]
  }
};

export const RoleUpgrade = ({ userId, currentRole, onRoleUpgraded }: RoleUpgradeProps) => {
  const { toast } = useToast();
  const [upgrading, setUpgrading] = useState<UserRole | null>(null);

  const handleUpgrade = async (targetRole: UserRole) => {
    setUpgrading(targetRole);
    
    try {
      const result = await upgradeUserRole(userId, targetRole);
      
      if (result.success) {
        toast({
          title: "Аккаунт обновлен",
          description: `Вы успешно обновили аккаунт до ${roleConfig[targetRole].title}`
        });
        onRoleUpgraded(targetRole);
      } else {
        toast({
          title: "Ошибка",
          description: result.error || "Не удалось обновить аккаунт",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: "Произошла ошибка при обновлении аккаунта",
        variant: "destructive"
      });
    } finally {
      setUpgrading(null);
    }
  };

  const availableUpgrades = (['pro', 'business'] as UserRole[]).filter(role => 
    role !== currentRole && canUpgradeTo(currentRole, role)
  );

  if (availableUpgrades.length === 0) {
    return null;
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h3 className="text-2xl font-bold mb-2">Расширьте возможности</h3>
        <p className="text-muted-foreground">Станьте специалистом или создайте бизнес аккаунт</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">{availableUpgrades.map((targetRole) => {
        const config = roleConfig[targetRole];
        const IconComponent = config.icon;
        
        return (
          <motion.div
            key={targetRole}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            className="perspective-1000"
          >
            <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden hover:shadow-3xl transition-all duration-300 transform hover:scale-[1.02]">
              {/* Верхняя секция с градиентом */}
              <div className={`h-32 bg-gradient-to-br ${config.gradient} relative`}>
                {/* Декоративный оверлей */}
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/10 to-white/20"></div>
                
                {/* Иконка по центру */}
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ duration: 0.2 }}
                  className="absolute left-1/2 top-16 transform -translate-x-1/2 z-10"
                >
                  <div className="w-32 h-32 bg-white rounded-full shadow-xl flex items-center justify-center">
                    <IconComponent className="w-12 h-12 text-gray-800" />
                  </div>
                </motion.div>
              </div>
              
              {/* Нижняя секция с контентом */}
              <div className="bg-white pt-20 px-6 pb-8">
                <div className="text-center mb-6">
                  <h4 className="text-xl font-bold text-gray-900 mb-1">{config.title}</h4>
                  <p className="text-sm text-gray-500 uppercase tracking-wide font-medium">
                    {config.description}
                  </p>
                </div>
                
                {/* Преимущества */}
                <div className="space-y-2 mb-6">
                  {config.benefits.map((benefit, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      {benefit}
                    </div>
                  ))}
                </div>
                
                {/* Кнопка действия */}
                <Button
                  onClick={() => handleUpgrade(targetRole)}
                  disabled={upgrading === targetRole}
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {upgrading === targetRole ? (
                    "Обновляем..."
                  ) : (
                    <>
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Стать {config.title.toLowerCase()}ом
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        );
      })}
      </div>
    </div>
  );
};