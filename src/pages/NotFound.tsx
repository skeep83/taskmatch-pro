import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { useEnhancedI18n } from "@/i18n/enhanced";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Home, Search, MessageSquareWarning } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const { t } = useEnhancedI18n();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <>
      <Seo title={`${t('app.name')} — Страница не найдена`} description="Страница не найдена. Вернитесь на главную или перейдите в каталог." canonical="/404" />
      <main className="min-h-screen bg-background px-4 py-16 flex items-center justify-center">
        <Card className="w-full max-w-2xl border-slate-200 bg-slate-50/60">
          <CardContent className="p-8 text-center space-y-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-200 text-slate-700">
              <MessageSquareWarning className="h-7 w-7" />
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium uppercase tracking-wide text-slate-500">404</div>
              <h1 className="text-3xl font-semibold">{t('common.page_not_found')}</h1>
              <p className="text-muted-foreground">{t('common.page_not_found_message')}</p>
              <p className="text-sm text-slate-600">
                Возможно, ссылка устарела, страница была перемещена или адрес введён с ошибкой.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white/80 p-4 text-left space-y-2">
              <div className="font-medium text-foreground">Что можно сделать сейчас</div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2"><span>1.</span><span>Вернуться на главную и выбрать нужный сценарий заново.</span></li>
                <li className="flex gap-2"><span>2.</span><span>Открыть каталог, если вы ищете исполнителя или категорию услуг.</span></li>
                <li className="flex gap-2"><span>3.</span><span>Вернуться назад, если вы только что перешли по неверной ссылке внутри продукта.</span></li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild className="gap-2">
                <Link to="/">
                  <Home className="h-4 w-4" />
                  На главную
                </Link>
              </Button>
              <Button asChild variant="outline" className="gap-2">
                <Link to="/catalog">
                  <Search className="h-4 w-4" />
                  Перейти в каталог
                </Link>
              </Button>
              <Button variant="ghost" onClick={() => window.history.back()} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Назад
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
};

export default NotFound;
