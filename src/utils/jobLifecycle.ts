export type LifecycleJob = {
  id?: string;
  status?: string | null;
  pro_id?: string | null;
};

export type ClientEditableJobFields = {
  title?: string | null;
  description?: string | null;
  category_id?: string | null;
  location_address?: string | null;
  budget_min_cents?: number | null;
  budget_max_cents?: number | null;
  scheduled_at?: string | null;
  urgency?: string | null;
};

export type MaterialChange = {
  field: string;
  label: string;
  before: unknown;
  after: unknown;
};

export type JobChangeRequestEntry = {
  type: 'client_material_update';
  created_at: string;
  triggered_by?: string | null;
  response_count: number;
  changes: MaterialChange[];
  note: string;
};

const LOCKED_STATUSES = new Set(['accepted', 'in_progress', 'done', 'canceled']);

export const isJobLocked = (job: LifecycleJob | null | undefined, hasPayment = false) => {
  if (!job) return false;
  return Boolean(job.pro_id) || hasPayment || LOCKED_STATUSES.has(job.status ?? '');
};

export const canClientEditJob = ({
  job,
  isOwner,
  hasPayment = false,
}: {
  job: LifecycleJob | null | undefined;
  isOwner: boolean;
  hasPayment?: boolean;
}) => {
  return Boolean(isOwner && job && job.status === 'new' && !isJobLocked(job, hasPayment));
};

export const canClientDeleteJob = canClientEditJob;

export const canClientCancelJob = ({
  job,
  isOwner,
  hasPayment = false,
}: {
  job: LifecycleJob | null | undefined;
  isOwner: boolean;
  hasPayment?: boolean;
}) => {
  if (!isOwner || !job) return false;
  if (job.status === 'canceled' || job.status === 'done') return false;
  return isJobLocked(job, hasPayment);
};

const normalizeText = (value: unknown) => {
  if (typeof value !== 'string') return value ?? null;
  const normalized = value.trim().replace(/\s+/g, ' ');
  return normalized || null;
};

const normalizeNumber = (value: unknown) => {
  if (value === '' || value === undefined || value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeIsoMinute = (value: unknown) => {
  if (typeof value !== 'string' || !value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return normalizeText(value);
  return date.toISOString().slice(0, 16);
};

const compareRuleMap: Array<{
  field: keyof ClientEditableJobFields;
  label: string;
  normalize: (value: unknown) => unknown;
}> = [
  { field: 'title', label: 'Заголовок', normalize: normalizeText },
  { field: 'description', label: 'Описание', normalize: normalizeText },
  { field: 'category_id', label: 'Категория', normalize: normalizeText },
  { field: 'location_address', label: 'Адрес', normalize: normalizeText },
  { field: 'budget_min_cents', label: 'Бюджет от', normalize: normalizeNumber },
  { field: 'budget_max_cents', label: 'Бюджет до', normalize: normalizeNumber },
  { field: 'scheduled_at', label: 'Дата и время', normalize: normalizeIsoMinute },
  { field: 'urgency', label: 'Срочность', normalize: normalizeText },
];

export const getMaterialJobChanges = (
  before: ClientEditableJobFields,
  after: ClientEditableJobFields,
): MaterialChange[] => {
  return compareRuleMap.flatMap(({ field, label, normalize }) => {
    const previous = normalize(before[field]);
    const next = normalize(after[field]);
    if (previous === next) return [];
    return [{ field, label, before: previous, after: next }];
  });
};

export const appendJobChangeRequest = (
  existing: unknown,
  entry: JobChangeRequestEntry,
): JobChangeRequestEntry[] => {
  const current = Array.isArray(existing) ? existing : [];
  return [...current, entry].slice(-20) as JobChangeRequestEntry[];
};

export const buildMaterialUpdateEntry = ({
  triggeredBy,
  responseCount,
  changes,
}: {
  triggeredBy?: string | null;
  responseCount: number;
  changes: MaterialChange[];
}): JobChangeRequestEntry => ({
  type: 'client_material_update',
  created_at: new Date().toISOString(),
  triggered_by: triggeredBy ?? null,
  response_count: responseCount,
  changes,
  note: 'Клиент изменил существенные условия после появления откликов',
});

export const inferMediaKind = (value: string | null | undefined) => {
  if (!value) return 'image' as const;
  const normalized = value.toLowerCase();
  if (/\.(mp4|mov|m4v|webm|ogg|ogv)(\?|$)/.test(normalized)) return 'video' as const;
  return 'image' as const;
};

export const isVideoFile = (file: File) => file.type.startsWith('video/');
