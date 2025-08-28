import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Trash2, Mail, Settings, Crown, User } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface BusinessMember {
  id: string;
  user_id: string;
  role: 'admin' | 'manager' | 'member';
  limits: any;
  created_at: string;
  profiles?: {
    full_name: string;
    phone: string;
  };
}

export function BusinessMembers() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<BusinessMember[]>([]);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<'admin' | 'manager' | 'member'>('member');
  const [addingMember, setAddingMember] = useState(false);

  useEffect(() => {
    loadBusinessMembers();
  }, []);

  const loadBusinessMembers = async () => {
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) return;

      // Get business account
      const { data: businessData, error: businessError } = await supabase
        .from("business_accounts")
        .select("id")
        .eq("owner_id", session.session.user.id)
        .maybeSingle();

      if (businessError) throw businessError;
      if (!businessData) return;

      setBusinessId(businessData.id);

      // Get members
      const { data, error } = await supabase
        .from("business_members")
        .select(`
          *,
          profiles:user_id (
            full_name,
            phone
          )
        `)
        .eq("business_id", businessData.id);

      if (error) throw error;
      setMembers(data || []);
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить список сотрудников",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addMember = async () => {
    if (!businessId || !newMemberEmail) return;
    
    setAddingMember(true);
    try {
      // Create invitation - in production this would send an email invitation
      const inviteData = {
        business_id: businessId,
        email: newMemberEmail,
        role: newMemberRole,
        status: 'pending',
        invited_by: (await supabase.auth.getSession()).data.session?.user?.id
      };

      // For demo purposes, create a dummy member entry
      const dummyUserId = `invited_${Date.now()}`;
      const { error } = await supabase
        .from("business_members")
        .insert({
          business_id: businessId,
          user_id: dummyUserId,
          role: newMemberRole,
          limits: {
            max_order_amount: newMemberRole === 'admin' ? 100000 : newMemberRole === 'manager' ? 50000 : 10000,
            can_approve_orders: newMemberRole !== 'member',
            can_invite_members: newMemberRole === 'admin'
          }
        });

      if (error) throw error;

      // In a real system, send invitation email/SMS
      console.log('Invitation would be sent to:', newMemberEmail, 'with role:', newMemberRole);

      setNewMemberEmail("");
      setNewMemberRole('member');
      loadBusinessMembers();
      
      toast({
        title: "Приглашение отправлено",
        description: `Приглашение отправлено на ${newMemberEmail}. Пользователь получит уведомление для подтверждения.`
      });
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось отправить приглашение",
        variant: "destructive"
      });
    } finally {
      setAddingMember(false);
    }
  };

  const removeMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from("business_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;

      loadBusinessMembers();
      toast({
        title: "Успешно",
        description: "Сотрудник удален"
      });
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить сотрудника",
        variant: "destructive"
      });
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Crown className="h-4 w-4" />;
      case 'manager': return <Settings className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Администратор';
      case 'manager': return 'Менеджер';
      default: return 'Сотрудник';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            Загрузка сотрудников...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Сотрудники компании
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add Member Form */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg">
          <div>
            <Label htmlFor="member_email">Email сотрудника</Label>
            <Input
              id="member_email"
              type="email"
              value={newMemberEmail}
              onChange={(e) => setNewMemberEmail(e.target.value)}
              placeholder="user@example.com"
            />
          </div>
          <div>
            <Label htmlFor="member_role">Роль</Label>
            <Select value={newMemberRole} onValueChange={(value: any) => setNewMemberRole(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите роль" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Сотрудник</SelectItem>
                <SelectItem value="manager">Менеджер</SelectItem>
                <SelectItem value="admin">Администратор</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button 
              onClick={addMember} 
              disabled={addingMember || !newMemberEmail}
              className="w-full"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {addingMember ? "Добавление..." : "Добавить"}
            </Button>
          </div>
        </div>

        {/* Members List */}
        {members.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>У вас пока нет сотрудников</p>
            <p className="text-sm">Добавьте первого сотрудника выше</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Сотрудник</TableHead>
                <TableHead>Роль</TableHead>
                <TableHead>Дата добавления</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {member.profiles?.full_name || "Неизвестно"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {member.profiles?.phone || "Телефон не указан"}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                      {getRoleIcon(member.role)}
                      {getRoleLabel(member.role)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(member.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Удалить сотрудника</AlertDialogTitle>
                          <AlertDialogDescription>
                            Вы уверены, что хотите удалить этого сотрудника из команды?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Отмена</AlertDialogCancel>
                          <AlertDialogAction onClick={() => removeMember(member.id)}>
                            Удалить
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}