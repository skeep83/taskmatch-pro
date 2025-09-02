#!/usr/bin/env node

/**
 * Скрипт для поиска жестко закодированных строк на русском/румынском языках
 * Использование: node scripts/find-hardcoded-strings.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Регулярные выражения для поиска
const patterns = [
  // Кириллица в строках
  /["'`][^"'`]*[А-Яа-я][^"'`]*["'`]/g,
  // Румынские диакритики
  /["'`][^"'`]*[ăîșțâĂÎȘȚÂ][^"'`]*["'`]/g,
  // Общие слова на русском
  /["'`][^"'`]*(войти|выйти|создать|найти|специалист|услуга|заказ|клиент)[^"'`]*["'`]/gi,
  // Общие слова на румынском
  /["'`][^"'`]*(conectare|găsește|specialist|serviciu|comandă|client)[^"'`]*["'`]/gi
];

// Папки для поиска
const searchDirs = ['src'];

// Файлы для исключения
const excludePatterns = [
  /\/locales\//,
  /\.json$/,
  /\.md$/,
  /\.test\./,
  /\.spec\./,
  /node_modules/,
  /\.git/,
  /build/,
  /dist/
];

// Исключения - допустимые строки
const allowedStrings = [
  'ru', 'ro', 'en',
  'Рус', 'Рум', 'Eng',
  'RU', 'RO', 'EN',
  'ServiceHub',
  'console.log', 'console.warn', 'console.error',
  'localStorage',
  'sessionStorage'
];

function shouldExcludeFile(filePath) {
  return excludePatterns.some(pattern => pattern.test(filePath));
}

function isAllowedString(str) {
  const cleaned = str.replace(/["'`]/g, '');
  return allowedStrings.some(allowed => 
    cleaned.toLowerCase().includes(allowed.toLowerCase())
  );
}

function searchInFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const findings = [];

    lines.forEach((line, lineNumber) => {
      patterns.forEach((pattern, patternIndex) => {
        const matches = line.match(pattern);
        if (matches) {
          matches.forEach(match => {
            if (!isAllowedString(match)) {
              findings.push({
                file: filePath,
                line: lineNumber + 1,
                match: match.trim(),
                context: line.trim(),
                pattern: patternIndex
              });
            }
          });
        }
      });
    });

    return findings;
  } catch (error) {
    console.error(`Ошибка при чтении файла ${filePath}:`, error.message);
    return [];
  }
}

function searchInDirectory(dir) {
  const results = [];
  
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const itemPath = path.join(dir, item);
      
      if (shouldExcludeFile(itemPath)) {
        continue;
      }
      
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        results.push(...searchInDirectory(itemPath));
      } else if (stat.isFile() && /\.(ts|tsx|js|jsx)$/.test(item)) {
        results.push(...searchInFile(itemPath));
      }
    }
  } catch (error) {
    console.error(`Ошибка при чтении директории ${dir}:`, error.message);
  }
  
  return results;
}

function main() {
  console.log('🔍 Поиск жестко закодированных строк...\n');
  
  const allFindings = [];
  
  for (const searchDir of searchDirs) {
    const dirPath = path.resolve(__dirname, '..', searchDir);
    console.log(`Поиск в: ${dirPath}`);
    const findings = searchInDirectory(dirPath);
    allFindings.push(...findings);
  }
  
  if (allFindings.length === 0) {
    console.log('✅ Жестко закодированные строки не найдены!');
    return;
  }
  
  console.log(`\n❌ Найдено ${allFindings.length} проблем:\n`);
  
  // Группируем по файлам
  const groupedByFile = allFindings.reduce((acc, finding) => {
    if (!acc[finding.file]) {
      acc[finding.file] = [];
    }
    acc[finding.file].push(finding);
    return acc;
  }, {});
  
  Object.keys(groupedByFile).forEach(file => {
    console.log(`📄 ${file}:`);
    groupedByFile[file].forEach(finding => {
      console.log(`   Строка ${finding.line}: ${finding.match}`);
      console.log(`   Контекст: ${finding.context}`);
      console.log('');
    });
  });
  
  console.log(`\n💡 Рекомендации:`);
  console.log(`1. Замените найденные строки на t("translation.key")`);
  console.log(`2. Добавьте соответствующие ключи в ru.json и ro.json`);
  console.log(`3. Импортируйте useEnhancedI18n в компонентах`);
  console.log(`4. Используйте <Trans> для сложных текстов с HTML`);
  
  process.exit(1);
}

main();