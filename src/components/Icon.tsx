const paths = {
  home: 'm3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z',
  search: 'm21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  plus: 'M12 5v14M5 12h14',
  chat: 'M21 11.5a8.5 8.5 0 0 1-8.5 8.5H3l2-5a8.5 8.5 0 1 1 16-3.5Z',
  user: 'M20 21v-2a7 7 0 0 0-14 0v2M17 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4',
  pin: 'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  filter: 'M4 7h16M7 4v6M4 17h16M17 14v6',
  back: 'm12 5-7 7 7 7M5 12h15',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  chevron: 'm8 10 4 4 4-4',
  close: 'm6 6 12 12M6 18 18 6',
  shop: 'M3 9 5 3h14l2 6M3 9v3h18V9M5 12v9h14v-9M9 21v-6h6v6',
  food: 'M7 3v6a2 2 0 0 0 4 0V3M9 3v18M16 3v18M16 9h3',
  clothing: 'm9 4 3 2 3-2 4 3-2 4-2-1v11H9V10l-2 1-2-4 4-3Z',
  categoryHome: 'm3 11 9-8 9 8M5 10v10h14V10M9 20v-6h6v6',
  vehicles: 'M5 18h14M6 18l1-8h10l2 8M8 10l1-4h6l2 4M8 15h.01M16 15h.01',
  garden: 'M20 4C12 4 5 8 5 15c0 3 2 5 5 5 7 0 10-7 10-16ZM5 20l8-8',
  other: 'M5 5h14v14H5zM9 9h.01M12 9h.01M15 9h.01M9 12h.01M12 12h.01M15 12h.01M9 15h.01M12 15h.01M15 15h.01',
} as const;
export type IconName = keyof typeof paths;
export function Icon({ name }: { name: IconName }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}
