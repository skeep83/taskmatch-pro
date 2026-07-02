import React, { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const Diagnostics: React.FC = () => {
  useEffect(() => {
    if (!import.meta.env.DEV) return;

    (async () => {
      try {
        if (supabase?.auth && typeof supabase.from === "function") {
          console.info(
            "ServiceHub Diagnostics: Supabase client detected and ready.",
          );
        } else {
          console.warn(
            "ServiceHub Diagnostics: Supabase client NOT found. Integration may be inactive.",
          );
        }
      } catch (e) {
        console.error("ServiceHub Diagnostics: Error while checking Supabase client", e);
      }
    })();
  }, []);

  return null;
};

export default Diagnostics;
