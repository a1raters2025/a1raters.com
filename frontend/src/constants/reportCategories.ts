export interface EvaluationCategoryOption {
  name: string;
  displayName: string;
  tasksPerHour: number;
}

export const EVALUATION_CATEGORY_OPTIONS: EvaluationCategoryOption[] = [
  { name: 'AI Assist', displayName: 'AI Assist - 15 tasks/hour', tasksPerHour: 15 },
  { name: 'AI Assist', displayName: 'AI Assist - 20 tasks/hour', tasksPerHour: 20 },
  { name: 'App Image Accessibility', displayName: 'App Image Accessibility - 20 tasks/hour', tasksPerHour: 20 },
  { name: 'App Store', displayName: 'App Store - 37 tasks/hour', tasksPerHour: 37 },
  { name: 'Mac App Store', displayName: 'Mac App Store - 38 tasks/hour', tasksPerHour: 38 },
  { name: 'Music', displayName: 'Music - 30 tasks/hour', tasksPerHour: 30 },
  { name: 'Music', displayName: 'Music - 35 tasks/hour', tasksPerHour: 35 },
  { name: 'Podcast', displayName: 'Podcast - 35 tasks/hour', tasksPerHour: 35 },
  { name: 'Video', displayName: 'Video - 25 tasks/hour', tasksPerHour: 25 },
  { name: 'Video Hint', displayName: 'Video Hint - 35 tasks/hour', tasksPerHour: 35 },
];

export const EVALUATION_CATEGORIES = Array.from(
  new Set(EVALUATION_CATEGORY_OPTIONS.map(({ name }) => name)),
);
