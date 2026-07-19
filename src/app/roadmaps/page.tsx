'use client';

import React, { useState, useMemo } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { roadmapRepository } from '../../repositories/roadmap.repository';
import { topologicalSort } from '../../engines/planner/dependency';
import { Roadmap, RoadmapItem } from '../../types';
import { 
  Compass, 
  CheckCircle2, 
  Circle, 
  Lock, 
  Play, 
  BookOpen, 
  Clock, 
  AlertCircle, 
  HelpCircle, 
  ChevronRight, 
  ExternalLink,
  Award
} from 'lucide-react';

export default function RoadmapsPage() {
  const { roadmaps } = useAppStore();
  const [selectedRoadmapId, setSelectedRoadmapId] = useState<string>('');
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [revealSolutions, setRevealSolutions] = useState<Record<string, boolean>>({});

  // Derive active roadmap: defaults to first one if none selected
  const activeRoadmap = useMemo(() => {
    if (roadmaps.length === 0) return null;
    return roadmaps.find(r => r.id === selectedRoadmapId) || roadmaps[0];
  }, [roadmaps, selectedRoadmapId]);

  // Topological sort of active roadmap items (memoized)
  const sortedItems = useMemo(() => {
    return activeRoadmap ? topologicalSort(activeRoadmap.items) : [];
  }, [activeRoadmap]);

  // Derive active item: defaults to first sorted item if none selected
  const activeItem = useMemo(() => {
    if (sortedItems.length === 0) return null;
    return sortedItems.find(item => item.id === selectedItemId) || sortedItems[0];
  }, [sortedItems, selectedItemId]);

  if (!activeRoadmap) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-slate-400">
        <div className="text-center space-y-4">
          <Compass className="w-12 h-12 mx-auto text-slate-600 animate-pulse" />
          <h2 className="text-xl font-semibold text-white">No Roadmaps Found</h2>
          <p className="text-sm">Create a roadmap to begin your learning journey.</p>
        </div>
      </div>
    );
  }

  // Calculate stats for selector
  const getRoadmapProgress = (roadmap: Roadmap) => {
    if (!roadmap.items || roadmap.items.length === 0) return 0;
    const completed = roadmap.items.filter(item => item.completionState === 'Completed').length;
    return Math.round((completed / roadmap.items.length) * 100);
  };

  // Helper to determine item eligibility status
  const getItemStatus = (item: RoadmapItem, allItems: RoadmapItem[]): 'Completed' | 'In Progress' | 'Available' | 'Locked' => {
    if (item.completionState === 'Completed') return 'Completed';
    if (item.completionState === 'In Progress') return 'In Progress';
    
    // Check prerequisites
    const itemsMap = new Map<string, RoadmapItem>(allItems.map(i => [i.id, i]));
    const prerequisitesCompleted = (item.prerequisites ?? []).every(prId => {
      const pr = itemsMap.get(prId);
      return pr && pr.completionState === 'Completed';
    });

    return prerequisitesCompleted ? 'Available' : 'Locked';
  };

  // Complete/Update status handlers
  const handleToggleCompletion = (item: RoadmapItem) => {
    const nextState = item.completionState === 'Completed' ? 'In Progress' : 'Completed';
    roadmapRepository.updateRoadmapItem(activeRoadmap.id, item.id, {
      completionState: nextState,
      lastStudied: nextState === 'Completed' ? new Date().toISOString().split('T')[0] : item.lastStudied,
      revisionCount: nextState === 'Completed' ? (item.revisionCount || 0) + 1 : item.revisionCount
    });
  };

  const handleUpdateConfidence = (item: RoadmapItem, score: number) => {
    roadmapRepository.updateRoadmapItem(activeRoadmap.id, item.id, {
      confidenceScore: score
    });
  };

  const handleUpdateWeakness = (item: RoadmapItem, score: number) => {
    roadmapRepository.updateRoadmapItem(activeRoadmap.id, item.id, {
      weaknessScore: score
    });
  };

  const toggleSolution = (qId: string) => {
    setRevealSolutions(prev => ({
      ...prev,
      [qId]: !prev[qId]
    }));
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-screen overflow-hidden">
      {/* 1. Left Sidebar: Roadmap Selection */}
      <aside className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-white/10 flex flex-col bg-slate-950/30 backdrop-blur-sm shrink-0">
        <div className="p-4 border-b border-white/10">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Compass className="w-5 h-5 text-cyan-400" />
            Learning Roadmaps
          </h2>
          <p className="text-xs text-slate-400 mt-1">Track and conquer your engineering goals.</p>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {roadmaps.map(roadmap => {
            const progress = getRoadmapProgress(roadmap);
            const isSelected = roadmap.id === selectedRoadmapId || (!selectedRoadmapId && roadmap.id === activeRoadmap.id);

            return (
              <button
                key={roadmap.id}
                onClick={() => {
                  setSelectedRoadmapId(roadmap.id);
                  setSelectedItemId('');
                }}
                className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer relative overflow-hidden group flex flex-col gap-2 ${
                  isSelected
                    ? 'bg-cyan-500/10 border-cyan-500/30 text-white'
                    : 'bg-white/5 border-transparent text-slate-300 hover:bg-white/10'
                }`}
              >
                {/* Glow bar */}
                {isSelected && (
                  <span className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-400" />
                )}

                <div className="flex justify-between items-start gap-2">
                  <div className="font-bold text-sm tracking-tight group-hover:text-cyan-400 transition-colors leading-snug">
                    {roadmap.title}
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-semibold shrink-0 uppercase tracking-wider ${
                    roadmap.difficulty === 'Hard' 
                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                      : roadmap.difficulty === 'Medium'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  }`}>
                    {roadmap.difficulty}
                  </span>
                </div>

                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {roadmap.description || 'No description provided.'}
                </p>

                {/* Progress bar info */}
                <div className="space-y-1 mt-1">
                  <div className="flex justify-between text-[10px] font-bold text-slate-500">
                    <span>PROGRESS</span>
                    <span className={isSelected ? 'text-cyan-400' : 'text-slate-400'}>{progress}%</span>
                  </div>
                  <div className="h-1 bg-slate-900 rounded-full overflow-hidden border border-white/5">
                    <div 
                      className="h-full bg-gradient-to-r from-cyan-400 to-purple-600 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* 2. Center Panel: Prerequisite Path flow */}
      <section className="flex-1 flex flex-col bg-slate-950/10 overflow-y-auto border-r border-white/10">
        <div className="p-6 border-b border-white/10 bg-slate-950/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-white tracking-tight">
              {activeRoadmap.title}
            </h1>
            <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
              {activeRoadmap.description || 'Master this topic sequentially using the prerequisite chain.'}
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold shrink-0">
            <div className="flex flex-col items-end">
              <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">TOTAL ESTIMATED</span>
              <span className="text-white text-sm font-bold flex items-center gap-1">
                <Clock className="w-4 h-4 text-cyan-400" />
                {activeRoadmap.estimatedHours || 0} Hours
              </span>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div className="flex flex-col items-end">
              <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">COMPLETION</span>
              <span className="text-cyan-400 text-sm font-bold">
                {activeRoadmap.items.filter(i => i.completionState === 'Completed').length} / {activeRoadmap.items.length} Topics
              </span>
            </div>
          </div>
        </div>

        {/* Path Flow List */}
        <div className="p-6 space-y-6 flex-1 max-w-3xl w-full mx-auto relative pl-12">
          {/* Static connecting line */}
          <div className="absolute top-8 bottom-8 left-[31px] w-0.5 bg-slate-800" />

          {sortedItems.map((item, idx) => {
            const status = getItemStatus(item, activeRoadmap.items);
            const isSelected = item.id === (activeItem?.id || '');

            // Define status colors
            let statusColor = 'border-slate-800 bg-slate-900/60 text-slate-500';
            let iconElement = <Circle className="w-5 h-5" />;

            if (status === 'Completed') {
              statusColor = 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/10 shadow-sm shadow-emerald-500/5';
              iconElement = <CheckCircle2 className="w-5 h-5 fill-emerald-500/10 text-emerald-400" />;
            } else if (status === 'In Progress') {
              statusColor = 'border-purple-500/30 bg-purple-500/5 text-purple-400 hover:bg-purple-500/10 shadow-sm shadow-purple-500/5';
              iconElement = <Play className="w-5 h-5 fill-purple-500/10 text-purple-400" />;
            } else if (status === 'Available') {
              statusColor = 'border-cyan-500/30 bg-cyan-500/5 text-cyan-400 hover:bg-cyan-500/10 shadow-sm shadow-cyan-500/5';
              iconElement = <Circle className="w-5 h-5 text-cyan-400" />;
            } else if (status === 'Locked') {
              statusColor = 'border-slate-900/80 bg-slate-950/40 text-slate-600 cursor-not-allowed opacity-60';
              iconElement = <Lock className="w-4 h-4 text-slate-600" />;
            }

            return (
              <div key={item.id} className="relative flex items-start gap-4 group">
                {/* Node marker on vertical timeline */}
                <div 
                  className={`absolute -left-[27px] top-4 w-[14px] h-[14px] rounded-full border-2 bg-slate-950 transition-all duration-300 z-10 ${
                    status === 'Completed' 
                      ? 'border-emerald-500 bg-emerald-500 shadow-md shadow-emerald-500/20' 
                      : status === 'In Progress'
                      ? 'border-purple-500 bg-purple-500 shadow-md shadow-purple-500/20'
                      : status === 'Available'
                      ? 'border-cyan-400'
                      : 'border-slate-800'
                  }`}
                />

                {/* Card */}
                <button
                  onClick={() => setSelectedItemId(item.id)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all relative flex flex-col gap-2 ${statusColor} ${
                    isSelected ? 'ring-2 ring-cyan-500/50 scale-[1.01]' : 'hover:scale-[1.005]'
                  }`}
                >
                  <div className="flex justify-between items-center gap-3">
                    <div className="flex items-center gap-2">
                      {iconElement}
                      <h3 className={`font-bold text-sm tracking-tight ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                        {item.title}
                      </h3>
                    </div>

                    <span className="text-[10px] text-slate-500 font-bold bg-white/5 px-2 py-0.5 rounded-md">
                      LEVEL {idx + 1}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-400 mt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {item.estimatedHours}h est.
                    </span>
                    <span className="w-1 h-1 rounded-full bg-slate-700" />
                    <span>Difficulty: <strong className="text-slate-300">{item.difficulty}</strong></span>
                    <span className="w-1 h-1 rounded-full bg-slate-700" />
                    <span>Revision: <strong className="text-slate-300">{item.revisionFrequency}</strong></span>
                  </div>

                  {/* Prerequisites indicator if any */}
                  {item.prerequisites && item.prerequisites.length > 0 && (
                    <div className="flex flex-wrap gap-1 items-center mt-1 border-t border-white/5 pt-2">
                      <span className="text-[9px] font-bold text-slate-500 uppercase mr-1">Prerequisites:</span>
                      {item.prerequisites.map(prId => {
                        const prItem = activeRoadmap.items.find(i => i.id === prId);
                        const prDone = prItem?.completionState === 'Completed';
                        return (
                          <span 
                            key={prId} 
                            className={`text-[9px] px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5 ${
                              prDone 
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                : 'bg-slate-800 text-slate-400 border border-white/5'
                            }`}
                          >
                            {prDone ? <CheckCircle2 className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
                            {prItem?.title || prId}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Right Panel: Topic Details & Action Panel */}
      <aside className="w-full lg:w-96 overflow-y-auto bg-slate-950/40 backdrop-blur-md flex flex-col p-6 space-y-6 shrink-0 border-t lg:border-t-0 border-white/10">
        {activeItem ? (
          <>
            {/* Header / Info */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                  getItemStatus(activeItem, activeRoadmap.items) === 'Completed'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : getItemStatus(activeItem, activeRoadmap.items) === 'In Progress'
                    ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                    : getItemStatus(activeItem, activeRoadmap.items) === 'Available'
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                    : 'bg-slate-800 text-slate-500 border border-white/5'
                }`}>
                  {getItemStatus(activeItem, activeRoadmap.items)}
                </span>
                
                <span className="text-[11px] text-slate-400 font-semibold bg-white/5 px-2.5 py-0.5 rounded-full">
                  Topic Details
                </span>
              </div>

              <h2 className="text-xl font-bold text-white tracking-tight leading-snug">
                {activeItem.title}
              </h2>
            </div>

            {/* Complete Item Action Button */}
            <div>
              {getItemStatus(activeItem, activeRoadmap.items) === 'Locked' ? (
                <div className="w-full p-3 rounded-xl bg-slate-900 border border-white/5 text-center flex items-center justify-center gap-2 text-xs text-slate-500">
                  <Lock className="w-4 h-4" />
                  Prerequisites Required to Unlock
                </div>
              ) : (
                <button
                  onClick={() => handleToggleCompletion(activeItem)}
                  className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
                    activeItem.completionState === 'Completed'
                      ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                      : 'bg-gradient-to-r from-cyan-400 to-purple-600 hover:from-cyan-300 hover:to-purple-500 text-slate-950'
                  }`}
                >
                  {activeItem.completionState === 'Completed' ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 fill-slate-950 text-emerald-400" />
                      Mark Incomplete
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-slate-950 text-cyan-400" />
                      Mark Completed
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Metadata Stats Grid */}
            <div className="glass-panel p-4 space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
                <Award className="w-4 h-4 text-cyan-400" />
                Parameters & Statistics
              </h3>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 block mb-0.5">EST. HOURS</span>
                  <span className="text-white font-semibold">{activeItem.estimatedHours} Hours</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 block mb-0.5">DIFFICULTY</span>
                  <span className="text-white font-semibold">{activeItem.difficulty}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 block mb-0.5">REVISION FREQ</span>
                  <span className="text-white font-semibold">{activeItem.revisionFrequency}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 block mb-0.5">REVISION COUNT</span>
                  <span className="text-white font-semibold">{activeItem.revisionCount || 0} reviews</span>
                </div>
              </div>

              {/* Editable parameters in UI */}
              <div className="space-y-3 pt-3 border-t border-white/5">
                {/* Confidence score selector */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-[10px] font-bold text-slate-500">CONFIDENCE SCORE</span>
                    <span className="text-cyan-400 font-bold">{activeItem.confidenceScore}/5</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <button
                        key={val}
                        onClick={() => handleUpdateConfidence(activeItem, val)}
                        className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center transition-all border cursor-pointer ${
                          val <= (activeItem.confidenceScore || 0)
                            ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400 shadow-sm'
                            : 'bg-slate-900 border-transparent text-slate-500 hover:border-white/10 hover:text-slate-300'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Weakness score slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-[10px] font-bold text-slate-500">WEAKNESS SCORE</span>
                    <span className="text-rose-400 font-bold">{activeItem.weaknessScore}%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input 
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={activeItem.weaknessScore}
                      onChange={(e) => handleUpdateWeakness(activeItem, parseInt(e.target.value))}
                      className="flex-1 accent-rose-400 h-1 bg-slate-900 rounded-full cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Resources Section */}
            {activeItem.resources && activeItem.resources.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-purple-400" />
                  Study Resources
                </h3>
                <div className="space-y-2">
                  {activeItem.resources.map((res, index) => (
                    <a
                      key={index}
                      href={res.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 flex items-center justify-between text-xs text-slate-200 hover:text-cyan-400 transition-all group"
                    >
                      <span className="truncate pr-4 font-medium">{res.title}</span>
                      <span className="shrink-0 flex items-center gap-1 text-[10px] font-bold text-slate-500 group-hover:text-cyan-400">
                        {res.type ? res.type.toUpperCase() : 'LINK'}
                        <ExternalLink className="w-3 h-3" />
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Practice Questions Section */}
            {activeItem.practiceQuestions && activeItem.practiceQuestions.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-amber-400" />
                  Practice Questions
                </h3>
                <div className="space-y-3">
                  {activeItem.practiceQuestions.map((pq) => {
                    const isRevealed = !!revealSolutions[pq.id];
                    return (
                      <div key={pq.id} className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-2.5 text-xs">
                        <p className="font-semibold text-slate-200 leading-relaxed">
                          {pq.question}
                        </p>
                        
                        <div className="flex justify-between items-center">
                          <button
                            onClick={() => toggleSolution(pq.id)}
                            className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            {isRevealed ? 'Hide Solution' : 'Show Solution'}
                            <ChevronRight className={`w-3 h-3 transition-transform ${isRevealed ? 'rotate-90' : ''}`} />
                          </button>
                        </div>

                        {isRevealed && (
                          <div className="p-2.5 rounded-lg bg-slate-950/50 border border-white/5 text-slate-400 leading-relaxed mt-1 text-[11px]">
                            {pq.solution}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 text-sm text-slate-500 flex flex-col items-center justify-center gap-2 flex-1">
            <AlertCircle className="w-8 h-8 text-slate-600" />
            Select a topic from the path to view details.
          </div>
        )}
      </aside>
    </div>
  );
}
