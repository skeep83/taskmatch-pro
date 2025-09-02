import { useState, useEffect } from "react";
import { Seo } from "@/components/Seo";
import { adminApi } from "@/lib/adminApi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Activity, Search, FileText, Image, MessageSquare, Eye, CheckCircle, XCircle, AlertTriangle, Flag, Languages, Plus, Edit, Trash2, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

interface ContentItem {
  id: string;
  type: "post" | "comment" | "portfolio" | "profile";
  author_id: string;
  author_name: string;
  title?: string;
  content: string;
  status: "pending" | "approved" | "rejected" | "flagged";
  created_at: string;
  reports_count: number;
  images?: string[];
  metadata?: any;
}

interface Report {
  id: string;
  content_id: string;
  reporter_id: string;
  reporter_name: string;
  reason: string;
  description: string;
  status: "new" | "reviewed" | "resolved";
  created_at: string;
}

interface ContentStats {
  pending_review: number;
  flagged_items: number;
  reports_today: number;
  auto_approved_rate: number;
}

interface Language {
  id: string;
  code: string;
  name: string;
  native_name: string;
  flag_emoji: string;
  is_active: boolean;
  is_default: boolean;
  sort_order: number;
}

interface Translation {
  id: string;
  language_code: string;
  translation_key: string;
  translation_value: string;
  namespace: string;
  context?: string;
}

export default function AdminContent() {
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState<ContentStats>({
    pending_review: 0,
    flagged_items: 0,
    reports_today: 0,
    auto_approved_rate: 0
  });
  const [languages, setLanguages] = useState<Language[]>([]);
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [selectedReports, setSelectedReports] = useState<Report[]>([]);
  const [moderationNote, setModerationNote] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState<Language | null>(null);
  const [selectedTranslation, setSelectedTranslation] = useState<Translation | null>(null);
  const [newLanguage, setNewLanguage] = useState({
    code: "",
    name: "",
    native_name: "",
    flag_emoji: "",
    is_active: true
  });
  const [newTranslation, setNewTranslation] = useState({
    language_code: "",
    translation_key: "",
    translation_value: "",
    namespace: "common",
    context: ""
  });
  const [translationSearchTerm, setTranslationSearchTerm] = useState("");
  const [selectedNamespace, setSelectedNamespace] = useState<string>("all");
  const { toast } = useToast();
  const { t, i18n } = useTranslation();

  const fetchLanguagesData = async () => {
    try {
      const { data: languagesData, error: langError } = await supabase
        .from('languages')
        .select('*')
        .order('sort_order');

      if (langError) throw langError;
      setLanguages(languagesData || []);

      const { data: translationsData, error: transError } = await supabase
        .from('translations')
        .select('*')
        .order('translation_key');

      if (transError) throw transError;
      setTranslations(translationsData || []);

    } catch (error) {
      console.error("Failed to fetch languages data:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить языковые данные",
        variant: "destructive"
      });
    }
  };

  const fetchContentData = async () => {
    try {
      setLoading(true);
      
      // Mock content items data
      const mockContent: ContentItem[] = [
        {
          id: "1",
          type: "post",
          author_id: "user1",
          author_name: "Иванов И.И.",
          title: "Замена сантехники в ванной",
          content: "Выполнил качественную замену всей сантехники в ванной комнате. Клиент остался доволен результатом.",
          status: "pending",
          created_at: "2024-01-15T10:30:00Z",
          reports_count: 0,
          images: ["https://example.com/image1.jpg", "https://example.com/image2.jpg"]
        },
        {
          id: "2",
          type: "comment",
          author_id: "user2",
          author_name: "Петров П.П.",
          content: "Отличная работа! Рекомендую этого мастера всем.",
          status: "flagged",
          created_at: "2024-01-15T09:15:00Z",
          reports_count: 2
        },
        {
          id: "3",
          type: "portfolio",
          author_id: "user3",
          author_name: "Сидоров С.С.",
          title: "Электромонтажные работы",
          content: "Примеры моих работ по электромонтажу в жилых и коммерческих помещениях.",
          status: "approved",
          created_at: "2024-01-14T16:20:00Z",
          reports_count: 0,
          images: ["https://example.com/portfolio1.jpg"]
        },
        {
          id: "4",
          type: "post",
          author_id: "user4",
          author_name: "Козлов К.К.",
          title: "Неподобающий контент",
          content: "Содержит спам и неуместную рекламу сторонних услуг.",
          status: "rejected",
          created_at: "2024-01-14T14:10:00Z",
          reports_count: 3
        }
      ];

      // Mock reports data
      const mockReports: Report[] = [
        {
          id: "1",
          content_id: "2",
          reporter_id: "user5",
          reporter_name: "Николаев Н.Н.",
          reason: "spam",
          description: "Содержит спам и рекламу",
          status: "new",
          created_at: "2024-01-15T11:00:00Z"
        },
        {
          id: "2",
          content_id: "2", 
          reporter_id: "user6",
          reporter_name: "Федоров Ф.Ф.",
          reason: "inappropriate",
          description: "Неуместный контент",
          status: "new",
          created_at: "2024-01-15T11:15:00Z"
        }
      ];

      // Mock stats
      const mockStats: ContentStats = {
        pending_review: 5,
        flagged_items: 2,
        reports_today: 3,
        auto_approved_rate: 0.85
      };

      setContentItems(mockContent);
      setReports(mockReports);
      setStats(mockStats);
      
      await fetchLanguagesData();
    } catch (error) {
      console.error("Failed to fetch content data:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить данные контента",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const moderateContent = async (contentId: string, action: "approve" | "reject", note?: string) => {
    try {
      // await adminApi.moderateContent(contentId, action, note);
      setContentItems(prev =>
        prev.map(item =>
          item.id === contentId 
            ? { ...item, status: action === "approve" ? "approved" : "rejected" }
            : item
        )
      );
      toast({
        title: "Успешно",
        description: `Контент ${action === "approve" ? "одобрен" : "отклонен"}`
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось выполнить модерацию",
        variant: "destructive"
      });
    }
  };

  const resolveReport = async (reportId: string, action: "dismiss" | "accept") => {
    try {
      // await adminApi.resolveReport(reportId, action);
      setReports(prev =>
        prev.map(report =>
          report.id === reportId
            ? { ...report, status: "resolved" }
            : report
        )
      );
      toast({
        title: "Успешно",
        description: `Жалоба ${action === "accept" ? "принята" : "отклонена"}`
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось обработать жалобу",
        variant: "destructive"
      });
    }
  };

  const getContentReports = (contentId: string) => {
    return reports.filter(report => report.content_id === contentId);
  };

  const saveLanguage = async () => {
    try {
      if (selectedLanguage) {
        // Update existing language
        const { error } = await supabase
          .from('languages')
          .update({
            name: selectedLanguage.name,
            native_name: selectedLanguage.native_name,
            flag_emoji: selectedLanguage.flag_emoji,
            is_active: selectedLanguage.is_active,
            sort_order: selectedLanguage.sort_order
          })
          .eq('id', selectedLanguage.id);

        if (error) throw error;
        
        toast({
          title: "Успешно",
          description: "Язык обновлен"
        });
      } else {
        // Create new language
        const { error } = await supabase
          .from('languages')
          .insert([{
            code: newLanguage.code,
            name: newLanguage.name,
            native_name: newLanguage.native_name,
            flag_emoji: newLanguage.flag_emoji,
            is_active: newLanguage.is_active
          }]);

        if (error) throw error;
        
        toast({
          title: "Успешно",
          description: "Язык добавлен"
        });
        
        setNewLanguage({
          code: "",
          name: "",
          native_name: "",
          flag_emoji: "",
          is_active: true
        });
      }
      
      await fetchLanguagesData();
      setSelectedLanguage(null);
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось сохранить язык",
        variant: "destructive"
      });
    }
  };

  const deleteLanguage = async (languageId: string) => {
    try {
      const { error } = await supabase
        .from('languages')
        .delete()
        .eq('id', languageId);

      if (error) throw error;
      
      toast({
        title: "Успешно",
        description: "Язык удален"
      });
      
      await fetchLanguagesData();
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось удалить язык",
        variant: "destructive"
      });
    }
  };

  const saveTranslation = async () => {
    try {
      if (selectedTranslation) {
        // Update existing translation
        const { error } = await supabase
          .from('translations')
          .update({
            translation_value: selectedTranslation.translation_value,
            context: selectedTranslation.context
          })
          .eq('id', selectedTranslation.id);

        if (error) throw error;
        
        toast({
          title: "Успешно",
          description: "Перевод обновлен"
        });
      } else {
        // Create new translation
        const { error } = await supabase
          .from('translations')
          .insert([newTranslation]);

        if (error) throw error;
        
        toast({
          title: "Успешно",
          description: "Перевод добавлен"
        });
        
        setNewTranslation({
          language_code: "",
          translation_key: "",
          translation_value: "",
          namespace: "common",
          context: ""
        });
      }
      
      await fetchLanguagesData();
      setSelectedTranslation(null);
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось сохранить перевод",
        variant: "destructive"
      });
    }
  };

  const deleteTranslation = async (translationId: string) => {
    try {
      const { error } = await supabase
        .from('translations')
        .delete()
        .eq('id', translationId);

      if (error) throw error;
      
      toast({
        title: "Успешно",
        description: "Перевод удален"
      });
      
      await fetchLanguagesData();
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось удалить перевод",
        variant: "destructive"
      });
    }
  };

  const toggleLanguageStatus = async (languageId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('languages')
        .update({ is_active: isActive })
        .eq('id', languageId);

      if (error) throw error;
      
      toast({
        title: "Успешно",
        description: `Язык ${isActive ? 'активирован' : 'деактивирован'}`
      });
      
      await fetchLanguagesData();
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось изменить статус языка",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchContentData();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "approved": return "bg-green-100 text-green-800";
      case "rejected": return "bg-red-100 text-red-800";
      case "flagged": return "bg-orange-100 text-orange-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "post": return <FileText className="w-4 h-4" />;
      case "comment": return <MessageSquare className="w-4 h-4" />;
      case "portfolio": return <Image className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const filteredContent = contentItems.filter(item => {
    const matchesSearch = item.author_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.title && item.title.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = typeFilter === "all" || item.type === typeFilter;
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const filteredTranslations = translations.filter(translation => {
    const matchesSearch = translation.translation_key.toLowerCase().includes(translationSearchTerm.toLowerCase()) ||
                         translation.translation_value.toLowerCase().includes(translationSearchTerm.toLowerCase());
    const matchesNamespace = selectedNamespace === "all" || translation.namespace === selectedNamespace;
    
    return matchesSearch && matchesNamespace;
  });

  const namespaces = [...new Set(translations.map(t => t.namespace))];

  if (loading) {
    return (
      <section className="max-w-6xl mx-auto card-surface">
        <Seo title="ServiceHub — Admin Content" description="Модерация контента" canonical="/admin/content" />
        <div className="flex items-center justify-center py-12">
          <Activity className="w-8 h-8 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-6xl mx-auto space-y-6">
      <Seo title="ServiceHub — Admin Content & Languages" description="Модерация контента и управление языками" canonical="/admin/content" />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Контент и локализация</h1>
          <p className="text-sm text-muted-foreground">Модерация контента и управление многоязычностью платформы</p>
        </div>
      </div>

      <Tabs defaultValue="content" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="content" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Модерация контента
          </TabsTrigger>
          <TabsTrigger value="languages" className="flex items-center gap-2">
            <Languages className="w-4 h-4" />
            Языки платформы
          </TabsTrigger>
          <TabsTrigger value="translations" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Переводы
          </TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  На модерации
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.pending_review}</div>
                <p className="text-xs text-muted-foreground">Требуют проверки</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Flag className="w-4 h-4" />
                  Помечено
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.flagged_items}</div>
                <p className="text-xs text-muted-foreground">Есть жалобы</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Жалоб сегодня
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.reports_today}</div>
                <p className="text-xs text-muted-foreground">+1 за час</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Авто-одобрение
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(stats.auto_approved_rate * 100).toFixed(0)}%</div>
                <p className="text-xs text-muted-foreground">Фильтрами ИИ</p>
              </CardContent>
            </Card>
          </div>

          {/* Content Moderation */}
          <Card>
            <CardHeader>
              <CardTitle>Контент для модерации</CardTitle>
              <CardDescription>
                Пользовательский контент, требующий проверки
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex gap-4 mb-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Поиск по автору или содержимому..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Тип" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все типы</SelectItem>
                    <SelectItem value="post">Посты</SelectItem>
                    <SelectItem value="comment">Комментарии</SelectItem>
                    <SelectItem value="portfolio">Портфолио</SelectItem>
                    <SelectItem value="profile">Профили</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Статус" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все</SelectItem>
                    <SelectItem value="pending">На модерации</SelectItem>
                    <SelectItem value="flagged">Помечено</SelectItem>
                    <SelectItem value="approved">Одобрено</SelectItem>
                    <SelectItem value="rejected">Отклонено</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Тип</TableHead>
                    <TableHead>Автор</TableHead>
                    <TableHead>Контент</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Жалобы</TableHead>
                    <TableHead>Дата</TableHead>
                    <TableHead>Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContent.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTypeIcon(item.type)}
                          <span className="capitalize">{item.type}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.author_name}</div>
                          <div className="text-sm text-muted-foreground">{item.author_id}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          {item.title && (
                            <div className="font-medium text-sm mb-1">{item.title}</div>
                          )}
                          <div className="text-sm text-muted-foreground max-w-xs truncate">
                            {item.content}
                          </div>
                          {item.images && item.images.length > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                              <Image className="w-3 h-3" />
                              <span className="text-xs text-muted-foreground">
                                {item.images.length} изображений
                              </span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(item.status)}>
                          {item.status === 'pending' ? 'На модерации' :
                           item.status === 'approved' ? 'Одобрено' :
                           item.status === 'rejected' ? 'Отклонено' : 'Помечено'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.reports_count > 0 ? (
                          <div className="flex items-center gap-1 text-red-600">
                            <Flag className="w-4 h-4" />
                            {item.reports_count}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(item.created_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedItem(item);
                                  setSelectedReports(getContentReports(item.id));
                                  setModerationNote("");
                                }}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl">
                              <DialogHeader>
                                <DialogTitle>Модерация контента</DialogTitle>
                                <DialogDescription>
                                  Проверка и принятие решения по контенту
                                </DialogDescription>
                              </DialogHeader>
                              
                              {selectedItem && (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <strong>Автор:</strong> {selectedItem.author_name}
                                    </div>
                                    <div>
                                      <strong>Тип:</strong> {selectedItem.type}
                                    </div>
                                    <div>
                                      <strong>Дата создания:</strong> {new Date(selectedItem.created_at).toLocaleString()}
                                    </div>
                                    <div>
                                      <strong>Жалоб:</strong> {selectedItem.reports_count}
                                    </div>
                                  </div>
                                  
                                  {selectedItem.title && (
                                    <div>
                                      <strong>Заголовок:</strong>
                                      <p className="mt-1">{selectedItem.title}</p>
                                    </div>
                                  )}
                                  
                                  <div>
                                    <strong>Содержимое:</strong>
                                    <div className="mt-1 p-3 bg-gray-50 rounded-md">
                                      {selectedItem.content}
                                    </div>
                                  </div>
                                  
                                  {selectedItem.images && selectedItem.images.length > 0 && (
                                    <div>
                                      <strong>Изображения:</strong>
                                      <div className="grid grid-cols-3 gap-2 mt-2">
                                        {selectedItem.images.map((img, idx) => (
                                          <div key={idx} className="aspect-square bg-gray-100 rounded-md flex items-center justify-center">
                                            <Image className="w-8 h-8 text-gray-400" />
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {selectedReports.length > 0 && (
                                    <div>
                                      <strong>Жалобы:</strong>
                                      <div className="mt-2 space-y-2">
                                        {selectedReports.map((report) => (
                                          <div key={report.id} className="p-3 border rounded-md">
                                            <div className="flex justify-between items-start">
                                              <div>
                                                <div className="font-medium">{report.reporter_name}</div>
                                                <div className="text-sm text-muted-foreground">
                                                  Причина: {report.reason}
                                                </div>
                                                <div className="text-sm mt-1">{report.description}</div>
                                              </div>
                                              <div className="flex gap-1">
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  onClick={() => resolveReport(report.id, "dismiss")}
                                                >
                                                  Отклонить
                                                </Button>
                                                <Button
                                                  size="sm"
                                                  onClick={() => resolveReport(report.id, "accept")}
                                                >
                                                  Принять
                                                </Button>
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  
                                  <div>
                                    <strong>Заметка модератора:</strong>
                                    <Textarea
                                      value={moderationNote}
                                      onChange={(e) => setModerationNote(e.target.value)}
                                      placeholder="Дополнительные комментарии..."
                                      className="mt-1"
                                    />
                                  </div>
                                  
                                  {selectedItem.status === "pending" || selectedItem.status === "flagged" ? (
                                    <div className="flex gap-2">
                                      <Button
                                        onClick={() => moderateContent(selectedItem.id, "approve", moderationNote)}
                                        className="flex-1"
                                      >
                                        <CheckCircle className="w-4 h-4 mr-1" />
                                        Одобрить
                                      </Button>
                                      <Button
                                        variant="destructive"
                                        onClick={() => moderateContent(selectedItem.id, "reject", moderationNote)}
                                        className="flex-1"
                                      >
                                        <XCircle className="w-4 h-4 mr-1" />
                                        Отклонить
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="text-center text-muted-foreground">
                                      Контент уже прошел модерацию
                                    </div>
                                  )}
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>

                          {(item.status === "pending" || item.status === "flagged") && (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                onClick={() => moderateContent(item.id, "approve")}
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => moderateContent(item.id, "reject")}
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="languages" className="space-y-6">
          {/* Languages Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Languages className="w-5 h-5" />
                Управление языками
              </CardTitle>
              <CardDescription>
                Добавление и настройка языков платформы
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Add New Language Form */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                <Input
                  placeholder="Код (ru, ro, en)"
                  value={newLanguage.code}
                  onChange={(e) => setNewLanguage({...newLanguage, code: e.target.value})}
                  maxLength={2}
                />
                <Input
                  placeholder="Название (Russian)"
                  value={newLanguage.name}
                  onChange={(e) => setNewLanguage({...newLanguage, name: e.target.value})}
                />
                <Input
                  placeholder="Родное название (Русский)"
                  value={newLanguage.native_name}
                  onChange={(e) => setNewLanguage({...newLanguage, native_name: e.target.value})}
                />
                <Input
                  placeholder="Флаг emoji (🇷🇺)"
                  value={newLanguage.flag_emoji}
                  onChange={(e) => setNewLanguage({...newLanguage, flag_emoji: e.target.value})}
                  maxLength={2}
                />
                <Button onClick={saveLanguage} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Добавить язык
                </Button>
              </div>

              {/* Languages Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Код</TableHead>
                    <TableHead>Язык</TableHead>
                    <TableHead>Родное название</TableHead>
                    <TableHead>Флаг</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Порядок</TableHead>
                    <TableHead>Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {languages.map((language) => (
                    <TableRow key={language.id}>
                      <TableCell>
                        <Badge variant="outline">{language.code}</Badge>
                      </TableCell>
                      <TableCell>{language.name}</TableCell>
                      <TableCell>{language.native_name}</TableCell>
                      <TableCell className="text-lg">{language.flag_emoji}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={language.is_active}
                            onCheckedChange={(checked) => toggleLanguageStatus(language.id, checked)}
                          />
                          <span className="text-sm">
                            {language.is_active ? "Активен" : "Неактивен"}
                          </span>
                          {language.is_default && (
                            <Badge variant="default" className="ml-2">По умолчанию</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{language.sort_order}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedLanguage(language)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Редактировать язык</DialogTitle>
                                <DialogDescription>
                                  Изменение настроек языка {language.name}
                                </DialogDescription>
                              </DialogHeader>
                              {selectedLanguage && (
                                <div className="space-y-4">
                                  <div>
                                    <Label>Код языка</Label>
                                    <Input
                                      value={selectedLanguage.code}
                                      disabled
                                      className="bg-muted"
                                    />
                                  </div>
                                  <div>
                                    <Label>Название</Label>
                                    <Input
                                      value={selectedLanguage.name}
                                      onChange={(e) => setSelectedLanguage({
                                        ...selectedLanguage,
                                        name: e.target.value
                                      })}
                                    />
                                  </div>
                                  <div>
                                    <Label>Родное название</Label>
                                    <Input
                                      value={selectedLanguage.native_name}
                                      onChange={(e) => setSelectedLanguage({
                                        ...selectedLanguage,
                                        native_name: e.target.value
                                      })}
                                    />
                                  </div>
                                  <div>
                                    <Label>Флаг emoji</Label>
                                    <Input
                                      value={selectedLanguage.flag_emoji}
                                      onChange={(e) => setSelectedLanguage({
                                        ...selectedLanguage,
                                        flag_emoji: e.target.value
                                      })}
                                    />
                                  </div>
                                  <div>
                                    <Label>Порядок сортировки</Label>
                                    <Input
                                      type="number"
                                      value={selectedLanguage.sort_order}
                                      onChange={(e) => setSelectedLanguage({
                                        ...selectedLanguage,
                                        sort_order: parseInt(e.target.value) || 0
                                      })}
                                    />
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Switch
                                      checked={selectedLanguage.is_active}
                                      onCheckedChange={(checked) => setSelectedLanguage({
                                        ...selectedLanguage,
                                        is_active: checked
                                      })}
                                    />
                                    <Label>Активен</Label>
                                  </div>
                                  <div className="flex justify-end gap-2">
                                    <Button variant="outline" onClick={() => setSelectedLanguage(null)}>
                                      Отмена
                                    </Button>
                                    <Button onClick={saveLanguage}>
                                      Сохранить
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                          
                          {!language.is_default && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteLanguage(language.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="translations" className="space-y-6">
          {/* Translations Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Управление переводами
              </CardTitle>
              <CardDescription>
                Добавление и редактирование переводов для всех языков
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Add New Translation Form */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                <Select
                  value={newTranslation.language_code}
                  onValueChange={(value) => setNewTranslation({...newTranslation, language_code: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Язык" />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.filter(l => l.is_active).map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.flag_emoji} {lang.native_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Ключ (nav.home)"
                  value={newTranslation.translation_key}
                  onChange={(e) => setNewTranslation({...newTranslation, translation_key: e.target.value})}
                />
                <Input
                  placeholder="Перевод"
                  value={newTranslation.translation_value}
                  onChange={(e) => setNewTranslation({...newTranslation, translation_value: e.target.value})}
                />
                <Input
                  placeholder="Namespace"
                  value={newTranslation.namespace}
                  onChange={(e) => setNewTranslation({...newTranslation, namespace: e.target.value})}
                />
                <Button onClick={saveTranslation} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Добавить перевод
                </Button>
              </div>

              {/* Filters */}
              <div className="flex gap-4 mb-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Поиск по ключу или переводу..."
                      value={translationSearchTerm}
                      onChange={(e) => setTranslationSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={selectedNamespace} onValueChange={setSelectedNamespace}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Namespace" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все namespace</SelectItem>
                    {namespaces.map((ns) => (
                      <SelectItem key={ns} value={ns}>{ns}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Translations Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Язык</TableHead>
                    <TableHead>Ключ</TableHead>
                    <TableHead>Перевод</TableHead>
                    <TableHead>Namespace</TableHead>
                    <TableHead>Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTranslations.map((translation) => {
                    const language = languages.find(l => l.code === translation.language_code);
                    return (
                      <TableRow key={translation.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{language?.flag_emoji}</span>
                            <Badge variant="outline">{translation.language_code}</Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-1 py-0.5 rounded">
                            {translation.translation_key}
                          </code>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate" title={translation.translation_value}>
                            {translation.translation_value}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{translation.namespace}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedTranslation(translation)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Редактировать перевод</DialogTitle>
                                  <DialogDescription>
                                    Изменение перевода для ключа {translation.translation_key}
                                  </DialogDescription>
                                </DialogHeader>
                                {selectedTranslation && (
                                  <div className="space-y-4">
                                    <div>
                                      <Label>Язык</Label>
                                      <Input
                                        value={selectedTranslation.language_code}
                                        disabled
                                        className="bg-muted"
                                      />
                                    </div>
                                    <div>
                                      <Label>Ключ</Label>
                                      <Input
                                        value={selectedTranslation.translation_key}
                                        disabled
                                        className="bg-muted"
                                      />
                                    </div>
                                    <div>
                                      <Label>Перевод</Label>
                                      <Textarea
                                        value={selectedTranslation.translation_value}
                                        onChange={(e) => setSelectedTranslation({
                                          ...selectedTranslation,
                                          translation_value: e.target.value
                                        })}
                                        rows={3}
                                      />
                                    </div>
                                    <div>
                                      <Label>Контекст (необязательно)</Label>
                                      <Input
                                        value={selectedTranslation.context || ""}
                                        onChange={(e) => setSelectedTranslation({
                                          ...selectedTranslation,
                                          context: e.target.value
                                        })}
                                        placeholder="Дополнительная информация о переводе"
                                      />
                                    </div>
                                    <div className="flex justify-end gap-2">
                                      <Button variant="outline" onClick={() => setSelectedTranslation(null)}>
                                        Отмена
                                      </Button>
                                      <Button onClick={saveTranslation}>
                                        Сохранить
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteTranslation(translation.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </section>
  );
}