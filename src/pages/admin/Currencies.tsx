import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2, TrendingUp, RefreshCw, DollarSign, History } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface Currency {
  id: string;
  code: string;
  name_en: string;
  name_ru: string;
  name_ro: string;
  symbol: string;
  exchange_rate: number;
  is_base: boolean;
  is_active: boolean;
  decimal_places: number;
  created_at: string;
  updated_at: string;
}

interface ExchangeRateHistory {
  id: string;
  currency_id: string;
  old_rate: number;
  new_rate: number;
  created_at: string;
  changed_by: string;
}

export default function AdminCurrencies() {
  const { t } = useTranslation();
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [history, setHistory] = useState<ExchangeRateHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name_en: '',
    name_ru: '',
    name_ro: '',
    symbol: '',
    exchange_rate: 1.0,
    is_base: false,
    is_active: true,
    decimal_places: 2
  });

  useEffect(() => {
    loadCurrencies();
  }, []);

  const loadCurrencies = async () => {
    try {
      const { data, error } = await supabase
        .from('currencies')
        .select('*')
        .order('is_base', { ascending: false })
        .order('code');

      if (error) throw error;
      setCurrencies(data || []);
    } catch (error) {
      console.error('Error loading currencies:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить валюты",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadExchangeHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('exchange_rate_history')
        .select(`
          *,
          currencies:currency_id(code, symbol)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setHistory(data || []);
      setShowHistoryDialog(true);
    } catch (error) {
      console.error('Error loading exchange history:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить историю курсов",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCurrency) {
        const { error } = await supabase
          .from('currencies')
          .update(formData)
          .eq('id', editingCurrency.id);

        if (error) throw error;
        toast({
          title: "Успех",
          description: "Валюта обновлена"
        });
        setShowEditDialog(false);
      } else {
        const { error } = await supabase
          .from('currencies')
          .insert([formData]);

        if (error) throw error;
        toast({
          title: "Успех",
          description: "Валюта добавлена"
        });
        setShowAddDialog(false);
      }
      
      loadCurrencies();
      resetForm();
    } catch (error: any) {
      console.error('Error saving currency:', error);
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось сохранить валюту",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (currency: Currency) => {
    setEditingCurrency(currency);
    setFormData({
      code: currency.code,
      name_en: currency.name_en,
      name_ru: currency.name_ru || '',
      name_ro: currency.name_ro || '',
      symbol: currency.symbol,
      exchange_rate: currency.exchange_rate,
      is_base: currency.is_base,
      is_active: currency.is_active,
      decimal_places: currency.decimal_places
    });
    setShowEditDialog(true);
  };

  const handleDelete = async (currencyId: string) => {
    try {
      const { error } = await supabase
        .from('currencies')
        .delete()
        .eq('id', currencyId);

      if (error) throw error;
      
      toast({
        title: "Успех",
        description: "Валюта удалена"
      });
      loadCurrencies();
    } catch (error: any) {
      console.error('Error deleting currency:', error);
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось удалить валюту",
        variant: "destructive"
      });
    }
  };

  const toggleActive = async (currency: Currency) => {
    try {
      const { error } = await supabase
        .from('currencies')
        .update({ is_active: !currency.is_active })
        .eq('id', currency.id);

      if (error) throw error;
      
      toast({
        title: "Успех",
        description: `Валюта ${currency.is_active ? 'деактивирована' : 'активирована'}`
      });
      loadCurrencies();
    } catch (error: any) {
      console.error('Error toggling currency:', error);
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось изменить статус валюты",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      name_en: '',
      name_ru: '',
      name_ro: '',
      symbol: '',
      exchange_rate: 1.0,
      is_base: false,
      is_active: true,
      decimal_places: 2
    });
    setEditingCurrency(null);
  };

  const formatRate = (rate: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4
    }).format(rate);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Управление валютами</h1>
          <p className="text-muted-foreground">
            Настройка валют и курсов обмена
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadExchangeHistory}
          >
            <History className="h-4 w-4 mr-2" />
            История курсов
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={loadCurrencies}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Обновить
          </Button>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Добавить валюту
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Добавить валюту</DialogTitle>
                <DialogDescription>
                  Создание новой валюты для платформы
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Код валюты</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="USD"
                      maxLength={3}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="symbol">Символ</Label>
                    <Input
                      id="symbol"
                      value={formData.symbol}
                      onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                      placeholder="$"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="name_en">Название (EN)</Label>
                  <Input
                    id="name_en"
                    value={formData.name_en}
                    onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                    placeholder="US Dollar"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="name_ru">Название (RU)</Label>
                  <Input
                    id="name_ru"
                    value={formData.name_ru}
                    onChange={(e) => setFormData({ ...formData, name_ru: e.target.value })}
                    placeholder="Доллар США"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="name_ro">Название (RO)</Label>
                  <Input
                    id="name_ro"
                    value={formData.name_ro}
                    onChange={(e) => setFormData({ ...formData, name_ro: e.target.value })}
                    placeholder="Dolar american"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="exchange_rate">Курс к USD</Label>
                    <Input
                      id="exchange_rate"
                      type="number"
                      step="0.0001"
                      min="0"
                      value={formData.exchange_rate}
                      onChange={(e) => setFormData({ ...formData, exchange_rate: parseFloat(e.target.value) || 0 })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="decimal_places">Десятичные знаки</Label>
                    <Input
                      id="decimal_places"
                      type="number"
                      min="0"
                      max="8"
                      value={formData.decimal_places}
                      onChange={(e) => setFormData({ ...formData, decimal_places: parseInt(e.target.value) || 2 })}
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Активная валюта</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_base"
                    checked={formData.is_base}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_base: checked })}
                  />
                  <Label htmlFor="is_base">Базовая валюта</Label>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                    Отмена
                  </Button>
                  <Button type="submit">Добавить</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Валюты платформы
          </CardTitle>
          <CardDescription>
            Всего валют: {currencies.length} | Активных: {currencies.filter(c => c.is_active).length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Код</TableHead>
                <TableHead>Название</TableHead>
                <TableHead>Символ</TableHead>
                <TableHead>Курс к USD</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currencies.map((currency) => (
                <TableRow key={currency.id}>
                  <TableCell className="font-mono font-medium">
                    {currency.code}
                    {currency.is_base && (
                      <Badge variant="secondary" className="ml-2">
                        Базовая
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{currency.name_en}</TableCell>
                  <TableCell className="font-medium">{currency.symbol}</TableCell>
                  <TableCell className="font-mono">
                    {currency.is_base ? '1.0000' : formatRate(currency.exchange_rate)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={currency.is_active ? "default" : "secondary"} className={currency.is_active ? "bg-green-500 hover:bg-green-600" : ""}>
                      {currency.is_active ? 'Активна' : 'Неактивна'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(currency)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleActive(currency)}
                      >
                        <TrendingUp className="h-4 w-4" />
                      </Button>
                      {!currency.is_base && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Удалить валюту?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Это действие нельзя отменить. Валюта {currency.code} будет удалена навсегда.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Отмена</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(currency.id)}>
                                Удалить
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать валюту</DialogTitle>
            <DialogDescription>
              Изменение параметров валюты {editingCurrency?.code}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_code">Код валюты</Label>
                <Input
                  id="edit_code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="USD"
                  maxLength={3}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_symbol">Символ</Label>
                <Input
                  id="edit_symbol"
                  value={formData.symbol}
                  onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                  placeholder="$"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit_name_en">Название (EN)</Label>
              <Input
                id="edit_name_en"
                value={formData.name_en}
                onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                placeholder="US Dollar"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit_name_ru">Название (RU)</Label>
              <Input
                id="edit_name_ru"
                value={formData.name_ru}
                onChange={(e) => setFormData({ ...formData, name_ru: e.target.value })}
                placeholder="Доллар США"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit_name_ro">Название (RO)</Label>
              <Input
                id="edit_name_ro"
                value={formData.name_ro}
                onChange={(e) => setFormData({ ...formData, name_ro: e.target.value })}
                placeholder="Dolar american"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_exchange_rate">Курс к USD</Label>
                <Input
                  id="edit_exchange_rate"
                  type="number"
                  step="0.0001"
                  min="0"
                  value={formData.exchange_rate}
                  onChange={(e) => setFormData({ ...formData, exchange_rate: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_decimal_places">Десятичные знаки</Label>
                <Input
                  id="edit_decimal_places"
                  type="number"
                  min="0"
                  max="8"
                  value={formData.decimal_places}
                  onChange={(e) => setFormData({ ...formData, decimal_places: parseInt(e.target.value) || 2 })}
                  required
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="edit_is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="edit_is_active">Активная валюта</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                Отмена
              </Button>
              <Button type="submit">Сохранить</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>История изменения курсов</DialogTitle>
            <DialogDescription>
              Последние 50 изменений курсов валют
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Валюта</TableHead>
                  <TableHead>Старый курс</TableHead>
                  <TableHead>Новый курс</TableHead>
                  <TableHead>Изменение</TableHead>
                  <TableHead>Дата</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((record) => {
                  const change = ((record.new_rate - record.old_rate) / record.old_rate) * 100;
                  const isPositive = change > 0;
                  
                  return (
                    <TableRow key={record.id}>
                      <TableCell className="font-mono font-medium">
                        {(record as any).currencies?.code}
                      </TableCell>
                      <TableCell className="font-mono">
                        {formatRate(record.old_rate)}
                      </TableCell>
                      <TableCell className="font-mono">
                        {formatRate(record.new_rate)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={isPositive ? "default" : "destructive"} className={isPositive ? "bg-green-500 hover:bg-green-600" : ""}>
                          {isPositive ? '+' : ''}{change.toFixed(2)}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(record.created_at).toLocaleDateString('ru-RU', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowHistoryDialog(false)}>
              Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}