import { StudyBlock, StudyBlockTemplate,} from '../../types';

/**
 * Generates study blocks for the day using defined templates.
 * 
 * Sets start/end times relative to typical daily patterns:
 * - Morning: 09:00 onwards
 * - Afternoon: 14:00 onwards
 * - Evening: 18:00 onwards
 */
export function generateBlocksFromTemplates(
  templates: StudyBlockTemplate[]
): StudyBlock[] {
  let currentHour = 9; // Start morning blocks at 9 AM
  
  return templates.map((tpl, idx) => {
    // Determine typical start hour based on index or template properties
    let startH = currentHour;
    if (tpl.title.toLowerCase().includes('evening') || tpl.title.toLowerCase().includes('night')) {
      startH = Math.max(18, currentHour);
    } else if (tpl.title.toLowerCase().includes('afternoon')) {
      startH = Math.max(14, currentHour);
    }
    
    const startStr = `${startH.toString().padStart(2, '0')}:00`;
    const endH = startH + tpl.preferredDuration;
    const endStr = `${endH.toString().padStart(2, '0')}:00`;
    
    currentHour = endH + 1; // 1 hour buffer

    return {
      id: `block-${tpl.id}-${Date.now()}`,
      title: tpl.title,
      icon: tpl.title.toLowerCase().includes('morning') ? 'Sunrise' : 'Moon',
      color: tpl.priority === 'High' ? '#00f0ff' : '#bd00ff',
      priority: tpl.priority,
      estHours: tpl.preferredDuration,
      startTime: startStr,
      endTime: endStr,
      orderIndex: idx,
      isCollapsed: false,
      tasks: []
    };
  });
}

// Default standard block templates
export const defaultBlockTemplates: StudyBlockTemplate[] = [
  {
    id: 'tpl-morning',
    title: 'Morning Study Block',
    preferredDuration: 2,
    priority: 'High',
    preferredTopics: ['DSA', 'Java', 'SQL']
  },
  {
    id: 'tpl-afternoon',
    title: 'Afternoon Project Block',
    preferredDuration: 2.5,
    priority: 'Medium',
    preferredTopics: ['Projects', 'Development', 'ML']
  },
  {
    id: 'tpl-evening',
    title: 'Evening Review Block',
    preferredDuration: 1.5,
    priority: 'High',
    preferredTopics: ['Revision', 'Flashcards', 'System Design']
  }
];
