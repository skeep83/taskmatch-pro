// 3D Icons System - реалистичные clay/matte иконки с прозрачным фоном
// Единый стиль: изометрия 3/4, свет сверху-слева, нейтральные + бренд-акценты

export interface Icon3D {
  src: string;
  alt: string;
}

export const icons3d = {
  // Навигация / базовые
  home: {
    src: '/icons3d/ic3d-home.png',
    alt: 'Дом / Главная'
  },
  search: {
    src: '/icons3d/ic3d-search.png',
    alt: 'Поиск услуг'
  },
  briefcase: {
    src: '/icons3d/ic3d-briefcase.png',
    alt: 'Задания / Проекты'
  },
  star: {
    src: '/icons3d/ic3d-star.png',
    alt: 'Рейтинг и отзывы'
  },
  bell: {
    src: '/icons3d/ic3d-bell.png',
    alt: 'Уведомления'
  },
  chatBubbles: {
    src: '/icons3d/ic3d-chat-bubbles.png',
    alt: 'Сообщения / Чат'
  },
  user: {
    src: '/icons3d/ic3d-user.png',
    alt: 'Профиль'
  },
  shieldVerified: {
    src: '/icons3d/ic3d-shield-verified.png',
    alt: 'Проверенный исполнитель'
  },
  settingsGear: {
    src: '/icons3d/ic3d-settings-gear.png',
    alt: 'Настройки'
  },

  // Локация/сроки
  mapPin: {
    src: '/icons3d/ic3d-map-pin.png',
    alt: 'Локация'
  },
  calendar: {
    src: '/icons3d/ic3d-calendar.png',
    alt: 'Календарь / Дедлайн'
  },
  clock: {
    src: '/icons3d/ic3d-clock.png',
    alt: 'Время / Сроки'
  },

  // Функции платформы
  escrowSafe: {
    src: '/icons3d/ic3d-escrow-safe.png',
    alt: 'Escrow платежи'
  },
  auctionGavel: {
    src: '/icons3d/ic3d-auction-gavel.png',
    alt: 'Тендеры'
  },
  videoCall: {
    src: '/icons3d/ic3d-video-call.png',
    alt: 'Видео-оценка'
  },
  instantPayout: {
    src: '/icons3d/ic3d-instant-payout.png',
    alt: 'Мгновенные выплаты'
  },

  // Финансы/аккаунт
  wallet: {
    src: '/icons3d/ic3d-wallet.png',
    alt: 'Кошелёк / Баланс'
  },
  invoice: {
    src: '/icons3d/ic3d-invoice.png',
    alt: 'Счёт / Оплата'
  },

  // Категории услуг
  hammerWrench: {
    src: '/icons3d/ic3d-hammer-wrench.png',
    alt: 'Ремонт / Мастер на час'
  },
  pipeWrench: {
    src: '/icons3d/ic3d-pipe-wrench.png',
    alt: 'Сантехника'
  },
  broomBucket: {
    src: '/icons3d/ic3d-broom-bucket.png',
    alt: 'Уборка'
  },
  paintRoller: {
    src: '/icons3d/ic3d-paint-roller.png',
    alt: 'Малярные работы'
  },
  truckBox: {
    src: '/icons3d/ic3d-truck-box.png',
    alt: 'Переезд / Грузоперевозки'
  },
  camera: {
    src: '/icons3d/ic3d-camera.png',
    alt: 'Фотография'
  }
} as const;

export type Icon3DKey = keyof typeof icons3d;

// Размеры иконок
export const iconSizes = {
  sm: 'w-8 h-8',     // 32px - мелкие элементы UI
  md: 'w-12 h-12',   // 48px - кнопки, навигация
  lg: 'w-16 h-16',   // 64px - карточки
  xl: 'w-24 h-24',   // 96px - заголовки секций
  '2xl': 'w-32 h-32' // 128px - hero, большие элементы
} as const;

export type IconSize = keyof typeof iconSizes;