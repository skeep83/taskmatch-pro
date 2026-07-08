import { useEffect, useState } from "react";
import { supabase, SUPABASE_URL } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Copy, Check, ShieldCheck, Smartphone, FlaskConical, ExternalLink, CheckCircle2, XCircle } from "lucide-react";

type Settings = {
  payment_provider: string;
  payment_mode: string;
  payment_currency: string;
  platform_fee_percent: number;
  tax_percent: number;
  stripe_publishable_key: string;
  apple_pay_enabled: boolean;
  google_pay_enabled: boolean;
  payments_enabled: boolean;
};

const DEFAULTS: Settings = {
  payment_provider: "stripe",
  payment_mode: "test",
  payment_currency: "mdl",
  platform_fee_percent: 10,
  tax_percent: 0,
  stripe_publishable_key: "",
  apple_pay_enabled: false,
  google_pay_enabled: false,
  payments_enabled: false,
};

const parse = (v: unknown): unknown => (typeof v === "string" ? (() => { try { return JSON.parse(v); } catch { return v; } })() : v);

const CopyRow = ({ label, value }: { label: string; value: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="min-w-0 flex-1">
        <div className="text-xs text-muted-foreground mb-1">{label}</div>
        <code className="block text-xs bg-neo neo-inset-2 rounded-lg px-3 py-2 truncate">{value}</code>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="shrink-0 mt-4"
        onClick={() => {
          navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      </Button>
    </div>
  );
};

export default function AdminPayments() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; url?: string } | null>(null);

  const runTestPayment = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("create-payment", {
        body: {
          amount_cents: 1000,
          currency: settings.payment_currency,
          description: "ServiceHub — тестовый платёж (админ-проверка процессинга)",
          test: true,
        },
      });
      if (error) throw new Error(error.message || "Функция create-payment вернула ошибку");
      const url = (data as { url?: string; checkout_url?: string })?.url
        || (data as { checkout_url?: string })?.checkout_url;
      if ((data as { simulated?: boolean })?.simulated) {
        setTestResult({ ok: true, message: "Тестовый режим: платёж успешно симулирован (Stripe не подключён — для реальных карт добавьте sk_test).", url });
      } else if (url) {
        setTestResult({ ok: true, message: "Платёжная сессия создана. Откройте страницу оплаты и используйте тестовую карту.", url });
      } else {
        setTestResult({ ok: true, message: `Функция ответила без ошибок: ${JSON.stringify(data).slice(0, 200)}` });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setTestResult({
        ok: false,
        message: msg.includes("STRIPE_SECRET_KEY")
          ? "Секретный ключ не задан. Выполните команду из шага 2 (используйте sk_test_... для тестового режима)."
          : `Ошибка: ${msg}`,
      });
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("key, value")
        .eq("category", "payments");
      if (data) {
        const next = { ...DEFAULTS } as Record<string, unknown>;
        data.forEach((r) => { if (r.key in next) next[r.key] = parse(r.value); });
        setSettings(next as Settings);
      }
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const rows = Object.entries(settings).map(([key, value]) => ({
        key,
        value: JSON.stringify(value),
        category: "payments",
      }));
      for (const row of rows) {
        const { error } = await supabase
          .from("platform_settings")
          .upsert(row, { onConflict: "key" });
        if (error) throw error;
      }
      toast({ title: "Сохранено", description: "Настройки платежей обновлены" });
    } catch (e: unknown) {
      toast({ title: "Ошибка", description: e instanceof Error ? e.message : "Не удалось сохранить", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const projectRef = SUPABASE_URL.replace("https://", "").split(".")[0];
  const webhookUrl = `${SUPABASE_URL}/functions/v1/stripe-webhook`;

  if (loading) return <div className="p-8">Загрузка настроек…</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="neo-card p-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="neo-icon-well w-10 h-10"><CreditCard className="w-5 h-5 text-primary" /></div>
          <div>
            <h2 className="text-xl font-bold">Процессинг платежей</h2>
            <p className="text-sm text-muted-foreground">Карты хранятся у провайдера. Мы не сохраняем номера карт — только токены (PCI DSS).</p>
          </div>
          <Badge variant={settings.payments_enabled ? "default" : "secondary"} className="ml-auto">
            {settings.payments_enabled ? "Включено" : "Выключено"}
          </Badge>
        </div>
      </div>

      {/* Provider & keys */}
      <div className="neo-card p-6 space-y-5">
        <h3 className="font-semibold">1. Провайдер и ключи</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <Label>Провайдер</Label>
            <Select value={settings.payment_provider} onValueChange={(v) => setSettings((s) => ({ ...s, payment_provider: v }))}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="stripe">Stripe (рекомендуется)</SelectItem>
                <SelectItem value="maib">MAIB E-Commerce</SelectItem>
                <SelectItem value="paynet">Paynet.md</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Режим</Label>
            <Select value={settings.payment_mode} onValueChange={(v) => setSettings((s) => ({ ...s, payment_mode: v }))}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="test">Тестовый</SelectItem>
                <SelectItem value="live">Боевой (live)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Валюта</Label>
            <Select value={settings.payment_currency} onValueChange={(v) => setSettings((s) => ({ ...s, payment_currency: v }))}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mdl">MDL</SelectItem>
                <SelectItem value="eur">EUR</SelectItem>
                <SelectItem value="usd">USD</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="fee">Комиссия платформы, %</Label>
            <Input
              id="fee"
              type="number"
              min="0"
              max="50"
              step="0.5"
              className="mt-1"
              value={settings.platform_fee_percent}
              onChange={(e) => setSettings((s) => ({ ...s, platform_fee_percent: Number(e.target.value) || 0 }))}
            />
            <p className="text-xs text-muted-foreground mt-1">Добавляется к сумме заказа при оплате в эскроу; остаётся платформе.</p>
          </div>
          <div>
            <Label htmlFor="tax">Налог, %</Label>
            <Input
              id="tax"
              type="number"
              min="0"
              max="30"
              step="0.5"
              className="mt-1"
              value={settings.tax_percent}
              onChange={(e) => setSettings((s) => ({ ...s, tax_percent: Number(e.target.value) || 0 }))}
            />
            <p className="text-xs text-muted-foreground mt-1">0 — если налог не взимается на уровне платформы.</p>
          </div>
        </div>

        <div>
          <Label htmlFor="pk">Publishable key (публичный ключ, pk_...)</Label>
          <Input
            id="pk"
            className="mt-1 font-mono text-sm"
            placeholder="pk_live_..."
            value={settings.stripe_publishable_key}
            onChange={(e) => setSettings((s) => ({ ...s, stripe_publishable_key: e.target.value.trim() }))}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Этот ключ безопасен для фронтенда. Секретный ключ (sk_...) в базу НЕ вводится — см. шаг 2.
          </p>
        </div>

        <div className="flex items-center justify-between p-3 rounded-xl bg-neo neo-inset-2">
          <div>
            <div className="font-medium text-sm">Платежи включены</div>
            <div className="text-xs text-muted-foreground">Главный тумблер: включайте после шагов 1–3</div>
          </div>
          <Switch checked={settings.payments_enabled} onCheckedChange={(v) => setSettings((s) => ({ ...s, payments_enabled: v }))} />
        </div>
      </div>

      {/* Wallets */}
      <div className="neo-card p-6 space-y-4">
        <h3 className="font-semibold flex items-center gap-2"><Smartphone className="w-4 h-4" /> Кошельки</h3>
        <div className="flex items-center justify-between p-3 rounded-xl bg-neo neo-inset-2">
          <div>
            <div className="font-medium text-sm"> Pay</div>
            <div className="text-xs text-muted-foreground">Требует верификации домена в Stripe (шаг 4)</div>
          </div>
          <Switch checked={settings.apple_pay_enabled} onCheckedChange={(v) => setSettings((s) => ({ ...s, apple_pay_enabled: v }))} />
        </div>
        <div className="flex items-center justify-between p-3 rounded-xl bg-neo neo-inset-2">
          <div>
            <div className="font-medium text-sm">Google Pay</div>
            <div className="text-xs text-muted-foreground">Работает сразу после включения Stripe</div>
          </div>
          <Switch checked={settings.google_pay_enabled} onCheckedChange={(v) => setSettings((s) => ({ ...s, google_pay_enabled: v }))} />
        </div>
      </div>

      {/* Copy-paste setup */}
      <div className="neo-card p-6 space-y-4">
        <h3 className="font-semibold flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Подключение (copy-paste)</h3>
        <ol className="space-y-4 text-sm list-decimal list-inside text-foreground/90">
          <li>
            Вставьте <b>publishable key</b> выше и сохраните.
          </li>
          <li>
            Секретный ключ задаётся один раз в терминале (не хранится в БД):
            <div className="mt-2">
              <CopyRow label="Команда" value={`supabase secrets set STRIPE_SECRET_KEY=sk_live_ВАШ_КЛЮЧ --project-ref ${projectRef}`} />
            </div>
          </li>
          <li>
            В Stripe Dashboard → Webhooks добавьте endpoint:
            <div className="mt-2">
              <CopyRow label="Webhook URL" value={webhookUrl} />
            </div>
            <div className="mt-2">
              <CopyRow label="Секрет вебхука" value={`supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_ВАШ_СЕКРЕТ --project-ref ${projectRef}`} />
            </div>
          </li>
          <li>
            Для <b> Pay</b>: Stripe Dashboard → Settings → Payment methods → Apple Pay → добавьте ваш домен
            (Stripe выдаст файл верификации, разместите его по адресу <code className="text-xs">/.well-known/apple-developer-merchantid-domain-association</code>).
          </li>
          <li>Включите главный тумблер «Платежи включены» и сохраните.</li>
        </ol>
      </div>

      {/* Test the processing pipeline */}
      <div className="neo-card p-6 space-y-4">
        <h3 className="font-semibold flex items-center gap-2"><FlaskConical className="w-4 h-4" /> Проверка процессинга (тестовый режим)</h3>
        <p className="text-sm text-muted-foreground">
          Использует те же функции, что и боевые платежи, но с тестовыми ключами (<code className="text-xs">pk_test_ / sk_test_</code>) деньги не списываются.
          Установите режим «Тестовый», вставьте тестовые ключи Stripe и нажмите кнопку.
        </p>

        <div className="grid sm:grid-cols-3 gap-3 text-xs">
          <div className="bg-neo neo-inset-2 rounded-xl p-3">
            <div className="font-medium mb-1">Успешная оплата</div>
            <code>4242 4242 4242 4242</code>
          </div>
          <div className="bg-neo neo-inset-2 rounded-xl p-3">
            <div className="font-medium mb-1">Отклонённая карта</div>
            <code>4000 0000 0000 0002</code>
          </div>
          <div className="bg-neo neo-inset-2 rounded-xl p-3">
            <div className="font-medium mb-1">3-D Secure</div>
            <code>4000 0027 6000 3184</code>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Любая будущая дата, любой CVC. Google Pay / Apple Pay в тестовом режиме тоже используют тестовые карты Stripe.</p>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={runTestPayment} disabled={testing} variant="outline" className="rounded-xl">
            <FlaskConical className="w-4 h-4 mr-2" />
            {testing ? "Создаём тестовый платёж…" : "Создать тестовый платёж (10.00)"}
          </Button>
          {settings.payment_mode === "live" && (
            <Badge variant="destructive" className="text-xs">Внимание: выбран боевой режим</Badge>
          )}
        </div>

        {testResult && (
          <div className={`flex items-start gap-2 p-3 rounded-xl text-sm ${testResult.ok ? "bg-neo neo-inset-2" : "bg-destructive/10"}`}>
            {testResult.ok
              ? <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
              : <XCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />}
            <div className="min-w-0">
              <p>{testResult.message}</p>
              {testResult.url && (
                <a href={testResult.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary font-medium mt-1">
                  Открыть страницу оплаты <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      <Button onClick={save} disabled={saving} className="rounded-xl px-8">
        {saving ? "Сохранение…" : "Сохранить настройки"}
      </Button>
    </div>
  );
}
