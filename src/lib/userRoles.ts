import { supabase } from "@/integrations/supabase/client";

export type UserRole = 'client' | 'pro' | 'business';

export interface UserRoleResult {
  success: boolean;
  role: UserRole;
  error?: string;
}

export interface UpgradeResult {
  success: boolean;
  error?: string;
}

export const getUserRole = async (userId: string): Promise<UserRoleResult> => {
  try {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error('Error checking role:', error);
      return { success: false, role: 'client', error: error.message };
    }

    const role = data?.role || 'client';
    return { success: true, role: role as UserRole };
  } catch (error: any) {
    console.error('Unexpected error in getUserRole:', error);
    return { success: false, role: 'client', error: error.message };
  }
};

export const upgradeUserRole = async (userId: string, newRole: UserRole): Promise<UpgradeResult> => {
  try {
    const { data, error } = await supabase.rpc('upgrade_user_role', {
      _user_id: userId,
      _new_role: newRole
    });

    if (error) {
      console.error('Error upgrading role:', error);
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: false, error: 'Недопустимый путь апгрейда' };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Unexpected error in upgradeUserRole:', error);
    return { success: false, error: error.message };
  }
};

export const hasUserRole = (userRole: UserRole, targetRole: UserRole): boolean => {
  return userRole === targetRole;
};

// Иерархия ролей: business > pro > client
export const hasRoleAccess = (userRole: UserRole, requiredRole: UserRole): boolean => {
  const roleHierarchy: Record<UserRole, number> = {
    'client': 1,
    'pro': 2,
    'business': 3
  };
  
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
};

export const canUpgradeTo = (currentRole: UserRole, targetRole: UserRole): boolean => {
  switch (targetRole) {
    case 'pro':
      return currentRole === 'client';
    case 'business':
      return currentRole === 'client' || currentRole === 'pro';
    default:
      return false;
  }
};