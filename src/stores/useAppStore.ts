import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  UserProfile, 
  StudyBlock, 
  Task, 
  Roadmap,
  RoadmapItem, 
  Project, 
  Note, 
  JobApplication, 
  Achievement, 
  AnalyticsDaily, 
  Flashcard, 
  UserMemory, 
  CalendarEvent,
  Notification
} from '../types';
import { eventBus } from '../core/eventBus';

interface AppState {
  // Data State
  profile: UserProfile;
  blocks: StudyBlock[];
  roadmaps: Roadmap[];
  projects: Project[];
  notes: Note[];
  applications: JobApplication[];
  achievements: Achievement[];
  analytics: AnalyticsDaily[];
  flashcards: Flashcard[];
  memories: UserMemory[];
  notifications: Notification[];
  calendarEvents: CalendarEvent[];
  availableHours: number;

  // Actions
  updateProfile: (updates: Partial<UserProfile>) => void;
  setAvailableHours: (hours: number) => void;
  
  // Blocks & Tasks
  addBlock: (block: StudyBlock) => void;
  updateBlock: (blockId: string, updates: Partial<StudyBlock>) => void;
  deleteBlock: (blockId: string) => void;
  addTask: (blockId: string, task: Task) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  deleteTask: (taskId: string) => void;
  toggleChecklistItem: (taskId: string, itemId: string) => void;
  
  // Roadmaps
  addRoadmap: (roadmap: Roadmap) => void;
  updateRoadmapItem: (roadmapId: string, itemId: string, updates: Partial<RoadmapItem>) => void;
  
  // Projects
  addProject: (project: Project) => void;
  updateProject: (projectId: string, updates: Partial<Project>) => void;
  deleteProject: (projectId: string) => void;
  
  // Notes
  addNote: (note: Note) => void;
  updateNote: (noteId: string, updates: Partial<Note>) => void;
  deleteNote: (noteId: string) => void;
  
  // Applications
  addApplication: (app: JobApplication) => void;
  updateApplication: (appId: string, updates: Partial<JobApplication>) => void;
  deleteApplication: (appId: string) => void;

  // Flashcards
  addFlashcard: (card: Flashcard) => void;
  updateFlashcard: (cardId: string, updates: Partial<Flashcard>) => void;
  deleteFlashcard: (cardId: string) => void;
  
  // Achievements
  unlockAchievement: (code: string) => void;
  
  // Analytics
  logStudySession: (blockId: string | undefined, taskId: string | undefined, duration: number, xpEarned: number, focusMode: boolean) => void;
  
  // Notifications
  addNotification: (title: string, message: string, type: Notification['type']) => void;
  clearNotification: (id: string) => void;
  markNotificationsAsRead: () => void;
  
  // Calendar
  addCalendarEvent: (event: CalendarEvent) => void;
  updateCalendarEvent: (eventId: string, updates: Partial<CalendarEvent>) => void;
  deleteCalendarEvent: (eventId: string) => void;

  // Memory
  addMemory: (key: string, value: unknown, confidence: number) => void;
  removeMemory: (id: string) => void;

  // Reset helper
  resetToDefaults: () => void;
}

// Initial Mock Seed Data
const defaultProfile: UserProfile = {
  id: 'user-default-123',
  name: 'Alex Mercer',
  avatarUrl: undefined,
  xp: 3420,
  level: 4,
  streak: 14,
  dailyHoursGoal: 4,
  weeklyHoursGoal: 24,
  careerGoals: 'Break into Google as a Senior Frontend/AI Engineer. Master Distributed Systems and Spaced Repetition algorithms.',
  currentRole: 'Computer Science Student',
  targetRole: 'AI & Systems Software Engineer',
  lastActiveDate: new Date().toISOString().split('T')[0]
};

const defaultBlocks: StudyBlock[] = [
  {
    id: 'block-morning-dsa',
    title: 'Morning Prep: DSA & Algorithms',
    icon: 'Terminal',
    color: '#00f0ff', // Cyan
    priority: 'High',
    estHours: 2,
    startTime: '09:00',
    endTime: '11:00',
    orderIndex: 0,
    isCollapsed: false,
    tasks: [
      {
        id: 'task-arrays-strings',
        blockId: 'block-morning-dsa',
        title: 'LeetCode Arrays & Two Pointers',
        description: 'Complete sliding window and two-pointer basics. Focus on Container with Most Water and Product of Array Except Self.',
        estDuration: 60,
        priority: 'High',
        difficulty: 'Medium',
        status: 'Completed',
        tags: ['DSA', 'LeetCode', 'Interview'],
        attachments: [],
        notes: 'Sliding window is O(N) linear scan. Keep track of left pointer boundaries.',
        resources: [
          { title: 'NeetCode Roadmap', url: 'https://neetcode.io' },
          { title: 'Sliding Window Visualizer', url: 'https://visualgo.net' }
        ],
        progress: 100,
        checklist: [
          { id: 'c1', title: 'Container with Most Water', done: true },
          { id: 'c2', title: 'Product of Array Except Self', done: true },
          { id: 'c3', title: 'Minimum Window Substring', done: true }
        ],
        createdAt: new Date().toISOString()
      },
      {
        id: 'task-streams-java',
        blockId: 'block-morning-dsa',
        title: 'Java Streams & Lambdas',
        description: 'Review collectors groupingBy, partitioningBy, and infinite stream reduction.',
        estDuration: 60,
        priority: 'Medium',
        difficulty: 'Medium',
        status: 'In Progress',
        tags: ['Java', 'Backend'],
        attachments: [],
        resources: [],
        progress: 30,
        checklist: [
          { id: 'c4', title: 'Implement groupingBy examples', done: true },
          { id: 'c5', title: 'Compare parallel vs sequential performance', done: false }
        ],
        createdAt: new Date().toISOString()
      }
    ]
  },
  {
    id: 'block-afternoon-dev',
    title: 'Afternoon Dev: Deep Learning App',
    icon: 'Layers',
    color: '#bd00ff', // Purple
    priority: 'Medium',
    estHours: 2.5,
    startTime: '14:00',
    endTime: '16:30',
    orderIndex: 1,
    isCollapsed: false,
    tasks: [
      {
        id: 'task-apple-model',
        blockId: 'block-afternoon-dev',
        title: 'Dataset Prep & Model Architecture',
        description: 'Setup the directory structure for dataset, resize images to 256x256, and compile simple CNN layers.',
        estDuration: 150,
        priority: 'High',
        difficulty: 'Hard',
        status: 'Todo',
        tags: ['PyTorch', 'ML', 'Computer Vision'],
        attachments: [],
        progress: 0,
        checklist: [
          { id: 'c6', title: 'Write image preprocessing script', done: false },
          { id: 'c7', title: 'Define custom ResNet-18 block', done: false },
          { id: 'c8', title: 'Run single epoch sanity check', done: false }
        ],
        createdAt: new Date().toISOString()
      }
    ]
  }
];

const defaultRoadmaps: Roadmap[] = [
  {
    id: 'roadmap-dsa',
    title: 'Data Structures & Algorithms',
    description: 'Core coding patterns required for Big Tech technical screens.',
    difficulty: 'Hard',
    estimatedHours: 60,
    icon: 'Code',
    color: '#00f0ff',
    completionState: 'In Progress',
    items: [
      {
        id: 'item-arrays',
        roadmapId: 'roadmap-dsa',
        parentId: null,
        title: 'Arrays & Hashing',
        difficulty: 'Easy',
        estimatedHours: 6,
        prerequisites: [],
        resources: [{ title: 'Array Guide', url: 'https://leetcode.com', type: 'doc' }],
        practiceQuestions: [{ id: 'q1', question: 'Two Sum', solution: 'Use HashMap for O(1) checks.' }],
        interviewQuestions: [],
        revisionFrequency: 'Weekly',
        completionState: 'Completed',
        orderIndex: 0,
        revisionCount: 3,
        confidenceScore: 5,
        weaknessScore: 0,
        mistakeCount: 0,
        interviewReadiness: 100
      },
      {
        id: 'item-sliding-window',
        roadmapId: 'roadmap-dsa',
        parentId: 'item-arrays',
        title: 'Sliding Window',
        difficulty: 'Medium',
        estimatedHours: 8,
        prerequisites: ['item-arrays'],
        resources: [],
        practiceQuestions: [{ id: 'q2', question: 'Longest Substring Without Repeating Characters', solution: 'Keep index map of characters.' }],
        interviewQuestions: [{ id: 'iq1', question: 'Amazon: Find all anagrams in a string', answer: 'Use fixed count array.' }],
        revisionFrequency: 'Weekly',
        completionState: 'Completed',
        orderIndex: 1,
        revisionCount: 2,
        confidenceScore: 4,
        weaknessScore: 20,
        mistakeCount: 1,
        interviewReadiness: 90
      },
      {
        id: 'item-trees',
        roadmapId: 'roadmap-dsa',
        parentId: 'item-sliding-window',
        title: 'Binary Trees & Recursion',
        difficulty: 'Hard',
        estimatedHours: 12,
        prerequisites: ['item-sliding-window'],
        resources: [],
        practiceQuestions: [],
        interviewQuestions: [],
        revisionFrequency: 'Biweekly',
        completionState: 'In Progress',
        orderIndex: 2,
        revisionCount: 1,
        confidenceScore: 2,
        weaknessScore: 60,
        mistakeCount: 4,
        interviewReadiness: 40
      },
      {
        id: 'item-graphs',
        roadmapId: 'roadmap-dsa',
        parentId: 'item-trees',
        title: 'Graphs & BFS/DFS',
        difficulty: 'Hard',
        estimatedHours: 16,
        prerequisites: ['item-trees'],
        resources: [],
        practiceQuestions: [],
        interviewQuestions: [],
        revisionFrequency: 'Monthly',
        completionState: 'Not Started',
        orderIndex: 3,
        revisionCount: 0,
        confidenceScore: 1,
        weaknessScore: 80,
        mistakeCount: 0,
        interviewReadiness: 10
      }
    ]
  },
  {
    id: 'roadmap-react',
    title: 'Advanced React & Architecture',
    description: 'Master rendering performance, server components, state mechanics, and micro-frontends.',
    difficulty: 'Medium',
    estimatedHours: 30,
    icon: 'Layers',
    color: '#bd00ff',
    completionState: 'In Progress',
    items: [
      {
        id: 'item-react-hooks',
        roadmapId: 'roadmap-react',
        parentId: null,
        title: 'Hook Optimization & closures',
        difficulty: 'Medium',
        estimatedHours: 6,
        prerequisites: [],
        resources: [],
        practiceQuestions: [],
        interviewQuestions: [],
        revisionFrequency: 'Weekly',
        completionState: 'Completed',
        orderIndex: 0,
        revisionCount: 4,
        confidenceScore: 5,
        weaknessScore: 5,
        mistakeCount: 0,
        interviewReadiness: 95
      },
      {
        id: 'item-react-rsc',
        roadmapId: 'roadmap-react',
        parentId: 'item-react-hooks',
        title: 'React Server Components (RSC)',
        difficulty: 'Hard',
        estimatedHours: 8,
        prerequisites: ['item-react-hooks'],
        resources: [],
        practiceQuestions: [],
        interviewQuestions: [],
        revisionFrequency: 'Biweekly',
        completionState: 'In Progress',
        orderIndex: 1,
        revisionCount: 1,
        confidenceScore: 3,
        weaknessScore: 40,
        mistakeCount: 2,
        interviewReadiness: 60
      }
    ]
  }
];

const defaultProjects: Project[] = [
  {
    id: 'proj-leaves',
    name: 'Apple Leaf Disease Detector',
    overview: 'Using custom ResNet-18 model to classify healthy vs spotted apple leaves. Includes a sleek Next.js UI upload panel.',
    documentation: 'Run python scripts/train.py. Required python modules: torch, torchvision, albumentations, flask.',
    milestones: [
      { id: 'm1', title: 'Collate & clean dataset', status: 'Completed', dueDate: '2026-07-01' },
      { id: 'm2', title: 'Train CNN model to 96% accuracy', status: 'In Progress', dueDate: '2026-07-25' },
      { id: 'm3', title: 'Build visual web interface', status: 'Not Started', dueDate: '2026-08-10' }
    ],
    timeline: [
      { date: '2026-06-20', event: 'Downloaded Kaggle dataset' },
      { date: '2026-06-25', event: 'Wrote image augmentation scripts' },
      { date: '2026-07-10', event: 'Hit 88% accuracy on val set' }
    ],
    tasks: [
      { id: 'pt1', title: 'Optimize hyperparameters learning rate', status: 'In Progress' },
      { id: 'pt2', title: 'Export trained model to ONNX', status: 'Todo' }
    ],
    issues: [
      { id: 'is1', title: 'Model overfitting on Cedar Rust subset', status: 'Open', severity: 'High' }
    ],
    files: [
      { name: 'train.py', path: 'scripts/train.py', size: '4.2 KB' },
      { name: 'dataset.py', path: 'scripts/dataset.py', size: '2.8 KB' },
      { name: 'LeafModel.onnx', path: 'models/LeafModel.onnx', size: '44.8 MB' }
    ],
    githubRepo: 'github.com/alexmercer/apple-leaf-detector',
    aiSuggestions: 'Add Albumentations library augmentation. It will reduce the overfitting issue on Rust leaves.',
    readmeContent: '# Apple Leaf Disease Detector\nTrains convolutional networks to spot leaf lesions.',
    progress: 45,
    createdAt: new Date().toISOString()
  }
];

const defaultNotes: Note[] = [
  {
    id: 'note-concurrency',
    title: 'Java Concurrency Cheat Sheet',
    content: '### ThreadPoolExecutor Tuning\n- **CorePoolSize**: Min threads kept alive.\n- **MaximumPoolSize**: Max threads created under peak load.\n- **KeepAliveTime**: Idle thread termination window.\n\n```java\nThreadPoolExecutor executor = new ThreadPoolExecutor(\n    10, 50, 60L, TimeUnit.SECONDS,\n    new LinkedBlockingQueue<>(1000)\n);\n```\n\nUse `LinkedBlockingQueue` with a fixed limit to avoid memory leaks.',
    tags: ['Java', 'Concurrency', 'Backend'],
    folder: 'Java Studies',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'note-sql-joins',
    title: 'SQL Join Execution Paths',
    content: '### Types of Join algorithms\n1. **Nested Loop Join**: O(N*M). Good for tiny tables.\n2. **Hash Join**: Build hash map of inner table. O(N+M). Good for large, unsorted datasets.\n3. **Merge Join**: Sort both tables first, then scan. O(N log N + M log M). Best if indexes already sort keys.',
    tags: ['SQL', 'Databases'],
    folder: 'System Design',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const defaultApplications: JobApplication[] = [
  {
    id: 'app-google',
    companyName: 'Google',
    position: 'Software Engineer III (AI & Interfaces)',
    salary: '$165,000 - $190,000/yr',
    status: 'Interviewing',
    stages: [
      { stage: 'Recruiter Screening', date: '2026-07-05', status: 'passed' },
      { stage: 'Technical Phone Screen', date: '2026-07-15', status: 'passed' },
      { stage: 'Onsite: Coding & Systems', date: '2026-07-28', status: 'pending' }
    ],
    hrContacts: [{ name: 'Sarah Connor', email: 'sconnor@google.com' }],
    notes: 'Google loves Tree traversal, Graphs, and robust time/space analysis. Focus on BFS, DFS, and topological sorts.',
    interviewDate: '2026-07-28T10:00:00Z',
    aiPrepSuggestions: 'Generate advanced Graph questions. Read the System Design notes on Scaling API Gateways.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'app-stripe',
    companyName: 'Stripe',
    position: 'Fullstack Engineer (Developer Tools)',
    salary: '$180,000/yr',
    status: 'Offer',
    stages: [
      { stage: 'Initial Chat', date: '2026-06-12', status: 'passed' },
      { stage: 'Take-home assessment', date: '2026-06-18', status: 'passed' },
      { stage: 'Virtual Onsite loop', date: '2026-06-30', status: 'passed' }
    ],
    hrContacts: [{ name: 'Marc Andreessen' }],
    notes: 'Stripe focuses on clean API design, developer integrations, and robust error handling. They evaluate readable code.',
    createdAt: new Date().toISOString()
  }
];

const defaultAchievements: Achievement[] = [
  { id: 'ach-1', code: 'STREAK_7', name: 'Dedicated Scholar', description: 'Maintain a 7-day study streak', points: 100, requirementType: 'STREAK', requirementValue: 7, unlocked: true, unlockedAt: new Date().toISOString() },
  { id: 'ach-2', code: 'STREAK_14', name: 'Habitual Master', description: 'Maintain a 14-day study streak', points: 200, requirementType: 'STREAK', requirementValue: 14, unlocked: true, unlockedAt: new Date().toISOString() },
  { id: 'ach-3', code: 'XP_5000', name: 'XP Collector', description: 'Gather 5000 total experience points', points: 300, requirementType: 'XP', requirementValue: 5000, unlocked: false },
  { id: 'ach-4', code: 'TIME_10', name: 'Deep Focus Machine', description: 'Perform 10 hours in Focus Mode', points: 150, requirementType: 'TIME', requirementValue: 600, unlocked: true, unlockedAt: new Date().toISOString() }
];

// Generate dynamic 6-week heatmap data (42 days)
const generateHeatmapData = (): AnalyticsDaily[] => {
  const data: AnalyticsDaily[] = [];
  const base = new Date();
  for (let i = 42; i >= 0; i--) {
    const d = new Date(base.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().split('T')[0];
    
    // Seed days with varying degrees of study hours
    const dayOfWeek = d.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const studyHours = Math.max(0, parseFloat((Math.random() * (isWeekend ? 2 : 5)).toFixed(1)));
    const codingHours = Math.max(0, parseFloat((studyHours * 0.6).toFixed(1)));
    
    data.push({
      date: dateStr,
      studyHours,
      codingHours,
      tasksCompleted: studyHours > 0 ? Math.floor(studyHours * 0.8) + 1 : 0,
      focusSessionsCount: studyHours > 0 ? Math.floor(studyHours * 1.2) : 0,
      learningVelocity: studyHours > 0 ? studyHours * 10 + 5 : 0,
      aiInteractionsCount: studyHours > 0 ? Math.floor(Math.random() * 4) : 0
    });
  }
  return data;
};

const defaultFlashcards: Flashcard[] = [
  { id: 'flash-1', deckName: 'Java Collections', front: 'What is the backing structure of HashMap?', back: 'An array of Node buckets (Node<K,V>[]). Buckets turn into balanced trees (Red-Black trees) when collisions exceed TREEIFY_THRESHOLD (8).', nextReview: new Date().toISOString(), intervalDays: 1, easeFactor: 2.5, repetitions: 0 },
  { id: 'flash-2', deckName: 'System Design', front: 'What is the split-brain problem in distributed consensus?', back: 'It occurs when a network partition separates node sub-clusters, and multiple groups elect separate leader instances, causing conflicting state updates.', nextReview: new Date().toISOString(), intervalDays: 1, easeFactor: 2.5, repetitions: 0 }
];

const defaultMemories: UserMemory[] = [
  { id: 'mem-1', memoryKey: 'preferred_study_time', memoryValue: '09:00 - 11:00', confidenceScore: 0.9, lastUpdated: new Date().toISOString() },
  { id: 'mem-2', memoryKey: 'strong_topics', memoryValue: ['Java basics', 'Arrays', 'API Design'], confidenceScore: 0.85, lastUpdated: new Date().toISOString() },
  { id: 'mem-3', memoryKey: 'weak_topics', memoryValue: ['Binary Trees', 'PyTorch CNN training'], confidenceScore: 0.8, lastUpdated: new Date().toISOString() }
];

const defaultNotifications: Notification[] = [
  { id: 'notif-1', title: 'Interview Milestone', message: 'You have a Microsoft interview scheduled tomorrow at 10 AM. Review System Design checklists.', type: 'warning', isRead: false, createdAt: new Date().toISOString() },
  { id: 'notif-2', title: 'Achievement Unlocked!', message: 'Earned "Habitual Master" for maintaining a 14-day study streak!', type: 'success', isRead: false, createdAt: new Date().toISOString() }
];

const defaultCalendarEvents: CalendarEvent[] = [
  { id: 'cal-1', title: 'Morning Study Block', description: 'DSA & Java Streams', startTime: new Date(new Date().setHours(9, 0, 0)).toISOString(), endTime: new Date(new Date().setHours(11, 0, 0)).toISOString(), type: 'study', color: '#00f0ff', isAllDay: false },
  { id: 'cal-2', title: 'Mock Interview with AI Mentor', description: 'Amazon Prep questions session', startTime: new Date(new Date().setHours(18, 0, 0)).toISOString(), endTime: new Date(new Date().setHours(19, 30, 0)).toISOString(), type: 'interview', color: '#00e676', isAllDay: false }
];

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // State
      profile: defaultProfile,
      blocks: defaultBlocks,
      roadmaps: defaultRoadmaps,
      projects: defaultProjects,
      notes: defaultNotes,
      applications: defaultApplications,
      achievements: defaultAchievements,
      analytics: generateHeatmapData(),
      flashcards: defaultFlashcards,
      memories: defaultMemories,
      notifications: defaultNotifications,
      calendarEvents: defaultCalendarEvents,
      availableHours: 4,

      // Profile Mutators
      updateProfile: (updates) => set((state) => {
        const nextProfile = { ...state.profile, ...updates };
        return { profile: nextProfile };
      }),
      setAvailableHours: (hours) => set({ availableHours: hours }),

      // Blocks & Tasks Mutators
      addBlock: (block) => set((state) => {
        const nextBlocks = [...state.blocks, { ...block, tasks: block.tasks || [] }];
        return { blocks: nextBlocks.sort((a, b) => a.orderIndex - b.orderIndex) };
      }),
      updateBlock: (blockId, updates) => set((state) => ({
        blocks: state.blocks.map(b => b.id === blockId ? { ...b, ...updates } : b)
      })),
      deleteBlock: (blockId) => set((state) => ({
        blocks: state.blocks.filter(b => b.id !== blockId)
      })),
      addTask: (blockId, task) => set((state) => ({
        blocks: state.blocks.map(b => {
          if (b.id === blockId) {
            return { ...b, tasks: [...(b.tasks || []), task] };
          }
          return b;
        })
      })),
      updateTask: (taskId, updates) => set((state) => {
        let changedXp = 0;
        let blockRefId = '';
        const updatedBlocks = state.blocks.map(b => {
          const taskExists = b.tasks?.some(t => t.id === taskId);
          if (!taskExists) return b;
          
          return {
            ...b,
            tasks: b.tasks?.map(t => {
              if (t.id === taskId) {
                const nextStatus = updates.status !== undefined ? updates.status : t.status;
                const nextTask = { ...t, ...updates };
                
                // Triggers TASK_COMPLETED event if moving to Completed
                if (nextStatus === 'Completed' && t.status !== 'Completed') {
                  changedXp = 50; // XP Awarded for completing a task
                  blockRefId = b.id;
                }
                return nextTask;
              }
              return t;
            })
          };
        });

        // Trigger Event Bus
        if (changedXp > 0) {
          eventBus.emit('TASK_COMPLETED', { taskId, blockId: blockRefId, xp: changedXp });
          
          // Increment Local Profile XP
          const nextXp = state.profile.xp + changedXp;
          const nextLevel = Math.floor(nextXp / 1000) + 1;
          const levelUp = nextLevel > state.profile.level;
          
          setTimeout(() => {
            if (levelUp) {
              get().updateProfile({ xp: nextXp, level: nextLevel });
              eventBus.emit('USER_LEVELED_UP', { newLevel: nextLevel, totalXp: nextXp });
              get().addNotification('Leveled Up!', `Congratulations! You reached Level ${nextLevel}!`, 'success');
            } else {
              get().updateProfile({ xp: nextXp });
            }
          }, 0);
        }

        return { blocks: updatedBlocks };
      }),
      deleteTask: (taskId) => set((state) => ({
        blocks: state.blocks.map(b => ({
          ...b,
          tasks: b.tasks?.filter(t => t.id !== taskId) || []
        }))
      })),
      toggleChecklistItem: (taskId, itemId) => set((state) => ({
        blocks: state.blocks.map(b => ({
          ...b,
          tasks: b.tasks?.map(t => {
            if (t.id === taskId) {
              const nextChecklist = t.checklist.map(c => c.id === itemId ? { ...c, done: !c.done } : c);
              const allDone = nextChecklist.every(c => c.done);
              const nextProgress = allDone ? 100 : Math.round((nextChecklist.filter(c => c.done).length / nextChecklist.length) * 100);
              return { 
                ...t, 
                checklist: nextChecklist, 
                progress: nextProgress,
                status: nextProgress === 100 ? 'Completed' : t.status
              };
            }
            return t;
          })
        }))
      })),

      // Roadmaps
      addRoadmap: (roadmap) => set((state) => ({
        roadmaps: [...state.roadmaps, roadmap]
      })),
      updateRoadmapItem: (roadmapId, itemId, updates) => set((state) => ({
        roadmaps: state.roadmaps.map(r => {
          if (r.id !== roadmapId) return r;
          
          const updatedItems = r.items.map(item => {
            if (item.id !== itemId) return item;
            const nextItem = { ...item, ...updates };
            if (updates.completionState === 'Completed' && item.completionState !== 'Completed') {
              setTimeout(() => {
                eventBus.emit('ROADMAP_ITEM_COMPLETED', { roadmapId, itemId });
              }, 0);
            }
            return nextItem;
          });

          // Check if entire roadmap is completed
          const allCompleted = updatedItems.every(i => i.completionState === 'Completed');
          return {
            ...r,
            items: updatedItems,
            completionState: allCompleted ? 'Completed' : 'In Progress'
          };
        })
      })),

      // Projects
      addProject: (project) => set((state) => ({ projects: [...state.projects, project] })),
      updateProject: (projectId, updates) => set((state) => ({
        projects: state.projects.map(p => p.id === projectId ? { ...p, ...updates } : p)
      })),
      deleteProject: (projectId) => set((state) => ({
        projects: state.projects.filter(p => p.id !== projectId)
      })),

      // Notes
      addNote: (note) => set((state) => ({ notes: [...state.notes, note] })),
      updateNote: (noteId, updates) => set((state) => ({
        notes: state.notes.map(n => n.id === noteId ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n)
      })),
      deleteNote: (noteId) => set((state) => ({
        notes: state.notes.filter(n => n.id !== noteId)
      })),

      // Applications
      addApplication: (app) => set((state) => ({ applications: [...state.applications, app] })),
      updateApplication: (appId, updates) => set((state) => {
        // Look for scheduled interviews
        if (updates.interviewDate) {
          const app = state.applications.find(a => a.id === appId);
          if (app) {
            setTimeout(() => {
              eventBus.emit('INTERVIEW_SCHEDULED', {
                companyName: app.companyName,
                interviewDate: updates.interviewDate!,
                position: app.position
              });
            }, 0);
          }
        }
        return {
          applications: state.applications.map(a => a.id === appId ? { ...a, ...updates } : a)
        };
      }),
      deleteApplication: (appId) => set((state) => ({
        applications: state.applications.filter(a => a.id !== appId)
      })),

      // Flashcards
      addFlashcard: (card) => set((state) => ({ flashcards: [...state.flashcards, card] })),
      updateFlashcard: (cardId, updates) => set((state) => ({
        flashcards: state.flashcards.map(c => c.id === cardId ? { ...c, ...updates } : c)
      })),
      deleteFlashcard: (cardId) => set((state) => ({
        flashcards: state.flashcards.filter(c => c.id !== cardId)
      })),

      // Achievements
      unlockAchievement: (code) => set((state) => ({
        achievements: state.achievements.map(a => 
          a.code === code ? { ...a, unlocked: true, unlockedAt: new Date().toISOString() } : a
        )
      })),

      // Log study session
      logStudySession: (blockId, taskId, duration, xpEarned, focusMode) => set((state) => {
        // Log Session
        const sessionDate = new Date().toISOString().split('T')[0];
        
        // Update analytics record for today
        const updatedAnalytics = state.analytics.map(a => {
          if (a.date === sessionDate) {
            return {
              ...a,
              studyHours: parseFloat((a.studyHours + duration / 60).toFixed(1)),
              focusSessionsCount: focusMode ? a.focusSessionsCount + 1 : a.focusSessionsCount,
              learningVelocity: a.learningVelocity + xpEarned
            };
          }
          return a;
        });

        // Trigger Event Bus
        setTimeout(() => {
          eventBus.emit('STUDY_SESSION_COMPLETED', {
            durationMinutes: duration,
            blockId: blockId || '',
            xp: xpEarned
          });
        }, 0);

        // Update profile XP
        const nextXp = state.profile.xp + xpEarned;
        const nextLevel = Math.floor(nextXp / 1000) + 1;
        const levelUp = nextLevel > state.profile.level;

        setTimeout(() => {
          if (levelUp) {
            get().updateProfile({ xp: nextXp, level: nextLevel });
            eventBus.emit('USER_LEVELED_UP', { newLevel: nextLevel, totalXp: nextXp });
            get().addNotification('Leveled Up!', `Congratulations! You reached Level ${nextLevel}!`, 'success');
          } else {
            get().updateProfile({ xp: nextXp });
          }
        }, 0);

        return { analytics: updatedAnalytics };
      }),

      // Notifications
      addNotification: (title, message, type) => set((state) => ({
        notifications: [
          {
            id: `notif-${Date.now()}`,
            title,
            message,
            type,
            isRead: false,
            createdAt: new Date().toISOString()
          },
          ...state.notifications
        ]
      })),
      clearNotification: (id) => set((state) => ({
        notifications: state.notifications.filter(n => n.id !== id)
      })),
      markNotificationsAsRead: () => set((state) => ({
        notifications: state.notifications.map(n => ({ ...n, isRead: true }))
      })),

      // Calendar
      addCalendarEvent: (event) => set((state) => ({ calendarEvents: [...state.calendarEvents, event] })),
      updateCalendarEvent: (eventId, updates) => set((state) => ({
        calendarEvents: state.calendarEvents.map(e => e.id === eventId ? { ...e, ...updates } : e)
      })),
      deleteCalendarEvent: (eventId) => set((state) => ({
        calendarEvents: state.calendarEvents.filter(e => e.id !== eventId)
      })),

      // Memory
      addMemory: (key, value, confidence) => set((state) => {
        const memoryExists = state.memories.some(m => m.memoryKey === key);
        const updatedMemories = memoryExists
          ? state.memories.map(m => m.memoryKey === key ? { ...m, memoryValue: value, confidenceScore: confidence, lastUpdated: new Date().toISOString() } : m)
          : [...state.memories, { id: `mem-${Date.now()}`, memoryKey: key, memoryValue: value, confidenceScore: confidence, lastUpdated: new Date().toISOString() }];
        return { memories: updatedMemories };
      }),
      removeMemory: (id) => set((state) => ({
        memories: state.memories.filter(m => m.id !== id)
      })),

      // Reset
      resetToDefaults: () => set({
        profile: defaultProfile,
        blocks: defaultBlocks,
        roadmaps: defaultRoadmaps,
        projects: defaultProjects,
        notes: defaultNotes,
        applications: defaultApplications,
        achievements: defaultAchievements,
        analytics: generateHeatmapData(),
        flashcards: defaultFlashcards,
        memories: defaultMemories,
        notifications: defaultNotifications,
        calendarEvents: defaultCalendarEvents,
        availableHours: 4
      })
    }),
    {
      name: 'mentoros-app-store',
      // only persist core content state
      partialize: (state) => ({
        profile: state.profile,
        blocks: state.blocks,
        roadmaps: state.roadmaps,
        projects: state.projects,
        notes: state.notes,
        applications: state.applications,
        achievements: state.achievements,
        analytics: state.analytics,
        flashcards: state.flashcards,
        memories: state.memories,
        notifications: state.notifications,
        calendarEvents: state.calendarEvents,
        availableHours: state.availableHours
      }),
    }
  )
);
