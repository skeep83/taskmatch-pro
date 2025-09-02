import { supabase } from '@/integrations/supabase/client';

// Import translation files
import ruTranslations from '../locales/ru.json';
import roTranslations from '../locales/ro.json';

/**
 * Flatten nested translation object to dot notation keys
 */
function flattenTranslations(obj: any, prefix = ''): Record<string, string> {
  const flattened: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(flattened, flattenTranslations(value, newKey));
    } else {
      flattened[newKey] = String(value);
    }
  }
  
  return flattened;
}

/**
 * Migrate translations from JSON files to database
 */
export async function migrateTranslationsToDatabase(): Promise<void> {
  console.log('Starting translation migration...');
  
  try {
    // Flatten translations
    const ruFlat = flattenTranslations(ruTranslations);
    const roFlat = flattenTranslations(roTranslations);
    
    console.log(`Found ${Object.keys(ruFlat).length} Russian translations`);
    console.log(`Found ${Object.keys(roFlat).length} Romanian translations`);
    
    // Prepare data for insertion
    const translationsToInsert = [
      ...Object.entries(ruFlat).map(([key, value]) => ({
        key,
        value,
        language_code: 'ru',
      })),
      ...Object.entries(roFlat).map(([key, value]) => ({
        key,
        value,
        language_code: 'ro',
      })),
    ];
    
    console.log(`Inserting ${translationsToInsert.length} total translations...`);
    
    // Clear existing translations first
    const { error: deleteError } = await supabase
      .from('translations')
      .delete()
      .in('language_code', ['ru', 'ro']);
    
    if (deleteError) {
      console.error('Error clearing existing translations:', deleteError);
      throw deleteError;
    }
    
    // Insert new translations in batches (Supabase has a limit)
    const batchSize = 100;
    for (let i = 0; i < translationsToInsert.length; i += batchSize) {
      const batch = translationsToInsert.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from('translations')
        .insert(batch);
      
      if (error) {
        console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
        throw error;
      }
      
      console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(translationsToInsert.length / batchSize)}`);
    }
    
    console.log('Translation migration completed successfully!');
    
    // Verify the migration
    const { count: ruCount } = await supabase
      .from('translations')
      .select('*', { count: 'exact' })
      .eq('language_code', 'ru');
      
    const { count: roCount } = await supabase
      .from('translations')
      .select('*', { count: 'exact' })
      .eq('language_code', 'ro');
    
    console.log(`Verification: ${ruCount} Russian and ${roCount} Romanian translations in database`);
    
  } catch (error) {
    console.error('Translation migration failed:', error);
    throw error;
  }
}

/**
 * Add a single translation to the database
 */
export async function addTranslation(
  key: string,
  value: string,
  languageCode: 'ru' | 'ro'
): Promise<void> {
  const { error } = await supabase
    .from('translations')
    .upsert({
      key,
      value,
      language_code: languageCode,
    }, {
      onConflict: 'key,language_code'
    });
  
  if (error) {
    console.error('Error adding translation:', error);
    throw error;
  }
}

/**
 * Update a translation in the database
 */
export async function updateTranslation(
  key: string,
  value: string,
  languageCode: 'ru' | 'ro'
): Promise<void> {
  const { error } = await supabase
    .from('translations')
    .update({ value })
    .eq('key', key)
    .eq('language_code', languageCode);
  
  if (error) {
    console.error('Error updating translation:', error);
    throw error;
  }
}

/**
 * Delete a translation from the database
 */
export async function deleteTranslation(
  key: string,
  languageCode?: 'ru' | 'ro'
): Promise<void> {
  let query = supabase
    .from('translations')
    .delete()
    .eq('key', key);
  
  if (languageCode) {
    query = query.eq('language_code', languageCode);
  }
  
  const { error } = await query;
  
  if (error) {
    console.error('Error deleting translation:', error);
    throw error;
  }
}