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
import { Activity, Search, Users, UserCheck, UserX, Crown, Shield, Eye, Edit, Ban, CheckCircle, XCircle, MapPin, Calendar, Phone, Mail, Briefcase, Star, Clock, DollarSign, AlertTriangle } from "lucide-react";

interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  city?: string;
  created_at: string;
  last_sign_in_at?: string;
  roles: string[];
  kyc_status: "none" | "pending" | "approved" | "rejected";
  is_blocked: boolean;
  profile_completion: number;
  pro_data?: ProData;
}

interface ProData {
  bio?: string;
  hourly_rate_cents?: number;
  fixed_price_cents?: number;
  radius_km: number;
  categories: string[];
  avg_rating: number;
  rating_count: number;
  jobs_completed: number;
  response_time_hours: number;
  verification_level: "none" | "basic" | "verified" | "premium";
}

interface KycDocument {
  id: string;
  user_id: string;
  doc_type: string;
  file_url: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  reviewed_at?: string;
  reviewer_notes?: string;
}

interface UserStats {
  total_users: number;
  active_users: number;
  pro_users: number;
  pending_kyc: number;
  blocked_users: number;
  new_signups_today: number;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [kycDocuments, setKycDocuments] = useState<KycDocument[]>([]);
  const [stats, setStats] = useState<UserStats>({
    total_users: 0,
    active_users: 0,
    pro_users: 0,
    pending_kyc: 0,
    blocked_users: 0,
    new_signups_today: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [kycFilter, setKycFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionNote, setActionNote] = useState("");
  const { toast } = useToast();

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 20,
        search: searchTerm || undefined,
        role: roleFilter !== "all" ? roleFilter : undefined,
        kyc_status: kycFilter !== "all" ? kycFilter : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
      };
      
      // Note: These would be real API calls in production
      // const data = await adminApi.getUsers(params);
      
      // Mock users data for demonstration
      const mockUsers: User[] = [
        {
          id: "1",
          email: "ivanov@example.com",
          first_name: "Иван",
          last_name: "Иванов",
          phone: "+373 69 123 456",
          city: "Кишинев",
          created_at: "2024-01-01T10:00:00Z",
          last_sign_in_at: "2024-01-15T14:30:00Z",
          roles: ["client", "pro"],
          kyc_status: "approved",
          is_blocked: false,
          profile_completion: 95,
          pro_data: {
            bio: "Опытный сантехник с 10-летним стажем",
            hourly_rate_cents: 5000,
            fixed_price_cents: 15000,
            radius_km: 15,
            categories: ["Сантехника", "Отопление"],
            avg_rating: 4.8,
            rating_count: 127,
            jobs_completed: 89,
            response_time_hours: 2,
            verification_level: "verified"
          }
        },
        {
          id: "2", 
          email: "petrov@example.com",
          first_name: "Петр",
          last_name: "Петров",
          phone: "+373 68 987 654",
          city: "Бельцы",
          created_at: "2024-01-05T09:15:00Z",
          last_sign_in_at: "2024-01-14T16:45:00Z",
          roles: ["client"],
          kyc_status: "none",
          is_blocked: false,
          profile_completion: 60
        },
        {
          id: "3",
          email: "sidorov@example.com", 
          first_name: "Сидор",
          last_name: "Сидоров",
          phone: "+373 67 555 123",
          city: "Кишинев",
          created_at: "2024-01-10T11:20:00Z",
          last_sign_in_at: "2024-01-12T09:10:00Z",
          roles: ["pro"],
          kyc_status: "pending",
          is_blocked: false,
          profile_completion: 85,
          pro_data: {
            bio: "Электрик с большим опытом работы",
            hourly_rate_cents: 4500,
            radius_km: 20,
            categories: ["Электрика"],
            avg_rating: 4.5,
            rating_count: 43,
            jobs_completed: 35,
            response_time_hours: 4,
            verification_level: "basic"
          }
        },
        {
          id: "4",
          email: "blocked@example.com",
          first_name: "Заблокированный",
          last_name: "Пользователь",
          created_at: "2024-01-08T15:30:00Z",
          roles: ["client"],
          kyc_status: "rejected",
          is_blocked: true,
          profile_completion: 40
        }
      ];

      // Mock stats
      const mockStats: UserStats = {
        total_users: 2485,
        active_users: 1923,
        pro_users: 756,
        pending_kyc: 23,
        blocked_users: 12,
        new_signups_today: 8
      };

      setUsers(mockUsers);
      setStats(mockStats);
      setTotalPages(Math.ceil(mockUsers.length / 20));
    } catch (error) {
      console.error("Failed to fetch users:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить пользователей",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserKyc = async (userId: string) => {
    try {
      // Mock KYC documents
      const mockDocs: KycDocument[] = [
        {
          id: "1",
          user_id: userId,
          doc_type: "passport",
          file_url: "/uploads/passport_scan.jpg",
          status: "pending",
          created_at: "2024-01-10T12:00:00Z"
        },
        {
          id: "2",
          user_id: userId,
          doc_type: "address_proof",
          file_url: "/uploads/utility_bill.pdf",
          status: "approved",
          created_at: "2024-01-10T12:05:00Z",
          reviewed_at: "2024-01-11T10:00:00Z"
        }
      ];
      setKycDocuments(mockDocs);
    } catch (error) {
      console.error("Failed to fetch KYC documents:", error);
    }
  };

  const blockUser = async (userId: string, reason: string) => {
    try {
      // await adminApi.blockUser(userId, reason);
      setUsers(prev =>
        prev.map(user =>
          user.id === userId ? { ...user, is_blocked: true } : user
        )
      );
      toast({
        title: "Успешно",
        description: "Пользователь заблокирован"
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось заблокировать пользователя",
        variant: "destructive"
      });
    }
  };

  const unblockUser = async (userId: string, reason: string) => {
    try {
      // await adminApi.unblockUser(userId, reason);
      setUsers(prev =>
        prev.map(user =>
          user.id === userId ? { ...user, is_blocked: false } : user
        )
      );
      toast({
        title: "Успешно",
        description: "Пользователь разблокирован"
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось разблокировать пользователя",
        variant: "destructive"
      });
    }
  };

  const changeUserRole = async (userId: string, newRole: string, removeRole?: string) => {
    try {
      // await adminApi.changeUserRole(userId, newRole, removeRole, actionNote);
      setUsers(prev =>
        prev.map(user => {
          if (user.id === userId) {
            let updatedRoles = [...user.roles];
            if (removeRole && updatedRoles.includes(removeRole)) {
              updatedRoles = updatedRoles.filter(r => r !== removeRole);
            }
            if (!updatedRoles.includes(newRole)) {
              updatedRoles.push(newRole);
            }
            return { ...user, roles: updatedRoles };
          }
          return user;
        })
      );
      toast({
        title: "Успешно",
        description: "Роль пользователя изменена"
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось изменить роль",
        variant: "destructive"
      });
    }
  };

  const moderateKyc = async (userId: string, status: "approved" | "rejected", notes?: string) => {
    try {
      // await adminApi.moderateKyc(userId, status, notes);
      setUsers(prev =>
        prev.map(user =>
          user.id === userId ? { ...user, kyc_status: status } : user
        )
      );
      toast({
        title: "Успешно",
        description: `KYC ${status === "approved" ? "одобрен" : "отклонен"}`
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить статус KYC",
        variant: "destructive"
      });
    }
  };

  const resetKyc = async (userId: string, reason: string) => {
    try {
      // await adminApi.resetKYC(userId, reason);
      setUsers(prev =>
        prev.map(user =>
          user.id === userId ? { ...user, kyc_status: "none" } : user
        )
      );
      toast({
        title: "Успешно",
        description: "KYC статус сброшен"
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось сбросить KYC",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [currentPage, searchTerm, roleFilter, kycFilter, statusFilter]);

  const getKycStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "bg-green-100 text-green-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "rejected": return "bg-red-100 text-red-800";
      case "none": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getVerificationIcon = (level: string) => {
    switch (level) {
      case "premium": return <Crown className="w-4 h-4 text-yellow-600" />;
      case "verified": return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "basic": return <Shield className="w-4 h-4 text-blue-600" />;
      default: return <XCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || user.roles.includes(roleFilter);
    const matchesKyc = kycFilter === "all" || user.kyc_status === kycFilter;
    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "active" && !user.is_blocked) ||
                         (statusFilter === "blocked" && user.is_blocked);
    
    return matchesSearch && matchesRole && matchesKyc && matchesStatus;
  });

  if (loading) {
    return (
      <section className="max-w-6xl mx-auto card-surface">
        <Seo title="ServiceHub — Admin Users" description="Управление пользователями и мастерами" canonical="/admin/users" />
        <div className="flex items-center justify-center py-12">
          <Activity className="w-8 h-8 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-6xl mx-auto space-y-6">
      <Seo title="ServiceHub — Admin Users" description="Управление пользователями и мастерами" canonical="/admin/users" />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Управление пользователями</h1>
          <p className="text-sm text-muted-foreground">Пользователи, профессионалы и KYC верификация</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="w-4 h-4" />
              Всего
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_users.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Пользователей</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Активные
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active_users.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">За 30 дней</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              Профи
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pro_users}</div>
            <p className="text-xs text-muted-foreground">Специалистов</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              KYC
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending_kyc}</div>
            <p className="text-xs text-muted-foreground">На проверке</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Ban className="w-4 h-4" />
              Заблок.
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.blocked_users}</div>
            <p className="text-xs text-muted-foreground">Пользователей</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Сегодня
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{stats.new_signups_today}</div>
            <p className="text-xs text-muted-foreground">Регистраций</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Фильтры и поиск</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск по имени или email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Роль" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все роли</SelectItem>
                <SelectItem value="client">Клиенты</SelectItem>
                <SelectItem value="pro">Профи</SelectItem>
                <SelectItem value="admin">Админы</SelectItem>
              </SelectContent>
            </Select>
            <Select value={kycFilter} onValueChange={setKycFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="KYC" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все KYC</SelectItem>
                <SelectItem value="none">Без KYC</SelectItem>
                <SelectItem value="pending">На проверке</SelectItem>
                <SelectItem value="approved">Одобрено</SelectItem>
                <SelectItem value="rejected">Отклонено</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все</SelectItem>
                <SelectItem value="active">Активные</SelectItem>
                <SelectItem value="blocked">Заблокированные</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Список пользователей</CardTitle>
          <CardDescription>
            Все пользователи системы с возможностью управления
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Пользователь</TableHead>
                <TableHead>Роли</TableHead>
                <TableHead>KYC</TableHead>
                <TableHead>Профиль</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Последняя активность</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {user.first_name && user.last_name 
                          ? `${user.first_name} ${user.last_name}`
                          : user.email
                        }
                        {user.pro_data && getVerificationIcon(user.pro_data.verification_level)}
                      </div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                      {user.city && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {user.city}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {user.roles.map(role => (
                        <Badge key={role} variant="outline" className="text-xs">
                          {role === 'client' ? 'Клиент' : 
                           role === 'pro' ? 'Профи' : 
                           role === 'admin' ? 'Админ' : role}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getKycStatusColor(user.kyc_status)}>
                      {user.kyc_status === 'none' ? 'Нет' :
                       user.kyc_status === 'pending' ? 'Проверка' :
                       user.kyc_status === 'approved' ? 'Одобрено' : 'Отклонено'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${user.profile_completion}%` }}
                        />
                      </div>
                      <span className="text-xs">{user.profile_completion}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.is_blocked ? (
                      <Badge className="bg-red-100 text-red-800">
                        Заблокирован
                      </Badge>
                    ) : (
                      <Badge className="bg-green-100 text-green-800">
                        Активен
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {user.last_sign_in_at 
                        ? new Date(user.last_sign_in_at).toLocaleDateString()
                        : "Никогда"
                      }
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user);
                              if (user.kyc_status !== "none") {
                                fetchUserKyc(user.id);
                              }
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl">
                          <DialogHeader>
                            <DialogTitle>Профиль пользователя</DialogTitle>
                            <DialogDescription>
                              Детальная информация и управление пользователем
                            </DialogDescription>
                          </DialogHeader>
                          
                          {selectedUser && (
                            <div className="space-y-6">
                              {/* Basic Info */}
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <h4 className="font-medium mb-2">Основная информация</h4>
                                  <div className="space-y-2 text-sm">
                                    <div><strong>Имя:</strong> {selectedUser.first_name || "Не указано"} {selectedUser.last_name || ""}</div>
                                    <div><strong>Email:</strong> {selectedUser.email}</div>
                                    <div><strong>Телефон:</strong> {selectedUser.phone || "Не указан"}</div>
                                    <div><strong>Город:</strong> {selectedUser.city || "Не указан"}</div>
                                    <div><strong>Регистрация:</strong> {new Date(selectedUser.created_at).toLocaleString()}</div>
                                    <div><strong>Роли:</strong> {selectedUser.roles.join(", ")}</div>
                                  </div>
                                </div>
                                
                                <div>
                                  <h4 className="font-medium mb-2">Статусы</h4>
                                  <div className="space-y-2 text-sm">
                                    <div className="flex items-center gap-2">
                                      <strong>KYC:</strong>
                                      <Badge className={getKycStatusColor(selectedUser.kyc_status)}>
                                        {selectedUser.kyc_status}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <strong>Статус:</strong>
                                      <Badge className={selectedUser.is_blocked ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}>
                                        {selectedUser.is_blocked ? "Заблокирован" : "Активен"}
                                      </Badge>
                                    </div>
                                    <div><strong>Заполненность профиля:</strong> {selectedUser.profile_completion}%</div>
                                  </div>
                                </div>
                              </div>

                              {/* Pro Data */}
                              {selectedUser.pro_data && (
                                <div>
                                  <h4 className="font-medium mb-2">Данные профессионала</h4>
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <div><strong>Био:</strong> {selectedUser.pro_data.bio || "Не указано"}</div>
                                      <div><strong>Почасовая ставка:</strong> ${(selectedUser.pro_data.hourly_rate_cents || 0) / 100}/час</div>
                                      <div><strong>Фиксированная цена:</strong> ${(selectedUser.pro_data.fixed_price_cents || 0) / 100}</div>
                                      <div><strong>Радиус работы:</strong> {selectedUser.pro_data.radius_km} км</div>
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-1">
                                        <Star className="w-4 h-4 text-yellow-500" />
                                        <strong>Рейтинг:</strong> {selectedUser.pro_data.avg_rating} ({selectedUser.pro_data.rating_count} отзывов)
                                      </div>
                                      <div><strong>Заказов выполнено:</strong> {selectedUser.pro_data.jobs_completed}</div>
                                      <div><strong>Время ответа:</strong> {selectedUser.pro_data.response_time_hours}ч</div>
                                      <div className="flex items-center gap-2">
                                        <strong>Верификация:</strong>
                                        {getVerificationIcon(selectedUser.pro_data.verification_level)}
                                        {selectedUser.pro_data.verification_level}
                                      </div>
                                      <div><strong>Категории:</strong> {selectedUser.pro_data.categories.join(", ")}</div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* KYC Documents */}
                              {selectedUser.kyc_status !== "none" && (
                                <div>
                                  <h4 className="font-medium mb-2">KYC Документы</h4>
                                  <div className="space-y-2">
                                    {kycDocuments.map((doc) => (
                                      <div key={doc.id} className="flex items-center justify-between p-2 border rounded">
                                        <div>
                                          <div className="font-medium">{doc.doc_type}</div>
                                          <div className="text-sm text-muted-foreground">
                                            Загружен: {new Date(doc.created_at).toLocaleString()}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Badge className={getKycStatusColor(doc.status)}>
                                            {doc.status}
                                          </Badge>
                                          <Button size="sm" variant="outline">
                                            <Eye className="w-4 h-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Admin Actions */}
                              <div>
                                <h4 className="font-medium mb-2">Действия администратора</h4>
                                
                                <div className="mb-3">
                                  <Textarea
                                    placeholder="Причина/комментарий к действию..."
                                    value={actionNote}
                                    onChange={(e) => setActionNote(e.target.value)}
                                  />
                                </div>

                                <div className="flex gap-2 flex-wrap">
                                  {/* Block/Unblock */}
                                  {selectedUser.is_blocked ? (
                                    <Button
                                      onClick={() => unblockUser(selectedUser.id, actionNote)}
                                      className="bg-green-600 hover:bg-green-700"
                                    >
                                      <UserCheck className="w-4 h-4 mr-1" />
                                      Разблокировать
                                    </Button>
                                  ) : (
                                    <Button
                                      variant="destructive"
                                      onClick={() => blockUser(selectedUser.id, actionNote)}
                                    >
                                      <Ban className="w-4 h-4 mr-1" />
                                      Заблокировать
                                    </Button>
                                  )}

                                  {/* Role Management */}
                                  {!selectedUser.roles.includes("pro") && (
                                    <Button
                                      variant="outline"
                                      onClick={() => changeUserRole(selectedUser.id, "pro")}
                                    >
                                      <Briefcase className="w-4 h-4 mr-1" />
                                      Сделать профи
                                    </Button>
                                  )}

                                  {!selectedUser.roles.includes("admin") && (
                                    <Button
                                      variant="outline"
                                      onClick={() => changeUserRole(selectedUser.id, "admin")}
                                    >
                                      <Shield className="w-4 h-4 mr-1" />
                                      Дать админа
                                    </Button>
                                  )}

                                  {/* KYC Actions */}
                                  {selectedUser.kyc_status === "pending" && (
                                    <>
                                      <Button
                                        onClick={() => moderateKyc(selectedUser.id, "approved", actionNote)}
                                      >
                                        <CheckCircle className="w-4 h-4 mr-1" />
                                        Одобрить KYC
                                      </Button>
                                      <Button
                                        variant="destructive"
                                        onClick={() => moderateKyc(selectedUser.id, "rejected", actionNote)}
                                      >
                                        <XCircle className="w-4 h-4 mr-1" />
                                        Отклонить KYC
                                      </Button>
                                    </>
                                  )}

                                  {(selectedUser.kyc_status === "approved" || selectedUser.kyc_status === "rejected") && (
                                    <Button
                                      variant="outline"
                                      onClick={() => resetKyc(selectedUser.id, actionNote)}
                                    >
                                      <AlertTriangle className="w-4 h-4 mr-1" />
                                      Сбросить KYC
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>

                      {!user.is_blocked ? (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => blockUser(user.id, "Административное решение")}
                        >
                          <Ban className="w-4 h-4" />
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => unblockUser(user.id, "Разблокировка администратором")}
                        >
                          <UserCheck className="w-4 h-4" />
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => prev - 1)}
          >
            Назад
          </Button>
          <span className="text-sm">
            Страница {currentPage} из {totalPages}
          </span>
          <Button
            variant="outline"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => prev + 1)}
          >
            Вперед
          </Button>
        </div>
      )}
    </section>
  );
}