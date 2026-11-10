export const WORKLOG_FORMATS = ['daily-log', 'standup', 'client-report'] as const;
export type WorklogFormat = (typeof WORKLOG_FORMATS)[number];

export const WORKLOG_LANGUAGES = ['en'] as const;
export type WorklogLanguage = (typeof WORKLOG_LANGUAGES)[number];

export const DATE_FORMAT = 'yyyy-MM-dd';
export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Calendar days allowed in one plan request. */
export const MAX_RANGE_DAYS = 31;

/**
 * Days with recorded activity that may be summarised in one run.
 * This protects the user's own rate limit and budget, not the server:
 * every active day is one LLM request.
 */
export const MAX_ACTIVE_DAYS = { free: 7, paid: 31 } as const;
export type LlmTier = keyof typeof MAX_ACTIVE_DAYS;

/** Bump when the prompt or the facts shape changes, so cached texts are regenerated. */
export const PROMPT_VERSION = 3;

/** Caps on what is sent to the model. They bound token usage and the room for prompt injection. */
export const MAX_NAME_LENGTH = 80;
export const MAX_COMMIT_MESSAGE_LENGTH = 120;
export const MAX_COMMITS_PER_DAY = 10;
export const MAX_PROJECTS_PER_DAY = 5;
export const MAX_BRANCHES_PER_PROJECT = 5;
export const MAX_LANGUAGES_PER_DAY = 3;
export const MAX_HOT_FILES_PER_DAY = 5;
export const MAX_FILE_PATH_LENGTH = 160;
export const MAX_BRANCH_WORK_ITEMS_PER_DAY = 5;
export const MAX_ACTIVE_FILES_PER_BRANCH = 5;
export const MAX_CHANGED_FILES_PER_BRANCH = 10;
export const MAX_COMMITS_PER_BRANCH = 5;
