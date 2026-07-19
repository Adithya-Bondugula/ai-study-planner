'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { taskRepository } from '../../repositories/task.repository';

import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  Maximize2, 
  Minimize2, 
  CheckSquare, 
  Square,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function FocusPage() {
  const { blocks, logStudySession } = useAppStore();
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  
  // Timer State
  const [duration, setDuration] = useState<number>(50); // in minutes
  const [timeLeft, setTimeLeft] = useState<number>(50 * 60); // in seconds
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [timerMode, setTimerMode] = useState<'focus' | 'break'>('focus');
  const [ambientSound, setAmbientSound] = useState<string>('none');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Flatten all tasks today
  const todaysTasks = blocks.flatMap(b => b.tasks?.map(t => ({ ...t, blockTitle: b.title })) || []);
  
  // Set default task if available (deferred to avoid direct setState in effect)
  useEffect(() => {
    if (todaysTasks.length > 0 && !selectedTaskId) {
      setTimeout(() => setSelectedTaskId(todaysTasks[0].id), 0);
    }
  }, [todaysTasks, selectedTaskId]);

  const effectiveTaskId = selectedTaskId || (todaysTasks[0]?.id ?? '');
  const activeTask = todaysTasks.find(t => t.id === effectiveTaskId) || null;

  // Adjust timer value when duration settings change (deferred to avoid direct setState in effect)
  useEffect(() => {
    if (!isRunning) {
      setTimeout(() => setTimeLeft(duration * 60), 0);
    }
  }, [duration, isRunning]);


  const handleTimerComplete = useCallback(() => {
    setIsRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);

    // Play sound notification
    try {
      // Create AudioContext without using 'any' type
      const AudioCtxCtor = (window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) as typeof AudioContext;
      if (!AudioCtxCtor) throw new Error('AudioContext not supported');
      const audioCtx = new AudioCtxCtor();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.setValueAtTime(523.25, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.5);
    } catch {
      console.log('Audio Context blocked or not supported');
    }

    // Trigger Confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#00f0ff', '#bd00ff', '#00e676'],
    });

    if (timerMode === 'focus') {
      // Recompute todays tasks locally to avoid stale dependency
      const todays = blocks.flatMap(b => b.tasks?.map(t => ({ ...t, blockTitle: b.title })) || []);
      const currentTask = todays.find(t => t.id === selectedTaskId);
      const xpEarned = duration * 2;
      logStudySession(
        currentTask?.blockId,
        currentTask?.id,
        duration,
        xpEarned,
        true,
      );

      // Switch to break mode
      setTimerMode('break');
      setDuration(10);
      setTimeLeft(10 * 60);

      if (currentTask) {
        taskRepository.updateTask(currentTask.id, { progress: 100, status: 'Completed' });
      }
    } else {
      setTimerMode('focus');
      setDuration(50);
      setTimeLeft(50 * 60);
    }
  }, [duration, timerMode, selectedTaskId, logStudySession, blocks]);

  // Core Timer Interval
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, handleTimerComplete]);

  const handleStartPause = () => {
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(duration * 60);
  };

  // Skip Timer helper
  const handleSkip = () => {
    handleTimerComplete();
  };

  // Helper to format remaining time MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate SVG stroke offset
  const totalSeconds = duration * 60;
  const strokeDasharray = 2 * Math.PI * 90; // radius = 90
  const strokeDashoffset = strokeDasharray - (timeLeft / totalSeconds) * strokeDasharray;

  // Toggle checklist tasks from Focus Mode
  const handleToggleChecklist = (taskId: string, itemId: string) => {
    taskRepository.toggleChecklistItem(taskId, itemId);
  };

  return (
    <div className={`flex-1 flex flex-col p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6 ${isFullscreen ? 'fixed inset-0 bg-slate-950/95 z-50 p-8 justify-center overflow-y-auto' : ''}`}>
      
      {/* Fullscreen header toggle */}
      {isFullscreen && (
        <div className="absolute top-6 right-6 flex items-center gap-3">
          <button 
            onClick={() => setIsFullscreen(false)}
            className="p-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-white cursor-pointer transition-all"
            title="Exit Fullscreen"
          >
            <Minimize2 className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className={`grid grid-cols-1 ${isFullscreen ? '' : 'lg:grid-cols-3'} gap-6 items-start`}>
        
        {/* Left Side: Focus Timer Ring */}
        <div className={`glass-panel p-6 flex flex-col items-center justify-center space-y-6 ${isFullscreen ? 'lg:col-span-3 border-none bg-transparent shadow-none' : 'lg:col-span-2'}`}>
          <div className="text-center">
            <span className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-bold uppercase tracking-wider text-cyan-400">
              {timerMode === 'focus' ? 'Focus Mode' : 'Rest Break'}
            </span>
            {activeTask && !isFullscreen && (
              <p className="text-slate-400 text-sm mt-2">Active: <span className="text-white font-medium">{activeTask.title}</span></p>
            )}
          </div>

          {/* SVG Progress Ring */}
          <div className="relative w-72 h-72 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90">
              {/* Background circle */}
              <circle
                cx="144"
                cy="144"
                r="90"
                className="stroke-slate-900 fill-none"
                strokeWidth="10"
              />
              {/* Foreground circle indicator */}
              <circle
                cx="144"
                cy="144"
                r="90"
                className={`fill-none transition-all duration-300 ${
                  timerMode === 'focus' ? 'stroke-cyan-400' : 'stroke-emerald-400'
                }`}
                strokeWidth="10"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>

            {/* Centered Timer Number */}
            <div className="absolute text-center space-y-1">
              <span className="text-5xl font-black text-white tracking-tighter">
                {formatTime(timeLeft)}
              </span>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                {isRunning ? 'Session Active' : 'Session Paused'}
              </p>
            </div>
          </div>

          {/* Core Controls */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleReset}
              className="p-3.5 rounded-full bg-slate-900 border border-white/5 hover:border-white/10 hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer transition-all"
              title="Reset Timer"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            
            <button
              onClick={handleStartPause}
              className={`p-5 rounded-full text-slate-950 cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-lg ${
                timerMode === 'focus' 
                  ? 'bg-cyan-400 shadow-cyan-400/20' 
                  : 'bg-emerald-400 shadow-emerald-400/20'
              }`}
            >
              {isRunning ? <Pause className="w-6 h-6 fill-slate-950" /> : <Play className="w-6 h-6 fill-slate-950 ml-0.5" />}
            </button>

            <button
              onClick={handleSkip}
              className="p-3.5 rounded-full bg-slate-900 border border-white/5 hover:border-white/10 hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer transition-all"
              title="Skip Session"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Sliders for time adjustments */}
          {!isRunning && !isFullscreen && (
            <div className="w-full max-w-sm flex items-center justify-between text-xs text-slate-400 pt-2 gap-4">
              <div className="space-y-1.5 flex-1">
                <div className="flex justify-between font-medium">
                  <span>Focus Block:</span>
                  <span className="text-cyan-400 font-bold">{duration} min</span>
                </div>
                <input 
                  type="range" 
                  min="5" 
                  max="120" 
                  step="5" 
                  value={duration} 
                  onChange={(e) => {
                    const newDur = parseInt(e.target.value);
                    setDuration(newDur);
                    if (!isRunning) setTimeLeft(newDur * 60);
                  }}
                  className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-900 rounded-full" 
                />
              </div>
            </div>
          )}

          {/* Sound select & Fullscreen */}
          {!isFullscreen && (
            <div className="w-full flex items-center justify-between gap-4 pt-4 border-t border-white/5 text-xs text-slate-400">
              <div className="flex items-center gap-3">
                <Volume2 className="w-4 h-4 text-slate-500" />
                <span className="font-medium">Ambience:</span>
                <select 
                  value={ambientSound} 
                  onChange={(e) => setAmbientSound(e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded px-2 py-1 outline-none text-slate-300"
                >
                  <option value="none">None</option>
                  <option value="rain">Rainfall</option>
                  <option value="lofi">Lofi Cafe</option>
                  <option value="forest">Forest Birds</option>
                </select>
              </div>

              <button
                onClick={() => setIsFullscreen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 hover:bg-white/5 text-white font-medium cursor-pointer transition-all"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                Distraction-Free
              </button>
            </div>
          )}
        </div>

        {/* Right Side: Task lists & outlines */}
        <div className={`space-y-6 ${isFullscreen ? 'lg:col-span-3 max-w-2xl mx-auto w-full' : ''}`}>
          
          {/* Task Select Panel */}
          {!isFullscreen && (
            <div className="glass-panel p-5 space-y-3">
              <h3 className="font-bold text-sm text-white">Focus Task</h3>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Select topic to study</label>
                <select
                  value={selectedTaskId || (todaysTasks[0]?.id ?? '')}
                  onChange={(e) => setSelectedTaskId(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 outline-none text-slate-200 text-sm focus:border-cyan-400"
                >
                  {todaysTasks.length === 0 ? (
                    <option value="">No tasks generated today</option>
                  ) : (
                    todaysTasks.map(t => (
                      <option key={t.id} value={t.id}>
                        [{t.blockTitle.split(':')[0]}] {t.title}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>
          )}

          {/* Active Task Details & Checklist */}
          {activeTask ? (
            <div className="glass-panel p-5 space-y-4 relative overflow-hidden">
              {isFullscreen && (
                <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />
              )}
              
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">Target Objectives</span>
                <h3 className="font-bold text-base text-white mt-0.5">{activeTask.title}</h3>
                {activeTask.description && (
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{activeTask.description}</p>
                )}
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-semibold text-slate-400">
                  <span>Task Completion</span>
                  <span className="text-cyan-400">{activeTask.progress}%</span>
                </div>
                <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden border border-white/5">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-400 to-purple-600 rounded-full transition-all duration-300"
                    style={{ width: `${activeTask.progress}%` }}
                  />
                </div>
              </div>

              {/* Checklist items */}
              {activeTask.checklist && activeTask.checklist.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Interactive Checklist</span>
                  <div className="space-y-2">
                    {activeTask.checklist.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => handleToggleChecklist(activeTask.id, c.id)}
                        className="flex items-start gap-2.5 w-full text-left text-xs text-slate-300 hover:text-white transition-colors cursor-pointer group"
                      >
                        {c.done ? (
                          <CheckSquare className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5 fill-cyan-400/10" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-600 group-hover:text-slate-400 shrink-0 mt-0.5" />
                        )}
                        <span className={c.done ? 'line-through text-slate-500' : ''}>
                          {c.title}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Study Companion Tips */}
              {activeTask.aiSuggestions && (
                <div className="p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/10 flex gap-2.5 text-xs text-slate-300 mt-2">
                  <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 leading-none">AI Coach Tip</span>
                    <p className="text-slate-400 leading-relaxed">{activeTask.aiSuggestions}</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="glass-panel p-6 text-center text-sm text-slate-500">
              Select or generate a task to view target checklist.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
