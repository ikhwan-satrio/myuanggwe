<script lang="ts">
	import { createQuery } from '@tanstack/svelte-query';
	import { BarChart } from 'layerchart';

	const chartQuery = createQuery(() => ({
		queryKey: ['dashboard-chart'],
		queryFn: async () => {
			const { data, error } = await client.dashboard.chart.get();
			if (error) {
				throw new Error('Failed to load chart');
			}
			return data;
		}
	}));

	const chartConfig = {
		income: {
			label: 'Pemasukan',
			color: '#2563eb'
		},
		expense: {
			label: 'Pengeluaran',
			color: '#60a5fa'
		}
	} satisfies typeof ChartConfig;
</script>

<div class="h-80 rounded-2xl border-2 border-blue-400 px-10 py-5">
	{#if chartQuery.isPending}
		<div class="flex h-full items-center justify-center">
			<Skeleton class="h-50 w-full" />
		</div>
	{:else if chartQuery.isError}
		<div class="flex h-full flex-col items-center justify-center gap-2">
			<p class="text-red-600">Failed to load chart</p>
			<button class="text-sm text-primary underline" onclick={() => chartQuery.refetch()}>
				Retry
			</button>
		</div>
	{:else if chartQuery.data && chartQuery.data.length === 0}
		<div class="flex h-full items-center justify-center">
			<p class="text-muted-foreground">Belum ada data transaksi</p>
		</div>
	{:else if chartQuery.data}
		<Chart.Container class="h-70 w-full" config={chartConfig}>
			<BarChart data={chartQuery.data} x="month" y={['income', 'expense']}>
				{#snippet tooltip()}
					<Chart.Tooltip />
				{/snippet}
			</BarChart>
		</Chart.Container>
	{/if}
</div>
