/**
 * Database types generated from Supabase schema
 * These types match the database/schema.sql structure
 */

// Enum types matching PostgreSQL ENUMs
export type MemberRole = 'owner' | 'admin' | 'member';
export type GroupStatus = 'active' | 'archived' | 'deleted';
export type AwardStatus = 'draft' | 'nominations' | 'voting' | 'completed' | 'archived';
export type VoteType = 'person' | 'photo' | 'video' | 'audio' | 'text';
export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired';
export type NotificationType = 
  | 'group_invite'
  | 'award_created'
  | 'nomination_received'
  | 'voting_started'
  | 'award_won'
  | 'new_member'
  | 'role_changed';

// JSON types for settings
export interface ProfileSettings {
  notifications: boolean;
  theme: 'auto' | 'light' | 'dark';
}

export interface GroupSettings {
  allow_member_nominations: boolean;
  allow_member_voting: boolean;
  max_members: number;
  require_approval: boolean;
}

export interface VotingSettings {
  nominees_can_vote: boolean;  // Can nominees vote in this award? (default: false)
  allow_self_vote: boolean;    // Can a nominee vote for themselves? (only if nominees_can_vote is true)
  allow_vote_change: boolean;  // Can users change their vote after casting? (default: false)
  max_votes_per_user: number;
  anonymous_voting: boolean;
  show_results_before_end: boolean;
}

// Table row types
export interface Profile {
  id: string;
  username: string | null;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  email: string | null;
  settings: ProfileSettings;
  created_at: string;
  updated_at: string;
  last_seen_at: string | null;
}

export interface Group {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  cover_image_url: string | null;
  category: string;
  status: GroupStatus;
  is_public: boolean;
  invite_code: string;
  invite_code_expires_at: string | null;
  settings: GroupSettings;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: MemberRole;
  is_active: boolean;
  invited_by: string | null;
  joined_at: string;
  updated_at: string;
  group_display_name?: string | null;
  group_avatar_url?: string | null;
  group_bio?: string | null;
}

export interface Widget {
  id: string;
  name: string;
  subtitle: string | null;
  icon: string | null;
  category: string;
  created_at: string;
}

export interface GroupWidget {
  id: string;
  group_id: string;
  widget_id: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export interface GroupWidgetWithDetails extends GroupWidget {
  widget: Widget;
}

export interface GroupInvitation {
  id: string;
  group_id: string;
  invited_by: string;
  invited_user_id: string | null;
  invite_email: string | null;
  invite_code: string;
  status: InvitationStatus;
  created_at: string;
  expires_at: string | null;
  responded_at: string | null;
}

export interface AwardCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  is_global: boolean;
  group_id: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Award {
  id: string;
  group_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  icon: string;
  status: AwardStatus;
  vote_type: VoteType;
  voting_settings: VotingSettings;
  nominations_start_at: string | null;
  nominations_end_at: string | null;
  voting_start_at: string | null;
  voting_end_at: string | null;
  winner_id: string | null;
  is_revealed: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface Nominee {
  id: string;
  award_id: string;
  user_id: string;
  nominated_by: string | null;
  nomination_reason: string | null;
  content_url: string | null;
  vote_count: number;
  is_winner: boolean;
  created_at: string;
}

export interface Vote {
  id: string;
  award_id: string;
  voter_id: string;
  nominee_id: string;
  points: number;
  created_at: string;
}

export interface Ceremony {
  id: string;
  group_id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  scheduled_at: string | null;
  is_live: boolean;
  is_completed: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  data: Record<string, unknown>;
  group_id: string | null;
  award_id: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface GalleryImage {
  id: string;
  group_id: string;
  uploaded_by: string;
  media_url: string;
  media_type: 'image' | 'video';
  thumbnail_url: string | null;
  caption: string | null;
  file_size: number | null;
  width: number | null;
  height: number | null;
  created_at: string;
}

export interface Message {
  id: string;
  group_id: string;
  sender_id: string;
  content: string;
  type: 'text' | 'image' | 'video' | 'system';
  metadata: any;
  is_edited: boolean;
  is_deleted: boolean;
  reply_to_id: string | null;
  created_at: string;
}

export interface MessageView extends Message {
  sender_name: string;
  sender_avatar: string | null;
  reply_to_content: string | null;
  reply_to_sender_name: string | null;
}

// ─── Notes (Bloc widget) ──────────────────────────────────────────────
export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

export interface NoteBlock {
  id: string;
  type: 'text' | 'heading' | 'checklist';
  value: string;
  items?: ChecklistItem[];
}

export interface Note {
  id: string;
  group_id: string;
  title: string;
  content: NoteBlock[];
  is_pinned: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ─── Events (Agenda widget) ───────────────────────────────────────────
export type RsvpStatus = 'pending' | 'accepted' | 'declined' | 'maybe';

export interface CalendarEvent {
  id: string;
  group_id: string;
  title: string;
  description: string | null;
  emoji: string;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  is_all_day: boolean;
  color: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface EventParticipant {
  id: string;
  event_id: string;
  user_id: string;
  status: RsvpStatus;
  invited_by: string | null;
  responded_at: string | null;
  created_at: string;
}

export interface EventGalleryLink {
  id: string;
  event_id: string;
  gallery_image_id: string;
  linked_by: string | null;
  is_auto_linked: boolean;
  created_at: string;
}

export interface EventParticipantWithProfile extends EventParticipant {
  user: {
    display_name: string;
    avatar_url: string | null;
  };
}

export interface CalendarEventWithDetails extends CalendarEvent {
  participants: EventParticipantWithProfile[];
  creator: {
    display_name: string;
    avatar_url: string | null;
  };
  gallery_count: number;
}

export interface CreateEventInput {
  group_id: string;
  title: string;
  description?: string;
  emoji?: string;
  location?: string;
  starts_at: string;
  ends_at?: string;
  is_all_day?: boolean;
  color?: string;
  participant_ids?: string[];
}

export interface GalleryImageWithUser extends GalleryImage {
  uploader?: {
    display_name: string;
    avatar_url: string | null;
  };
}

// View types
export interface GroupMemberView extends GroupMember {
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  group_bio?: string | null;
  user_bio?: string | null;
}

export interface AwardWithStats extends Award {
  group_name: string;
  nominee_count: number;
  total_votes: number;
}

// Extended types with relations (for frontend use)
export interface GroupWithMembers extends Group {
  members: GroupMemberView[];
  member_count: number;
}

export interface GroupWithDetails extends GroupWithMembers {
  awards: Award[];
  my_role: MemberRole | null;
}

export interface AwardWithNominees extends Award {
  nominees: NomineeWithProfile[];
  group?: Group;
}

export interface NomineeWithProfile extends Nominee {
  user: Profile;
}

// Input types for creating/updating
export interface CreateGroupInput {
  name: string;
  description?: string;
  icon?: string;
  category?: string;
  cover_image_url?: string;
}

export interface UpdateGroupInput {
  name?: string;
  description?: string | null;
  icon?: string;
  cover_image_url?: string;
  settings?: Partial<GroupSettings>;
}

export interface CreateAwardInput {
  group_id: string;
  name: string;
  description?: string;
  icon?: string;
  category_id?: string;
  vote_type?: VoteType;
  nominee_ids: string[];
  voting_settings?: Partial<VotingSettings>;
}

export interface UpdateAwardInput {
  name?: string;
  description?: string | null;
  icon?: string;
  status?: AwardStatus;
  voting_settings?: Partial<VotingSettings>;
}

// ─── Bucket List (Lista de deseos widget) ─────────────────────────────
export type BucketListCategory = 'restaurants' | 'travel' | 'movies' | 'gifts' | 'other';

export interface BucketListItem {
  id: string;
  group_id: string;
  title: string;
  description: string | null;
  category: BucketListCategory;
  image_url: string | null;
  is_completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  gallery_image_id: string | null;
  created_by: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface BucketListItemWithCreator extends BucketListItem {
  creator: {
    display_name: string;
    avatar_url: string | null;
  };
  completer?: {
    display_name: string;
    avatar_url: string | null;
  } | null;
}

export interface CreateBucketListItemInput {
  group_id: string;
  title: string;
  description?: string;
  category?: BucketListCategory;
  image_url?: string;
}

// Database schema type for Supabase client
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>;
      };
      groups: {
        Row: Group;
        Insert: Omit<Group, 'id' | 'invite_code' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Group, 'id' | 'created_at'>>;
      };
      group_members: {
        Row: GroupMember;
        Insert: Omit<GroupMember, 'id' | 'joined_at' | 'updated_at'>;
        Update: Partial<Omit<GroupMember, 'id' | 'joined_at'>>;
      };
      group_invitations: {
        Row: GroupInvitation;
        Insert: Omit<GroupInvitation, 'id' | 'invite_code' | 'created_at'>;
        Update: Partial<Omit<GroupInvitation, 'id' | 'invite_code' | 'created_at'>>;
      };
      award_categories: {
        Row: AwardCategory;
        Insert: Omit<AwardCategory, 'id' | 'created_at'>;
        Update: Partial<Omit<AwardCategory, 'id' | 'created_at'>>;
      };
      awards: {
        Row: Award;
        Insert: Omit<Award, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Award, 'id' | 'created_at'>>;
      };
      nominees: {
        Row: Nominee;
        Insert: Omit<Nominee, 'id' | 'vote_count' | 'is_winner' | 'created_at'>;
        Update: Partial<Omit<Nominee, 'id' | 'created_at'>>;
      };
      votes: {
        Row: Vote;
        Insert: Omit<Vote, 'id' | 'created_at'>;
        Update: never; // Votes shouldn't be updated
      };
      ceremonies: {
        Row: Ceremony;
        Insert: Omit<Ceremony, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Ceremony, 'id' | 'created_at'>>;
      };
      notifications: {
        Row: Notification;
        Insert: Omit<Notification, 'id' | 'created_at'>;
        Update: Partial<Omit<Notification, 'id' | 'created_at'>>;
      };
      messages: {
        Row: Message;
        Insert: Omit<Message, 'id' | 'created_at'>;
        Update: Partial<Omit<Message, 'id' | 'created_at'>>;
      };
      events: {
        Row: CalendarEvent;
        Insert: Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<CalendarEvent, 'id' | 'created_at'>>;
      };
      event_participants: {
        Row: EventParticipant;
        Insert: Omit<EventParticipant, 'id' | 'created_at'>;
        Update: Partial<Omit<EventParticipant, 'id' | 'created_at'>>;
      };
      event_gallery_links: {
        Row: EventGalleryLink;
        Insert: Omit<EventGalleryLink, 'id' | 'created_at'>;
        Update: never;
      };
    };
    Views: {
      group_members_view: {
        Row: GroupMemberView;
      };
      awards_with_stats: {
        Row: AwardWithStats;
      };
      messages_view: {
        Row: MessageView;
      };
    };
    Functions: {
      generate_invite_code: {
        Args: { length?: number };
        Returns: string;
      };
    };
    Enums: {
      member_role: MemberRole;
      group_status: GroupStatus;
      award_status: AwardStatus;
      invitation_status: InvitationStatus;
      notification_type: NotificationType;
    };
  };
}
