import { supabase } from "@/integrations/supabase/client";

export type UserRole = 'client' | 'pro' | 'business';

export interface UserRoleResult {
  success: boolean;
  roles: UserRole[];
  error?: string;
}

export const ensureUserRoles = async (userId: string): Promise<UserRoleResult> => {
  try {
    // Check existing roles
    const { data: existingRoles, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (roleError) {
      console.error('Error checking roles:', roleError);
      return { success: false, roles: [], error: roleError.message };
    }

    const currentRoles = (existingRoles || []).map((r: any) => r.role as UserRole);

    // If user has no roles, create client role by default
    if (currentRoles.length === 0) {
      const { error: insertError } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: "client" });

      if (insertError) {
        console.error('Error creating default role:', insertError);
        return { success: false, roles: [], error: insertError.message };
      }

      return { success: true, roles: ['client'] };
    }

    return { success: true, roles: currentRoles };
  } catch (error: any) {
    console.error('Unexpected error in ensureUserRoles:', error);
    return { success: false, roles: [], error: error.message };
  }
};

export const createUserRole = async (userId: string, role: UserRole): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from("user_roles")
      .insert({ user_id: userId, role });

    if (error && !error.message.includes('duplicate')) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const hasUserRole = (roles: UserRole[], targetRole: UserRole): boolean => {
  return roles.includes(targetRole);
};