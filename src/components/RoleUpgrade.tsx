import { useState } from "react";
import { upgradeUserRole, canUpgradeTo, UserRole } from "@/lib/userRoles";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Building2, Crown, ArrowRight, Check } from "lucide-react";

interface RoleUpgradeProps {
  userId: string;
  currentRole: UserRole;
  onRoleUpgraded: (newRole: UserRole) => void;
}

const roleConfig = {
  client: {
    title: "Клиент",
    description: "Заказывайте услуги",
    icon: Crown,
    color: "bg-blue-500"
  },
  pro: {
    title: "Специалист", 
    description: "Предоставляйте услуги",
    icon: Briefcase,
    color: "bg-purple-500"
  },
  business: {
    title: "Бизнес",
    description: "Корпоративный аккаунт",
    icon: Building2,
    color: "bg-green-500"
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
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Апгрейд аккаунта</h3>
      
      <div className="grid gap-4">
        {/* Current Role */}
        <Card className="border-2 border-muted">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${roleConfig[currentRole].color}`} />
              Текущий статус
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${roleConfig[currentRole].color} text-white`}>
                  {(() => {
                    const IconComponent = roleConfig[currentRole].icon;
                    return <IconComponent className="w-4 h-4" />;
                  })()}
                </div>
              <div>
                <p className="font-medium">{roleConfig[currentRole].title}</p>
                <p className="text-sm text-muted-foreground">{roleConfig[currentRole].description}</p>
              </div>
              <Badge variant="outline" className="ml-auto">
                <Check className="w-3 h-3 mr-1" />
                Активен
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Available Upgrades */}
        {availableUpgrades.map((targetRole) => (
          <Card key={targetRole} className="border-2 border-dashed border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${roleConfig[targetRole].color}`} />
                Доступно для апгрейда
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${roleConfig[targetRole].color} text-white`}>
                  {(() => {
                    const IconComponent = roleConfig[targetRole].icon;
                    return <IconComponent className="w-4 h-4" />;
                  })()}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{roleConfig[targetRole].title}</p>
                  <p className="text-sm text-muted-foreground">{roleConfig[targetRole].description}</p>
                </div>
                <Button
                  onClick={() => handleUpgrade(targetRole)}
                  disabled={upgrading === targetRole}
                  className="ml-auto"
                >
                  {upgrading === targetRole ? (
                    "Обновляем..."
                  ) : (
                    <>
                      <ArrowRight className="w-4 h-4 mr-1" />
                      Апгрейд
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};