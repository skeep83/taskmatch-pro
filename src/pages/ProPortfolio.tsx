import { useEffect, useState } from "react";
import { Seo } from "@/components/Seo";
import { MediaViewer } from "@/components/media";
import { useEnhancedI18n } from "@/i18n/enhanced";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FloatingCard } from "@/components/ui/floating-card";
import { Upload, Plus, Image, Trash2 } from "lucide-react";
import { toast } from "sonner";

const ProPortfolio = () => {
  const { t } = useEnhancedI18n();
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    (async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: s } = await supabase.auth.getSession();
      const uid = s.session?.user?.id || null;
      if (!uid) { window.location.href = '/auth'; return; }
      setUserId(uid);
      const { data } = await (supabase as any).from('portfolio_items').select('*').eq('pro_id', uid).order('created_at', { ascending: false });
      setItems(data || []);
    })();
  }, []);

  const refresh = async () => {
    if (!userId) return;
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await (supabase as any).from('portfolio_items').select('*').eq('pro_id', userId).order('created_at', { ascending: false });
    setItems(data || []);
  };

  const addItem = async () => {
    try {
      if (!userId || !file) return;
      setUploading(true);
      const { supabase } = await import("@/integrations/supabase/client");
      const ext = file.name.split('.').pop();
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error: uerr } = await supabase.storage.from('portfolio').upload(path, file, { upsert: false, contentType: file.type });
      if (uerr) throw uerr;
      const { data: { publicUrl } } = supabase.storage.from('portfolio').getPublicUrl(path);
      const image_url = publicUrl || path;
      const { error: ierr } = await (supabase as any).from('portfolio_items').insert({ pro_id: userId, title, description: desc, image_url });
      if (ierr) throw ierr;
      setTitle(''); setDesc(''); setFile(null);
      toast.success('Работа успешно добавлена в портфолио');
      await refresh();
    } catch (e:any) {
      console.error(e);
      toast.error(e?.message || 'Ошибка при добавлении работы');
    } finally {
      setUploading(false);
    }
  };

  const deleteItem = async (itemId: string) => {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await (supabase as any).from('portfolio_items').delete().eq('id', itemId);
      if (error) throw error;
      toast.success('Работа удалена из портфолио');
      await refresh();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Ошибка при удалении работы');
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <Seo title={`${t('app.name')} — Портфолио`} description="Pro portfolio" canonical="/portfolio" />
      
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl lg:text-5xl font-display font-bold text-gradient">
              Мое Портфолио
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Демонстрируйте свои лучшие работы и привлекайте больше клиентов
            </p>
          </div>

          {/* Add New Item Card */}
          <FloatingCard className="p-6 border-dashed border-2 border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Plus className="h-5 w-5 text-primary" />
                Добавить новую работу
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Название работы
                    </label>
                    <Input
                      placeholder="Например: Ремонт ванной комнаты"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Краткое описание
                    </label>
                    <Textarea
                      placeholder="Описание выполненных работ..."
                      value={desc}
                      onChange={(e) => setDesc(e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 items-end">
                  <div className="flex-1 space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Фото или видео
                    </label>
                    <div className="relative">
                      <Input
                        type="file"
                        accept="image/*,video/*"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                        className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                      />
                      <Upload className="absolute right-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>
                  <Button
                    onClick={addItem}
                    disabled={uploading || !file || !title.trim()}
                    className="btn-hero min-w-[120px]"
                  >
                    {uploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Загрузка...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Добавить
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </FloatingCard>

          {/* Portfolio Grid */}
          {items.length > 0 ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold">Мои работы</h2>
                <Badge variant="secondary" className="px-3 py-1">
                  {items.length} {items.length === 1 ? 'работа' : items.length < 5 ? 'работы' : 'работ'}
                </Badge>
              </div>
              
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.map((item) => (
                  <FloatingCard key={item.id} className="group overflow-hidden">
                    <div className="relative aspect-video">
                      <MediaViewer
                        src={item.image_url}
                        alt={item.title || 'Работа'}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        enableZoom
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        onClick={() => deleteItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-lg mb-2 line-clamp-1">
                        {item.title || 'Без названия'}
                      </h3>
                      {item.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {item.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                        <Image className="h-3 w-3" />
                        <span>Добавлено {new Date(item.created_at).toLocaleDateString()}</span>
                      </div>
                    </CardContent>
                  </FloatingCard>
                ))}
              </div>
            </div>
          ) : (
            <FloatingCard className="p-12 text-center">
              <div className="space-y-4">
                <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                  <Image className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold">Ваше портфолио пусто</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Добавьте фотографии ваших лучших работ, чтобы привлечь больше клиентов
                  </p>
                </div>
              </div>
            </FloatingCard>
          )}
        </div>
      </div>
    </main>
  );
};

export default ProPortfolio;
