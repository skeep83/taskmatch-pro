import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useEnhancedI18n } from '@/i18n/enhanced';
import { Languages, TestTube, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const TranslationTester: React.FC = () => {
  const { t, language, changeLanguage } = useEnhancedI18n();
  const [testKey, setTestKey] = useState('app.name');
  const [testResult, setTestResult] = useState('');
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const testTranslation = () => {
    try {
      const result = t(testKey);
      setTestResult(result);
    } catch (error) {
      setTestResult('Error: ' + (error as Error).message);
    }
  };

  const copyResult = async () => {
    try {
      await navigator.clipboard.writeText(testResult);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: 'Скопировано',
        description: 'Результат скопирован в буфер обмена',
      });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось скопировать',
        variant: 'destructive',
      });
    }
  };

  const commonKeys = [
    'app.name',
    'nav.find_pro',
    'nav.sign_in',
    'hero.title',
    'hero.subtitle',
    'common.loading',
    'common.error',
    'auth.welcome_sign_in',
    'client.dashboard.title',
    'job.new.title',
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          Тестер переводов
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            Текущий язык: {language.toUpperCase()}
          </Badge>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => changeLanguage(language === 'ru' ? 'ro' : 'ru')}
          >
            <Languages className="h-4 w-4 mr-1" />
            Переключить на {language === 'ru' ? 'RO' : 'RU'}
          </Button>
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Введите ключ перевода (например: app.name)"
            value={testKey}
            onChange={(e) => setTestKey(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && testTranslation()}
            className="flex-1"
          />
          <Button onClick={testTranslation}>
            Тест
          </Button>
        </div>

        {testResult && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Результат:</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={copyResult}
                className="h-6 px-2"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </Button>
            </div>
            <div className="p-3 bg-muted rounded-md font-mono text-sm">
              {testResult}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <h4 className="text-sm font-medium">Быстрые тесты:</h4>
          <div className="grid grid-cols-2 gap-2">
            {commonKeys.map((key) => (
              <Button
                key={key}
                variant="outline"
                size="sm"
                onClick={() => {
                  setTestKey(key);
                  const result = t(key);
                  setTestResult(result);
                }}
                className="justify-start text-xs"
              >
                {key}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};