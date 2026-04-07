// --- Enums (mirror Prisma enums) ---

export type ConversationScope = 'DIRECT' | 'CLASS' | 'YEAR_GROUP' | 'SCHOOL';

export type MessageType = 'TEXT' | 'POLL' | 'SYSTEM';

export type PollType = 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE';

// --- DTOs ---

export interface MessagePreviewDto {
  body: string;
  senderName: string;
  createdAt: string;
}

export interface ConversationDto {
  id: string;
  schoolId: string;
  scope: ConversationScope;
  scopeId: string | null;
  subject: string | null;
  createdBy: string;
  createdAt: string;
  lastMessage: MessagePreviewDto | null;
  unreadCount: number;
  memberCount: number;
}

export interface MessageAttachmentDto {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

export interface PollOptionDto {
  id: string;
  text: string;
  voteCount: number;
  voters?: { userId: string; name: string }[];
}

export interface PollDto {
  id: string;
  question: string;
  type: PollType;
  deadline: string | null;
  isClosed: boolean;
  options: PollOptionDto[];
  userVoteOptionIds: string[];
}

export interface MessageDto {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  body: string;
  type: MessageType;
  createdAt: string;
  attachments: MessageAttachmentDto[];
  poll: PollDto | null;
  readCount?: number;
  totalRecipients?: number;
}

// --- Socket event interfaces ---

export interface MessageNewEvent {
  message: MessageDto;
}

export interface MessageReadEvent {
  messageId: string;
  readBy: string;
  readCount: number;
  totalRecipients: number;
}

export interface PollVoteEvent {
  pollId: string;
  results: PollOptionDto[];
}
