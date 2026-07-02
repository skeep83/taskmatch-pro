import { supabase } from '@/integrations/supabase/client';

export const getErrorMessage = (error: unknown, fallback = 'неизвестная ошибка') => {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return fallback;
};

export type DeleteClientJobResult = 'hard' | 'soft';

const softDeleteClientJob = async (jobId: string) => {
  const { error } = await supabase
    .from('jobs')
    .update({
      status: 'canceled',
      status_new: 'Cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId);

  if (error) throw error;

  await supabase.rpc('transition_job_status', {
    _job_id: jobId,
    _new_status: 'Cancelled',
    _reason: 'client_deleted_job_soft_fallback',
  });

  return 'soft' as const;
};

export async function deleteClientJob(jobId: string): Promise<DeleteClientJobResult> {
  const { error } = await supabase.rpc('delete_client_job', { _job_id: jobId });

  if (!error) {
    return 'hard';
  }

  const message = getErrorMessage(error, '').toLowerCase();
  const shouldFallback =
    message.includes('function public.delete_client_job') ||
    message.includes('delete_client_job') ||
    message.includes('does not exist') ||
    message.includes('not found') ||
    message.includes('permission denied') ||
    message.includes('row-level security') ||
    message.includes('violates foreign key constraint');

  if (!shouldFallback) {
    throw error;
  }

  return softDeleteClientJob(jobId);
}
