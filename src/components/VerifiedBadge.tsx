import { BadgeCheck } from "lucide-react";
import { useEnhancedI18n } from "@/i18n/enhanced";

/** KYC-verified marker shown next to a specialist's name. */
export const VerifiedBadge = ({ className = "" }: { className?: string }) => {
  const { t } = useEnhancedI18n();
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap align-middle ${className}`}
      title={t("verified.tooltip")}
    >
      <BadgeCheck className="w-3.5 h-3.5" />
      {t("verified.label")}
    </span>
  );
};
