-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table (Linked to Supabase Auth Users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    avatar_url TEXT,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    streak INTEGER DEFAULT 0,
    last_active_date DATE,
    daily_hours_goal NUMERIC DEFAULT 4.0,
    weekly_hours_goal NUMERIC DEFAULT 24.0,
    career_goals TEXT,
    current_role TEXT,
    target_role TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Study Blocks
CREATE TABLE public.blocks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    priority TEXT DEFAULT 'Medium',
    est_hours NUMERIC DEFAULT 1.0,
    start_time TIME,
    end_time TIME,
    order_index INTEGER DEFAULT 0,
    is_collapsed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Tasks
CREATE TABLE public.tasks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    block_id UUID REFERENCES public.blocks(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    est_duration INTEGER DEFAULT 60, -- in minutes
    priority TEXT DEFAULT 'Medium',
    difficulty TEXT DEFAULT 'Medium',
    status TEXT DEFAULT 'Todo', -- 'Backlog', 'Todo', 'In Progress', 'Completed'
    tags TEXT[] DEFAULT '{}',
    attachments JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    resources JSONB DEFAULT '[]'::jsonb,
    roadmap_ref_id UUID,
    ai_suggestions TEXT,
    progress INTEGER DEFAULT 0, -- 0-100%
    checklist JSONB DEFAULT '[]'::jsonb, -- e.g. [{"id": "1", "title": "Setup", "done": false}]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Subtasks
CREATE TABLE public.subtasks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    parent_task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'Todo', -- 'Todo', 'Completed'
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. Roadmaps
CREATE TABLE public.roadmaps (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    difficulty TEXT DEFAULT 'Medium',
    estimated_hours NUMERIC DEFAULT 0.0,
    icon TEXT,
    color TEXT,
    completion_state TEXT DEFAULT 'Not Started',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. Roadmap Items
CREATE TABLE public.roadmap_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    roadmap_id UUID REFERENCES public.roadmaps(id) ON DELETE CASCADE NOT NULL,
    parent_id UUID REFERENCES public.roadmap_items(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    difficulty TEXT DEFAULT 'Medium',
    estimated_hours NUMERIC DEFAULT 1.0,
    prerequisites UUID[] DEFAULT '{}',
    resources JSONB DEFAULT '[]'::jsonb,
    practice_questions JSONB DEFAULT '[]'::jsonb,
    interview_questions JSONB DEFAULT '[]'::jsonb,
    revision_frequency TEXT DEFAULT 'Weekly', -- 'Daily', 'Weekly', 'Biweekly', 'Monthly'
    completion_state TEXT DEFAULT 'Not Started', -- 'Not Started', 'In Progress', 'Completed'
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 7. Projects
CREATE TABLE public.projects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    overview TEXT,
    documentation TEXT,
    milestones JSONB DEFAULT '[]'::jsonb,
    timeline JSONB DEFAULT '[]'::jsonb,
    tasks JSONB DEFAULT '[]'::jsonb,
    issues JSONB DEFAULT '[]'::jsonb,
    files JSONB DEFAULT '[]'::jsonb,
    github_repo TEXT,
    ai_suggestions TEXT,
    readme_content TEXT,
    progress INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 8. Notes
CREATE TABLE public.notes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    tags TEXT[] DEFAULT '{}',
    folder TEXT DEFAULT 'All',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 9. Study Sessions (Gamification & Heatmap input)
CREATE TABLE public.study_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    block_id UUID REFERENCES public.blocks(id) ON DELETE SET NULL,
    task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
    duration_minutes INTEGER NOT NULL,
    xp_earned INTEGER DEFAULT 0,
    focus_mode BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 10. Achievements Table
CREATE TABLE public.achievements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    badge_url TEXT,
    points INTEGER DEFAULT 50,
    requirement_type TEXT NOT NULL, -- 'STREAK', 'XP', 'TIME', 'ROADMAP'
    requirement_value INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 11. User Achievements Junction
CREATE TABLE public.user_achievements (
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    achievement_id UUID REFERENCES public.achievements(id) ON DELETE CASCADE NOT NULL,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    PRIMARY KEY (profile_id, achievement_id)
);

-- 12. Analytics Summary (Caching daily states)
CREATE TABLE public.analytics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    study_hours NUMERIC DEFAULT 0.0,
    coding_hours NUMERIC DEFAULT 0.0,
    tasks_completed INTEGER DEFAULT 0,
    focus_sessions_count INTEGER DEFAULT 0,
    learning_velocity NUMERIC DEFAULT 0.0,
    ai_interactions_count INTEGER DEFAULT 0,
    UNIQUE(profile_id, date)
);

-- 13. Notifications
CREATE TABLE public.notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info', -- 'info', 'success', 'warning', 'system'
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 14. Calendar Events
CREATE TABLE public.calendar_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    type TEXT DEFAULT 'study', -- 'study', 'interview', 'revision', 'event'
    color TEXT,
    is_all_day BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 15. Career Hub: Job Applications
CREATE TABLE public.applications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    company_name TEXT NOT NULL,
    position TEXT NOT NULL,
    salary TEXT,
    status TEXT DEFAULT 'Applied', -- 'Applied', 'Interviewing', 'Offer', 'Rejected'
    stages JSONB DEFAULT '[]'::jsonb, -- stages timeline e.g. [{"stage": "HR round", "date": "...", "status": "passed"}]
    hr_contacts JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    interview_date TIMESTAMP WITH TIME ZONE,
    ai_prep_suggestions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 16. Resumes
CREATE TABLE public.resumes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    file_url TEXT,
    parsed_content TEXT,
    feedback JSONB DEFAULT '[]'::jsonb,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 17. Flashcards
CREATE TABLE public.flashcards (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    deck_name TEXT DEFAULT 'Default',
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    next_review TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    interval_days INTEGER DEFAULT 0,
    ease_factor NUMERIC DEFAULT 2.5,
    repetitions INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 18. Settings
CREATE TABLE public.settings (
    profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    dark_mode BOOLEAN DEFAULT TRUE,
    notifications_enabled BOOLEAN DEFAULT TRUE,
    focus_ambient_sound TEXT DEFAULT 'none',
    focus_timer_duration INTEGER DEFAULT 25,
    break_timer_duration INTEGER DEFAULT 5,
    ai_model_preference TEXT DEFAULT 'gemini-1.5-pro'
);

-- 19. Knowledge Graph Nodes
CREATE TABLE public.graph_nodes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    entity_type TEXT NOT NULL, -- 'ROADMAP_ITEM', 'NOTE', 'PROJECT', 'FLASHCARD', 'QUIZ', 'INTERVIEW_QUESTION', 'APPLICATION', 'RESUME_SKILL'
    entity_id UUID NOT NULL,
    label TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 20. Knowledge Graph Edges
CREATE TABLE public.graph_edges (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    source_node_id UUID REFERENCES public.graph_nodes(id) ON DELETE CASCADE NOT NULL,
    target_node_id UUID REFERENCES public.graph_nodes(id) ON DELETE CASCADE NOT NULL,
    relation_type TEXT NOT NULL, -- 'PREREQUISITE_OF', 'REFERENCES', 'PRACTICED_IN', 'TESTED_BY', 'USED_IN', 'REQUIRED_FOR'
    weight NUMERIC DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(source_node_id, target_node_id, relation_type)
);

-- 21. AI Memory Engine
CREATE TABLE public.ai_memories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    memory_key TEXT NOT NULL,
    memory_value JSONB NOT NULL,
    confidence_score NUMERIC DEFAULT 1.0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(profile_id, memory_key)
);

-- 22. Integrations Sync Tracking
CREATE TABLE public.integrations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    platform TEXT NOT NULL, -- 'GITHUB', 'GOOGLE_CALENDAR', 'LEETCODE', 'NOTION'
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    sync_status TEXT DEFAULT 'CONNECTED',
    config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(profile_id, platform)
);

-- 23. Agent Task Execution Pipeline
CREATE TABLE public.agent_actions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    agent_name TEXT NOT NULL, -- 'PLANNER', 'TEACHER', 'CAREER', 'DEV'
    user_request TEXT NOT NULL,
    detected_intent TEXT NOT NULL,
    steps JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'PENDING',
    approval_required BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
