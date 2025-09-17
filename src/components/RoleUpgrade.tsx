import { useState } from "react";
import { motion } from "framer-motion";
import { UserRole } from "@/lib/userRoles";
import { Button } from "@/components/ui/button";
import { Briefcase, Building2, ArrowRight, Star } from "lucide-react";
import { RoleUpgradeWizard } from "./RoleUpgradeWizard";

interface RoleUpgradeProps {
  userId: string;
  currentRole: UserRole;
  onRoleUpgraded: (newRole: UserRole) => void;
}

interface UpgradeModal {
  isOpen: boolean;
  targetRole: UserRole | null;
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
  const [modal, setModal] = useState<UpgradeModal>({ isOpen: false, targetRole: null });

  const handleUpgradeClick = (targetRole: UserRole) => {
    setModal({ isOpen: true, targetRole });
  };

  const handleCloseModal = () => {
    setModal({ isOpen: false, targetRole: null });
  };

  const handleUpgradeSuccess = (newRole: UserRole) => {
    onRoleUpgraded(newRole);
    handleCloseModal();
  };

  // Доступные апгрейды (исключаем текущую роль)
  const availableUpgrades = (['pro', 'business'] as UserRole[]).filter(role => 
    role !== currentRole
  );

  if (availableUpgrades.length === 0) {
    return null;
  }

  return (
    <div className="space-y-8">
      <div className="text-center mx-auto max-w-lg">
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
            className="perspective-1000 group"
          >
            <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden hover:shadow-3xl transition-all duration-300 transform preserve-3d card-3d h-80 flex flex-col">
              {/* Верхняя секция с градиентом - уменьшена */}
              <div className={`h-28 bg-gradient-to-br ${config.gradient} relative`}>
                {/* Декоративный оверлей */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-white/10 to-transparent"></div>
                
                {/* Иконка */}
                <div className="absolute left-1/2 top-14 transform -translate-x-1/2 -translate-y-1/2 z-10">
                  <motion.div
                    whileHover={{ scale: 1.15, rotate: 8 }}
                    transition={{ duration: 0.2 }}
                    className="w-20 h-20 bg-white rounded-full shadow-2xl flex items-center justify-center ring-4 ring-white/30"
                  >
                    <IconComponent className="w-10 h-10 text-white" />
                  </motion.div>
                </div>
              </div>
              
              {/* Нижняя секция с контентом - более компактная */}
              <div className="bg-gradient-to-b from-gray-50 to-white pt-18 px-5 pb-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="text-center mb-4">
                    <h4 className="text-lg font-bold text-foreground mb-1">{config.title}</h4>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                      {config.description}
                    </p>
                  </div>
                  
                  {/* Преимущества - более компактные */}
                  <div className="space-y-1 mb-4">
                    {config.benefits.slice(0, 2).map((benefit, index) => (
                      <div key={index} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Star className="w-3 h-3 text-yellow-500 fill-current flex-shrink-0" />
                        <span className="truncate">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Кнопка действия - меньшего размера */}
                <Button
                  onClick={() => handleUpgradeClick(targetRole)}
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-semibold py-2.5 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 text-sm hover-scale"
                >
                  <ArrowRight className="w-4 h-4 mr-1" />
                  Стать {config.title.toLowerCase()}ом
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

      {/* Role Upgrade Wizard Modal */}
      {modal.isOpen && modal.targetRole && (
        <RoleUpgradeWizard
          userId={userId}
          currentRole={currentRole}
          targetRole={modal.targetRole}
          isOpen={modal.isOpen}
          onClose={handleCloseModal}
          onSuccess={handleUpgradeSuccess}
        />
      )}
    </div>
  );
};