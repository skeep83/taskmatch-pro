import { supabase } from "@/integrations/supabase/client";

import type { Database } from "@/integrations/supabase/types";

/** Primary account roles used across dashboards */
export type UserRole = 'client' | 'pro' | 'business';
/** Full set of roles as stored in the user_roles table */
export type AppRole = Database["public"]["Enums"]["app_role"];

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
      .eq("user_id", userId);

    if (error) {
      console.error('Error checking role:', error);
      return { success: false, role: 'client', error: error.message };
    }

    // Если пользователь имеет несколько ролей, выбираем приоритетную
    if (!data || data.length === 0) {
      return { success: true, role: 'client' };
    }

    const roles = data.map(r => r.role);
    
    // Иерархия приоритетов ролей
    if (roles.includes('business')) return { success: true, role: 'business' };
    if (roles.includes('pro')) return { success: true, role: 'pro' };
    return { success: true, role: 'client' };
    
  } catch (error: any) {
    console.error('Unexpected error in getUserRole:', error);
    return { success: false, role: 'client', error: error.message };
  }
};

export const getUserRoles = async (userId: string): Promise<UserRole[]> => {
  try {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (error) {
      console.error('Error checking roles:', error);
      return ['client'];
    }

    return data?.map(r => r.role as UserRole) || ['client'];
  } catch (error: any) {
    console.error('Unexpected error in getUserRoles:', error);
    return ['client'];
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