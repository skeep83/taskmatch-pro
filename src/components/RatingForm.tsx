import { useState, useEffect } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useEnhancedI18n } from "@/i18n/enhanced";

interface RatingFormProps {
  jobId: string;
  toUserId: string;
  fromUserId: string;
  onRatingSubmitted?: () => void;
  existingRating?: {
    id: string;
    score: number;
    comment: string | null;
  } | null;
}

export const RatingForm = ({ 
  jobId, 
  toUserId, 
  fromUserId, 
  onRatingSubmitted,
  existingRating 
}: RatingFormProps) => {
  const { t } = useEnhancedI18n();
  const { toast } = useToast();
  const [score, setScore] = useState(existingRating?.score || 0);
  const [comment, setComment] = useState(existingRating?.comment || "");
  const [hoveredStar, setHoveredStar] = useState(0);
  const [loading, setLoading] = useState(false);

  const isEditing = !!existingRating;

  const handleSubmit = async () => {
    if (score === 0) {
      toast({
        title: t('rating.error'),
        description: t('rating.select_score'),
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      if (isEditing) {
        // Update existing rating
        const { error } = await supabase
          .from('ratings')
          .update({
            score,
            comment: comment.trim() || null
          })
          .eq('id', existingRating.id);

        if (error) throw error;

        toast({
          title: t('rating.updated'),
          description: t('rating.update_success'),
        });
      } else {
        // Create new rating
        const { error } = await supabase
          .from('ratings')
          .insert({
            job_id: jobId,
            from_user_id: fromUserId,
            to_user_id: toUserId,
            score,
            comment: comment.trim() || null
          });

        if (error) throw error;

        toast({
          title: t('rating.submitted'),
          description: t('rating.submit_success'),
        });
      }

      onRatingSubmitted?.();
    } catch (error: any) {
      console.error('Rating error:', error);
      toast({
        title: t('rating.error'),
        description: error.message || t('rating.submit_error'),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {isEditing ? t('rating.edit_title') : t('rating.give_title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Star Rating */}
        <div className="space-y-2">
          <label className="text-sm font-medium">{t('rating.your_score')}</label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className="p-1 hover:scale-110 transition-transform"
                onMouseEnter={() => setHoveredStar(star)}
                onMouseLeave={() => setHoveredStar(0)}
                onClick={() => setScore(star)}
              >
                <Star
                  className={`w-8 h-8 ${
                    star <= (hoveredStar || score)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-gray-300"
                  }`}
                />
              </button>
            ))}
          </div>
          {score > 0 && (
            <p className="text-sm text-muted-foreground">
              {score === 1 && t('rating.score_1')}
              {score === 2 && t('rating.score_2')}
              {score === 3 && t('rating.score_3')}
              {score === 4 && t('rating.score_4')}
              {score === 5 && t('rating.score_5')}
            </p>
          )}
        </div>

        {/* Comment */}
        <div className="space-y-2">
          <label className="text-sm font-medium">{t('rating.comment_label')}</label>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t('rating.comment_placeholder')}
            rows={3}
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground">
            {comment.length}/500 {t('rating.characters')}
          </p>
        </div>

        {/* Submit Button */}
        <Button 
          onClick={handleSubmit}
          disabled={loading || score === 0}
          className="w-full"
        >
          {loading ? t('common.loading') : (
            isEditing ? t('rating.update_button') : t('rating.submit_button')
          )}
        </Button>

        {isEditing && (
          <p className="text-xs text-muted-foreground text-center">
            {t('rating.edit_info')}
          </p>
        )}
      </CardContent>
    </Card>
  );
};