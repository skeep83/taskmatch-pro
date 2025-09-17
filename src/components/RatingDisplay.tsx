import { useState } from "react";
import { Star, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RatingForm } from "./RatingForm";
import { useEnhancedI18n } from "@/i18n/enhanced";
import { formatDistanceToNow } from "date-fns";
import { ru, ro } from "date-fns/locale";

interface Rating {
  id: string;
  score: number;
  comment: string | null;
  created_at: string;
  updated_at?: string;
  from_user_id: string;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface RatingDisplayProps {
  rating: Rating;
  canEdit: boolean;
  onRatingUpdated?: () => void;
}

export const RatingDisplay = ({ rating, canEdit, onRatingUpdated }: RatingDisplayProps) => {
  const { t, language } = useEnhancedI18n();
  const [isEditing, setIsEditing] = useState(false);

  const locale = language === 'ro' ? ro : ru;
  const isUpdated = rating.updated_at && rating.updated_at !== rating.created_at;

  const userName = rating.profiles?.full_name || 
    (rating.profiles?.first_name && rating.profiles?.last_name ? 
      `${rating.profiles.first_name} ${rating.profiles.last_name}` : 
      t('common.anonymous'));

  const handleEditComplete = () => {
    setIsEditing(false);
    onRatingUpdated?.();
  };

  if (isEditing) {
    return (
      <div className="space-y-4">
        <RatingForm
          jobId="" // Not needed for editing
          toUserId="" // Not needed for editing
          fromUserId={rating.from_user_id}
          existingRating={{
            id: rating.id,
            score: rating.score,
            comment: rating.comment
          }}
          onRatingSubmitted={handleEditComplete}
        />
        <Button
          variant="outline"
          onClick={() => setIsEditing(false)}
          className="w-full"
        >
          {t('common.cancel')}
        </Button>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-3">
          {/* User info and stars */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {rating.profiles?.avatar_url && (
                <img
                  src={rating.profiles.avatar_url}
                  alt={userName}
                  className="w-8 h-8 rounded-full"
                />
              )}
              <span className="font-medium">{userName}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${
                      star <= rating.score
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    }`}
                  />
                ))}
              </div>
              {canEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="p-1 h-auto"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Comment */}
          {rating.comment && (
            <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
              "{rating.comment}"
            </p>
          )}

          {/* Timestamp */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {isUpdated ? t('rating.updated') : t('rating.created')}{' '}
              {formatDistanceToNow(new Date(isUpdated ? rating.updated_at! : rating.created_at), {
                addSuffix: true,
                locale
              })}
            </span>
            {isUpdated && (
              <span className="text-orange-600 font-medium">
                {t('rating.edited')}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};