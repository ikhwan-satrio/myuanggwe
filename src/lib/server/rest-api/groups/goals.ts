import { eq, and, isNull } from 'drizzle-orm';
import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { withBackendCache } from '$lib/redis/server';
import { financialGoalSchema } from '$lib/schemas';
import { createServer } from '../server';
import { invalidateUserCache } from '$lib/composables/invalidateRedis';
import { z } from 'zod';

export const goalsGroup = createServer({ name: 'goals', prefix: '/goals' })
	.get(
		'/',
		async ({ user, activeOrg }) => {
			const cacheKey = activeOrg ? `goals:org:${activeOrg.id}` : `goals:user:${user.id}`;

			const goalList = await withBackendCache(cacheKey, async () => {
				return await db.query.financialGoals.findMany({
					where: activeOrg
						? eq(schema.financialGoals.organizationId, activeOrg.id)
						: and(
								eq(schema.financialGoals.userId, user.id),
								isNull(schema.financialGoals.organizationId)
							),
					with: {
						wallet: true
					},
					orderBy: (goal, { desc }) => [desc(goal.createdAt)]
				});
			});

			return { goalList };
		},
		{ auth: true }
	)

	.post(
		'/create',
		async (c) => {
			const { user, activeOrg, body } = c;

			try {
				await db.insert(schema.financialGoals).values({
					id: crypto.randomUUID(),
					name: body.name,
					targetAmount: body.targetAmount,
					deadline: body.deadline ? new Date(body.deadline) : null,
					walletId: body.walletId,
					userId: user!.id,
					organizationId: activeOrg?.id ?? null,
					currentAmount: 0
				});

				await invalidateUserCache(user!.id, activeOrg?.id);

				return { success: true, message: 'Target menabung berhasil dibuat' };
			} catch (e) {
				console.error(e);
				return { success: false, message: 'Gagal membuat target menabung' };
			}
		},
		{ auth: true, body: financialGoalSchema }
	)

	.put(
		'/allocate/:id',
		async (c) => {
			const { user, activeOrg, body, params } = c;
			const { amount } = body;

			try {
				const contextQuery = activeOrg
					? eq(schema.financialGoals.organizationId, activeOrg.id)
					: and(
							eq(schema.financialGoals.userId, user.id),
							isNull(schema.financialGoals.organizationId)
						);

				const goal = await db.query.financialGoals.findFirst({
					where: and(eq(schema.financialGoals.id, params.id), contextQuery)
				});

				if (!goal) return { success: false, message: 'Goal not found' };

				await db
					.update(schema.financialGoals)
					.set({
						currentAmount: goal.currentAmount + amount
					})
					.where(eq(schema.financialGoals.id, params.id));

				await invalidateUserCache(user!.id, activeOrg?.id);

				return { success: true, message: 'Alokasi dana berhasil' };
			} catch (e) {
				console.error(e);
				return { success: false, message: 'Gagal alokasi dana' };
			}
		},
		{
			auth: true,
			body: z.object({ amount: z.number() })
		}
	)

	.delete(
		'/erase/:id',
		async ({ params, user, activeOrg }) => {
			try {
				const contextQuery = activeOrg
					? eq(schema.financialGoals.organizationId, activeOrg.id)
					: and(
							eq(schema.financialGoals.userId, user.id),
							isNull(schema.financialGoals.organizationId)
						);

				const result = await db
					.delete(schema.financialGoals)
					.where(and(eq(schema.financialGoals.id, params.id), contextQuery));

				if (result.rowsAffected === 0) {
					return { success: false, message: 'Goal not found' };
				}

				await invalidateUserCache(user.id, activeOrg?.id);

				return { success: true, message: 'Target menabung dihapus' };
			} catch (e) {
				console.error(e);
				return { success: false, message: 'Gagal hapus target' };
			}
		},
		{ auth: true }
	);
