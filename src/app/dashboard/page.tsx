'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { plannerAgent } from '../../agents/planner.agent';
import { 
  Flame, 
  Award, 
  Sparkles, 
  Play, 
  BookOpen,
  Calendar,
  Layers,
  RefreshCw
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
  const { profile, blocks, analytics} = useAppStore();
  const [greeting, setGreeting] = useState('Welcome back');
  const [isPlanning, setIsPlanning] = useState(false);

  // Set greeting based on local time
  useEffect(() => {
    const hrs = new Date().getHours();
    setTimeout(() => {
      if (hrs < 12) setGreeting('Good morning');
      else if (hrs < 17) setGreeting('Good afternoon');
      else setGreeting('Good evening');
    }, 0);
  }, []);

  // Trigger AI Daily Planner recalculation
  const handleRecalculate = () => {
    setIsPlanning(true);
    setTimeout(() => {
      plannerAgent.generateDailySchedule();
      setIsPlanning(false);
    }, 800);
  };

  // Prepare skill radar data dynamically from roadmaps
  const skillData = [
    { subject: 'DSA', value: 85, fullMark: 100 },
    { subject: 'React', value: 70, fullMark: 100 },
    { subject: 'SQL', value: 80, fullMark: 100 },
    { subject: 'Systems', value: 45, fullMark: 100 },
    { subject: 'AI / PyTorch', value: 55, fullMark: 100 },
  ];

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
  const todaysTasks = blocks.flatMap(b => b.tasks?.map(t => ({ ...t, blockTitle: b.title, blockColor: b.color })) || []);
  const pendingTasks = todaysTasks.filter(t => t.status !== 'Completed');

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
        
        {/* Left Column - Gamification & Analytics Heatmap */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Stats Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Level Panel */}
            <div className="glass-panel p-4 flex items-center gap-4 relative overflow-hidden">
              <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Current Level</p>
                <p className="text-2xl font-black text-white">Lvl {profile.level}</p>
              </div>
            </div>

            {/* Streak Panel */}
            <div className="glass-panel p-4 flex items-center gap-4 relative overflow-hidden">
              <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Flame className="w-6 h-6 fill-amber-500/20" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Study Streak</p>
                <p className="text-2xl font-black text-amber-400">{profile.streak} Days</p>
              </div>
            </div>

            {/* Total XP Panel */}
            <div className="glass-panel p-4 flex items-center gap-4 relative overflow-hidden">
              <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total XP</p>
                <p className="text-2xl font-black text-cyan-400">{profile.xp} Points</p>
              </div>
            </div>
          </div>

          {/* GitHub Study Heatmap */}
          <div className="glass-panel p-5 space-y-4">
            <div>
              <h3 className="font-bold text-base text-white">Study Velocity Heatmap</h3>
              <p className="text-xs text-slate-400">Tracks hours studied daily over the last 6 weeks.</p>
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
            <div className="flex justify-between items-center text-[10px] text-slate-500 pt-2 border-t border-white/5">
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
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-semibold text-cyan-400 uppercase tracking-wider">
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
                                  <span className="w-1 h-1 rounded-full bg-slate-600" />
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

        </div>

        {/* Right Column - Skill Radar & AI insights */}
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

          {/* AI Insights Card */}
          <div className="glass-panel p-5 space-y-4 border border-cyan-500/25 shadow-lg shadow-cyan-500/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-cyan-400/5 rounded-full blur-xl" />
            <div className="flex items-center gap-2 text-cyan-400">
              <Sparkles className="w-4 h-4" />
              <h3 className="font-bold text-sm uppercase tracking-wider">AI Insights & Advice</h3>
            </div>
            
            <div className="space-y-3.5 text-xs text-slate-300">
              <p className="leading-relaxed">
                Analyzing your study heatmap: You have been highly consistent over the last 14 days, averaging <span className="text-cyan-400 font-semibold">3.8 hours</span>/day.
              </p>
              
              <div className="p-2.5 rounded-lg bg-white/5 space-y-1.5 border border-white/5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">Strong Subjects</span>
                <p className="text-slate-400">Arrays, Hashing and Java fundamentals (95% correctness).</p>
              </div>

              <div className="p-2.5 rounded-lg bg-white/5 space-y-1.5 border border-white/5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Recommended Next Step</span>
                <p className="text-slate-400">Your Google interview onsite is in 10 days. The AI suggests scheduling a focus block on Binary Trees DFS/BFS traversal tomorrow.</p>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
