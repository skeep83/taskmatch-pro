import { supabase } from '@/integrations/supabase/client';

export interface SubmitJobResponseInput {
  jobId: string;
  priceCents: number;
  etaSlot?: string | null;
  note?: string | null;
  warrantyDays?: number | null;
}

interface ExtraResponseDetails {
  etaLabel?: string | null;
  etaDate?: string | null;
  estimatedHours?: number | null;
}

const cleanText = (value?: string | null) => {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
};

export async function submitJobResponse({
  jobId,
  priceCents,
  etaSlot,
  note,
  warrantyDays,
}: SubmitJobResponseInput) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return { data: null, error: { message: 'Unauthorized' } };
  }

  const { data, error } = await supabase.functions.invoke('job-application-create', {
    body: {
      jobId,
      priceCents,
      etaSlot: cleanText(etaSlot),
      note: cleanText(note),
      warrantyDays: typeof warrantyDays === 'number' ? warrantyDays : 0,
    },
  });

  if (error) {
    const message =
      (typeof error === 'object' && error !== null && 'message' in error && String((error as { message: unknown }).message)) ||
      'Не удалось отправить предложение';
    return { data: null, error: { message } };
  }

  const payload = data as { error?: string } | null;
  if (payload?.error) {
    return { data: null, error: { message: payload.error } };
  }

  return { data, error: null };
}

export function buildQuickResponseNote(
  note: string,
  { etaLabel, etaDate, estimatedHours }: ExtraResponseDetails = {},
) {
  const baseNote = cleanText(note) ?? '';
  const meta: string[] = [];

  if (etaLabel) {
    meta.push(`Окно выезда: ${etaLabel}`);
  }

  if (etaDate) {
    meta.push(`Дата/срок: ${etaDate}`);
  }

  if (typeof estimatedHours === 'number' && Number.isFinite(estimatedHours) && estimatedHours > 0) {
    meta.push(`Оценка по времени: ${estimatedHours} ч.`);
  }

  if (!meta.length) {
    return baseNote || undefined;
  }

  return [baseNote, meta.join('\n')].filter(Boolean).join('\n\n');
}