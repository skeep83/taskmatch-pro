// 3D Icons Registry - WebP with alpha channel, clay/soft-matte style
// Unified 3/4 isometric view, soft top-left lighting, subtle shadows

import React from 'react';

export interface Icon3D {
  src: string;
  alt: string;
}

export const icons3d = {
  // Core Navigation
  home: { src: '/icons3d/ic3d-home.webp', alt: 'Главная' },
  search: { src: '/icons3d/ic3d-search.webp', alt: 'Поиск' },
  user: { src: '/icons3d/ic3d-user.webp', alt: 'Профиль' },
  settings: { src: '/icons3d/ic3d-settings-gear.webp', alt: 'Настройки' },
  
  // Communications
  chat: { src: '/icons3d/ic3d-chat-bubbles.webp', alt: 'Чаты' },
  bell: { src: '/icons3d/ic3d-bell.webp', alt: 'Уведомления' },
  
  // Platform Features
  shield: { src: '/icons3d/ic3d-shield-verified.webp', alt: 'Проверенный' },
  auction: { src: '/icons3d/ic3d-auction-gavel.webp', alt: 'Тендеры' },
  video: { src: '/icons3d/ic3d-video-call.webp', alt: 'Видео-оценка' },
  payout: { src: '/icons3d/ic3d-instant-payout.webp', alt: 'Выплаты' },
  
  // Financial
  wallet: { src: '/icons3d/ic3d-wallet.webp', alt: 'Кошелёк' },
  invoice: { src: '/icons3d/ic3d-invoice.webp', alt: 'Счёт' },
  
  // Location & Time
  map: { src: '/icons3d/ic3d-map-pin.webp', alt: 'Локация' },
  calendar: { src: '/icons3d/ic3d-calendar.webp', alt: 'Календарь' },
  
  // Rating & Reviews
  star: { src: '/icons3d/ic3d-star.webp', alt: 'Отзывы' },
} as const;

export type IconName = keyof typeof icons3d;

// Unified Icon Component
export function Icon({ 
  name, 
  size = 64 
}: { 
  name: IconName; 
  size?: number;
}): React.ReactElement {
  const icon = icons3d[name];
  return React.createElement('img', {
    src: icon.src,
    alt: icon.alt,
    width: size,
    height: size,
    className: 'icon',
    loading: 'lazy'
  });
}