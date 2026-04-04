import { z } from 'zod';

/**
 * Role status enum - validated at runtime (not database level per DEV-021)
 * - ignore: User explicitly not interested
 * - save: Saved for later review
 * - apply: Planning to apply
 * - applied: Application submitted
 */
export const RoleStatusEnum = z.enum(['ignore', 'save', 'apply', 'applied']);

export type RoleStatus = z.infer<typeof RoleStatusEnum>;

/**
 * Schema for updating role status
 */
export const UpdateRoleStatusSchema = z.object({
  status: RoleStatusEnum,
  notes: z.string().max(500).optional(),
});

export type UpdateRoleStatus = z.infer<typeof UpdateRoleStatusSchema>;

/**
 * Schema for filtering role statuses in queue view
 */
export const RoleStatusFilterSchema = z.enum(['all', 'ignore', 'save', 'apply', 'applied']);

export type RoleStatusFilter = z.infer<typeof RoleStatusFilterSchema>;
