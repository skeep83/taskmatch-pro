import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { migrateTranslationsToDatabase } from '@/utils/migrateTranslations';
import { Download, Upload, AlertTriangle, CheckCircle } from 'lucide-react';

export const TranslationMigration: React.FC = () => {
  const [migrating, setMigrating] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [migrationMessage, setMigrationMessage] = useState('');
  const { toast } = useToast();

  const handleMigration = async () => {
    setMigrating(true);
    setMigrationStatus('idle');
    setMigrationMessage('');

    try {
      await migrateTranslationsToDatabase();
      setMigrationStatus('success');
      setMigrationMessage('Переводы успешно перенесены в базу данных');
      toast({
        title: 'Миграция завершена',
        description: 'Все переводы перенесены в базу данных',
      });
    } catch (error: any) {
      setMigrationStatus('error');
      setMigrationMessage(`Ошибка миграции: ${error.message}`);
      toast({
        title: 'Ошибка миграции',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setMigrating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Миграция переводов
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Эта операция перенесет все переводы из JSON файлов в базу данных.
            Существующие переводы будут заменены.
          </AlertDescription>
        </Alert>

        {migrationStatus === 'success' && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription className="text-green-600">
              {migrationMessage}
            </AlertDescription>
          </Alert>
        )}

        {migrationStatus === 'error' && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {migrationMessage}
            </AlertDescription>
          </Alert>
        )}

        {migrating && (
          <div className="space-y-2">
            <Progress value={undefined} className="w-full" />
            <p className="text-sm text-muted-foreground">
              Переносим переводы в базу данных...
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleMigration}
            disabled={migrating}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            {migrating ? 'Переносим...' : 'Перенести переводы'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};