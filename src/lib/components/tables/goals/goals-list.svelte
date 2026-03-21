<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Progress } from '$lib/components/ui/progress/index.js';
	import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
	import { toast } from 'svelte-sonner';

	const queryClient = useQueryClient();

	const goals = createQuery(() => ({
		queryKey: ['goals'],
		queryFn: async () => {
			const { data, error } = await client.goals.get();
			if (error) throw error;
			return data.goalList;
		}
	}));

	const deleteGoal = createMutation(() => ({
		mutationFn: async (id: string) => {
			const { error } = await client.goals.erase({ id }).delete();
			if (error) throw error;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['goals'] });
			toast.success('Target berhasil dihapus');
		}
	}));

	const allocateFunds = createMutation(() => ({
		mutationFn: async ({ id, amount }: { id: string; amount: number }) => {
			const { error } = await client.goals.allocate({ id }).put({ amount });
			if (error) throw error;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['goals'] });
			toast.success('Alokasi dana berhasil');
		}
	}));

	function calculateProgress(current: number, target: number) {
		return Math.min(Math.round((current / target) * 100), 100);
	}
</script>

<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
	{#if goals.isLoading}
		{#each Array(3) as _}
			<Card.Root class="animate-pulse">
				<Card.Header class="h-24 bg-muted/50" />
				<Card.Content class="space-y-2 p-4">
					<div class="h-4 w-3/4 bg-muted"></div>
					<div class="h-8 w-full bg-muted"></div>
				</Card.Content>
			</Card.Root>
		{/each}
	{:else if goals.data}
		{#each goals.data as goal}
			<Card.Root>
				<Card.Header class="pb-2">
					<div class="flex items-center justify-between">
						<Card.Title class="text-lg font-bold">{goal.name}</Card.Title>
						<div class="rounded-full bg-primary/10 p-2 text-primary">
							<Lucide name="TrendingUp" class="h-4 w-4" />
						</div>
					</div>
					<Card.Description>
						Target: {formatIDR(goal.targetAmount)}
					</Card.Description>
				</Card.Header>
				<Card.Content>
					<div class="mt-2 space-y-3">
						<div class="flex items-center justify-between text-sm">
							<span class="text-muted-foreground">Terkumpul</span>
							<span class="font-medium">{formatIDR(goal.currentAmount)}</span>
						</div>

						<Progress
							value={calculateProgress(goal.currentAmount, goal.targetAmount)}
							class="h-2"
						/>

						<div class="flex items-center justify-between text-xs text-muted-foreground">
							<span>{calculateProgress(goal.currentAmount, goal.targetAmount)}% Selesai</span>
							{#if goal.deadline}
								<span>Sisa waktu: {new Date(goal.deadline).toLocaleDateString()}</span>
							{/if}
						</div>

						<div class="mt-4 flex items-center gap-2">
							<div class="flex items-center gap-1 text-xs text-muted-foreground">
								<Lucide name="Wallet" class="h-3 w-3" />
								<span>{goal.wallet?.name || 'Wallet tidak ditemukan'}</span>
							</div>
						</div>
					</div>
				</Card.Content>
				<Card.Footer class="flex justify-between border-t bg-muted/50 p-3">
					<Button
						variant="outline"
						size="sm"
						onclick={() => {
							const amount = prompt('Masukkan jumlah dana yang ingin dialokasikan:');
							if (amount && !isNaN(Number(amount))) {
								allocateFunds.mutate({ id: goal.id, amount: Number(amount) });
							}
						}}
					>
						Alokasi Dana
					</Button>
					<Button
						variant="ghost"
						size="icon"
						class="text-destructive"
						onclick={() => deleteGoal.mutate(goal.id)}
					>
						<Lucide name="Trash2" class="h-4 w-4" />
					</Button>
				</Card.Footer>
			</Card.Root>
		{/each}
	{/if}
</div>

{#if goals.data?.length === 0}
	<div
		class="flex h-50 flex-col items-center justify-center rounded-lg border border-dashed text-center"
	>
		<p class="text-muted-foreground">Belum ada target menabung</p>
	</div>
{/if}
