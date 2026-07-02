import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEnhancedI18n } from "@/i18n/enhanced";
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
  role: 'owner' | 'manager' | 'member';
  limits: any;
  created_at: string;
  profiles?: {
    full_name: string;
    phone: string;
  };
}

export function BusinessMembers() {
  const { toast } = useToast();
  const { t } = useEnhancedI18n();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<BusinessMember[]>([]);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<'manager' | 'member'>('member');
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
        title: t("common.error"),
        description: t("biz.members.load_error"),
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
      // Приглашение отправляется через серверную функцию уведомлений.
      // Прямое создание записи невозможно: user_id появляется только после
      // регистрации пользователя (FK на profiles).
      const { error } = await supabase.functions.invoke('notifications-send', {
        body: {
          type: 'business_member_invite',
          email: newMemberEmail,
          business_id: businessId,
          role: newMemberRole,
        },
      });

      if (error) throw new Error(error.message || t('biz.members.invite_unavailable'));

      setNewMemberEmail("");
      setNewMemberRole('member');

      toast({
        title: t("biz.members.invite_sent"),
        description: t("biz.members.invite_sent_desc", { email: newMemberEmail })
      });
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message || t("biz.members.invite_error"),
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
        title: t("common.success"),
        description: t("biz.members.deleted")
      });
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: t("biz.members.delete_error"),
        variant: "destructive"
      });
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="h-4 w-4" />;
      case 'manager': return <Settings className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner': return t('biz.members.role_owner');
      case 'manager': return t('biz.members.role_manager');
      default: return t('biz.members.role_member');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            {t("biz.members.loading")}
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
          {t("biz.members.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add Member Form */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg">
          <div>
            <Label htmlFor="member_email">{t("biz.members.email_label")}</Label>
            <Input
              id="member_email"
              type="email"
              value={newMemberEmail}
              onChange={(e) => setNewMemberEmail(e.target.value)}
              placeholder="user@example.com"
            />
          </div>
          <div>
            <Label htmlFor="member_role">{t("common.role")}</Label>
            <Select value={newMemberRole} onValueChange={(value: any) => setNewMemberRole(value)}>
              <SelectTrigger>
                <SelectValue placeholder={t("biz.members.role_placeholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">{t("biz.members.role_member")}</SelectItem>
                <SelectItem value="manager">{t("biz.members.role_manager")}</SelectItem>
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
              {addingMember ? t("biz.members.adding") : t("biz.members.add")}
            </Button>
          </div>
        </div>

        {/* Members List */}
        {members.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{t("biz.members.empty_title")}</p>
            <p className="text-sm">{t("biz.members.empty_text")}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("biz.members.col_member")}</TableHead>
                <TableHead>{t("common.role")}</TableHead>
                <TableHead>{t("biz.members.col_added")}</TableHead>
                <TableHead>{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {member.profiles?.full_name || t("common.unknown")}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {member.profiles?.phone || t("biz.members.no_phone")}
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
                          <AlertDialogTitle>{t("biz.members.delete_title")}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t("biz.members.delete_confirm")}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => removeMember(member.id)}>
                            {t("common.delete")}
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