import { taskRepository } from '../repositories/task.repository';
import { userRepository } from '../repositories/user.repository';
import { roadmapRepository } from '../repositories/roadmap.repository';
import { careerRepository } from '../repositories/career.repository';
import { scheduleTasksIntoBlocks } from '../engines/planner/scheduler';
import { calculateXP } from '../engines/planner/xp.engine';
import { identifyCarryOverTasks, mergeTasksWithoutDuplicates } from '../engines/planner/carryOver';
import { calculateTopicPriority } from '../engines/planner/priority';
import { getEligibleTopics } from '../engines/planner/dependency';
// Module 5: Revision Engine Integration
import { identifyDueRevisions, generateRevisionBlocks } from '../engines/planner/revisionScheduler';
import { Task, StudyBlock, DailyPlan } from '../types';

export const plannerAgent = {
  /**
   * Automatically orchestrates daily study schedules.
   * Runs the calculation pipeline, updates tasks, schedules blocks, and updates repositories.
   */
  generateDailySchedule(): void {
    // Module 5: Remove stale revision blocks from a previous run before
    // rescheduling so they do not bleed into the normal study block pool.
    taskRepository
      .getBlocks()
      .filter(b => b.id.startsWith('revision-block-'))
      .forEach(b => taskRepository.deleteBlock(b.id));

    const availableHours = userRepository.getAvailableHours();
    // Re-fetch blocks after deletion so the scheduler starts with a clean slate.
    const currentBlocks = taskRepository.getBlocks();
    const roadmaps = roadmapRepository.getRoadmaps();
    const applications = careerRepository.getApplications();

    // 1. Identify carry over tasks from previous active blocks
    const allPreviousTasks = currentBlocks.flatMap(b => b.tasks || []);
    const carryOver = identifyCarryOverTasks(allPreviousTasks);

    // 2. Identify eligible topics from roadmaps
    const allRoadmapItems = roadmaps.flatMap(r => r.items);
    const eligibleRoadmapItems = getEligibleTopics(allRoadmapItems);

    // Find nearest interview date to calculate deadline proximity
    let daysUntilInterview: number | null = null;
    const interviewDates = applications
      .filter(app => app.interviewDate)
      .map(app => new Date(app.interviewDate!));
    
    if (interviewDates.length > 0) {
      const nearest = new Date(Math.min(...interviewDates.map(d => d.getTime())));
      const today = new Date();
      const diffTime = nearest.getTime() - today.getTime();
      daysUntilInterview = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }

    // 3. Create tasks from eligible items
    const newTasksFromRoadmap: Task[] = eligibleRoadmapItems.map(item => {
      // Calculate dynamic priority score
      const priorityScore = calculateTopicPriority(
        item,
        daysUntilInterview,
        item.difficulty === 'Hard' ? 5 : item.difficulty === 'Medium' ? 3 : 1
      );

      let priority: Task['priority'] = 'Medium';
      if (priorityScore > 75) priority = 'High';
      else if (priorityScore < 35) priority = 'Low';

      return {
        id: `task-rm-${item.id}`,
        blockId: '',
        title: `Study: ${item.title}`,
        description: `Learn next topic in roadmap. Prerequisites completed. Difficulty: ${item.difficulty}`,
        estDuration: Math.round(item.estimatedHours * 60), // convert hours to minutes
        priority,
        difficulty: item.difficulty,
        status: 'Todo',
        tags: ['Roadmap', item.difficulty],
        attachments: [],
        notes: '',
        resources: item.resources.map(r => ({ title: r.title, url: r.url })),
        roadmapRefId: item.id,
        aiSuggestions: `Priority Score: ${priorityScore}% calculated by Planning Engine.`,
        progress: 0,
        checklist: item.practiceQuestions.map((q, qidx) => ({
          id: `checklist-pq-${item.id}-${qidx}`,
          title: `Practice: ${q.question}`,
          done: false
        })),
        createdAt: new Date().toISOString()
      };
    });

    // 4. Merge carry-over tasks and new backlog items
    const allCandidateTasks = mergeTasksWithoutDuplicates(carryOver, newTasksFromRoadmap);

    // 5. Group into blocks
    // Clean current blocks (empty tasks list first)
    const emptyBlocks: StudyBlock[] = currentBlocks.map(b => ({
      ...b,
      tasks: []
    }));

    const scheduledBlocks = scheduleTasksIntoBlocks(availableHours, emptyBlocks, allCandidateTasks);

    // 6. Save back to task repository blocks
    scheduledBlocks.forEach(b => {
      taskRepository.updateBlock(b.id, { tasks: b.tasks || [] });
    });

    // 7. Module 5 — Generate and persist revision blocks.
    //    Only completed roadmap items are eligible for SM-2 revision.
    const completedItems = allRoadmapItems.filter(
      item => item.completionState === 'Completed',
    );
    const revisionCandidates = identifyDueRevisions(completedItems);
    const revisionBlocks = generateRevisionBlocks(
      revisionCandidates,
      scheduledBlocks,
      1.5,
    );
    revisionBlocks.forEach(b => taskRepository.addBlock(b));
  }, // end generateDailySchedule
  /**
   * Generates a DailyPlan without persisting changes.
   */
  generateDailyPlan(): DailyPlan {
    const availableHours = userRepository.getAvailableHours();
    const currentBlocks = taskRepository.getBlocks();
    const roadmaps = roadmapRepository.getRoadmaps();
    const applications = careerRepository.getApplications();

    const allPreviousTasks = currentBlocks.flatMap(b => b.tasks || []);
    const carryOver = identifyCarryOverTasks(allPreviousTasks);

    const allRoadmapItems = roadmaps.flatMap(r => r.items);
    const eligibleRoadmapItems = getEligibleTopics(allRoadmapItems);

    let daysUntilInterview: number | null = null;
    const interviewDates = applications
      .filter(app => app.interviewDate)
      .map(app => new Date(app.interviewDate!));

    if (interviewDates.length > 0) {
      const nearest = new Date(Math.min(...interviewDates.map(d => d.getTime())));
      const today = new Date();
      const diffTime = nearest.getTime() - today.getTime();
      daysUntilInterview = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }

    const newTasksFromRoadmap: Task[] = eligibleRoadmapItems.map(item => {
      const priorityScore = calculateTopicPriority(
        item,
        daysUntilInterview,
        item.difficulty === 'Hard' ? 5 : item.difficulty === 'Medium' ? 3 : 1
      );
      let priority: Task['priority'] = 'Medium';
      if (priorityScore > 75) priority = 'High';
      else if (priorityScore < 35) priority = 'Low';
      return {
        id: `task-rm-${item.id}`,
        blockId: '',
        title: `Study: ${item.title}`,
        description: `Learn next topic in roadmap. Prerequisites completed. Difficulty: ${item.difficulty}`,
        estDuration: Math.round(item.estimatedHours * 60),
        priority,
        difficulty: item.difficulty,
        status: 'Todo',
        tags: ['Roadmap', item.difficulty],
        attachments: [],
        notes: '',
        resources: item.resources.map(r => ({ title: r.title, url: r.url })),
        roadmapRefId: item.id,
        aiSuggestions: `Priority Score: ${priorityScore}% calculated by Planning Engine.`,
        progress: 0,
        checklist: item.practiceQuestions.map((q, qidx) => ({
          id: `checklist-pq-${item.id}-${qidx}`,
          title: `Practice: ${q.question}`,
          done: false
        })),
        createdAt: new Date().toISOString()
      };
    });

    const allCandidateTasks = mergeTasksWithoutDuplicates(carryOver, newTasksFromRoadmap);

    const emptyBlocks: StudyBlock[] = currentBlocks.map(b => ({
      ...b,
      tasks: []
    }));

    const scheduledBlocks = scheduleTasksIntoBlocks(availableHours, emptyBlocks, allCandidateTasks);

    const estimatedXP = calculateXP(allCandidateTasks);

    // Module 5: Generate revision blocks for completed roadmap items that are
    // due for SM-2 spaced-repetition review today.
    const allRoadmapItemsPlan = roadmaps.flatMap(r => r.items);
    const completedItemsPlan = allRoadmapItemsPlan.filter(
      item => item.completionState === 'Completed',
    );
    const revisionCandidates = identifyDueRevisions(completedItemsPlan);
    const revisionBlocks = generateRevisionBlocks(
      revisionCandidates,
      scheduledBlocks,
      1.5,
    );

    const revisionHours = revisionBlocks.reduce((sum, b) => sum + b.estHours, 0);
    const totalStudyHours =
      scheduledBlocks.reduce((sum, b) => sum + b.estHours, 0) + revisionHours;

    const summary =
      `Planned ${scheduledBlocks.length} study block(s) with ${allCandidateTasks.length} task(s)` +
      `, ${revisionBlocks.length} revision block(s) with ${revisionCandidates.length} due item(s)` +
      `, estimated XP ${estimatedXP}.`;

    return {
      orderedStudyBlocks: scheduledBlocks,
      scheduledTasks: allCandidateTasks,
      carryOverTasks: carryOver,
      revisionBlocks,
      estimatedXP,
      totalStudyHours,
      summary,
    };
  }
};
