export class UserContactDto {
  id: string;
  phoneNumber: string;
  name: string | null;
  avatar: string | null;
  isRegistered: boolean;
  isInContacts: boolean; // New field
  lastActiveAt: Date | null;
  lastMessage?: {
    content: string;
    createdAt: Date;
    isFromMe: boolean;
  } | null;
  unreadCount?: number;
}
