import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminLogs() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Мониторинг ошибок</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Logs page loading successfully!</p>
        </CardContent>
      </Card>
    </div>
  );
}