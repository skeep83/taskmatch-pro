import { useEnhancedI18n } from "@/i18n/enhanced";
import { Wrench, Clock, Star, MessageSquare, CheckCircle2 } from "lucide-react";

/**
 * Product mockup for the landing hero: a stylized job card with
 * pro responses and a chat bubble. Pure JSX/CSS — always matches the
 * design system and current language, no stock imagery.
 */
export const HeroShowcase = () => {
  const { t } = useEnhancedI18n();

  return (
    <div className="relative w-full max-w-[560px] mx-auto select-none" aria-hidden="true">
      {/* Job card */}
      <div className="neo-card neo-aura p-6 lg:p-8 animate-float-slow">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-center gap-4">
            <div className="neo-icon-well w-14 h-14 shrink-0">
              <Wrench size={24} className="text-primary" />
            </div>
            <div>
              <div className="font-semibold text-lg leading-snug">{t("hero.mock.job_title")}</div>
              <div className="text-sm text-muted-foreground">{t("hero.mock.category")}</div>
            </div>
          </div>
          <span className="neo-chip px-3 py-1.5 text-xs font-medium text-primary flex items-center gap-1.5 shrink-0">
            <Clock size={13} />
            {t("hero.mock.urgency")}
          </span>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div className="neo-inset-2 bg-neo rounded-xl px-4 py-2.5">
            <div className="text-xs text-muted-foreground">{t("hero.mock.budget")}</div>
            <div className="font-bold text-foreground">400–600 MDL</div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            {t("hero.mock.status")}
          </div>
        </div>

        {/* Responses */}
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          {t("hero.mock.responses")} · 2
        </div>
        <div className="space-y-3">
          <div className="neo-2 bg-neo rounded-xl p-3.5 flex items-center gap-3">
            <div className="neo-icon-well w-10 h-10 text-sm font-bold text-primary shrink-0">АВ</div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{t("hero.mock.pro1")}</div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Star size={11} className="text-amber-500 fill-amber-500" /> 4.9 · {t("hero.mock.pro1_eta")}
              </div>
            </div>
            <div className="font-bold text-sm shrink-0">450 MDL</div>
            <button type="button" tabIndex={-1} className="neo-btn px-3 py-1.5 text-xs shrink-0">{t("hero.mock.select")}</button>
          </div>
          <div className="neo-2 bg-neo rounded-xl p-3.5 flex items-center gap-3 opacity-80">
            <div className="neo-icon-well w-10 h-10 text-sm font-bold text-accent shrink-0">ИМ</div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{t("hero.mock.pro2")}</div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Star size={11} className="text-amber-500 fill-amber-500" /> 4.7 · {t("hero.mock.pro2_eta")}
              </div>
            </div>
            <div className="font-bold text-sm shrink-0">520 MDL</div>
          </div>
        </div>
      </div>

      {/* Floating chat bubble */}
      <div className="neo-card absolute -bottom-8 -left-4 lg:-left-10 max-w-[260px] p-4 animate-float-slow" style={{ animationDelay: "600ms" }}>
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare size={15} className="text-primary" />
          <span className="text-xs font-semibold text-primary">{t("hero.mock.pro1")}</span>
        </div>
        <p className="text-xs text-foreground/80 leading-relaxed">{t("hero.mock.chat_msg")}</p>
      </div>

      {/* Floating verified badge */}
      <div className="neo-card absolute -top-6 -right-2 lg:-right-8 p-3.5 flex items-center gap-2 animate-float-slow" style={{ animationDelay: "300ms" }}>
        <CheckCircle2 size={18} className="text-success" />
        <span className="text-xs font-semibold">KYC ✓</span>
      </div>
    </div>
  );
};
