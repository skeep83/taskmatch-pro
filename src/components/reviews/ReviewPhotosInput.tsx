import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEnhancedI18n } from "@/i18n/enhanced";
import { useToast } from "@/hooks/use-toast";
import { Camera, X, Loader2 } from "lucide-react";

const MAX_PHOTOS = 4;
const MAX_SIZE_MB = 8;

interface ReviewPhotosInputProps {
  userId: string;
  jobId: string;
  photos: string[];
  onChange: (photos: string[]) => void;
}

/**
 * Up to 4 photos of the completed work, attached to a review.
 * Uploads to the public `review-photos` bucket under the reviewer's folder.
 */
export const ReviewPhotosInput = ({ userId, jobId, photos, onChange }: ReviewPhotosInputProps) => {
  const { t } = useEnhancedI18n();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const slots = MAX_PHOTOS - photos.length;
    const selected = Array.from(files).slice(0, slots);
    setUploading(true);
    const uploaded: string[] = [];
    for (const file of selected) {
      if (!file.type.startsWith("image/")) continue;
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        toast({ title: t("reviews.photo_too_large"), variant: "destructive" });
        continue;
      }
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${userId}/${jobId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("review-photos").upload(path, file, {
        cacheControl: "31536000",
        upsert: false,
      });
      if (error) {
        toast({ title: t("reviews.photo_upload_error"), variant: "destructive" });
        continue;
      }
      const { data } = supabase.storage.from("review-photos").getPublicUrl(path);
      if (data?.publicUrl) uploaded.push(data.publicUrl);
    }
    if (uploaded.length) onChange([...photos, ...uploaded]);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const removePhoto = (url: string) => {
    onChange(photos.filter((p) => p !== url));
    // best-effort cleanup in storage
    const idx = url.indexOf("/review-photos/");
    if (idx !== -1) {
      const path = decodeURIComponent(url.slice(idx + "/review-photos/".length));
      void supabase.storage.from("review-photos").remove([path]);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs md:text-sm font-medium">{t("reviews.photos_label")}</span>
        <span className="text-xs text-muted-foreground">{photos.length}/{MAX_PHOTOS}</span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {photos.map((url) => (
          <div key={url} className="relative aspect-square rounded-xl overflow-hidden bg-neo neo-inset-2 group">
            <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
            <button
              type="button"
              onClick={() => removePhoto(url)}
              aria-label={t("reviews.remove_photo")}
              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-foreground/60 text-white flex items-center justify-center opacity-80 hover:opacity-100 transition-opacity"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {photos.length < MAX_PHOTOS && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            aria-label={t("reviews.add_photo")}
            className="aspect-square rounded-xl border-2 border-dashed border-foreground/15 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
            <span className="text-[10px] font-medium">{t("reviews.add_photo")}</span>
          </button>
        )}
      </div>
      <p className="text-xs text-muted-foreground mt-2">{t("reviews.photos_hint")}</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
      />
    </div>
  );
};
