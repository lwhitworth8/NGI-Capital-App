import { z } from "zod";

export const Todo = z.object({
  id: z.string(), title: z.string().min(1),
  notes: z.string().optional(),
  due: z.string().datetime().nullable().optional(),
  completed: z.boolean().default(false),
  createdAt: z.string(), updatedAt: z.string()
});
export type Todo = z.infer<typeof Todo>;

export const CalendarEvent = z.object({
  id: z.string(), calendarId: z.string(), title: z.string(),
  startISO: z.string(), endISO: z.string(),
  location: z.string().optional(), attendees: z.array(z.string()).optional()
});
export type CalendarEvent = z.infer<typeof CalendarEvent>;

export const Goal = z.object({
  id: z.string(), title: z.string(), owner: z.string(),
  progress: z.number().min(0).max(100),
  status: z.enum(["On Track","At Risk","Off Track"]),
  due: z.string().datetime().optional()
});
export type Goal = z.infer<typeof Goal>;

export const ProductCard = z.object({
  id: z.string(), title: z.string(),
  ownerIds: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  targetDate: z.string().datetime().optional(),
  status: z.enum(["Backlog","Exploring","Building","Testing","Launched"]),
  progress: z.number().min(0).max(100).default(0)
});
export type ProductCard = z.infer<typeof ProductCard>;

// ===================== HR / Employees Schemas =====================
export const EmployeeSchema = z.object({
  name: z.string().min(1, 'name required'),
  email: z.string().email('invalid email'),
  employment_type: z.string().optional(),
  status: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});
export type EmployeeSchema = z.infer<typeof EmployeeSchema>;

export const MembershipSchema = z.object({
  entityId: z.number().int().positive(),
  allocationPct: z.number().min(0).max(100).default(100),
  primary: z.boolean().default(false),
});
export type MembershipSchema = z.infer<typeof MembershipSchema>;

export const TeamSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['Functional','Project','AdvisoryProject']).optional(),
});
export type TeamSchema = z.infer<typeof TeamSchema>;

export const EmployeeTaskSchema = z.object({
  title: z.string().min(1),
  notes: z.string().optional(),
  status: z.enum(['Open','In Progress','Done']).default('Open'),
  due_at: z.string().optional(),
});
export type EmployeeTaskSchema = z.infer<typeof EmployeeTaskSchema>;

// Label switcher for Advisory LLC
export function labelsForEntityName(name?: string) {
  const isAdvisory = typeof name === 'string' && /advisory/i.test(name)
  return {
    people: isAdvisory ? 'Students' : 'Employees',
    groups: isAdvisory ? 'Projects' : 'Teams',
    todos: isAdvisory ? 'Student To-Dos' : 'Employee To-Dos',
  }
}

// Status transition helper: Active -> Inactive requires end_date
export function validateStatusTransition(prev: { status?: string; end_date?: string }, next: { status?: string; end_date?: string }) {
  const from = (prev.status || 'Active').toLowerCase()
  const to = (next.status || prev.status || 'Active').toLowerCase()
  if (from === 'active' && to === 'inactive') {
    if (!next.end_date) {
      throw new Error('end_date required when setting status to Inactive')
    }
  }
  return true
}
