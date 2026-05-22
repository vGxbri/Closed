// User type
export interface User {
  id: string;
  name: string;
  avatar?: string;
  email?: string;
}

// Group types
export interface Group {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  memberCount: number;
  members: GroupMember[];
  awards: Award[];
  inviteCode: string;
  createdAt: Date;
}

export interface GroupMember {
  userId: string;
  user: User;
  role: 'admin' | 'member';
  joinedAt: Date;
}

// Award types
export interface Award {
  id: string;
  groupId: string;
  name: string;
  description?: string;
  icon: string;
  nominees: Nominee[];
  status: 'draft' | 'active' | 'voting' | 'completed';
  createdAt: Date;
  createdBy: string;
}

export interface Nominee {
  userId: string;
  user: User;
  votes?: number;
}

// Navigation param types
export type RootStackParamList = {
  '(tabs)': undefined;
  'group/[id]': { id: string };
  'award/create': { groupId: string };
  'join/[code]': { code: string };
};
