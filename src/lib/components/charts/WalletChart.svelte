<script lang="ts">
	import { Chart as LayerChart, Pie, Svg } from "layerchart";

	let { wallets = [] } = $props<{ wallets: { name: string; balance: number }[] }>();

	const totalBalance = $derived(wallets.reduce((acc, curr) => acc + curr.balance, 0));
	const chartData = $derived(
		wallets.map((w, i) => ({
			name: w.name,
			value: w.balance,
			fill: `var(--color-chart-${(i % 5) + 1})`
		}))
	);

	const chartConfig = $derived(
		Object.fromEntries(
			wallets.map((w, i) => [
				w.name,
				{
					label: w.name,
					color: `var(--color-chart-${(i % 5) + 1})`
				}
			])
		) as ChartConfig
	);
</script>

<div class="space-y-4">
	<Chart.Container config={chartConfig} class="mx-auto aspect-square h-[200px] w-full">
		<LayerChart data={chartData} key="name" value="value" padding={{ bottom: 10 }}>
			<Svg>
				<Pie
					innerRadius={40}
					outerRadius={80}
					padAngle={0.02}
					cornerRadius={4}
					class="stroke-background hover:opacity-80 transition-opacity"
				/>
			</Svg>
			<Chart.Tooltip hideLabel indicator="dot">
				{#snippet formatter({ value, name })}
					<div class="flex flex-1 items-center justify-between gap-4 leading-none">
						<span class="text-muted-foreground">{name}</span>
						<span class="font-mono font-medium tabular-nums">{formatIDR(value as number)}</span>
					</div>
				{/snippet}
			</Chart.Tooltip>
		</LayerChart>
	</Chart.Container>

	<div class="grid grid-cols-2 gap-2 text-[10px] md:text-xs">
		{#each chartData.slice(0, 4) as item, i}
			<div class="flex items-center gap-1.5">
				<div class="h-2 w-2 rounded-full" style="background-color: var(--color-chart-{(i % 5) + 1})"></div>
				<span class="truncate max-w-[80px]">{item.name}</span>
				<span class="text-muted-foreground ml-auto">
					{totalBalance > 0 ? ((item.value / totalBalance) * 100).toFixed(0) : 0}%
				</span>
			</div>
		{/each}
		{#if chartData.length > 4}
			<div class="col-span-2 text-center text-muted-foreground pt-1 text-[10px]">
				+ {chartData.length - 4} more accounts
			</div>
		{/if}
	</div>
</div>
