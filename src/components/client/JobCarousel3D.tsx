import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCurrency } from '@/hooks/useCurrency';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { NeumorphicIcon } from '@/components/ui/neumorphic-icon';
import { 
  Clock, 
  CheckCircle, 
  User, 
  ExternalLink, 
  ChevronLeft, 
  ChevronRight, 
  Star, 
  Eye,
  Edit,
  Trash2,
  AlertCircle,
  PlayCircle,
  XCircle,
  MapPin,
  Calendar,
  DollarSign,
  Zap
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { OptimizedImage } from '@/components/media/OptimizedImage';
import { Link } from 'react-router-dom';

interface Job {
  id: string;
  title: string;
  status: 'new' | 'accepted' | 'in_progress' | 'done' | 'cancelled';
  budget_min_cents?: number;
  budget_max_cents?: number;
  created_at: string;
  scheduled_at?: string;
  urgency: string;
  pro_id?: string;
  categories?: {
    label_ru: string;
  };
  description?: string;
  location_address?: string;
}

interface JobCarousel3DProps {
  jobs: Job[];
  onEdit?: (jobId: string) => void;
  onDelete?: (jobId: string) => void;
}

export function JobCarousel3D({ jobs, onEdit, onDelete }: JobCarousel3DProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { formatPrice } = useCurrency();

  const nextCard = () => {
    setCurrentIndex((prev) => (prev + 1) % jobs.length);
  };

  const prevCard = () => {
    setCurrentIndex((prev) => (prev - 1 + jobs.length) % jobs.length);
  };

  const goToCard = (index: number) => {
    setCurrentIndex(index);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new': return <AlertCircle className="h-4 w-4" />;
      case 'accepted': return <CheckCircle className="h-4 w-4" />;
      case 'in_progress': return <PlayCircle className="h-4 w-4" />;
      case 'done': return <CheckCircle className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'new': { label: 'Новый', variant: 'secondary' as const, color: 'bg-blue-100 text-blue-800' },
      'accepted': { label: 'Принят', variant: 'default' as const, color: 'bg-green-100 text-green-800' },
      'in_progress': { label: 'В работе', variant: 'default' as const, color: 'bg-yellow-100 text-yellow-800' },
      'done': { label: 'Выполнен', variant: 'default' as const, color: 'bg-purple-100 text-purple-800' },
      'cancelled': { label: 'Отменен', variant: 'destructive' as const, color: 'bg-red-100 text-red-800' }
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || { label: status, variant: 'default' as const, color: 'bg-gray-100 text-gray-800' };
    
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl font-medium text-sm ${statusInfo.color} shadow-neumorphic-inset`}>
        {getStatusIcon(status)}
        <span>{statusInfo.label}</span>
      </div>
    );
  };

  const getUrgencyBadge = (urgency: string) => {
    const urgencyMap = {
      'normal': { label: 'Обычный', color: 'bg-gray-100 text-gray-700' },
      'urgent': { label: 'Срочно', color: 'bg-orange-100 text-orange-800' },
      'same_day': { label: 'В тот же день', color: 'bg-red-100 text-red-800' }
    };
    
    const urgencyInfo = urgencyMap[urgency as keyof typeof urgencyMap] || { label: urgency, color: 'bg-gray-100 text-gray-700' };
    return (
      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${urgencyInfo.color}`}>
        <Zap className="w-3 h-3" />
        {urgencyInfo.label}
      </div>
    );
  };

  const formatJobPrice = (minCents?: number, maxCents?: number) => {
    if (!minCents && !maxCents) return "Не указан";
    
    if (minCents && maxCents) {
      return `${formatPrice(minCents)} - ${formatPrice(maxCents)}`;
    }
    
    return formatPrice(minCents || maxCents || 0);
  };

  const canEditJob = (job: Job) => {
    return job.status === 'new' && !job.urgency;
  };

  if (jobs.length === 0) {
    return (
      <div className="card-surface p-12 text-center">
        <div className="neumorphic-icon w-16 h-16 mx-auto mb-6 bg-muted">
          <User className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold mb-3 text-foreground">Пока нет заказов</h3>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          Создайте свой первый заказ и найдите надежного специалиста для выполнения задач
        </p>
        <Link to="/job/new">
          <Button className="bg-gradient-primary hover:shadow-glow text-white">
            Создать заказ
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with counter */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-display font-bold text-foreground">Мои заказы</h3>
          <p className="text-muted-foreground">Всего заказов: {jobs.length}</p>
        </div>
        {jobs.length > 1 && (
          <div className="text-sm text-muted-foreground bg-muted px-4 py-2 rounded-xl shadow-neumorphic-inset">
            {currentIndex + 1} / {jobs.length}
          </div>
        )}
      </div>

      {/* 3D Carousel Container */}
      <div className="relative w-full max-w-2xl mx-auto perspective-1000">
        <div className="relative h-[600px]">
          <AnimatePresence mode="wait">
            {jobs.map((job, index) => {
              if (index !== currentIndex) return null;
              
              return (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, x: 100, rotateY: 15, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, rotateY: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -100, rotateY: -15, scale: 0.95 }}
                  transition={{ 
                    duration: 0.5, 
                    ease: [0.4, 0, 0.2, 1],
                    type: "spring",
                    stiffness: 300,
                    damping: 30
                  }}
                  className="absolute inset-0 card-3d"
                >
                  <div className="h-full bg-card rounded-3xl shadow-neumorphic overflow-hidden border border-border/20 transform-gpu">
                    {/* Header with gradient */}
                    <div className="relative h-32 bg-gradient-primary overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/10 to-white/20" />
                      <div className="absolute top-4 left-6 right-6 flex justify-between items-start">
                        <div className="flex gap-2">
                          {getStatusBadge(job.status)}
                          {job.urgency && job.urgency !== 'normal' && getUrgencyBadge(job.urgency)}
                        </div>
                        
                        {canEditJob(job) && (
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onEdit?.(job.id)}
                              className="h-8 w-8 p-0 bg-white/20 hover:bg-white/30 text-white border-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onDelete?.(job.id)}
                              className="h-8 w-8 p-0 bg-white/20 hover:bg-white/30 text-white border-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Category icon positioned to overlap */}
                    <div className="absolute left-1/2 transform -translate-x-1/2 top-20 z-10">
                      <motion.div
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{ duration: 0.2 }}
                      >
                        <NeumorphicIcon 
                          icon={User}
                          size={64}
                          variant="behance"
                          className="bg-background shadow-neumorphic"
                        />
                      </motion.div>
                    </div>

                    {/* Content */}
                    <div className="px-6 pt-16 pb-6 space-y-6">
                      {/* Title and category */}
                      <div className="text-center">
                        <h4 className="font-bold text-xl text-foreground mb-2 line-clamp-2">{job.title}</h4>
                        <p className="text-sm text-muted-foreground uppercase tracking-wide font-medium">
                          {job.categories?.label_ru || 'Общие услуги'}
                        </p>
                      </div>

                      {/* Price */}
                      <div className="text-center py-4 bg-muted/30 rounded-2xl shadow-neumorphic-inset">
                        <div className="text-2xl font-bold text-foreground">
                          {formatJobPrice(job.budget_min_cents, job.budget_max_cents)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Бюджет заказа
                        </div>
                      </div>

                      {/* Job info */}
                      <div className="space-y-4">
                        {job.location_address && (
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <div className="neumorphic-icon bg-muted">
                              <MapPin className="w-4 h-4" />
                            </div>
                            <span className="truncate">{job.location_address}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <div className="neumorphic-icon bg-muted">
                            <Calendar className="w-4 h-4" />
                          </div>
                          <span>
                            {job.scheduled_at 
                              ? new Date(job.scheduled_at).toLocaleDateString('ru-RU')
                              : `Создан ${formatDistanceToNow(new Date(job.created_at), { addSuffix: true, locale: ru })}`
                            }
                          </span>
                        </div>
                      </div>

                      {/* Description */}
                      {job.description && (
                        <div className="bg-muted/20 rounded-xl p-4">
                          <p className="text-sm text-muted-foreground line-clamp-3">
                            {job.description}
                          </p>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex gap-3 pt-4">
                        <Link 
                          to={`/job/${job.id}`}
                          className="flex-1"
                        >
                          <Button 
                            className="w-full bg-gradient-primary hover:shadow-glow text-white"
                            size="lg"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Подробнее
                          </Button>
                        </Link>
                        
                        {job.status === 'in_progress' && (
                          <Link 
                            to={`/messages?job_id=${job.id}`}
                            className="flex-1"
                          >
                            <Button 
                              variant="outline" 
                              className="w-full border-primary/20 hover:bg-primary/5"
                              size="lg"
                            >
                              Чат
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation */}
      {jobs.length > 1 && (
        <div className="flex items-center justify-center gap-8">
          {/* Previous button */}
          <Button
            variant="ghost"
            size="lg"
            onClick={prevCard}
            className="h-14 w-14 rounded-full bg-muted shadow-neumorphic hover:shadow-neumorphic-inset transition-all duration-300"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>

          {/* Dots indicator */}
          <div className="flex gap-2">
            {jobs.map((_, index) => (
              <button
                key={index}
                onClick={() => goToCard(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === currentIndex 
                    ? 'bg-primary shadow-glow scale-125' 
                    : 'bg-muted shadow-neumorphic-inset hover:bg-muted-foreground/20'
                }`}
              />
            ))}
          </div>

          {/* Next button */}
          <Button
            variant="ghost"
            size="lg"
            onClick={nextCard}
            className="h-14 w-14 rounded-full bg-muted shadow-neumorphic hover:shadow-neumorphic-inset transition-all duration-300"
          >
            <ChevronRight className="w-6 h-6" />
          </Button>
        </div>
      )}

      {/* Quick actions */}
      <div className="flex justify-center gap-4">
        <Link to="/job/new">
          <Button className="bg-gradient-primary hover:shadow-glow text-white px-8">
            <DollarSign className="w-4 h-4 mr-2" />
            Новый заказ
          </Button>
        </Link>
        <Link to="/tenders/new">
          <Button variant="outline" className="border-primary/20 hover:bg-primary/5 px-8">
            Создать тендер
          </Button>
        </Link>
      </div>
    </div>
  );
}