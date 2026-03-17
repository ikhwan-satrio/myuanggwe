import { eq, and, isNull, sql, gte, lte } from 'drizzle-orm'
import { db } from '$lib/server/db'
import * as schema from '$lib/server/db/schema'
import { withBackendCache } from '$lib/redis/server'
import { recurringTransactionSchema } from '$lib/schemas'
import { createServer } from '../server'
import { invalidateUserCache } from '$lib/composables/invalidateRedis'

export const recurringGroup = createServer({ name: 'recurring', prefix: '/recurring' })
  .get(
    '/',
    async ({ user, activeOrg }) => {
      const cacheKey = activeOrg
        ? `recurring:org:${activeOrg.id}`
        : `recurring:user:${user.id}`

      const recurringList = await withBackendCache(
        cacheKey,
        async () => {
          return await db.query.recurringTransactions.findMany({
            where: activeOrg
              ? eq(schema.recurringTransactions.organizationId, activeOrg.id)
              : and(eq(schema.recurringTransactions.userId, user.id), isNull(schema.recurringTransactions.organizationId)),
            with: {
              wallet: true,
              toWallet: true,
              category: true
            },
            orderBy: (rec, { desc }) => [desc(rec.createdAt)]
          })
        }
      )

      return { recurringList }
    },
    { auth: true }
  )

  .post(
    '/create',
    async (c) => {
      const { user, activeOrg, body } = c
      const { amount, type, frequency, startDate, walletId, toWalletId, categoryId, description } = body

      try {
        const start = new Date(startDate)
        
        await db.insert(schema.recurringTransactions).values({
          id: crypto.randomUUID(),
          amount,
          type,
          frequency,
          startDate: start,
          nextRunDate: start, // Initial next run is start date
          walletId,
          toWalletId: toWalletId || null,
          categoryId: categoryId || null,
          description: description || null,
          userId: user!.id,
          organizationId: activeOrg?.id ?? null,
          isActive: true
        })

        await invalidateUserCache(user!.id, activeOrg?.id)

        return { success: true, message: 'Transaksi berulang berhasil dibuat' }
      } catch (e) {
        console.error(e)
        return { success: false, message: 'Gagal membuat transaksi berulang' }
      }
    },
    { auth: true, body: recurringTransactionSchema }
  )

  .delete(
    '/erase/:id',
    async ({ params, user, activeOrg }) => {
      try {
        const contextQuery = activeOrg
          ? eq(schema.recurringTransactions.organizationId, activeOrg.id)
          : and(eq(schema.recurringTransactions.userId, user.id), isNull(schema.recurringTransactions.organizationId))

        const result = await db
          .delete(schema.recurringTransactions)
          .where(and(eq(schema.recurringTransactions.id, params.id), contextQuery))

        if (result.rowsAffected === 0) {
          return { success: false, message: 'Recurring transaction not found' }
        }

        await invalidateUserCache(user.id, activeOrg?.id)

        return { success: true, message: 'Transaksi berulang dihapus' }
      } catch (e) {
        console.error(e)
        return { success: false, message: 'Gagal hapus transaksi berulang' }
      }
    },
    { auth: true }
  )

// Function to process pending recurring transactions
export async function processRecurringTransactions(userId: string, orgId?: string | null) {
  const now = new Date()

  const pending = await db.query.recurringTransactions.findMany({
    where: and(
      eq(schema.recurringTransactions.userId, userId),
      orgId ? eq(schema.recurringTransactions.organizationId, orgId) : isNull(schema.recurringTransactions.organizationId),
      eq(schema.recurringTransactions.isActive, true),
      lte(schema.recurringTransactions.nextRunDate, now)
    )
  })

  if (pending.length === 0) return

  for (const rec of pending) {
    try {
      await db.transaction(async (tx) => {
        // 1. Create the transaction
        await tx.insert(schema.transactions).values({
          id: crypto.randomUUID(),
          amount: rec.amount,
          type: rec.type,
          description: `[Recurring] ${rec.description || ''}`,
          date: rec.nextRunDate,
          walletId: rec.walletId,
          toWalletId: rec.toWalletId,
          categoryId: rec.categoryId,
          userId: rec.userId,
          organizationId: rec.organizationId
        })

        // 2. Update wallet balances (Logic should be shared, but for brevity here:)
        const walletSource = await tx.query.wallets.findFirst({ where: eq(schema.wallets.id, rec.walletId) })
        if (walletSource) {
          if (rec.type === 'transfer') {
             await tx.update(schema.wallets).set({ balance: walletSource.balance - rec.amount }).where(eq(schema.wallets.id, rec.walletId))
             if (rec.toWalletId) {
                const walletDest = await tx.query.wallets.findFirst({ where: eq(schema.wallets.id, rec.toWalletId) })
                if (walletDest) {
                   await tx.update(schema.wallets).set({ balance: walletDest.balance + rec.amount }).where(eq(schema.wallets.id, rec.toWalletId))
                }
             }
          } else {
             const change = rec.type === 'income' ? rec.amount : -rec.amount
             await tx.update(schema.wallets).set({ balance: walletSource.balance + change }).where(eq(schema.wallets.id, rec.walletId))
          }
        }

        // 3. Update nextRunDate for the recurring record
        let nextDate = new Date(rec.nextRunDate)
        if (rec.frequency === 'daily') nextDate.setDate(nextDate.getDate() + 1)
        else if (rec.frequency === 'weekly') nextDate.setDate(nextDate.getDate() + 7)
        else if (rec.frequency === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1)
        else if (rec.frequency === 'yearly') nextDate.setFullYear(nextDate.getFullYear() + 1)

        await tx.update(schema.recurringTransactions)
          .set({ 
            lastRunDate: rec.nextRunDate,
            nextRunDate: nextDate 
          })
          .where(eq(schema.recurringTransactions.id, rec.id))
      })
    } catch (err) {
      console.error(`Failed to process recurring transaction ${rec.id}:`, err)
    }
  }

  await invalidateUserCache(userId, orgId)
}
