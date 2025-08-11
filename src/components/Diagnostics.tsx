import React, { useEffect } from "react";

const Diagnostics: React.FC = () => {
  useEffect(() => {
    (async () => {
      try {
        const { supabase } = await import("@/integrations/supabase/client");
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
