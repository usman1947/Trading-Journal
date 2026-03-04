/**
 * Zod Validation Schemas for API Routes
 *
 * Provides runtime validation for all API request bodies with full TypeScript
 * type inference. Uses Zod for schema definition and validation.
 *
 * @module lib/validation-schemas
 */

import { z } from 'zod';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Format a Zod error into a human-readable string for API responses.
 *
 * @param error - The Zod validation error
 * @returns Formatted error message string
 */
export function formatZodError(error: z.ZodError<unknown>): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.join('.');
      return path ? `${path}: ${issue.message}` : issue.message;
    })
    .join('; ');
}

// =============================================================================
// Common Schemas
// =============================================================================

/**
 * Date string that can be parsed into a valid Date.
 */
const dateStringSchema = z.string().refine(
  (val) => {
    const date = new Date(val);
    return !isNaN(date.getTime());
  },
  { message: 'Invalid date format' }
);

/**
 * Optional date string.
 */
const optionalDateStringSchema = dateStringSchema.optional().nullable();

// =============================================================================
// Auth Schemas
// =============================================================================

/**
 * Login request schema.
 */
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email format')
    .transform((val) => val.toLowerCase().trim()),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Signup request schema.
 */
export const signupSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email format')
    .transform((val) => val.toLowerCase().trim()),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or less')
    .transform((val) => val.trim()),
});

export type SignupInput = z.infer<typeof signupSchema>;

// =============================================================================
// Trade Schemas
// =============================================================================

/**
 * Create trade request schema.
 */
export const createTradeSchema = z.object({
  symbol: z.string().min(1, 'Symbol is required').max(20),
  side: z.string().min(1, 'Side is required'),
  tradeTime: dateStringSchema,
  exitTime: optionalDateStringSchema,
  setup: z.string().max(500).optional().nullable(),
  risk: z.number({ error: 'Risk is required' }),
  result: z.number().optional().nullable(),
  partials: z.array(z.number()).optional().nullable(),
  commission: z.number().optional().nullable(),
  execution: z.string().optional().default('PASS'),
  isBreakEven: z.boolean().optional().default(false),
  notes: z.string().max(5000).optional().nullable(),
  strategyId: z.string().optional().nullable(),
  accountId: z.string().optional().nullable(),
  // AI-ready fields
  preTradeMood: z.string().optional().nullable(),
  postTradeMood: z.string().optional().nullable(),
  confidenceLevel: z.number().int().min(1).max(10).optional().nullable(),
  mistake: z.string().optional().nullable(),
  // Unified trade checklist
  checkPlan: z.boolean().optional().default(false),
  checkJudge: z.boolean().optional().default(false),
  checkExecute: z.boolean().optional().default(false),
  checkManage: z.boolean().optional().default(false),
});

export type CreateTradeInput = z.infer<typeof createTradeSchema>;

/**
 * Update trade request schema (all fields optional for partial updates).
 */
export const updateTradeSchema = z.object({
  symbol: z.string().min(1).max(20).optional(),
  side: z.string().min(1).optional(),
  tradeTime: dateStringSchema.optional(),
  exitTime: optionalDateStringSchema,
  setup: z.string().max(500).optional().nullable(),
  risk: z.number().optional(),
  result: z.number().optional().nullable(),
  partials: z.array(z.number()).optional().nullable(),
  commission: z.number().optional().nullable(),
  execution: z.string().optional(),
  isBreakEven: z.boolean().optional(),
  notes: z.string().max(5000).optional().nullable(),
  strategyId: z.string().optional().nullable(),
  accountId: z.string().optional().nullable(),
  // AI-ready fields
  preTradeMood: z.string().optional().nullable(),
  postTradeMood: z.string().optional().nullable(),
  confidenceLevel: z.number().int().min(1).max(10).optional().nullable(),
  mistake: z.string().optional().nullable(),
  // Unified trade checklist
  checkPlan: z.boolean().optional(),
  checkJudge: z.boolean().optional(),
  checkExecute: z.boolean().optional(),
  checkManage: z.boolean().optional(),
});

export type UpdateTradeInput = z.infer<typeof updateTradeSchema>;

// =============================================================================
// Strategy Schemas
// =============================================================================

/**
 * Create strategy request schema.
 */
export const createStrategySchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(2000).optional().nullable(),
  setups: z.array(z.string()).optional().nullable(),
  checkPlanDesc: z.string().max(500).optional().nullable(),
  checkJudgeDesc: z.string().max(500).optional().nullable(),
  checkExecuteDesc: z.string().max(500).optional().nullable(),
  checkManageDesc: z.string().max(500).optional().nullable(),
  isSwingStrategy: z.boolean().optional().default(false),
});

export type CreateStrategyInput = z.infer<typeof createStrategySchema>;

/**
 * Update strategy request schema.
 */
export const updateStrategySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  setups: z.array(z.string()).optional().nullable(),
  checkPlanDesc: z.string().max(500).optional().nullable(),
  checkJudgeDesc: z.string().max(500).optional().nullable(),
  checkExecuteDesc: z.string().max(500).optional().nullable(),
  checkManageDesc: z.string().max(500).optional().nullable(),
  isSwingStrategy: z.boolean().optional(),
});

export type UpdateStrategyInput = z.infer<typeof updateStrategySchema>;

// =============================================================================
// Journal Schemas
// =============================================================================

/**
 * Create/update journal entry request schema.
 */
export const createJournalSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  notes: z.string().min(1, 'Notes are required').max(10000),
  mood: z.string().optional().nullable(),
  lessons: z.string().max(5000).optional().nullable(),
  // AI-ready fields
  energyLevel: z.number().int().min(1).max(10).optional().nullable(),
  sleepQuality: z.number().int().min(1).max(10).optional().nullable(),
  focusLevel: z.number().int().min(1).max(10).optional().nullable(),
  premarketPlan: z.boolean().optional().default(false),
});

export type CreateJournalInput = z.infer<typeof createJournalSchema>;

// =============================================================================
// Account Schemas
// =============================================================================

/**
 * Create account request schema.
 */
export const createAccountSchema = z.object({
  name: z
    .string()
    .min(1, 'Account name is required')
    .max(100)
    .transform((val) => val.trim()),
  description: z.string().max(500).optional().nullable(),
  initialBalance: z.number().min(0).optional().default(0),
  isSwingAccount: z.boolean().optional().default(false),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;

/**
 * Update account request schema.
 */
export const updateAccountSchema = z.object({
  name: z
    .string()
    .min(1, 'Account name is required')
    .max(100)
    .transform((val) => val.trim()),
  description: z.string().max(500).optional().nullable(),
  initialBalance: z.number().min(0).optional(),
  isSwingAccount: z.boolean().optional(),
});

export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;

// =============================================================================
// Tag Schemas
// =============================================================================

/**
 * Create tag request schema.
 */
export const createTagSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a valid hex color')
    .optional()
    .default('#1976d2'),
});

export type CreateTagInput = z.infer<typeof createTagSchema>;
