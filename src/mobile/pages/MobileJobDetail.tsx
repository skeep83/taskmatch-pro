import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Clock, DollarSign, User, Star, Camera, MessageCircle, Phone, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { MobileCard } from '../components/ui/MobileCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useEnhancedI18n } from '@/i18n/enhanced';

interface JobDetail {
  id: string;
  title: string;
  description: string;
  budget_min_cents?: number;
  budget_max_cents?: number;
  location_address?: string;
  created_at: string;
  urgency: string;
  status: string;
  client_id?: string;
  categories?: { label_ru: string; label_ro: string };
  profiles?: {
    full_name?: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
    phone?: string;
  };
  job_photos?: Array<{ file_url: string }>;
}

export default function MobileJobDetail() {
  console.log("MobileJobDetail component loading...", { React });
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useEnhancedI18n();
  
  const [job, setJob] = useState<JobDetail | null>(null);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(false);

  useEffect(() => {
    if (id) {
      fetchJobDetail(id);
    }
  }, [id]);

  const openPhotoModal = (index: number) => {
    setCurrentPhotoIndex(index);
    setPhotoModalOpen(true);
  };

  const closePhotoModal = () => {
    setPhotoModalOpen(false);
    setCurrentPhotoIndex(0);
  };

  const nextPhoto = () => {
    if (job && currentPhotoIndex < job.job_photos.length - 1) {
      setCurrentPhotoIndex(currentPhotoIndex + 1);
    }
  };

  const prevPhoto = () => {
    if (currentPhotoIndex > 0) {
      setCurrentPhotoIndex(currentPhotoIndex - 1);
    }
  };

  const fetchJobDetail = async (jobId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          id,
          title,
          description,
          budget_min_cents,
          budget_max_cents,
          location_address,
          created_at,
          urgency,
          status,
          client_id,
          categories(label_ru, label_ro),
          profiles!jobs_client_id_fkey(
            full_name,
            first_name,
            last_name,
            avatar_url,
            phone
          )
        `)
        .eq('id', jobId)
        .single();

      if (error) {
        console.error('Error fetching job:', error);
        toast({ 
          title: "Ошибка", 
          description: "Не удалось загрузить детали заказа", 
          variant: "destructive" 
        });
        navigate(-1);
        return;
      }

      // Fetch job photos separately
      const { data: photos } = await supabase
        .from('job_photos')
        .select('file_url')
        .eq('job_id', jobId)
        .order('created_at', { ascending: true });

      // Add photos to job data
      const jobWithPhotos = {
        ...data,
        job_photos: photos || []
      };

      setJob(jobWithPhotos);
    } catch (error) {
      console.error('Error:', error);
      toast({ 
        title: "Ошибка", 
        description: "Произошла ошибка при загрузке", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async () => {
    setResponding(true);
    try {
      // Navigate to response form
      navigate(`/job/${id}/respond`);
    } catch (error) {
      console.error('Error:', error);
      toast({ 
        title: "Ошибка", 
        description: "Не удалось отправить отклик", 
        variant: "destructive" 
      });
    } finally {
      setResponding(false);
    }
  };

  const urgencyColors = {
    normal: 'bg-green-500/10 text-green-700 border-green-500/20',
    urgent: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
    same_day: 'bg-red-500/10 text-red-700 border-red-500/20'
  };

  const urgencyLabels = {
    normal: 'Обычно',
    urgent: 'Срочно',
    same_day: 'В тот же день'
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#E5E7EB] flex items-center justify-center">
        <div className="text-[#374151]">Загрузка...</div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-[#E5E7EB] flex items-center justify-center">
        <div className="text-[#374151]">Заказ не найден</div>
      </div>
    );
  }

  return (
    <div>
      {/* Photo Modal */}
      {photoModalOpen && job && job.job_photos.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
          <div className="relative w-full h-full flex items-center justify-center p-4">
            {/* Close Button */}
            <button
              onClick={closePhotoModal}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black bg-opacity-50 text-white hover:bg-opacity-70 transition-all"
            >
              <X size={24} />
            </button>

            {/* Photo Counter */}
            <div className="absolute top-4 left-4 z-10 px-3 py-1 rounded-full bg-black bg-opacity-50 text-white text-sm">
              {currentPhotoIndex + 1} из {job.job_photos.length}
            </div>

            {/* Previous Button */}
            {currentPhotoIndex > 0 && (
              <button
                onClick={prevPhoto}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 p-2 rounded-full bg-black bg-opacity-50 text-white hover:bg-opacity-70 transition-all"
              >
                <ChevronLeft size={24} />
              </button>
            )}

            {/* Next Button */}
            {currentPhotoIndex < job.job_photos.length - 1 && (
              <button
                onClick={nextPhoto}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 p-2 rounded-full bg-black bg-opacity-50 text-white hover:bg-opacity-70 transition-all"
              >
                <ChevronRight size={24} />
              </button>
            )}

            {/* Photo */}
            <motion.img
              key={currentPhotoIndex}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              src={supabase.storage.from('evidence').getPublicUrl(job.job_photos[currentPhotoIndex].file_url).data.publicUrl}
              alt={`Фото ${currentPhotoIndex + 1}`}
              className="max-w-full max-h-full object-contain rounded-lg"
              onError={(e) => {
                console.log("Failed to load image:", job.job_photos[currentPhotoIndex].file_url);
                e.currentTarget.src = '/placeholder.svg';
              }}
            />

            {/* Swipe gestures for mobile */}
            <div
              className="absolute inset-0 flex"
              onTouchStart={(e) => {
                const touchStartX = e.touches[0].clientX;
                const handleTouchEnd = (e: TouchEvent) => {
                  const touchEndX = e.changedTouches[0].clientX;
                  const diffX = touchStartX - touchEndX;
                  
                  if (Math.abs(diffX) > 50) {
                    if (diffX > 0 && currentPhotoIndex < job.job_photos.length - 1) {
                      nextPhoto();
                    } else if (diffX < 0 && currentPhotoIndex > 0) {
                      prevPhoto();
                    }
                  }
                  
                  document.removeEventListener('touchend', handleTouchEnd);
                };
                
                document.addEventListener('touchend', handleTouchEnd);
              }}
            />
          </div>
        </div>
      )}

      {/* Main Content */}
    <div className="min-h-screen bg-[#E5E7EB]">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#E5E7EB] px-4 py-3 border-b border-[#D1D5DB]">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] active:shadow-[inset_2px_2px_4px_#D1D5DB,inset_-2px_-2px_4px_#F9FAFB]"
          >
            <ArrowLeft className="w-5 h-5 text-[#374151]" />
          </button>
          <h1 className="text-lg font-semibold text-[#374151]">Детали заказа</h1>
          <div className="w-9 h-9" />
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Title and Category */}
        <MobileCard>
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <h2 className="text-xl font-bold text-[#374151] flex-1">{job.title}</h2>
              {job.categories && (
                <Badge variant="secondary" className="ml-2">
                  {job.categories.label_ru}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Badge 
                variant="outline" 
                className={urgencyColors[job.urgency as keyof typeof urgencyColors] || urgencyColors.normal}
              >
                {urgencyLabels[job.urgency as keyof typeof urgencyLabels] || 'Обычно'}
              </Badge>
              
              <Badge variant={job.status === 'new' ? 'default' : 'secondary'}>
                {job.status === 'new' ? 'Новый' : 
                 job.status === 'accepted' ? 'Принят' : 
                 job.status === 'in_progress' ? 'В работе' : 
                 job.status === 'done' ? 'Выполнен' : job.status}
              </Badge>
            </div>
          </div>
        </MobileCard>

        {/* Description */}
        <MobileCard>
          <div className="space-y-3">
            <h3 className="font-semibold text-[#374151]">Описание</h3>
            <p className="text-[#6B7280] leading-relaxed">{job.description}</p>
          </div>
        </MobileCard>

        {/* Details */}
        <MobileCard>
          <div className="space-y-4">
            <h3 className="font-semibold text-[#374151]">Детали</h3>
            
            {/* Budget */}
            <div className="flex items-center text-[#374151]">
              <DollarSign size={18} className="mr-3 text-green-500" />
              <div>
                <div className="font-medium">Бюджет</div>
                <div className="text-sm text-[#6B7280]">
                  {job.budget_min_cents && job.budget_max_cents 
                    ? `${Math.round(job.budget_min_cents / 100)}-${Math.round(job.budget_max_cents / 100)} MDL`
                    : job.budget_min_cents 
                      ? `от ${Math.round(job.budget_min_cents / 100)} MDL`
                      : 'Договорная'}
                </div>
              </div>
            </div>

            {/* Location */}
            {job.location_address && (
              <div className="flex items-center text-[#374151]">
                <MapPin size={18} className="mr-3 text-blue-500" />
                <div>
                  <div className="font-medium">Адрес</div>
                  <div className="text-sm text-[#6B7280]">{job.location_address}</div>
                </div>
              </div>
            )}

            {/* Date */}
            <div className="flex items-center text-[#374151]">
              <Clock size={18} className="mr-3 text-orange-500" />
              <div>
                <div className="font-medium">Дата публикации</div>
                <div className="text-sm text-[#6B7280]">
                  {new Date(job.created_at).toLocaleDateString('ru', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </div>
          </div>
        </MobileCard>

        {/* Photos */}
        {job.job_photos && job.job_photos.length > 0 && (
          <MobileCard>
            <div className="space-y-3">
              <h3 className="font-semibold text-[#374151] flex items-center">
                <Camera size={18} className="mr-2" />
                Фотографии ({job.job_photos.length})
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {job.job_photos.map((photo, index) => (
                  <div 
                    key={index} 
                    className="aspect-square rounded-lg overflow-hidden bg-[#D1D5DB] cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => openPhotoModal(index)}
                  >
                    <img
                      src={supabase.storage.from('evidence').getPublicUrl(photo.file_url).data.publicUrl}
                      alt={`Фото ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.log("Failed to load image:", photo.file_url);
                        e.currentTarget.src = '/placeholder.svg';
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </MobileCard>
        )}

        {/* Client Info */}
        {job.profiles && (
          <MobileCard>
            <div className="space-y-3">
              <h3 className="font-semibold text-[#374151]">Заказчик</h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Avatar className="h-12 w-12 mr-3">
                    <AvatarImage src={job.profiles.avatar_url} />
                    <AvatarFallback>
                      {job.profiles.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) ||
                       job.profiles.first_name?.[0] || 'К'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium text-[#374151]">
                      {job.profiles.full_name || 
                       (job.profiles.first_name && job.profiles.last_name 
                         ? `${job.profiles.first_name} ${job.profiles.last_name.charAt(0)}.`
                         : job.profiles.first_name || 'Клиент')}
                    </div>
                    <div className="text-sm text-[#6B7280]">Заказчик</div>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <button 
                    onClick={() => navigate(`/messages?job_id=${job.id}&client_id=${job.client_id || ''}`)}
                    className="p-2 rounded-lg bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] active:shadow-[inset_2px_2px_4px_#D1D5DB,inset_-2px_-2px_4px_#F9FAFB] hover:shadow-[6px_6px_12px_#D1D5DB,-6px_-6px_12px_#F9FAFB] transition-all duration-200"
                    title="Написать сообщение"
                  >
                    <MessageCircle size={18} className="text-[#374151]" />
                  </button>
                  {job.profiles?.phone && (
                    <button 
                      onClick={() => window.open(`tel:${job.profiles.phone}`, '_self')}
                      className="p-2 rounded-lg bg-[#E5E7EB] shadow-[4px_4px_8px_#D1D5DB,-4px_-4px_8px_#F9FAFB] active:shadow-[inset_2px_2px_4px_#D1D5DB,inset_-2px_-2px_4px_#F9FAFB] hover:shadow-[6px_6px_12px_#D1D5DB,-6px_-6px_12px_#F9FAFB] transition-all duration-200"
                      title="Позвонить"
                    >
                      <Phone size={18} className="text-[#374151]" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </MobileCard>
        )}

        {/* Response Button */}
        {job.status === 'new' && (
          <div className="pt-4 pb-20">
            <Button
              onClick={handleResponse}
              disabled={responding}
              className="w-full h-12 bg-primary text-white rounded-xl font-semibold shadow-[8px_8px_16px_#D1D5DB,-8px_-8px_16px_#F9FAFB] disabled:opacity-50"
            >
              {responding ? 'Отправка...' : 'Откликнуться на заказ'}
            </Button>
          </div>
        )}
      </div>
    </div>
    </div>
  );
}