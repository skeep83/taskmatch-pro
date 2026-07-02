import { SUPABASE_PUBLISHABLE_KEY, supabase } from '@/integrations/supabase/client';

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

const JOB_APPLICATION_CREATE_URL = `${window.location.origin}/marketplace-api/functions/job-application-create`;

const tryParseJson = (text: string) => {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
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

  const response = await fetch(JOB_APPLICATION_CREATE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      jobId,
      priceCents,
      etaSlot: cleanText(etaSlot),
      note: cleanText(note),
      warrantyDays: typeof warrantyDays === 'number' ? warrantyDays : 0,
    }),
  });

  const text = await response.text();
  const data = tryParseJson(text);

  if (!response.ok) {
    const message =
      data?.error ||
      data?.message ||
      text ||
      `Function job-application-create failed with ${response.status}`;

    return { data: null, error: { message } };
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