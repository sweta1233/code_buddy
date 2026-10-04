export interface User {
  id: number;
  email: string;
  username: string;
  name: string;
  college: string;
  grad_year: number | null;
}

export interface PlatformAccount {
  platform: string;
  handle: string;
  status: "ok" | "error" | "pending";
  last_error: string;
  last_synced_at: string | null;
  stats: Record<string, unknown> & {
    total_solved?: number;
    easy?: number;
    medium?: number;
    hard?: number;
    difficulty_method?: string;
    difficulty_breakdown_available?: boolean;
    rating?: number | null;
    max_rating?: number | null;
    topics?: { name: string; slug: string; solved: number }[];
  };
}

export interface Overview {
  totals: {
    solved: number;
    easy: number;
    medium: number;
    hard: number;
    rating: number | null;
    active_days: number;
    streak: number;
  };
  platforms: PlatformAccount[];
  topics: { name: string; solved: number }[];
  recent: { platform: string; title: string; url: string; difficulty: string; solved_at: string | null }[];
  insight: string | null;
}

export type RatingSeries = Record<string, { date: string | null; rating: number; name: string }[]>;

export interface PlanTask {
  id: number;
  week_no: number;
  day_no: number;
  topic: string;
  description: string;
  task_type: string;
  resource_url: string;
  target_count: number;
  done: boolean;
}

export interface Plan {
  id: number;
  title: string;
  goal: string;
  summary: string;
  hours_per_day: number;
  target_date: string | null;
  created_at: string | null;
  tasks: PlanTask[];
}

export interface TimeSlot {
  time_range: string;
  title: string;
  activity_type: "theory" | "coding" | "contest" | "review" | "break" | "college_work";
  duration_minutes: number;
  description: string;
  target_problems: string[];
  checklist: string[];
  tips: string;
}

export interface DailyRoutine {
  title: string;
  focus_theme: string;
  total_study_hours: number;
  summary: string;
  slots: TimeSlot[];
  pro_tip: string;
}

export interface SheetQuestion {
  id: number;
  order: number;
  title: string;
  slug: string;
  url: string;
  difficulty: string;
  topics: string[];
  status: "todo" | "done" | "revision";
}

export interface Sheet {
  slug: string;
  name: string;
  description: string;
  source_url: string;
  total: number;
  done: number;
  questions: SheetQuestion[];
}

export interface Contest {
  id?: string;
  platform: string;
  name: string;
  start_time: string;
  duration_minutes: number;
  url: string;
  gcal_url?: string;
}
