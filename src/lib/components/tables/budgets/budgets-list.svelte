<script lang="ts">
	import { toast } from 'svelte-sonner';

	type Budget = {
		id: string;
		amount: number;
		period: 'monthly' | 'yearly';
		categoryId: string;
		category: {
			name: string;
			icon?: string | null;
		};
		currentSpending: number;
	};

	let editingBudget = $state<Budget | null>(null);
	let isEditSheetOpen = $state(false);

	$effect(() => {
		if (!isEditSheetOpen) {
			editingBudget = null;
		}
	});

	// Query budgets
	const queryBudgets = createQuery(() => ({
		queryKey: ['budgets'],
		queryFn: async () => {
			const { data } = await client.budgets.get();
			return data;
		}
	}));

	// Delete mutation
	const deleteBudgetMutation = createMutation(() => ({
		mutationKey: ['delete-budget'],
		mutationFn: async ({ id }: { id: string }) => {
			const res = await client.budgets.erase({ id }).delete();
			if (res.data?.message) toast.success(res.data.message);
		},
		onSuccess() {
			queryBudgets.refetch();
		}
	}));

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('id-ID', {
			style: 'currency',
			currency: 'IDR',
			minimumFractionDigits: 0
		}).format(amount);
	};

	const handleUpdateClick = (budget: Budget) => {
		editingBudget = budget;
		isEditSheetOpen = true;
	};

	// Derived state
	let budgets = $derived(queryBudgets.data?.budgetList || []);
	let isLoading = $derived(queryBudgets.isLoading);
</script>

{#if isLoading}
	<div class="space-y-4">
		{#each Array(3) as _, i (i)}
			<div class="rounded-md border p-4">
				<div class="mb-2 flex items-center justify-between">
					<Skeleton class="h-5 w-32" />
					<Skeleton class="h-5 w-24" />
				</div>
				<Skeleton class="h-2 w-full rounded-full" />
				<div class="mt-2 flex justify-between">
					<Skeleton class="h-4 w-20" />
					<Skeleton class="h-4 w-16" />
				</div>
			</div>
		{/each}
	</div>
{:else}
	<div class="space-y-4">
		{#each budgets as budget (budget.id)}
			{@const progress = Math.min((budget.currentSpending / budget.amount) * 100, 100)}
			{@const isOverBudget = budget.currentSpending > budget.amount}
			<div class="rounded-md border bg-card p-4">
				<div class="mb-3 flex items-center justify-between">
					<div class="flex items-center gap-2">
						{#if budget.category.icon}
							<span>{budget.category.icon}</span>
						{/if}
						<span class="font-semibold">{budget.category.name}</span>
						<Badge variant="outline" class="text-[10px] capitalize">{budget.period}</Badge>
					</div>
					<div class="flex items-center gap-2">
						<DropdownAction
							onUpdate={() => handleUpdateClick(budget)}
							onDelete={() => deleteBudgetMutation.mutate({ id: budget.id })}
						>
							{#snippet trigger({ props })}
								<Button variant="ghost" size="icon" {...props} class="h-8 w-8">
									<Lucide name="MoreVertical" class="h-4 w-4" />
								</Button>
							{/snippet}
						</DropdownAction>
					</div>
				</div>

				<div class="space-y-2">
					<div class="h-2 w-full overflow-hidden rounded-full bg-muted">
						<div
							class={cn(
								'h-full transition-all duration-500',
								isOverBudget ? 'bg-destructive' : progress > 80 ? 'bg-yellow-500' : 'bg-primary'
							)}
							style="width: {progress}%"
						></div>
					</div>

					<div class="flex justify-between text-xs">
						<span class={cn(isOverBudget && 'font-bold text-destructive')}>
							{formatCurrency(budget.currentSpending)} / {formatCurrency(budget.amount)}
						</span>
						<span class="text-muted-foreground"
							>{Math.round((budget.currentSpending / budget.amount) * 100)}%</span
						>
					</div>
				</div>
			</div>
		{:else}
			<div class="rounded-md border border-dashed p-8 text-center text-muted-foreground">
				Belum ada anggaran.
			</div>
		{/each}
	</div>
{/if}

{#if editingBudget}
	{#await import('$lib/components/forms/budgets/edit-form.svelte') then { default: EditForm }}
		<EditForm bind:open={isEditSheetOpen} budget={editingBudget} />
	{/await}
{/if}
