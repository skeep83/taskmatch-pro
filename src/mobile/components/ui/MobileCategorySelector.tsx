import { default as React, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Check, ChevronDown, X, Filter, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useEnhancedI18n } from '@/i18n/enhanced';

interface Category {
  id: string;
  label_ru: string;
  label_ro: string;
}

interface MobileCategorySelectorProps {
  categories: Category[];
  selectedCategories: string[];
  onSelectionChange: (categoryIds: string[]) => void;
  placeholder?: string;
  maxSelection?: number;
  disabled?: boolean;
}

export function MobileCategorySelector({
  categories,
  selectedCategories,
  onSelectionChange,
  placeholder = "Выберите категории",
  maxSelection = 20,
  disabled = false
}: MobileCategorySelectorProps) {
  const { t } = useEnhancedI18n();
  // Для простоты используем русский язык по умолчанию
  const locale = 'ru';
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const selectorRef = useRef<HTMLDivElement>(null);

  const filteredCategories = categories.filter(category => {
    const label = category.label_ru || category.label_ro || '';
    return label.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const selectedCategoriesData = categories.filter(cat => 
    selectedCategories.includes(cat.id)
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
        setShowFilter(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleCategory = (categoryId: string) => {
    if (selectedCategories.includes(categoryId)) {
      onSelectionChange(selectedCategories.filter(id => id !== categoryId));
    } else if (selectedCategories.length < maxSelection) {
      onSelectionChange([...selectedCategories, categoryId]);
    }
  };

  const removeCategory = (categoryId: string) => {
    onSelectionChange(selectedCategories.filter(id => id !== categoryId));
  };

  const clearAll = () => {
    onSelectionChange([]);
  };

  const getCategoryLabel = (category: Category) => {
    return category.label_ru || category.label_ro || 'Без названия';
  };

  return (
    <div ref={selectorRef} className="relative w-full">
      {/* Selected categories display */}
      {selectedCategoriesData.length > 0 && (
        <div className="mb-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              Выбрано ({selectedCategoriesData.length}/{maxSelection})
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="h-6 px-2 text-xs text-gray-500 hover:text-gray-700"
            >
              <X className="h-3 w-3 mr-1" />
              Очистить
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedCategoriesData.map(category => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
              >
                <Badge
                  variant="secondary"
                  className="bg-neo text-gray-800 border-0 neo-inset-2 hover:neo-inset-4 transition-all duration-200 pr-1"
                >
                  <Tag className="h-3 w-3 mr-1" />
                  {getCategoryLabel(category)}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCategory(category.id)}
                    className="h-4 w-4 p-0 ml-2 hover:bg-gray-300 rounded-full"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Main selector button */}
      <motion.button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full p-4 rounded-2xl bg-neo transition-all duration-300 border-0 ${
          isOpen
            ? 'neo-inset-4'
            : 'neo-8 hover:neo-4'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        whileTap={!disabled ? { scale: 0.98 } : {}}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-neo neo-inset-2">
              <Tag className="h-5 w-5 text-gray-600" />
            </div>
            <span className="text-left text-gray-700 font-medium">
              {selectedCategoriesData.length > 0 
                ? `${selectedCategoriesData.length} категор${selectedCategoriesData.length === 1 ? 'ия' : selectedCategoriesData.length < 5 ? 'ии' : 'ий'} выбрано`
                : placeholder
              }
            </span>
          </div>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="h-5 w-5 text-gray-600" />
          </motion.div>
        </div>
      </motion.button>

      {/* Dropdown menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 mt-2 z-50 bg-neo rounded-2xl neo-8 border-0 overflow-hidden max-h-80"
          >
            {/* Search header */}
            <div className="p-4 border-b border-gray-300/50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Поиск категорий..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-neo border-0 neo-inset-2 focus:neo-inset-4 rounded-xl"
                />
              </div>
              
              {filteredCategories.length > 0 && (
                <div className="flex items-center justify-between mt-3 text-xs text-gray-600">
                  <span>{filteredCategories.length} категорий найдено</span>
                  <div className="flex items-center gap-2">
                    <span>{selectedCategories.length}/{maxSelection}</span>
                    <div className={`w-2 h-2 rounded-full ${
                      selectedCategories.length >= maxSelection ? 'bg-amber-500' : 'bg-green-500'
                    }`} />
                  </div>
                </div>
              )}
            </div>

            {/* Categories list */}
            <div className="max-h-48 overflow-y-auto">
              {filteredCategories.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Категории не найдены</p>
                  <p className="text-xs mt-1">Попробуйте изменить поисковый запрос</p>
                </div>
              ) : (
                <div className="p-2">
                  {filteredCategories.map((category, index) => {
                    const isSelected = selectedCategories.includes(category.id);
                    const canSelect = !isSelected && selectedCategories.length < maxSelection;
                    
                    return (
                      <motion.button
                        key={category.id}
                        onClick={() => toggleCategory(category.id)}
                        disabled={!isSelected && !canSelect}
                        className={`w-full p-3 rounded-xl mb-2 transition-all duration-200 text-left ${
                          isSelected
                            ? 'bg-neo neo-inset-4 text-gray-900'
                            : canSelect
                            ? 'bg-neo neo-2 hover:neo-4 text-gray-700'
                            : 'bg-neo text-gray-400 opacity-50 cursor-not-allowed'
                        }`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.02 }}
                        whileTap={canSelect || isSelected ? { scale: 0.98 } : {}}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all duration-200 ${
                              isSelected
                                ? 'bg-primary border-primary shadow-[inset_1px_1px_2px_rgba(0,0,0,0.1)]'
                                : 'border-gray-400 bg-neo neo-inset-1'
                            }`}>
                              {isSelected && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <Check className="h-3 w-3 text-white" />
                                </motion.div>
                              )}
                            </div>
                            <span className="font-medium">
                              {getCategoryLabel(category)}
                            </span>
                          </div>
                          
                          {!canSelect && !isSelected && (
                            <Badge variant="outline" className="text-xs bg-neo border-gray-400">
                              Лимит
                            </Badge>
                          )}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-gray-300/50 bg-neo">
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>Выберите категории (без ограничений)</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="h-6 px-3 text-xs hover:bg-gray-300/50 rounded-lg"
                >
                  Готово
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}