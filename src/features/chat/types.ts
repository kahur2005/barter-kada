export type ConversationSummary = {
  id: string;
  listing: { id: string; title: string; imagePath: string | null };
  counterpart: { id: string; name: string; storeName: string | null };
  lastMessage: { text: string; sentAt: string; senderId: string | null } | null;
  unreadCount: number;
};

export type ChatMessage = {
  id: string;
  seq: number;
  senderId: string | null;
  type: 'text' | 'image' | 'listing' | 'transaction' | 'system';
  transactionId: string | null;
  body: { text?: string; imagePaths?: string[]; imageUrls?: string[]; event?: string };
  sentAt: string;
};
