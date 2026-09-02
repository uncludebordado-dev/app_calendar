/**
 * Tipos de la base. Generá la versión canónica con:
 *   supabase gen types typescript --project-id <ref> --schema public > src/types/database.types.ts
 * Se usan `type` (no `interface`) a propósito: supabase-js exige que cada Row/Insert
 * sea asignable a `Record<string, unknown>`, y sólo los type-alias reciben índice implícito.
 */

export type BookingStatus = "confirmed" | "cancelled";
export type ProfileRole = "alumna" | "admin";
export type EmailEventType = "booking_confirmed" | "booking_cancelled";

export type Profile = {
  id: string;
  full_name: string;
  phone_e164: string;
  role: ProfileRole;
  strikes: number;
  blocked: boolean;
  created_at: string;
  updated_at: string;
};

export type AvailabilitySlot = {
  id: string;
  class_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM:SS
  end_time: string; // HH:MM:SS
  capacity: number;
  booked_count: number;
  notes: string | null;
  is_published: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Booking = {
  id: string;
  slot_id: string;
  user_id: string;
  status: BookingStatus;
  late_cancellation: boolean;
  no_show: boolean;
  created_at: string;
  cancelled_at: string | null;
  cancelled_by: string | null;
};

export type EmailEvent = {
  id: string;
  type: EmailEventType;
  booking_id: string | null;
  payload: Record<string, unknown>;
  processed_at: string | null;
  error: string | null;
  created_at: string;
};

export type AdminRosterRow = {
  slot_id: string;
  class_date: string;
  start_time: string;
  end_time: string;
  capacity: number;
  booked_count: number;
  notes: string | null;
  is_published: boolean;
  booking_id: string | null;
  booking_status: BookingStatus | null;
  no_show: boolean | null;
  late_cancellation: boolean | null;
  student_name: string | null;
  student_phone: string | null;
  student_email: string | null;
  booked_at: string | null;
};

export type AdminStudentRow = {
  id: string;
  full_name: string;
  phone_e164: string;
  email: string;
  strikes: number;
  blocked: boolean;
  confirmed_count: number;
  cancelled_count: number;
  created_at: string;
};

type InsertOf<T, Required extends keyof T = never> = Partial<T> &
  ([Required] extends [never] ? Record<never, never> : Pick<T, Required>);

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: InsertOf<Profile, "id">;
        Update: Partial<Profile>;
        Relationships: [];
      };
      availability_slots: {
        Row: AvailabilitySlot;
        Insert: InsertOf<AvailabilitySlot, "class_date" | "start_time" | "end_time">;
        Update: Partial<AvailabilitySlot>;
        Relationships: [];
      };
      bookings: {
        Row: Booking;
        Insert: InsertOf<Booking, "slot_id" | "user_id">;
        Update: Partial<Booking>;
        Relationships: [
          {
            foreignKeyName: "bookings_slot_id_fkey";
            columns: ["slot_id"];
            isOneToOne: false;
            referencedRelation: "availability_slots";
            referencedColumns: ["id"];
          },
        ];
      };
      email_events: {
        Row: EmailEvent;
        Insert: InsertOf<EmailEvent, "type" | "payload">;
        Update: Partial<Pick<EmailEvent, "processed_at" | "error">>;
        Relationships: [];
      };
      rate_limits: {
        Row: { id: number; bucket: string; subject: string; created_at: string };
        Insert: { bucket: string; subject: string };
        Update: { bucket?: string; subject?: string };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      book_slot: { Args: { p_slot_id: string }; Returns: Booking };
      cancel_booking: { Args: { p_booking_id: string }; Returns: Booking };
      mark_no_show: { Args: { p_booking_id: string }; Returns: undefined };
      reset_strikes: { Args: { p_user_id: string }; Returns: undefined };
      check_rate_limit: {
        Args: { p_bucket: string; p_subject: string; p_max: number; p_window_seconds: number };
        Returns: boolean;
      };
      admin_rosters_between: {
        Args: { p_from: string; p_to: string };
        Returns: AdminRosterRow[];
      };
      admin_list_students: {
        Args: Record<string, never>;
        Returns: AdminStudentRow[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
