import React from 'react';
import { useEnhancedI18n, Trans } from './enhanced';

interface SmartTextProps {
  children: string;
  fallback?: string;
  values?: Record<string, any>;
  components?: Record<string, React.ReactElement>;
  className?: string;
}

/**
 * SmartText component that automatically handles translation
 * If the text looks like a translation key (contains dots), it will translate it
 * Otherwise, it will render the text as-is (for backward compatibility)
 */
export const SmartText: React.FC<SmartTextProps> = ({ 
  children, 
  fallback, 
  values = {}, 
  components = {},
  className 
}) => {
  const { t } = useEnhancedI18n();

  // Check if the text looks like a translation key
  const isTranslationKey = typeof children === 'string' && 
    (children.includes('.') || children.match(/^[a-z][a-zA-Z._]*$/));

  if (isTranslationKey) {
    // Try to translate, if no translation found, use fallback or original
    const translated = t(children, values);
    
    // If translation returned the key itself (no translation found)
    if (translated === children) {
      const textToRender = fallback || children;
      
      // If we have components for interpolation, use Trans
      if (Object.keys(components).length > 0) {
        return (
          <Trans 
            i18nKey={children} 
            values={values} 
            components={components}
            className={className}
          >
            {textToRender}
          </Trans>
        );
      }
      
      return <span className={className}>{textToRender}</span>;
    }
    
    // If we have components for interpolation, use Trans
    if (Object.keys(components).length > 0) {
      return (
        <Trans 
          i18nKey={children} 
          values={values} 
          components={components}
          className={className}
        >
          {translated}
        </Trans>
      );
    }
    
    return <span className={className}>{translated}</span>;
  }

  // Not a translation key, render as-is
  return <span className={className}>{children}</span>;
};

// Higher-order component to wrap existing components with smart translation
export const withSmartTranslation = <P extends object>(
  Component: React.ComponentType<P>
) => {
  const WrappedComponent = (props: P) => {
    return <Component {...props} />;
  };
  WrappedComponent.displayName = `withSmartTranslation(${Component.displayName || Component.name})`;
  return WrappedComponent;
};