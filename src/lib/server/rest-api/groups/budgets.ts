import { eq, and, isNull, sql } from 'drizzle-orm'
import { db } from '$lib/server/db'
import * as schema from '$lib/server/db/schema'
import { withBackendCache } from '$lib/redis/server'
import { budgetSchema } from '$lib/schemas'
import { createServer } from '../server'
import { invalidateUserCache } from '$lib/composables/invalidateRedis'

export const budgetsGroup = createServer({ name: 'budgets', prefix: '/budgets' })
  .get(
    '/',
    async ({ user, activeOrg }) => {
      const cacheKey = activeOrg
        ? `budgets:org:${activeOrg.id}`
        : `budgets:user:${user.id}`

      const budgetList = await withBackendCache(
        cacheKey,
        async () => {
          // Get budgets with category info
          const budgetsData = await db.query.budgets.findMany({
            where: activeOrg
              ? eq(schema.budgets.organizationId, activeOrg.id)
              : and(eq(schema.budgets.userId, user.id), isNull(schema.budgets.organizationId)),
            with: {
              category: true
            },
            orderBy: (budgets, { desc }) => [desc(budgets.createdAt)]
          })

          // For each budget, calculate current spending in its category for the current month
          const startOfMonth = new Date()
          startOfMonth.setDate(1)
          startOfMonth.setHours(0, 0, 0, 0)

          const budgetsWithSpending = await Promise.all(
            budgetsData.map(async (budget) => {
              const contextQuery = activeOrg
                ? eq(schema.transactions.organizationId, activeOrg.id)
                : and(eq(schema.transactions.userId, user.id), isNull(schema.transactions.organizationId))

              const spending = await db
                .select({
                  total: sql<number>`cast(sum(${schema.transactions.amount}) as integer)`
                })
                .from(schema.transactions)
                .where(
                  and(
                    contextQuery,
                    eq(schema.transactions.categoryId, budget.categoryId),
                    eq(schema.transactions.type, 'expense'),
                    gte(schema.transactions.date, startOfMonth)
                  )
                )

              return {
                ...budget,
                currentSpending: spending[0]?.total || 0
              }
            })
          )

          return budgetsWithSpending
        }
      )

      return { budgetList }
    },
    { auth: true }
  )

  .post(
    '/create',
    async (c) => {
      const { user, activeOrg, body } = c

      try {
        await db.insert(schema.budgets).values({
          id: crypto.randomUUID(),
          amount: body.amount,
          period: body.period,
          categoryId: body.categoryId,
          userId: user!.id,
          organizationId: activeOrg?.id ?? null
        })

        await invalidateUserCache(user!.id, activeOrg?.id)

        return { success: true, message: 'Budget created successfully' }
      } catch (e) {
        console.error(e)
        return { success: false, message: 'Gagal membuat anggaran' }
      }
    },
    { auth: true, body: budgetSchema }
  )

  .put(
    '/edit/:id',
    async (c) => {
      const { user, activeOrg, body, params } = c

      try {
        const contextQuery = activeOrg
          ? eq(schema.budgets.organizationId, activeOrg.id)
          : and(eq(schema.budgets.userId, user.id), isNull(schema.budgets.organizationId))

        const result = await db
          .update(schema.budgets)
          .set({
            amount: body.amount,
            period: body.period,
            categoryId: body.categoryId
          })
          .where(and(eq(schema.budgets.id, params.id), contextQuery))

        if (result.rowsAffected === 0) {
          return { success: false, message: 'Budget not found or access denied' }
        }

        await invalidateUserCache(user!.id, activeOrg?.id)

        return { success: true, message: 'Budget updated successfully' }
      } catch (e) {
        console.error(e)
        return { success: false, message: 'Gagal update anggaran' }
      }
    },
    { auth: true, body: budgetSchema }
  )

  .delete(
    '/erase/:id',
    async ({ params, user, activeOrg }) => {
      try {
        const contextQuery = activeOrg
          ? eq(schema.budgets.organizationId, activeOrg.id)
          : and(eq(schema.budgets.userId, user.id), isNull(schema.budgets.organizationId))

        const result = await db
          .delete(schema.budgets)
          .where(and(eq(schema.budgets.id, params.id), contextQuery))

        if (result.rowsAffected === 0) {
          return { success: false, message: 'Budget not found or access denied' }
        }

        await invalidateUserCache(user.id, activeOrg?.id)

        return { success: true, message: 'Budget deleted successfully' }
      } catch (e) {
        console.error(e)
        return { success: false, message: 'Gagal hapus anggaran' }
      }
    },
    { auth: true }
  )

// Add gte for transaction query
import { gte } from 'drizzle-orm'
