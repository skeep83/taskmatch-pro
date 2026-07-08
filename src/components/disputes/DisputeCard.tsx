import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEnhancedI18n } from "@/i18n/enhanced";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ReviewPhotosInput } from "@/components/reviews/ReviewPhotosInput";
import { Scale, AlertTriangle, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ru as ruLocale, ro as roLocale } from "date-fns/locale";

interface EvidenceEntry {
  user_id: string;
  text: string;
  files: string[];
  at: string;
}

interface DisputeRow {
  id: string;
  status: string;
  resolution: string | null;
  refund_cents: number | null;
  evidence: EvidenceEntry[] | null;
  claimant: string;
  created_at: string;
}

interface DisputeCardProps {
  jobId: string;
  clientId: string;
  proId: string | null;
  jobStatus: string;
  currentUserId: string;
  onChanged?: () => void;
}

/**
 * Dispute block on the job page. A participant can open a dispute while
 * funds are held; both sides then attach evidence (text + photos) until
 * the admin team resolves it.
 */
export const DisputeCard = ({ jobId, clientId, proId, jobStatus, currentUserId, onChanged }: DisputeCardProps) => {
  const { t, language } = useEnhancedI18n();
  const { toast } = useToast();
  const [dispute, setDispute] = useState<DisputeRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [text, setText] = useState("");
  const [files, setFiles] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [escrowHeld, setEscrowHeld] = useState(false);

  const dateLocale = language === "ro" ? roLocale : ruLocale;
  const isParticipant = currentUserId === clientId || currentUserId === proId;

  const load = useCallback(async () => {
    const { data: esc } = await supabase
      .from("escrows")
      .select("status")
      .eq("job_id", jobId)
      .maybeSingle();
    setEscrowHeld(esc?.status === "held");
    const { data } = await supabase
      .from("dispute_cases")
      .select("id, status, resolution, refund_cents, evidence, claimant, created_at")
      .eq("job_id", jobId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setDispute((data as unknown as DisputeRow) || null);
    setLoading(false);
  }, [jobId]);

  useEffect(() => { void load(); }, [load]);

  const openDispute = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("open_dispute", { _job_id: jobId, _reason: text.trim() });
      if (error) throw error;
      const res = data as { success?: boolean; error?: string };
      if (!res?.success) throw new Error(res?.error || "failed");
      toast({ title: t("dispute.opened_title"), description: t("dispute.opened_desc") });
      setText("");
      setShowForm(false);
      await load();
      onChanged?.();
    } catch (e) {
      toast({ title: t("notifications.error"), description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const addEvidence = async () => {
    if (!dispute || (!text.trim() && !files.length)) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("add_dispute_evidence", {
        _dispute_id: dispute.id,
        _text: text.trim(),
        _files: files,
      });
      if (error) throw error;
      const res = data as { success?: boolean; error?: string };
      if (!res?.success) throw new Error(res?.error || "failed");
      setText("");
      setFiles([]);
      toast({ title: t("dispute.evidence_added") });
      await load();
    } catch (e) {
      toast({ title: t("notifications.error"), description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  if (loading || !isParticipant) return null;

  // No dispute: offer to open one only while funds are held
  if (!dispute || dispute.status === "resolved" && !escrowHeld && jobStatus !== "disputed") {
    if (dispute?.status === "resolved") {
      return (
        <div className="neo-card p-5">
          <div className="flex items-start gap-3">
            <div className="neo-icon-well w-10 h-10 shrink-0"><Scale className="w-5 h-5 text-primary" /></div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold">{t("dispute.resolved_title")}</h3>
              {dispute.resolution && <p className="text-sm text-muted-foreground mt-1">{dispute.resolution}</p>}
            </div>
          </div>
        </div>
      );
    }
    if (!escrowHeld || jobStatus === "disputed") return null;
    return (
      <div className="neo-card p-5">
        <div className="flex items-start gap-3">
          <div className="neo-icon-well w-10 h-10 shrink-0"><Scale className="w-5 h-5 text-muted-foreground" /></div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold">{t("dispute.title")}</h3>
            <p className="text-xs text-muted-foreground mt-1">{t("dispute.hint")}</p>
            {showForm ? (
              <div className="mt-3">
                <Textarea
                  rows={3}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={t("dispute.reason_placeholder")}
                  className="text-sm mb-2"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button size="sm" variant="destructive" className="rounded-lg" onClick={() => void openDispute()} disabled={busy || !text.trim()}>
                    {busy && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
                    {t("dispute.open_confirm")}
                  </Button>
                  <Button size="sm" variant="ghost" className="rounded-lg" onClick={() => setShowForm(false)}>
                    {t("common.cancel")}
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="mt-2 text-xs font-medium text-destructive hover:underline"
              >
                {t("dispute.open_btn")}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Active or resolved dispute view
  const evidence = Array.isArray(dispute.evidence) ? dispute.evidence : [];
  const active = dispute.status !== "resolved";

  return (
    <div className="neo-card p-5">
      <div className="flex items-start gap-3">
        <div className="neo-icon-well w-10 h-10 shrink-0">
          {active ? <AlertTriangle className="w-5 h-5 text-amber-600" /> : <Scale className="w-5 h-5 text-primary" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-semibold">{t("dispute.title")}</h3>
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${active ? "bg-amber-500/15 text-amber-700" : "bg-success/10 text-success"}`}>
              {active ? t("dispute.status_open") : t("dispute.status_resolved")}
            </span>
          </div>
          {active && <p className="text-xs text-muted-foreground mt-1">{t("dispute.active_hint")}</p>}
          {!active && dispute.resolution && <p className="text-sm text-muted-foreground mt-1">{dispute.resolution}</p>}

          {/* Evidence timeline */}
          {evidence.length > 0 && (
            <div className="mt-3 space-y-2.5">
              {evidence.map((ev, i) => {
                const mine = ev.user_id === currentUserId;
                return (
                  <div key={i} className={`rounded-xl px-3.5 py-2.5 text-sm ${mine ? "bg-primary/[0.07]" : "bg-neo neo-inset-2"}`}>
                    <div className="flex items-baseline justify-between gap-3 mb-0.5">
                      <span className="text-[11px] font-semibold text-muted-foreground">
                        {mine ? t("dispute.you") : ev.user_id === clientId ? t("dispute.client") : t("dispute.pro")}
                      </span>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(ev.at), { addSuffix: true, locale: dateLocale })}
                      </span>
                    </div>
                    {ev.text && <p className="leading-relaxed text-foreground/90">{ev.text}</p>}
                    {Array.isArray(ev.files) && ev.files.length > 0 && (
                      <div className="flex gap-2 mt-2">
                        {ev.files.map((url) => (
                          <a key={url} href={url} target="_blank" rel="noreferrer" className="w-14 h-14 rounded-lg overflow-hidden neo-2 shrink-0">
                            <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Add evidence */}
          {active && (
            <div className="mt-3">
              <Textarea
                rows={2}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t("dispute.evidence_placeholder")}
                className="text-sm mb-2"
              />
              <ReviewPhotosInput
                userId={currentUserId}
                jobId={jobId}
                photos={files}
                onChange={setFiles}
                bucket="evidence"
              />
              <Button
                size="sm"
                className="rounded-lg mt-2"
                onClick={() => void addEvidence()}
                disabled={busy || (!text.trim() && !files.length)}
              >
                {busy && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
                {t("dispute.evidence_send")}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
