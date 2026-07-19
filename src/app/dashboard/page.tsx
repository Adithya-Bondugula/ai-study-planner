'use client';

import React, { useState, useMemo } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { plannerAgent } from '../../agents/planner.agent';
import { identifyDueRevisions } from '../../engines/planner/revisionScheduler';
import { Roadmap } from '../../types';
import { 
  Flame, 
  Award, 
  Sparkles, 
  Play, 
  BookOpen,
  Calendar,
  Layers,
  RefreshCw,
  Clock,
  CheckCircle2,
  TrendingDown,
  TrendingUp
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar 
} from 'recharts';

export default function Dashboard() {
  const { profile, blocks, analytics, roadmaps } = useAppStore();
  const [isPlanning, setIsPlanning] = useState(false);

  // Set greeting based on local time
  const greeting = useMemo(() => {
    const hrs = new Date().getHours();
    if (hrs < 12) return 'Good morning';
    if (hrs < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  // Trigger AI Daily Planner recalculation
  const handleRecalculate = () => {
    setIsPlanning(true);
    setTimeout(() => {
      plannerAgent.generateDailySchedule();
      setIsPlanning(false);
    }, 800);
  };

  // --- 1. Dynamic Metrics & Analytics Calculations ---
  
  // Total study hours logged across all analytics days
  const totalStudyHoursVal = useMemo(() => {
    return parseFloat(analytics.reduce((sum, day) => sum + (day.studyHours || 0), 0).toFixed(1));
  }, [analytics]);

  // Average daily study hours
  const avgStudyHours = useMemo(() => {
    if (analytics.length === 0) return 0;
    const sum = analytics.reduce((s, day) => s + (day.studyHours || 0), 0);
    return parseFloat((sum / analytics.length).toFixed(1));
  }, [analytics]);

  // Gather all items across all roadmaps
  const allRoadmapItems = useMemo(() => {
    return roadmaps.flatMap(r => r.items.map(item => ({ ...item, roadmapTitle: r.title })));
  }, [roadmaps]);

  // Overall roadmap completion percentage
  const overallCompletionPercent = useMemo(() => {
    if (allRoadmapItems.length === 0) return 0;
    const completed = allRoadmapItems.filter(item => item.completionState === 'Completed').length;
    return Math.round((completed / allRoadmapItems.length) * 100);
  }, [allRoadmapItems]);

  // Count of completed roadmap topics
  const completedTopicsCount = useMemo(() => {
    return allRoadmapItems.filter(item => item.completionState === 'Completed').length;
  }, [allRoadmapItems]);

  // Count of active roadmaps (in progress / not completed)
  const activeRoadmapsCount = useMemo(() => {
    return roadmaps.filter(r => r.completionState !== 'Completed').length;
  }, [roadmaps]);

  // --- 2. Spaced Repetition / Revision Analytics ---
  
  // Due revisions list
  const dueRevisions = useMemo(() => {
    const completedItems = allRoadmapItems.filter(item => item.completionState === 'Completed');
    // Call the pure revisionScheduler engine helper
    return identifyDueRevisions(completedItems);
  }, [allRoadmapItems]);

  // Upcoming revisions (completed but not yet due, sorted by next review date)
  const upcomingRevisions = useMemo(() => {
    const completedItems = allRoadmapItems.filter(item => item.completionState === 'Completed');
    const dueIds = new Set(dueRevisions.map(dr => dr.item.id));
    
    // Filter out already due items, sort by projected studied time or estimate
    return completedItems
      .filter(item => !dueIds.has(item.id))
      .map(item => {
        // Estimate next review date based on lastStudied & frequency
        let intervalDays = 7;
        if (item.revisionFrequency === 'Daily') intervalDays = 1;
        else if (item.revisionFrequency === 'Biweekly') intervalDays = 14;
        else if (item.revisionFrequency === 'Monthly') intervalDays = 30;

        const lastDate = item.lastStudied ? new Date(item.lastStudied) : new Date();
        const nextDate = new Date(lastDate.getTime() + intervalDays * 24 * 60 * 60 * 1000);

        return {
          item,
          nextReviewDate: nextDate.toISOString().split('T')[0]
        };
      })
      .sort((a, b) => a.nextReviewDate.localeCompare(b.nextReviewDate))
      .slice(0, 3);
  }, [allRoadmapItems, dueRevisions]);

  // Recently completed revisions (topics studied sorted by lastStudied descending)
  const recentlyCompletedRevisions = useMemo(() => {
    return allRoadmapItems
      .filter(item => item.completionState === 'Completed' && item.lastStudied)
      .sort((a, b) => (b.lastStudied || '').localeCompare(a.lastStudied || ''))
      .slice(0, 3);
  }, [allRoadmapItems]);

  // --- 3. Weakest Topics ---
  const weakestTopics = useMemo(() => {
    return [...allRoadmapItems]
      .sort((a, b) => (b.weaknessScore || 0) - (a.weaknessScore || 0))
      .slice(0, 3);
  }, [allRoadmapItems]);

  // --- 4. Dynamic Skill Radar Data ---
  const skillData = useMemo(() => {
    return roadmaps.map(r => {
      const items = r.items;
      if (items.length === 0) return { subject: r.title, value: 0, fullMark: 100 };
      
      // Calculate subject proficiency: average of interviewReadiness or confidenceScore scaled
      const totalReadiness = items.reduce((sum, item) => {
        let score = item.interviewReadiness || 0;
        if (score === 0 && item.completionState === 'Completed') {
          score = 80; // default readiness weight for completed
        } else if (score === 0) {
          score = (item.confidenceScore || 0) * 20; // fallback to confidence
        }
        return sum + score;
      }, 0);

      const value = Math.round(totalReadiness / items.length);

      // Shorten titles for radar display
      let subject = r.title;
      if (subject.toLowerCase().includes('data structures')) subject = 'DSA';
      else if (subject.toLowerCase().includes('react')) subject = 'React';

      return {
        subject,
        value,
        fullMark: 100
      };
    });
  }, [roadmaps]);

  // Helper to determine heatmap square color opacity based on hours studied
  const getHeatmapColor = (hours: number) => {
    if (hours === 0) return 'bg-slate-900/60 border border-white/5';
    if (hours < 1.5) return 'bg-cyan-950/70 border border-cyan-800/20';
    if (hours < 3) return 'bg-cyan-700/80 border border-cyan-500/30';
    if (hours < 4.5) return 'bg-cyan-500/90 border border-cyan-400/40';
    return 'bg-cyan-400 text-slate-950 font-bold shadow-sm shadow-cyan-400/30';
  };

  // Get weekday letters for heatmap labels
  const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  // Flatten all tasks today
  const todaysTasks = useMemo(() => {
    return blocks.flatMap(b => b.tasks?.map(t => ({ ...t, blockTitle: b.title, blockColor: b.color })) || []);
  }, [blocks]);
  
  const pendingTasks = useMemo(() => {
    return todaysTasks.filter(t => t.status !== 'Completed');
  }, [todaysTasks]);

  // Calculate XP percentage to level up (assume 1000 XP per level)
  const xpPercentage = useMemo(() => {
    const xpInCurrentLevel = profile.xp % 1000;
    return (xpInCurrentLevel / 1000) * 100;
  }, [profile.xp]);

  // Calculate overall roadmap progress percentage per roadmap
  const getRoadmapProgress = (roadmap: Roadmap) => {
    if (!roadmap.items || roadmap.items.length === 0) return 0;
    const completed = roadmap.items.filter(item => item.completionState === 'Completed').length;
    return Math.round((completed / roadmap.items.length) * 100);
  };

  return (
    <div className="flex-1 p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Top Header Card */}
      <div className="glass-panel p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-white/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl" />
        <div className="space-y-1 z-10">
          <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            {greeting}, {profile.name}!
          </h2>
          <p className="text-slate-400 text-sm md:text-base max-w-2xl">
            Today&apos;s daily mission is focused on your target role: <span className="text-cyan-400 font-semibold">{profile.targetRole}</span>. Keep your {profile.streak}-day streak going!
          </p>
        </div>
        <button
          onClick={handleRecalculate}
          disabled={isPlanning}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-purple-600 hover:from-cyan-300 hover:to-purple-500 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shadow-lg shadow-cyan-500/20 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isPlanning ? 'animate-spin' : ''}`} />
          {isPlanning ? 'Planning Engine Running...' : 'Generate Today\'s Plan'}
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left/Middle Column - Gamification & Analytics Heatmap & Path Blocks */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Stats Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Level Panel */}
            <div className="glass-panel p-4 flex flex-col justify-between relative overflow-hidden gap-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Level</p>
                  <p className="text-lg font-black text-white leading-none">Lvl {profile.level}</p>
                </div>
              </div>
              {/* Mini level progress bar */}
              <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden border border-white/5">
                <div className="h-full bg-purple-500" style={{ width: `${xpPercentage}%` }} />
              </div>
            </div>

            {/* Streak Panel */}
            <div className="glass-panel p-4 flex items-center gap-3 relative overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                <Flame className="w-5 h-5 fill-amber-500/20" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Streak</p>
                <p className="text-lg font-black text-amber-400 leading-none">{profile.streak} Days</p>
              </div>
            </div>

            {/* Total XP Panel */}
            <div className="glass-panel p-4 flex items-center gap-3 relative overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Total XP</p>
                <p className="text-lg font-black text-cyan-400 leading-none">{profile.xp}</p>
              </div>
            </div>

            {/* Overall Completion Rate */}
            <div className="glass-panel p-4 flex flex-col justify-between relative overflow-hidden gap-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Completion</p>
                  <p className="text-lg font-black text-emerald-400 leading-none">{overallCompletionPercent}%</p>
                </div>
              </div>
              <div className="text-[10px] text-slate-500 font-semibold leading-none">
                {completedTopicsCount} topics done
              </div>
            </div>
          </div>

          {/* GitHub Study Heatmap */}
          <div className="glass-panel p-5 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base text-white">Study Velocity Heatmap</h3>
                <p className="text-xs text-slate-400">Tracks hours studied daily over the last 6 weeks.</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Study Time</span>
                <span className="text-sm font-black text-white flex items-center gap-1">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  {totalStudyHoursVal} Hours
                </span>
              </div>
            </div>
            
            <div className="flex gap-2 items-start justify-center pt-2 overflow-x-auto">
              {/* Row weekday headers */}
              <div className="grid grid-rows-7 gap-1 text-[10px] text-slate-500 pr-1.5 h-[116px] items-center">
                {weekdays.map((day, idx) => (
                  <span key={idx} className="h-3 text-center">{day}</span>
                ))}
              </div>

              {/* Heatmap Grid */}
              <div className="grid grid-flow-col grid-rows-7 gap-1 h-[116px]">
                {analytics.map((day, idx) => (
                  <div
                    key={idx}
                    className={`w-3.5 h-3.5 rounded-[3px] transition-all hover:scale-125 duration-100 cursor-pointer ${getHeatmapColor(day.studyHours)}`}
                    title={`${day.date}: ${day.studyHours} hours study, ${day.tasksCompleted} tasks`}
                  />
                ))}
              </div>
            </div>

            {/* Heatmap Legend */}
            <div className="flex justify-between items-center text-[10px] text-slate-500 pt-2 border-t border-white/5 font-semibold">
              <span>6 weeks ago</span>
              <div className="flex items-center gap-1">
                <span>Less</span>
                <div className="w-2.5 h-2.5 rounded-[2px] bg-slate-900 border border-white/5" />
                <div className="w-2.5 h-2.5 rounded-[2px] bg-cyan-950/70" />
                <div className="w-2.5 h-2.5 rounded-[2px] bg-cyan-700/80" />
                <div className="w-2.5 h-2.5 rounded-[2px] bg-cyan-500/90" />
                <div className="w-2.5 h-2.5 rounded-[2px] bg-cyan-400" />
                <span>More</span>
              </div>
              <span>Today</span>
            </div>
          </div>

          {/* Today's Schedule Timeline */}
          <div className="glass-panel p-5 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base text-white">Today&apos;s Focus Schedule</h3>
                <p className="text-xs text-slate-400">Calculated by priority scheduler.</p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                {pendingTasks.length} Pending Tasks
              </span>
            </div>

            <div className="space-y-4 pt-2 relative border-l border-white/10 ml-3.5 pl-5">
              {blocks.length === 0 ? (
                <div className="text-center py-6 text-sm text-slate-500">
                  No blocks scheduled. Click &quot;Generate Today&apos;s Plan&quot; above to organize your day.
                </div>
              ) : (
                blocks.map((block) => (
                  <div key={block.id} className="relative group">
                    {/* Time indicator bullet on vertical line */}
                    <span 
                      className="absolute -left-[26px] top-1.5 w-3 h-3 rounded-full border-2 border-slate-950 transition-transform duration-200 group-hover:scale-125 shadow-md shadow-slate-950"
                      style={{ backgroundColor: block.color || '#00f0ff' }}
                    />
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-baseline">
                        <h4 className="font-bold text-sm text-white group-hover:text-cyan-400 transition-colors">
                          {block.title}
                        </h4>
                        <span className="text-[11px] text-slate-400 font-semibold bg-white/5 px-2 py-0.5 rounded-md">
                          {block.startTime} - {block.endTime} ({block.estHours}h)
                        </span>
                      </div>

                      {/* Block Tasks */}
                      <div className="space-y-1.5 pl-1.5">
                        {block.tasks && block.tasks.length > 0 ? (
                          block.tasks.map((task) => (
                            <div 
                              key={task.id} 
                              className="p-2.5 rounded-lg bg-white/5 border border-white/5 hover:border-white/10 flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="space-y-0.5 flex-1 min-w-0">
                                <p className="font-medium text-slate-200 truncate">{task.title}</p>
                                <div className="flex items-center gap-2">
                                  <span className={`text-[10px] font-semibold ${
                                    task.priority === 'High' ? 'text-rose-400' : task.priority === 'Medium' ? 'text-amber-400' : 'text-slate-400'
                                  }`}>
                                    {task.priority} Priority
                                  </span>
                                  <span className="w-1 h-1 rounded-full bg-slate-700" />
                                  <span className="text-slate-500">{task.estDuration} min</span>
                                </div>
                              </div>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                task.status === 'Completed' 
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                  : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                              }`}>
                                {task.status}
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-slate-500 italic pl-1">No tasks allocated in this block.</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Roadmap Progress List */}
          <div className="glass-panel p-5 space-y-4">
            <div>
              <h3 className="font-bold text-base text-white">📈 Roadmap Progress</h3>
              <p className="text-xs text-slate-400">Completion analysis of all selected roadmaps.</p>
            </div>

            <div className="space-y-3.5">
              {roadmaps.map(roadmap => {
                const progress = getRoadmapProgress(roadmap);
                const completedCount = roadmap.items.filter(i => i.completionState === 'Completed').length;
                const totalCount = roadmap.items.length;
                
                // Calculate estimated hours remaining (completed items subtracted)
                const remainingHours = roadmap.items
                  .filter(i => i.completionState !== 'Completed')
                  .reduce((sum, item) => sum + (item.estimatedHours || 0), 0);

                return (
                  <div key={roadmap.id} className="p-3.5 rounded-xl border border-white/5 bg-white/5 space-y-2.5">
                    <div className="flex justify-between items-start gap-2">
                      <div className="space-y-0.5">
                        <span className="font-bold text-xs text-white block">{roadmap.title}</span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {completedCount} of {totalCount} topics completed • {remainingHours} hours remaining
                        </span>
                      </div>
                      <span className="text-xs font-bold text-cyan-400">{progress}%</span>
                    </div>

                    <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden border border-white/5">
                      <div 
                        className="h-full bg-gradient-to-r from-cyan-400 to-purple-600 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right Column - Skill Radar & Weakest & Revisions */}
        <div className="space-y-6">
          
          {/* Skill Radar Chart */}
          <div className="glass-panel p-5 space-y-4">
            <div>
              <h3 className="font-bold text-base text-white">Skill Radar</h3>
              <p className="text-xs text-slate-400">Visualizes subject proficiency levels.</p>
            </div>
            
            <div className="h-60 w-full flex items-center justify-center font-medium">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={skillData}>
                  <PolarGrid stroke="rgba(255,255,255,0.08)" />
                  <PolarAngleAxis 
                    dataKey="subject" 
                    tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                  />
                  <PolarRadiusAxis 
                    angle={30} 
                    domain={[0, 100]} 
                    tick={{ fill: '#64748b', fontSize: 8 }}
                    axisLine={false}
                  />
                  <Radar
                    name="Proficiency"
                    dataKey="value"
                    stroke="#00f0ff"
                    fill="#00f0ff"
                    fillOpacity={0.2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 🔥 Weakest Topics Panel */}
          <div className="glass-panel p-5 space-y-3">
            <div className="flex items-center gap-1.5 text-rose-400 border-b border-white/5 pb-2">
              <TrendingDown className="w-5 h-5" />
              <h3 className="font-bold text-sm uppercase tracking-wider">🔥 Weakest Topics</h3>
            </div>
            <div className="space-y-2.5">
              {weakestTopics.length === 0 ? (
                <p className="text-xs text-slate-500 italic text-center py-4">No weakness metrics logged yet.</p>
              ) : (
                weakestTopics.map((topic, idx) => (
                  <div key={topic.id} className="p-2.5 rounded-lg bg-white/5 border border-white/5 flex items-center justify-between gap-3">
                    <div className="space-y-0.5 min-w-0">
                      <p className="font-bold text-xs text-slate-200 truncate">{idx + 1}. {topic.title}</p>
                      <p className="text-[10px] text-slate-500 font-medium truncate">{topic.roadmapTitle}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-[9px] font-bold text-slate-500 uppercase">WEAKNESS</span>
                        <span className="text-xs font-black text-rose-400">{topic.weaknessScore}%</span>
                      </div>
                      <span className="text-[10px] bg-slate-900 border border-white/5 px-1.5 py-0.5 rounded font-bold text-slate-400" title="Confidence Score">
                        C: {topic.confidenceScore}/5
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 🔁 Revisions Due / Spaced Repetition Panel */}
          <div className="glass-panel p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <div className="flex items-center gap-1.5 text-cyan-400">
                <Calendar className="w-5 h-5" />
                <h3 className="font-bold text-sm uppercase tracking-wider">🔁 Revisions Due</h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[9px] font-black text-cyan-400">
                {dueRevisions.length} Due
              </span>
            </div>

            {/* List of due items */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {dueRevisions.length === 0 ? (
                <p className="text-xs text-slate-500 italic text-center py-4">All revisions complete for today!</p>
              ) : (
                dueRevisions.map(candidate => (
                  <div key={candidate.item.id} className="p-2 rounded-lg bg-cyan-950/20 border border-cyan-500/20 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0 space-y-0.5">
                      <p className="font-semibold text-slate-200 truncate">{candidate.item.title}</p>
                      <p className="text-[9px] text-slate-500 font-medium">Interval: {candidate.sm2Result.intervalDays} day(s)</p>
                    </div>
                    <span className="text-[9px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-1.5 py-0.5 rounded font-bold uppercase shrink-0">
                      DUE
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Spaced Repetition Timeline states */}
            <div className="space-y-2 pt-2 border-t border-white/5 text-[11px]">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Upcoming Review queue</span>
              {upcomingRevisions.map(ur => (
                <div key={ur.item.id} className="flex justify-between items-center text-slate-400">
                  <span className="truncate pr-4">• {ur.item.title}</span>
                  <span className="text-[10px] text-slate-500 shrink-0 font-medium">{ur.nextReviewDate}</span>
                </div>
              ))}

              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block pt-2">Recently studied</span>
              {recentlyCompletedRevisions.length === 0 ? (
                <span className="text-slate-500 italic text-[10px]">No revision history.</span>
              ) : (
                recentlyCompletedRevisions.map(item => (
                  <div key={item.id} className="flex justify-between items-center text-slate-400">
                    <span className="truncate pr-4 text-emerald-500/90 font-medium">• {item.title}</span>
                    <span className="text-[10px] text-slate-500 shrink-0">{item.lastStudied}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Completed Study Sessions Activity Log */}
          <div className="glass-panel p-5 space-y-3">
            <h3 className="font-bold text-sm text-white uppercase tracking-wider border-b border-white/5 pb-2 flex items-center gap-1.5">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              Study Activity Log
            </h3>
            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                <span className="text-[9px] font-bold text-slate-500 uppercase block mb-0.5">Average hours</span>
                <span className="text-white font-black text-sm">{avgStudyHours}h / day</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                <span className="text-[9px] font-bold text-slate-500 uppercase block mb-0.5">Active Roadmaps</span>
                <span className="text-white font-black text-sm">{activeRoadmapsCount} Active</span>
              </div>
            </div>

            <div className="space-y-1.5 pt-2 text-[11px]">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Recently completed topics</span>
              {recentlyCompletedRevisions.length === 0 ? (
                <p className="text-[10px] text-slate-500 italic">No topics completed yet.</p>
              ) : (
                recentlyCompletedRevisions.slice(0, 2).map(item => (
                  <div key={item.id} className="flex items-center gap-1.5 p-2 rounded bg-emerald-500/5 border border-emerald-500/10 text-slate-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">{item.title}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="glass-panel p-5 space-y-3">
            <h3 className="font-bold text-base text-white">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button className="flex flex-col items-center justify-center p-3 rounded-xl border border-white/5 hover:border-cyan-500/20 hover:bg-cyan-500/5 transition-all text-center gap-1.5 cursor-pointer group">
                <Play className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
                <span className="font-medium text-slate-200">Focus Mode</span>
              </button>
              <button className="flex flex-col items-center justify-center p-3 rounded-xl border border-white/5 hover:border-purple-500/20 hover:bg-purple-500/5 transition-all text-center gap-1.5 cursor-pointer group">
                <BookOpen className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform" />
                <span className="font-medium text-slate-200">Study Notes</span>
              </button>
              <button className="flex flex-col items-center justify-center p-3 rounded-xl border border-white/5 hover:border-emerald-500/20 hover:bg-emerald-500/5 transition-all text-center gap-1.5 cursor-pointer group">
                <Calendar className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                <span className="font-medium text-slate-200">Calendar</span>
              </button>
              <button className="flex flex-col items-center justify-center p-3 rounded-xl border border-white/5 hover:border-amber-500/20 hover:bg-amber-500/5 transition-all text-center gap-1.5 cursor-pointer group">
                <Layers className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
                <span className="font-medium text-slate-200">Quiz & Deck</span>
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
