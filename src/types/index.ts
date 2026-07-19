export type Priority = 'Low' | 'Medium' | 'High';
export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export type TaskStatus = 'Backlog' | 'Todo' | 'In Progress' | 'Completed';
export type CompletionState = 'Not Started' | 'In Progress' | 'Completed';

export interface UserProfile {
  id: string;
  name: string;
  avatarUrl?: string;
  xp: number;
  level: number;
  streak: number;
  dailyHoursGoal: number;
  weeklyHoursGoal: number;
  careerGoals?: string;
  currentRole?: string;
  targetRole?: string;
  lastActiveDate?: string; // YYYY-MM-DD
}

export interface Subtask {
  id: string;
  parentTaskId: string;
  title: string;
  status: 'Todo' | 'Completed';
  orderIndex: number;
}

export interface ChecklistItem {
  id: string;
  title: string;
  done: boolean;
}

/**
 * Carry-over metadata attached to a Task when it is forwarded from a previous study day.
 * All fields are optional — absence means the task has never been carried over.
 */
export interface CarryOverMetadata {
  /** Total number of times this task has been carried over. */
  carryOverCount: number;
  /** ISO date string of the first day the task was carried over (YYYY-MM-DD). */
  carriedSince: string;
  /** Number of consecutive study days this task has been unfinished and carried forward. */
  consecutiveCarryOvers: number;
}

export interface Task {
  id: string;
  blockId: string;
  title: string;
  description?: string;
  estDuration: number; // in minutes
  priority: Priority;
  difficulty: Difficulty;
  status: TaskStatus;
  tags: string[];
  attachments: string[];
  notes?: string;
  resources?: { title: string; url: string }[];
  roadmapRefId?: string;
  aiSuggestions?: string;
  progress: number; // 0 - 100
  checklist: ChecklistItem[];
  subtasks?: Subtask[];
  createdAt: string;
  // Carry-over tracking — populated by the Carry-over Engine
  carryOverCount?: number;
  carriedSince?: string;         // YYYY-MM-DD of first carry-over
  consecutiveCarryOvers?: number;
}

export interface StudyBlock {
  id: string;
  title: string;
  icon?: string;
  color?: string;
  priority: Priority;
  estHours: number;
  startTime?: string; // HH:MM
  endTime?: string; // HH:MM
  orderIndex: number;
  isCollapsed: boolean;
  tasks?: Task[];
}

export interface StudyBlockTemplate {
  id: string;
  title: string;
  preferredDuration: number; // in hours
  priority: Priority;
  preferredTopics: string[];
}

export interface RoadmapItem {
  id: string;
  roadmapId: string;
  parentId: string | null;
  title: string;
  difficulty: Difficulty;
  estimatedHours: number;
  prerequisites: string[]; // roadmap_item ids
  resources: { title: string; url: string; type: string }[];
  practiceQuestions: { id: string; question: string; solution: string }[];
  interviewQuestions: { id: string; question: string; answer: string; company?: string }[];
  revisionFrequency: 'Daily' | 'Weekly' | 'Biweekly' | 'Monthly';
  completionState: CompletionState;
  orderIndex: number;
  lastStudied?: string;
  revisionCount: number;
  quizScore?: number;
  confidenceScore: number; // 0 to 5 (used in priority calculations)
  weaknessScore: number; // 0 to 100
  mistakeCount: number;
  interviewReadiness: number; // 0 to 100
}

export interface Roadmap {
  id: string;
  title: string;
  description?: string;
  difficulty: Difficulty;
  estimatedHours: number;
  icon?: string;
  color?: string;
  completionState: CompletionState;
  items: RoadmapItem[];
}

export interface ProjectMilestone {
  id: string;
  title: string;
  dueDate: string;
  status: CompletionState;
}

export interface Project {
  id: string;
  name: string;
  overview?: string;
  documentation?: string;
  milestones: ProjectMilestone[];
  timeline: { date: string; event: string }[];
  tasks: { id: string; title: string; status: TaskStatus }[];
  issues: { id: string; title: string; status: 'Open' | 'Closed'; severity: string }[];
  files: { name: string; path: string; size: string }[];
  githubRepo?: string;
  aiSuggestions?: string;
  readmeContent?: string;
  progress: number;
  createdAt: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  folder: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudySession {
  id: string;
  blockId?: string;
  taskId?: string;
  durationMinutes: number;
  xpEarned: number;
  focusMode: boolean;
  completedAt: string;
}

export interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  badgeUrl?: string;
  points: number;
  requirementType: 'STREAK' | 'XP' | 'TIME' | 'ROADMAP';
  requirementValue: number;
  unlocked: boolean;
  unlockedAt?: string;
}

export interface AnalyticsDaily {
  date: string; // YYYY-MM-DD
  studyHours: number;
  codingHours: number;
  tasksCompleted: number;
  focusSessionsCount: number;
  learningVelocity: number;
  aiInteractionsCount: number;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'system';
  isRead: boolean;
  createdAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  type: 'study' | 'interview' | 'revision' | 'event';
  color?: string;
  isAllDay: boolean;
}

export interface JobApplication {
  id: string;
  companyName: string;
  position: string;
  salary?: string;
  status: 'Applied' | 'Interviewing' | 'Offer' | 'Rejected';
  stages: { stage: string; date: string; status: 'pending' | 'passed' | 'failed' }[];
  hrContacts: { name: string; email?: string; phone?: string }[];
  notes?: string;
  interviewDate?: string;
  aiPrepSuggestions?: string;
  createdAt: string;
}

export interface Resume {
  id: string;
  title: string;
  fileUrl?: string;
  parsedContent?: string;
  feedback: { section: string; score: number; comment: string; recommendation: string }[];
  uploadedAt: string;
}

export interface Flashcard {
  id: string;
  deckName: string;
  front: string;
  back: string;
  nextReview: string;
  intervalDays: number;
  easeFactor: number;
  repetitions: number;
}

export interface UserMemory {
  id: string;
  memoryKey: string;
  memoryValue: unknown;
  confidenceScore: number;
  lastUpdated: string;
}

export interface GraphNode {
  id: string;
  entityType: 'ROADMAP_ITEM' | 'NOTE' | 'PROJECT' | 'FLASHCARD' | 'QUIZ' | 'INTERVIEW_QUESTION' | 'APPLICATION' | 'RESUME_SKILL';
  entityId: string;
  label: string;
  metadata?: unknown;
}

export interface GraphEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationType: 'PREREQUISITE_OF' | 'REFERENCES' | 'PRACTICED_IN' | 'TESTED_BY' | 'USED_IN' | 'REQUIRED_FOR';
  weight: number;
}

// DailyPlan interface for Planner Agent output
export interface DailyPlan {
  orderedStudyBlocks: StudyBlock[];
  scheduledTasks: Task[];
  carryOverTasks: Task[];
  revisionBlocks: StudyBlock[];
  estimatedXP: number;
  totalStudyHours: number;
  summary: string;
}
