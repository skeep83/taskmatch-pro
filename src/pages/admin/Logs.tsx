import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function AdminLogs() {
  const [logs] = useState([]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Мониторинг ошибок</h1>
      <Card>
        <CardHeader>
          <CardTitle>Логи ошибок</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Найдено логов: {logs.length}</p>
          <p>Минимальная версия для тестирования</p>
        </CardContent>
      </Card>
    </div>
  );
}

export default AdminLogs;