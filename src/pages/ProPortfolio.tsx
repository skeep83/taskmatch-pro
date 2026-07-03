import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Trash2, Upload, Calendar, Camera, Plus, Loader2, Play, X, ChevronLeft, ChevronRight, Eye, ArrowLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useEnhancedI18n } from "@/i18n/enhanced";

export default function ProPortfolio() {
  const { t } = useEnhancedI18n();
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [portfolioItems, setPortfolioItems] = useState<any[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  // Check authentication and load data
  useEffect(() => {
    const loadUserData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate('/auth');
        return;
      }
      
      setUserId(session.user.id);
      await loadPortfolioItems(session.user.id);
    };

    loadUserData();
  }, [navigate]);

  const loadPortfolioItems = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('portfolio_items')
        .select(`
          *,
          portfolio_media(*)
        `)
        .eq('pro_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPortfolioItems(data || []);
    } catch (error) {
      console.error('Error loading portfolio items:', error);
      toast({
        title: t("notifications.error"),
        description: t("ui.ne_udalos_zagruzit_portfolio"),
        variant: "destructive"
      });
    }
  };

  const refresh = async () => {
    if (userId) {
      await loadPortfolioItems(userId);
    }
  };

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userId || !newTitle.trim() || selectedFiles.length === 0) {
      toast({
        title: t("notifications.error"),
        description: t("ui.zapolnite_nazvanie_i_dobavte"),
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      // Create portfolio item
      const { data: portfolioItem, error: itemError } = await supabase
        .from('portfolio_items')
        .insert({
          pro_id: userId,
          title: newTitle.trim(),
          description: newDescription.trim() || null
        })
        .select()
        .single();

      if (itemError) throw itemError;

      // Upload files and create media records
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/${portfolioItem.id}/${Date.now()}-${i}.${fileExt}`;

        // Upload file
        const { error: uploadError } = await supabase.storage
          .from('portfolio')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('portfolio')
          .getPublicUrl(fileName);

        // Create media record
        const { error: mediaError } = await supabase
          .from('portfolio_media')
          .insert({
            portfolio_item_id: portfolioItem.id,
            file_url: publicUrl,
            file_type: file.type.startsWith('video/') ? 'video' : 'image',
            file_name: file.name,
            file_size: file.size,
            display_order: i
          });

        if (mediaError) throw mediaError;
      }

      // Reset form
      setNewTitle('');
      setNewDescription('');
      setSelectedFiles([]);
      
      toast({
        title: t("ui.uspeshno"),
        description: t("ui.rabota_dobavlena_v_portfolio")
      });

      await refresh();
    } catch (error: any) {
      console.error('Error adding portfolio item:', error);
      toast({
        title: t("notifications.error"),
        description: error.message || t("ui.ne_udalos_dobavit_rabotu"),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('portfolio_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      toast({
        title: t("ui.uspeshno"),
        description: t("ui.rabota_udalena_iz_portfolio")
      });

      await refresh();
    } catch (error: any) {
      console.error('Error deleting portfolio item:', error);
      toast({
        title: t("notifications.error"),
        description: error.message || t("ui.ne_udalos_udalit_rabotu"),
        variant: "destructive"
      });
    }
  };

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('video/')) {
      return <Play className="h-4 w-4" />;
    }
    return <Camera className="h-4 w-4" />;
  };

  // Portfolio Carousel Component
  const PortfolioCarousel = ({ item }: { item: any }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    const media = item.portfolio_media || [];
    
    if (media.length === 0) {
      return (
        <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
          <Camera className="h-8 w-8 text-muted-foreground" />
        </div>
      );
    }

    const nextImage = () => {
      setCurrentIndex((prev) => (prev + 1) % media.length);
    };

    const prevImage = () => {
      setCurrentIndex((prev) => (prev - 1 + media.length) % media.length);
    };

    return (
      <>
        <div className="relative aspect-square rounded-lg overflow-hidden group">
          {media[currentIndex]?.file_type === 'video' ? (
            <video
              className="w-full h-full object-cover"
              controls
              preload="metadata"
            >
              <source src={media[currentIndex]?.file_url} />
            </video>
          ) : (
            <img
              src={media[currentIndex]?.file_url}
              alt={item.title}
              className="w-full h-full object-cover"
            />
          )}
          
          {/* Overlay with controls */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors">
            {media.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/70 text-white h-8 w-8 p-0"
                  onClick={prevImage}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/70 text-white h-8 w-8 p-0"
                  onClick={nextImage}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>

                {/* Dots indicator */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {media.map((_, index) => (
                    <button
                      key={index}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        index === currentIndex ? 'bg-white' : 'bg-white/50'
                      }`}
                      onClick={() => setCurrentIndex(index)}
                    />
                  ))}
                </div>
              </>
            )}
            
            {/* View button */}
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/70 text-white h-8 w-8 p-0"
              onClick={() => setIsModalOpen(true)}
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Modal for full view */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-4xl w-full p-2">
            <div className="relative">
              {media[currentIndex]?.file_type === 'video' ? (
                <video
                  className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
                  controls
                  autoPlay
                >
                  <source src={media[currentIndex]?.file_url} />
                </video>
              ) : (
                <img
                  src={media[currentIndex]?.file_url}
                  alt={item.title}
                  className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
                />
              )}
              
              {media.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white h-10 w-10 p-0 rounded-full"
                    onClick={prevImage}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white h-10 w-10 p-0 rounded-full"
                    onClick={nextImage}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>

                  <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
                    {currentIndex + 1} / {media.length}
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
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="lg:hidden sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold">{t("dash.pro.portfolio")}</h1>
        </div>
      </div>

      <div className="container mx-auto py-4 lg:py-8 px-4 bg-background-neomorphic">
        <div className="bg-card/80 backdrop-blur-sm rounded-3xl p-6 lg:p-8 shadow-neomorphic border border-border/50">
        {/* Hero Section */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-display font-bold">{t("dash.pro.portfolio")}</h1>
          <p className="text-muted-foreground mt-1">{t("portfolio.subtitle")}</p>
        </div>

        {/* Add New Item Section */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-6 lg:mb-12"
        >
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b p-4 lg:p-6">
              <CardTitle className="flex items-center gap-2 text-lg lg:text-xl">
                <Plus className="h-5 w-5" />
                {t("portfolio.add_new")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 lg:p-6">
              <form onSubmit={addItem} className="space-y-4 lg:space-y-6">
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="title">{t("ui.nazvanie_raboty")}</Label>
                    <Input
                      id="title"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder={t("ui.naprimer_remont_vannoi_komnaty")}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">{t("ui.opisanie")}</Label>
                    <Textarea
                      id="description"
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      placeholder={t("ui.rasskazhite_o_prodelannoi_rabote")}
                      className="min-h-[80px]"
                    />
                  </div>
                </div>

                {/* File Upload Area */}
                <div className="space-y-4">
                  <Label>{t("job.new.photos")}</Label>
                  <div 
                    className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 lg:p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                    onClick={() => document.getElementById('fileInput')?.click()}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                  >
                    <div className="flex flex-col items-center gap-3 lg:gap-4">
                      <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <Upload className="h-6 w-6 lg:h-8 lg:w-8 text-primary" />
                      </div>
                      <div>
                        <p className="text-base lg:text-lg font-medium">{t("ui.zagruzite_faily")}</p>
                        <p className="text-sm text-muted-foreground">
                          Перетащите файлы сюда или нажмите для выбора
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Поддерживаются: JPG, PNG, MP4, WebM (до 10MB)
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <input
                    id="fileInput"
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={handleFileSelection}
                    className="hidden"
                  />

                  {/* Selected Files Preview */}
                  {selectedFiles.length > 0 && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="relative group">
                          <div className="aspect-square bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                            {file.type.startsWith('image/') ? (
                              <img
                                src={URL.createObjectURL(file)}
                                alt={file.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="flex flex-col items-center gap-2">
                                {getFileIcon(file)}
                                <span className="text-xs text-center px-2">{file.name}</span>
                              </div>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeFile(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Добавление...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Добавить в портфолио
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.section>

        {/* Portfolio Items */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <h2 className="text-xl lg:text-2xl font-bold mb-4 lg:mb-6">{t("ui.moi_raboty")}</h2>
          
          {portfolioItems.length === 0 ? (
            <Card className="border-2 border-dashed border-muted-foreground/25 bg-muted/10">
              <CardContent className="flex flex-col items-center justify-center py-8 lg:py-12">
                <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-full bg-muted flex items-center justify-center mb-3 lg:mb-4">
                  <Camera className="h-6 w-6 lg:h-8 lg:w-8 text-muted-foreground" />
                </div>
                <h3 className="text-base lg:text-lg font-medium mb-2">{t("ui.portfolio_pusto")}</h3>
                <p className="text-muted-foreground text-center max-w-md text-sm lg:text-base">
                  Добавьте фотографии ваших работ, чтобы клиенты могли оценить качество ваших услуг
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 lg:gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {portfolioItems.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300 border-0 shadow-lg">
                    <div className="relative">
                      <PortfolioCarousel item={item} />
                      <Button
                        onClick={() => deleteItem(item.id)}
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2 h-8 w-8 p-0 bg-destructive/80 hover:bg-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <CardContent className="p-3 lg:p-4">
                      <h3 className="font-semibold text-base lg:text-lg mb-2">{item.title}</h3>
                      {item.description && (
                        <p className="text-muted-foreground text-xs lg:text-sm line-clamp-3 mb-3">
                          {item.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(item.created_at), 'dd.MM.yyyy')}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </motion.section>
        </div>
      </div>
    </div>
  );
}