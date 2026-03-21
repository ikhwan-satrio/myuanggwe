import { Elysia } from 'elysia';
import cors from '@elysiajs/cors';
import { dashboardGroup } from '#server/groups/dashboard';
import { walletsGroup } from '#server/groups/wallets';
import { transactionsGroup } from '#server/groups/transactions';
import { categoriesGroup } from '#server/groups/categories';
import { budgetsGroup } from '#server/groups/budgets';
import { recurringGroup, processRecurringTransactions } from '#server/groups/recurring';
import { goalsGroup } from '#server/groups/goals';
import { orgsGroups } from '#server/groups/orgs/switch';
import { manageOrgsGroup } from '#server/groups/orgs/manage';
import { createServer } from './server';

const layoutGroup = createServer().get(
	'/layout',
	async (c) => {
		const { user, session: authSession, organizations, activeOrg } = c;
		if (!authSession) {
			return { user: null, activeOrg: null, organizations: [] };
		}

		// Process recurring transactions whenever layout is fetched
		await processRecurringTransactions(user.id, activeOrg?.id);

		return { user, session: authSession, organizations, activeOrg };
	},
	{ auth: true }
);

export const app = new Elysia({ prefix: '/api' })
	.use(
		cors({
			origin: ['http://localhost:5173', 'https://myuanggwe.vercel.app'],
			methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
			credentials: true,
			allowedHeaders: ['Content-Type', 'Authorization']
		})
	)
	.use(layoutGroup)
	.use(orgsGroups)
	.use(dashboardGroup)
	.use(walletsGroup)
	.use(transactionsGroup)
	.use(categoriesGroup)
	.use(manageOrgsGroup)
	.use(budgetsGroup)
	.use(recurringGroup)
	.use(goalsGroup);

export type App = typeof app;
