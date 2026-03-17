<script lang="ts">
	import { toast } from 'svelte-sonner';

	type RecurringTransaction = {
		id: string;
		amount: number;
		type: 'income' | 'expense' | 'transfer';
		description?: string | null;
		frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
		startDate: string | number;
		nextRunDate: string | number;
		isActive: boolean;
		wallet: { name: string };
		category?: { name: string; icon?: string | null } | null;
		toWallet?: { name: string } | null;
	};

	let editingRecurring = $state<RecurringTransaction | null>(null);
	let isEditSheetOpen = $state(false);

	const queryClient = useQueryClient();

	// Query recurring transactions
	const queryRecurring = createQuery(() => ({
		queryKey: ['recurring-transactions'],
		queryFn: async () => {
			const { data } = await client.recurring.get();
			return data;
		}
	}));

	// Delete mutation
	const deleteRecurringMutation = createMutation(() => ({
		mutationKey: ['delete-recurring'],
		mutationFn: async ({ id }: { id: string }) => {
			const res = await client.recurring.erase({ id }).delete();
			if (res.data?.message) toast.success(res.data.message);
		},
		onSuccess() {
			queryRecurring.refetch();
		}
	}));

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('id-ID', {
			style: 'currency',
			currency: 'IDR',
			minimumFractionDigits: 0
		}).format(amount);
	};

	const formatDate = (date: string | number) => {
		const d = typeof date === 'number' ? new Date(date * 1000) : new Date(date);
		return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
	};

	let recurringItems = $derived(queryRecurring.data?.recurringList || []);
	let isLoading = $derived(queryRecurring.isLoading);
</script>

{#if isLoading}
	<div class="rounded-md border bg-card">
		{#each Array(3) as _, i (i)}
			<div class="flex items-center justify-between border-b p-4 last:border-0">
				<div class="flex items-center gap-3">
					<Skeleton class="h-10 w-10 rounded-full" />
					<div class="space-y-2">
						<Skeleton class="h-4 w-32" />
						<Skeleton class="h-3 w-24" />
					</div>
				</div>
				<Skeleton class="h-9 w-24" />
			</div>
		{/each}
	</div>
{:else}
	<div class="rounded-md border bg-card">
		{#each recurringItems as item (item.id)}
			<div class="flex items-center justify-between border-b p-4 transition-colors last:border-0 hover:bg-muted/50">
				<div class="flex items-center gap-3">
					<div class={cn(
						'rounded-full p-2',
						item.type === 'income' ? 'bg-green-100 text-green-600' : 
						item.type === 'expense' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
					)}>
						<Lucide name="Repeat" class="h-4 w-4" />
					</div>
					<div>
						<p class="font-medium">
							{item.description || item.category?.name || 'Transfer'}
							<Badge variant="secondary" class="ml-2 text-[10px] capitalize">{item.frequency}</Badge>
						</p>
						<p class="text-xs text-muted-foreground">
							{item.wallet.name} {item.toWallet ? `→ ${item.toWallet.name}` : ''}
							• Berikutnya: {formatDate(item.nextRunDate)}
						</p>
					</div>
				</div>
				<div class="flex items-center gap-4 text-right">
					<div>
						<p class="font-bold">{formatCurrency(item.amount)}</p>
						<p class="text-[10px] {item.isActive ? 'text-green-500' : 'text-muted-foreground'}">
							{item.isActive ? 'Aktif' : 'Nonaktif'}
						</p>
					</div>
					<DropdownAction
						onDelete={() => deleteRecurringMutation.mutate({ id: item.id })}
					>
						{#snippet trigger({ props })}
							<Button variant="outline" size="icon" {...props}>
								<Lucide name="MoreVertical" class="h-4 w-4" />
							</Button>
						{/snippet}
					</DropdownAction>
				</div>
			</div>
		{:else}
			<div class="p-8 text-center text-muted-foreground">Belum ada transaksi rutin.</div>
		{/each}
	</div>
{/if}
