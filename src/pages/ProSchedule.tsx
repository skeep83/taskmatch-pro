import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Clock, Plus, ArrowLeft } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

const weekdayNames: Record<number, string> = {
  0: 'Воскресенье',
  1: 'Понедельник', 
  2: 'Вторник',
  3: 'Среда',
  4: 'Четверг',
  5: 'Пятница',
  6: 'Суббота'
};

export default function ProSchedule() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [availability, setAvailability] = useState<any[]>([]);
  const [selectedWeekday, setSelectedWeekday] = useState<number>(1);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');

  useEffect(() => {
    const loadUserData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate('/auth');
        return;
      }
      
      setUserId(session.user.id);
      await loadAvailability(session.user.id);
    };

    loadUserData();
  }, [navigate]);

  const loadAvailability = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('pro_availability')
        .select('*')
        .eq('user_id', userId)
        .order('weekday')
        .order('start_time');

      if (error) throw error;
      setAvailability(data || []);
    } catch (error) {
      console.error('Error loading availability:', error);
    }
  };

  const addSlot = async () => {
    if (!userId) return;

    // Validate time
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    if (endMinutes <= startMinutes) {
      toast({
        title: "Некорректное время",
        description: "Время окончания должно быть позже времени начала",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('pro_availability')
        .insert({
          user_id: userId,
          weekday: selectedWeekday,
          start_time: startTime + ':00',
          end_time: endTime + ':00'
        });

      if (error) throw error;

      toast({
        title: "Успешно!",
        description: "Время работы добавлено"
      });

      await loadAvailability(userId);
    } catch (error: any) {
      console.error('Error adding availability slot:', error);
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось добавить время работы",
        variant: "destructive"
      });
    }
  };

  const remove = async (id: string) => {
    try {
      const { error } = await supabase
        .from('pro_availability')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setAvailability(prev => prev.filter(item => item.id !== id));

      toast({
        title: "Успешно!",
        description: "Время работы удалено"
      });
    } catch (error: any) {
      console.error('Error removing availability slot:', error);
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось удалить время работы",
        variant: "destructive"
      });
    }
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
          <h1 className="text-lg font-semibold">Расписание</h1>
        </div>
      </div>

      <div className="container mx-auto py-4 lg:py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6 lg:mb-8 hidden lg:block">
            <h1 className="text-2xl lg:text-3xl font-bold mb-2">Расписание работы</h1>
            <p className="text-muted-foreground">
              Установите удобное для вас время работы
            </p>
          </div>

          {/* Add New Slot */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="mb-6 lg:mb-8 border-0 shadow-lg">
              <CardHeader className="p-4 lg:p-6">
                <CardTitle className="flex items-center gap-2 text-lg lg:text-xl">
                  <Plus className="h-5 w-5" />
                  Добавить время работы
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 lg:p-6 space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>День недели</Label>
                    <Select 
                      value={selectedWeekday.toString()} 
                      onValueChange={(value) => setSelectedWeekday(parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Понедельник</SelectItem>
                        <SelectItem value="2">Вторник</SelectItem>
                        <SelectItem value="3">Среда</SelectItem>
                        <SelectItem value="4">Четверг</SelectItem>
                        <SelectItem value="5">Пятница</SelectItem>
                        <SelectItem value="6">Суббота</SelectItem>
                        <SelectItem value="0">Воскресенье</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Начало</Label>
                    <Input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Окончание</Label>
                    <Input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                  
                  <div className="flex items-end">
                    <Button onClick={addSlot} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Добавить
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Current Schedule */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="border-0 shadow-lg">
              <CardHeader className="p-4 lg:p-6">
                <CardTitle className="flex items-center gap-2 text-lg lg:text-xl">
                  <Clock className="h-5 w-5" />
                  Текущее расписание
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 lg:p-6">
                {availability.length === 0 ? (
                  <p className="text-muted-foreground text-center py-6 lg:py-8">
                    Расписание не настроено. Добавьте время работы выше.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {availability.map((slot) => (
                      <div 
                        key={slot.id} 
                        className="flex items-center justify-between p-3 lg:p-4 border rounded-lg bg-muted/20"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-primary rounded-full"></div>
                          <span className="font-medium text-sm lg:text-base">
                            {weekdayNames[slot.weekday]}
                          </span>
                          <span className="text-muted-foreground text-sm lg:text-base">
                            {slot.start_time} - {slot.end_time}
                          </span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => remove(slot.id)}
                          className="text-destructive hover:text-destructive h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}