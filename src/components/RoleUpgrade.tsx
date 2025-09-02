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
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">{availableUpgrades.map((targetRole) => {
        const config = roleConfig[targetRole];
        const IconComponent = config.icon;
        
        return (
          <motion.div
            key={targetRole}
            initial={{ opacity: 0, y: 20, rotateX: 20 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            whileHover={{ 
              y: -8, 
              rotateX: 5, 
              rotateY: 3,
              transition: { duration: 0.2 }
            }}
            className="perspective-1000"
          >
            <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden hover:shadow-3xl transition-all duration-300 transform preserve-3d card-3d">
              {/* Верхняя секция с градиентом - уменьшена */}
              <div className={`h-20 bg-gradient-to-br ${config.gradient} relative`}>
                {/* Декоративный оверлей */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-white/10 to-transparent"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent"></div>
                
                {/* Иконка меньшего размера */}
                <motion.div
                  whileHover={{ scale: 1.15, rotate: 8 }}
                  transition={{ duration: 0.2 }}
                  className="absolute left-1/2 top-10 transform -translate-x-1/2 z-10"
                >
                  <div className="w-20 h-20 bg-white rounded-full shadow-2xl flex items-center justify-center ring-4 ring-white/20">
                    <IconComponent className="w-8 h-8 text-gray-700" />
                  </div>
                </motion.div>
              </div>
              
              {/* Нижняя секция с контентом - более компактная */}
              <div className="bg-gradient-to-b from-gray-50 to-white pt-12 px-5 pb-5">
                <div className="text-center mb-4">
                  <h4 className="text-lg font-bold text-gray-900 mb-1">{config.title}</h4>
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                    {config.description}
                  </p>
                </div>
                
                {/* Преимущества - более компактные */}
                <div className="space-y-1 mb-4">
                  {config.benefits.slice(0, 2).map((benefit, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs text-gray-600">
                      <Star className="w-3 h-3 text-yellow-500 fill-current flex-shrink-0" />
                      <span className="truncate">{benefit}</span>
                    </div>
                  ))}
                </div>
                
                {/* Кнопка действия - меньшего размера */}
                <Button
                  onClick={() => handleUpgrade(targetRole)}
                  disabled={upgrading === targetRole}
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-semibold py-2.5 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 text-sm hover-scale"
                >
                  {upgrading === targetRole ? (
                    "Обновляем..."
                  ) : (
                    <>
                      <ArrowRight className="w-4 h-4 mr-1" />
                      Стать {config.title.toLowerCase()}ом
                    </>
                  )}
                </Button>
              </div>
              
              {/* Дополнительные блики для объема */}
              <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <div className="absolute top-2 left-2 w-8 h-8 bg-white/30 rounded-full blur-md"></div>
                <div className="absolute bottom-2 right-2 w-6 h-6 bg-black/10 rounded-full blur-sm"></div>
              </div>
            </div>
          </motion.div>
        );
      })}
      </div>
    </div>
  );
};