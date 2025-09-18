import { useEffect, useState } from "react";
import { Seo } from "@/components/Seo";
import { MediaViewer } from "@/components/media";
import { useEnhancedI18n } from "@/i18n/enhanced";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FloatingCard } from "@/components/ui/floating-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Upload, Plus, Image, Trash2, X, Camera, Film, FileImage, ChevronLeft, ChevronRight, ArrowLeft, Bell } from "lucide-react";
import { toast } from "sonner";

const ProPortfolio = () => {
  const { t } = useEnhancedI18n();
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    (async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: s } = await supabase.auth.getSession();
      const uid = s.session?.user?.id || null;
      if (!uid) { navigate('/auth'); return; }
      setUserId(uid);
      const { data } = await (supabase as any)
        .from('portfolio_items')
        .select(`
          *,
          portfolio_media (
            id,
            file_url,
            file_type,
            display_order
          )
        `)
        .eq('pro_id', uid)
        .order('created_at', { ascending: false });
      setItems(data || []);
    })();
  }, []);

  const refresh = async () => {
    if (!userId) return;
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await (supabase as any)
      .from('portfolio_items')
      .select(`
        *,
        portfolio_media (
          id,
          file_url,
          file_type,
          display_order
        )
      `)
      .eq('pro_id', userId)
      .order('created_at', { ascending: false });
    setItems(data || []);
  };

  const addItem = async () => {
    try {
      if (!userId || files.length === 0 || !title.trim()) return;
      setUploading(true);
      const { supabase } = await import("@/integrations/supabase/client");
      
      // First create the portfolio item
      const { data: portfolioItem, error: itemError } = await (supabase as any)
        .from('portfolio_items')
        .insert({ 
          pro_id: userId, 
          title: title.trim(), 
          description: desc.trim() || null,
          image_url: '' // Will be updated with first image
        })
        .select()
        .single();
      
      if (itemError) throw itemError;
      
      // Upload all files and create media records
      const mediaPromises = files.map(async (file, index) => {
        const ext = file.name.split('.').pop();
        const path = `${userId}/${portfolioItem.id}/${crypto.randomUUID()}.${ext}`;
        
        // Upload file
        const { error: uploadError } = await supabase.storage
          .from('portfolio')
          .upload(path, file, { upsert: false, contentType: file.type });
        
        if (uploadError) throw uploadError;
        
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('portfolio')
          .getPublicUrl(path);
        
        // Create media record
        const fileType = file.type.startsWith('video/') ? 'video' : 'image';
        const { error: mediaError } = await (supabase as any)
          .from('portfolio_media')
          .insert({
            portfolio_item_id: portfolioItem.id,
            file_url: publicUrl,
            file_type: fileType,
            file_name: file.name,
            file_size: file.size,
            display_order: index
          });
        
        if (mediaError) throw mediaError;
        
        // Update portfolio item with first image URL
        if (index === 0) {
          await (supabase as any)
            .from('portfolio_items')
            .update({ image_url: publicUrl })
            .eq('id', portfolioItem.id);
        }
        
        return publicUrl;
      });
      
      await Promise.all(mediaPromises);
      
      setTitle(''); 
      setDesc(''); 
      setFiles([]);
      toast.success('Работа успешно добавлена в портфолио');
      await refresh();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Ошибка при добавлении работы');
    } finally {
      setUploading(false);
    }
  };

  const deleteItem = async (itemId: string) => {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      // Delete portfolio item (cascade will delete media records)
      const { error } = await (supabase as any).from('portfolio_items').delete().eq('id', itemId);
      if (error) throw error;
      toast.success('Работа удалена из портфолио');
      await refresh();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Ошибка при удалении работы');
    }
  };

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('video/')) return <Film className="h-4 w-4" />;
    return <FileImage className="h-4 w-4" />;
  };

  // Portfolio Carousel Component
  const PortfolioCarousel = ({ media, title }: { media: any[], title: string }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalIndex, setModalIndex] = useState(0);
    
    if (!media || media.length === 0) {
      return (
        <div className="w-full h-full bg-muted flex items-center justify-center">
          <Image className="h-12 w-12 text-muted-foreground" />
        </div>
      );
    }

    if (media.length === 1) {
      return (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <div className="w-full h-full cursor-zoom-in">
              <MediaViewer
                src={media[0].file_url}
                alt={title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
            </div>
          </DialogTrigger>
          <DialogContent className="max-w-4xl w-full p-2">
            <MediaViewer
              src={media[0].file_url}
              alt={title}
              className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
            />
          </DialogContent>
        </Dialog>
      );
    }

    const nextImage = () => {
      setCurrentIndex((prev) => (prev + 1) % media.length);
    };

    const prevImage = () => {
      setCurrentIndex((prev) => (prev - 1 + media.length) % media.length);
    };

    const nextModalImage = () => {
      setModalIndex((prev) => (prev + 1) % media.length);
    };

    const prevModalImage = () => {
      setModalIndex((prev) => (prev - 1 + media.length) % media.length);
    };

    const openModal = (index: number) => {
      setModalIndex(index);
      setIsModalOpen(true);
    };

    return (
      <>
        <div className="relative w-full h-full">
          <div 
            className="w-full h-full cursor-zoom-in"
            onClick={() => openModal(currentIndex)}
          >
            <MediaViewer
              src={media[currentIndex]?.file_url}
              alt={`${title} - ${currentIndex + 1}`}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          </div>
          
          {/* Navigation Arrows */}
          <Button
            variant="ghost"
            size="sm"
            className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/70 text-white h-8 w-8 p-0 backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation();
              prevImage();
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/70 text-white h-8 w-8 p-0 backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation();
              nextImage();
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {/* Dots Indicator */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {media.map((_, index) => (
              <button
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentIndex ? 'bg-white' : 'bg-white/50'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(index);
                }}
              />
            ))}
          </div>
        </div>

        {/* Full Size Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-6xl w-full p-2">
            <div className="relative">
              <MediaViewer
                src={media[modalIndex]?.file_url}
                alt={`${title} - ${modalIndex + 1}`}
                className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
              />
              
              {/* Modal Navigation */}
              {media.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white h-10 w-10 p-0 backdrop-blur-sm rounded-full"
                    onClick={prevModalImage}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white h-10 w-10 p-0 backdrop-blur-sm rounded-full"
                    onClick={nextModalImage}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>

                  {/* Modal Counter */}
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-medium">
                    {modalIndex + 1} / {media.length}
                  </div>

                  {/* Modal Dots */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {media.map((_, index) => (
                      <button
                        key={index}
                        className={`w-3 h-3 rounded-full transition-colors ${
                          index === modalIndex ? 'bg-white' : 'bg-white/50'
                        }`}
                        onClick={() => setModalIndex(index)}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  };

  return (
    <main className="min-h-screen mobile-container bg-gradient-to-br from-background via-background to-muted/20">
      <Seo title={`${t('app.name')} — Портфолио`} description="Pro portfolio" canonical="/portfolio" />
      
      {/* Mobile Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b md:hidden">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate(-1)}
                className="p-2 rounded-full bg-secondary/50 hover:bg-secondary/70 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-lg font-semibold">Портфолио</h1>
                <span className="text-xs text-muted-foreground">{items.length} работ</span>
              </div>
            </div>
            <button className="p-2 rounded-full bg-secondary/50">
              <Bell className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto py-6 md:py-24 px-4 md:px-6">
        {/* Desktop Header */}
        <div className="text-center mb-8 md:mb-16 hidden md:block">
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-display font-bold mb-4 sm:mb-6 text-gradient">
            Мое Портфолио
          </h1>
          <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            Демонстрируйте свои лучшие работы и привлекайте больше клиентов
          </p>
        </div>

        {/* Add New Item Section */}
        <div className="max-w-5xl mx-auto mb-8 md:mb-16">
          <Card className="border-0 bg-gradient-to-br from-card via-card/95 to-card/80 backdrop-blur-sm shadow-sm md:shadow-2xl rounded-xl md:rounded-2xl">
            <CardHeader className="text-center pb-4 md:pb-6 p-4 md:p-6">
              <div className="mx-auto mb-3 md:mb-4 w-12 h-12 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                <Plus className="h-6 w-6 md:h-8 md:w-8 text-primary-foreground" />
              </div>
              <CardTitle className="text-lg md:text-2xl font-display font-bold text-gradient">
                Добавить новую работу
              </CardTitle>
              <p className="text-muted-foreground text-sm md:text-lg">
                Создайте альбом из фотографий и видео ваших лучших проектов
              </p>
            </CardHeader>
            
            <CardContent className="space-y-6 md:space-y-8 p-4 md:p-6">
              {/* Form Fields */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-2 md:space-y-3">
                  <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    Название работы
                  </label>
                  <Input
                    placeholder="Например: Ремонт ванной комнаты"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="h-10 md:h-12 border-0 bg-background/50 backdrop-blur-sm shadow-inner text-sm md:text-base"
                  />
                </div>
                <div className="space-y-2 md:space-y-3">
                  <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-secondary" />
                    Описание работ
                  </label>
                  <Textarea
                    placeholder="Опишите детали проекта, использованные материалы, сложности..."
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    rows={3}
                    className="border-0 bg-background/50 backdrop-blur-sm shadow-inner resize-none text-sm md:text-base"
                  />
                </div>
              </div>

              {/* File Upload Section */}
              <div className="space-y-4">
                <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-accent" />
                  Фотографии и видео
                </label>
                
                {/* Upload Area */}
                <div className="relative">
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={handleFileSelection}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    id="file-upload"
                  />
                  <label 
                    htmlFor="file-upload"
                    className="flex flex-col items-center justify-center p-6 md:p-8 border-2 border-dashed border-primary/30 rounded-xl bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 hover:border-primary/50 hover:bg-primary/10 transition-all duration-300 cursor-pointer group"
                  >
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-primary/10 flex items-center justify-center mb-3 md:mb-4 group-hover:bg-primary/20 transition-colors">
                      <Camera className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                    </div>
                    <p className="text-base md:text-lg font-semibold text-foreground mb-2">
                      Перетащите файлы или нажмите для выбора
                    </p>
                    <p className="text-xs md:text-sm text-muted-foreground text-center">
                      Поддерживаются изображения (JPG, PNG, WebP) и видео (MP4, MOV)
                      <br className="hidden md:block" />
                      Максимальный размер файла: 50MB
                    </p>
                  </label>
                </div>

                {/* Selected Files Preview */}
                {files.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 p-3 md:p-4 bg-muted/30 rounded-xl">
                    {files.map((file, index) => (
                      <div key={index} className="relative group">
                        <div className="aspect-square rounded-lg bg-background/80 border border-border/50 flex flex-col items-center justify-center p-2 md:p-3 hover:bg-background transition-colors">
                          <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-primary/10 flex items-center justify-center mb-1 md:mb-2">
                            {getFileIcon(file)}
                          </div>
                          <p className="text-xs font-medium text-center line-clamp-2">
                            {file.name}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {(file.size / 1024 / 1024).toFixed(1)} MB
                          </p>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="absolute -top-1 -right-1 h-5 w-5 md:h-6 md:w-6 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeFile(index)}
                        >
                          <X className="h-2 w-2 md:h-3 md:w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex justify-center pt-4">
                <Button
                  onClick={addItem}
                  disabled={uploading || files.length === 0 || !title.trim()}
                  className="btn-hero px-6 md:px-8 py-2 md:py-3 text-base md:text-lg font-semibold min-w-[180px] md:min-w-[200px]"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 md:h-5 md:w-5 border-b-2 border-white mr-2 md:mr-3" />
                      Создаём альбом...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 md:h-5 md:w-5 mr-2 md:mr-3" />
                      Создать альбом ({files.length})
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Portfolio Grid */}
        {items.length > 0 ? (
          <div>
            <div className="text-center mb-6 md:mb-12">
              <h2 className="text-xl md:text-3xl lg:text-4xl font-display font-bold mb-2 md:mb-4 text-gradient">
                Мои работы
              </h2>
              <p className="text-sm md:text-lg text-muted-foreground">
                {items.length} {items.length === 1 ? 'выполненная работа' : items.length < 5 ? 'выполненные работы' : 'выполненных работ'}
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {items.map((item, index) => (
                <div 
                  key={item.id} 
                  className="bg-card rounded-xl md:rounded-2xl shadow-sm border p-0 overflow-hidden cursor-pointer group animate-fade-in hover-scale"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="relative">
                    <div className="aspect-video overflow-hidden">
                      {/* Portfolio Media Carousel */}
                      <PortfolioCarousel 
                        media={item.portfolio_media || (item.image_url ? [{ file_url: item.image_url, file_type: 'image' }] : [])}
                        title={item.title || 'Работа'}
                      />
                    </div>
                    
                    {/* Media Count Badge */}
                    {item.portfolio_media && item.portfolio_media.length > 1 && (
                      <div className="absolute top-2 md:top-3 left-2 md:left-3 bg-black/70 backdrop-blur-sm text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                        <Image className="h-3 w-3" />
                        {item.portfolio_media.length}
                      </div>
                    )}
                    
                    {/* Delete Button */}
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 md:top-3 right-2 md:right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 h-7 w-7 md:h-8 md:w-8 p-0 backdrop-blur-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteItem(item.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                    </Button>
                  </div>
                  
                  <div className="p-4 md:p-6 space-y-2 md:space-y-3">
                    <h3 className="font-semibold text-base md:text-lg group-hover:text-primary transition-colors line-clamp-1">
                      {item.title || 'Без названия'}
                    </h3>
                    {item.description && (
                      <p className="text-xs md:text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between pt-1 md:pt-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Image className="h-3 w-3" />
                        <span className="text-xs">{new Date(item.created_at).toLocaleDateString()}</span>
                      </div>
                      {item.portfolio_media && item.portfolio_media.length > 0 && (
                        <div className="flex items-center gap-1">
                          <span className="text-xs">Альбом</span>
                          <Badge variant="secondary" className="text-xs px-2 py-0">
                            {item.portfolio_media.length}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 md:py-16">
            <div className="bg-card rounded-xl md:rounded-2xl shadow-sm border p-8 md:p-12 max-w-md mx-auto">
              <div className="mb-6">
                <div className="mx-auto w-16 h-16 md:w-24 md:h-24 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Image className="h-8 w-8 md:h-12 md:w-12 text-muted-foreground" />
                </div>
                <h3 className="text-lg md:text-2xl font-semibold mb-2">Ваше портфолио пусто</h3>
                <p className="text-sm md:text-base text-muted-foreground">
                  Добавьте фотографии ваших лучших работ, чтобы привлечь больше клиентов
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default ProPortfolio;
