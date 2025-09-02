/**
 * ESLint правило для запрета жестко закодированных строк на русском/румынском
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Запрещает жестко закодированные строки на русском/румынском языках',
      category: 'Best Practices',
      recommended: true,
    },
    fixable: null,
    schema: [
      {
        type: 'object',
        properties: {
          allowedStrings: {
            type: 'array',
            items: { type: 'string' }
          },
          ignoreConsole: {
            type: 'boolean'
          }
        },
        additionalProperties: false
      }
    ]
  },

  create(context) {
    const options = context.options[0] || {};
    const allowedStrings = options.allowedStrings || [
      'ru', 'ro', 'en', 'RU', 'RO', 'EN',
      'Рус', 'Рум', 'ServiceHub',
      'localStorage', 'sessionStorage'
    ];
    const ignoreConsole = options.ignoreConsole !== false;

    // Регулярные выражения для обнаружения
    const cyrillicPattern = /[А-Яа-я]/;
    const romanianPattern = /[ăîșțâĂÎȘȚÂ]/;

    function isHardcodedString(value) {
      if (typeof value !== 'string') return false;
      
      // Проверяем на кириллицу или румынские символы
      if (!cyrillicPattern.test(value) && !romanianPattern.test(value)) {
        return false;
      }

      // Проверяем исключения
      return !allowedStrings.some(allowed => 
        value.toLowerCase().includes(allowed.toLowerCase())
      );
    }

    function isInConsoleCall(node) {
      let parent = node.parent;
      while (parent) {
        if (
          parent.type === 'CallExpression' &&
          parent.callee &&
          parent.callee.type === 'MemberExpression' &&
          parent.callee.object &&
          parent.callee.object.name === 'console'
        ) {
          return true;
        }
        parent = parent.parent;
      }
      return false;
    }

    return {
      Literal(node) {
        if (node.value && isHardcodedString(node.value)) {
          // Игнорируем console calls если указано
          if (ignoreConsole && isInConsoleCall(node)) {
            return;
          }

          context.report({
            node,
            message: `Жестко закодированная строка: "${node.value}". Используйте t("translation.key") вместо этого.`
          });
        }
      },

      TemplateLiteral(node) {
        if (node.quasis) {
          node.quasis.forEach(quasi => {
            if (quasi.value && isHardcodedString(quasi.value.raw)) {
              if (ignoreConsole && isInConsoleCall(node)) {
                return;
              }

              context.report({
                node: quasi,
                message: `Жестко закодированная строка в template literal: "${quasi.value.raw}". Используйте t("translation.key") вместо этого.`
              });
            }
          });
        }
      },

      JSXText(node) {
        if (node.value && isHardcodedString(node.value.trim())) {
          context.report({
            node,
            message: `Жестко закодированный текст в JSX: "${node.value.trim()}". Используйте {t("translation.key")} вместо этого.`
          });
        }
      }
    };
  }
};