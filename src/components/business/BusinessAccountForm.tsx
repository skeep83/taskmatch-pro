import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
        title: "Ошибка",
        description: "Не удалось загрузить данные компании",
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
        title: "Успешно",
        description: "Данные компании сохранены"
      });
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось сохранить данные",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Данные компании
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="company_name">Название компании *</Label>
            <Input
              id="company_name"
              value={account.company_name}
              onChange={(e) => setAccount({ ...account, company_name: e.target.value })}
              placeholder="ООО «Пример»"
            />
          </div>
          <div>
            <Label htmlFor="idno">IDNO *</Label>
            <Input
              id="idno"
              value={account.idno}
              onChange={(e) => setAccount({ ...account, idno: e.target.value })}
              placeholder="1234567890123"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="vat_number">НДС номер</Label>
            <Input
              id="vat_number"
              value={account.vat_number}
              onChange={(e) => setAccount({ ...account, vat_number: e.target.value })}
              placeholder="MD123456789"
            />
          </div>
          <div>
            <Label htmlFor="rate_multiplier">Множитель тарифа</Label>
            <Input
              id="rate_multiplier"
              type="number"
              step="0.1"
              min="0.1"
              max="10"
              value={account.rate_multiplier}
              onChange={(e) => setAccount({ ...account, rate_multiplier: parseFloat(e.target.value) || 1.0 })}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="legal_address">Юридический адрес *</Label>
          <Textarea
            id="legal_address"
            value={account.legal_address}
            onChange={(e) => setAccount({ ...account, legal_address: e.target.value })}
            placeholder="г. Кишинев, ул. Примера, 123"
            rows={3}
          />
        </div>

        <div>
          <Label htmlFor="contract_url">Ссылка на договор</Label>
          <Input
            id="contract_url"
            value={account.contract_url || ""}
            onChange={(e) => setAccount({ ...account, contract_url: e.target.value })}
            placeholder="https://example.com/contract.pdf"
          />
        </div>

        <Button 
          onClick={saveBusinessAccount} 
          disabled={saving || !account.company_name || !account.idno || !account.legal_address}
          className="w-full"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Сохранение...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Сохранить данные
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}