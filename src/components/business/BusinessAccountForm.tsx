import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEnhancedI18n } from "@/i18n/enhanced";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Save, Loader2 } from "lucide-react";

interface BusinessAccount {
  id?: string;
  company_name: string;
  legal_address: string;
  idno: string;
  vat_number: string;
  rate_multiplier: number;
  contract_url?: string;
}

export function BusinessAccountForm() {
  const { toast } = useToast();
  const { t } = useEnhancedI18n();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [account, setAccount] = useState<BusinessAccount>({
    company_name: "",
    legal_address: "",
    idno: "",
    vat_number: "",
    rate_multiplier: 1.0,
    contract_url: ""
  });

  useEffect(() => {
    loadBusinessAccount();
  }, []);

  const loadBusinessAccount = async () => {
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) return;

      const { data, error } = await supabase
        .from("business_accounts")
        .select("*")
        .eq("owner_id", session.session.user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setAccount(data);
      }
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: t("biz.account.load_error"),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveBusinessAccount = async () => {
    setSaving(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) return;

      const accountData = {
        ...account,
        owner_id: session.session.user.id
      };

      let result;
      if (account.id) {
        result = await supabase
          .from("business_accounts")
          .update(accountData)
          .eq("id", account.id);
      } else {
        result = await supabase
          .from("business_accounts")
          .insert(accountData)
          .select()
          .single();
      }

      if (result.error) throw result.error;

      if (result.data && !account.id) {
        setAccount(result.data);
      }

      toast({
        title: t("common.success"),
        description: t("biz.account.saved")
      });
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message || t("biz.account.save_error"),
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-neo neo-8 rounded-2xl p-8">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin w-8 h-8 rounded-full bg-neo neo-4"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-neo neo-8 rounded-2xl p-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-full bg-neo neo-4 flex items-center justify-center">
          <Building2 className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-black">{t("biz.account.title")}</h2>
      </div>
      
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="company_name" className="text-black font-medium">{t("biz.account.company_name")}</Label>
            <div className="relative">
              <Input
                id="company_name"
                value={account.company_name}
                onChange={(e) => setAccount({ ...account, company_name: e.target.value })}
                placeholder={t("biz.account.company_placeholder")}
                className="bg-neo neo-inset-4 border-0 rounded-xl h-12 text-black placeholder:text-gray-500 focus:neo-inset-6"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="idno" className="text-black font-medium">IDNO *</Label>
            <Input
              id="idno"
              value={account.idno}
              onChange={(e) => setAccount({ ...account, idno: e.target.value })}
              placeholder="1234567890123"
              className="bg-neo neo-inset-4 border-0 rounded-xl h-12 text-black placeholder:text-gray-500 focus:neo-inset-6"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="vat_number" className="text-black font-medium">{t("biz.account.vat")}</Label>
            <Input
              id="vat_number"
              value={account.vat_number}
              onChange={(e) => setAccount({ ...account, vat_number: e.target.value })}
              placeholder="MD123456789"
              className="bg-neo neo-inset-4 border-0 rounded-xl h-12 text-black placeholder:text-gray-500 focus:neo-inset-6"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rate_multiplier" className="text-black font-medium">{t("biz.account.rate_multiplier")}</Label>
            <Input
              id="rate_multiplier"
              type="number"
              step="0.1"
              min="0.1"
              max="10"
              value={account.rate_multiplier}
              onChange={(e) => setAccount({ ...account, rate_multiplier: parseFloat(e.target.value) || 1.0 })}
              className="bg-neo neo-inset-4 border-0 rounded-xl h-12 text-black placeholder:text-gray-500 focus:neo-inset-6"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="legal_address" className="text-black font-medium">{t("biz.account.legal_address")}</Label>
          <Textarea
            id="legal_address"
            value={account.legal_address}
            onChange={(e) => setAccount({ ...account, legal_address: e.target.value })}
            placeholder={t("biz.account.address_placeholder")}
            rows={3}
            className="bg-neo neo-inset-4 border-0 rounded-xl text-black placeholder:text-gray-500 focus:neo-inset-6 resize-none"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contract_url" className="text-black font-medium">{t("biz.account.contract_url")}</Label>
          <Input
            id="contract_url"
            value={account.contract_url || ""}
            onChange={(e) => setAccount({ ...account, contract_url: e.target.value })}
            placeholder="https://example.com/contract.pdf"
            className="bg-neo neo-inset-4 border-0 rounded-xl h-12 text-black placeholder:text-gray-500 focus:neo-inset-6"
          />
        </div>

        <div className="pt-4">
          <button
            onClick={saveBusinessAccount}
            disabled={saving || !account.company_name || !account.idno || !account.legal_address}
            className="w-full h-14 bg-neo neo-8 hover:neo-4 active:neo-inset-4 disabled:neo-inset-2 disabled:text-gray-400 rounded-xl transition-all duration-300 flex items-center justify-center gap-3 text-black font-semibold text-lg"
          >
            {saving ? (
              <>
                <div className="w-5 h-5 rounded-full bg-neo neo-2 animate-spin"></div>
                {t("common.saving")}
              </>
            ) : (
              <>
                <div className="w-5 h-5 rounded-full bg-neo neo-2 flex items-center justify-center">
                  <Save className="h-3 w-3 text-primary" />
                </div>
                {t("biz.account.save")}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}