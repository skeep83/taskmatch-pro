import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Batch-checks which of the given user ids passed KYC verification. */
export const useVerifiedUsers = (userIds: string[]) => {
  const [verified, setVerified] = useState<Set<string>>(new Set());
  const key = [...userIds].sort().join(",");

  useEffect(() => {
    if (!key) { setVerified(new Set()); return; }
    let mounted = true;
    void supabase
      .from("verified_users")
      .select("user_id")
      .in("user_id", key.split(","))
      .then(({ data }) => {
        if (mounted) setVerified(new Set((data || []).map((r) => r.user_id)));
      });
    return () => { mounted = false; };
  }, [key]);

  return verified;
};
