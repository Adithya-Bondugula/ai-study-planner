-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.graph_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.graph_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_actions ENABLE ROW LEVEL SECURITY;

-- 1. Profiles Policies
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- 2. Blocks Policies
CREATE POLICY "Users can perform all operations on own blocks" ON public.blocks
    FOR ALL USING (auth.uid() = profile_id);

-- 3. Tasks Policies
-- Tasks are nested under blocks, we check block ownership or profile_id on tasks if we had it, but block relation is used:
-- Since blocks table has profile_id, we can verify block ownership:
CREATE POLICY "Users can perform all operations on own tasks" ON public.tasks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.blocks 
            WHERE blocks.id = tasks.block_id AND blocks.profile_id = auth.uid()
        )
    );

-- 4. Subtasks Policies
CREATE POLICY "Users can perform all operations on own subtasks" ON public.subtasks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.tasks
            JOIN public.blocks ON blocks.id = tasks.block_id
            WHERE tasks.id = subtasks.parent_task_id AND blocks.profile_id = auth.uid()
        )
    );

-- 5. Roadmaps Policies
CREATE POLICY "Users can perform all operations on own roadmaps" ON public.roadmaps
    FOR ALL USING (auth.uid() = profile_id);

-- 6. Roadmap Items Policies
CREATE POLICY "Users can perform all operations on own roadmap items" ON public.roadmap_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.roadmaps
            WHERE roadmaps.id = roadmap_items.roadmap_id AND roadmaps.profile_id = auth.uid()
        )
    );

-- 7. Projects Policies
CREATE POLICY "Users can perform all operations on own projects" ON public.projects
    FOR ALL USING (auth.uid() = profile_id);

-- 8. Notes Policies
CREATE POLICY "Users can perform all operations on own notes" ON public.notes
    FOR ALL USING (auth.uid() = profile_id);

-- 9. Study Sessions Policies
CREATE POLICY "Users can perform all operations on own study sessions" ON public.study_sessions
    FOR ALL USING (auth.uid() = profile_id);

-- 10. User Achievements Policies
CREATE POLICY "Users can view own achievements link" ON public.user_achievements
    FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY "System/User can insert own achievements link" ON public.user_achievements
    FOR INSERT WITH CHECK (auth.uid() = profile_id);

-- 11. Analytics Policies
CREATE POLICY "Users can view own analytics records" ON public.analytics
    FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY "Users can manage own analytics records" ON public.analytics
    FOR ALL USING (auth.uid() = profile_id);

-- 12. Notifications Policies
CREATE POLICY "Users can manage own notifications" ON public.notifications
    FOR ALL USING (auth.uid() = profile_id);

-- 13. Calendar Events Policies
CREATE POLICY "Users can manage own calendar events" ON public.calendar_events
    FOR ALL USING (auth.uid() = profile_id);

-- 14. Applications Policies
CREATE POLICY "Users can manage own job applications" ON public.applications
    FOR ALL USING (auth.uid() = profile_id);

-- 15. Resumes Policies
CREATE POLICY "Users can manage own resumes" ON public.resumes
    FOR ALL USING (auth.uid() = profile_id);

-- 16. Flashcards Policies
CREATE POLICY "Users can manage own flashcards" ON public.flashcards
    FOR ALL USING (auth.uid() = profile_id);

-- 17. Settings Policies
CREATE POLICY "Users can manage own settings" ON public.settings
    FOR ALL USING (auth.uid() = profile_id);

-- 18. Graph Nodes Policies
CREATE POLICY "Users can manage own graph nodes" ON public.graph_nodes
    FOR ALL USING (auth.uid() = profile_id);

-- 19. Graph Edges Policies
CREATE POLICY "Users can manage own graph edges" ON public.graph_edges
    FOR ALL USING (auth.uid() = profile_id);

-- 20. Memories Policies
CREATE POLICY "Users can manage own AI memories" ON public.ai_memories
    FOR ALL USING (auth.uid() = profile_id);

-- 21. Integrations Policies
CREATE POLICY "Users can manage own integrations credentials" ON public.integrations
    FOR ALL USING (auth.uid() = profile_id);

-- 22. Agent Actions Policies
CREATE POLICY "Users can manage own agent action pipeline logs" ON public.agent_actions
    FOR ALL USING (auth.uid() = profile_id);
