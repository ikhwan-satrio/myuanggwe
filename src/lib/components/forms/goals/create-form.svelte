<script lang="ts">
	import { financialGoalSchema } from '$lib/schemas';
	import { toast } from 'svelte-sonner';

	let { open = $bindable(false) } = $props();

	const queryClient = useQueryClient();

	const walletsQuery = createQuery(() => ({
		queryKey: ['wallets'],
		queryFn: async () => {
			const { data, error } = await client.wallets.get();
			if (error) throw error;
			return data;
		}
	}));

	const goalForm = createForm(() => ({
		defaultValues: {
			name: '',
			targetAmount: 0,
			deadline: null as string | null,
			walletId: ''
		},
		validators: {
			onSubmit: financialGoalSchema,
			onChange: financialGoalSchema
		},
		onSubmit: async ({ value }) => {
			try {
				//@ts-ignore
				const res = await client.goals.create.post(value);
				if (res.data?.success) {
					toast.success(res.data.message);
					await queryClient.invalidateQueries({ queryKey: ['goals'] });
					open = false;
					goalForm.reset();
				} else if (res.error) {
					toast.error('Terjadi kesalahan');
				}
			} catch (error) {
				console.error(error);
				toast.error('Terjadi kesalahan');
			}
		}
	}));

	let wallets = $derived(walletsQuery.data?.walletList || []);
	let isLoadingData = $derived(walletsQuery.isLoading);

	let selectedWallet = $derived(
		wallets.find((w) => w.id === goalForm.state.values.walletId)?.name || 'Pilih Dompet Sumber'
	);
</script>

{#if isLoadingData}
	<div class="p-4 text-center text-muted-foreground">Memuat data...</div>
{:else}
	<form
		class="space-y-4 p-4"
		onsubmit={(e) => {
			e.preventDefault();
			e.stopPropagation();
			goalForm.handleSubmit();
		}}
	>
		<goalForm.Field name="name">
			{#snippet children(field)}
				<div class="space-y-2">
					<Label for="name">Nama Target</Label>
					<Input
						id="name"
						value={field.state.value}
						oninput={(e: Event) => field.handleChange((e.target as HTMLInputElement).value)}
						placeholder="Tabungan Rumah, Liburan, dsb"
					/>
					{#if field.state.meta.errors.length > 0}
						<p class="text-xs text-destructive">{field.state.meta.errors[0]?.message}</p>
					{/if}
				</div>
			{/snippet}
		</goalForm.Field>

		<goalForm.Field name="targetAmount">
			{#snippet children(field)}
				<div class="space-y-2">
					<Label for="targetAmount">Target Jumlah</Label>
					<Input
						id="targetAmount"
						type="number"
						value={field.state.value}
						oninput={(e: Event) => field.handleChange(Number((e.target as HTMLInputElement).value))}
						placeholder="0"
						min="0"
					/>
					{#if field.state.meta.errors.length > 0}
						<p class="text-xs text-destructive">{field.state.meta.errors[0]?.message}</p>
					{/if}
				</div>
			{/snippet}
		</goalForm.Field>

		<goalForm.Field name="walletId">
			{#snippet children(field)}
				<div class="space-y-2">
					<Label>Dompet Sumber</Label>
					<Select.Root type="single" value={field.state.value} onValueChange={field.handleChange}>
						<Select.Trigger class="w-full">
							{selectedWallet}
						</Select.Trigger>
						<Select.Content>
							{#each wallets as wallet (wallet.id)}
								<Select.Item value={wallet.id} label={wallet.name}>
									{wallet.name}
								</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
					{#if field.state.meta.errors.length > 0}
						<p class="text-xs text-destructive">{field.state.meta.errors[0]?.message}</p>
					{/if}
				</div>
			{/snippet}
		</goalForm.Field>

		<goalForm.Field name="deadline">
			{#snippet children(field)}
				<div class="space-y-2">
					<Label for="deadline">Tenggat Waktu (Opsional)</Label>
					<Input
						id="deadline"
						type="date"
						value={field.state.value || ''}
						oninput={(e: Event) => field.handleChange((e.target as HTMLInputElement).value)}
					/>
				</div>
			{/snippet}
		</goalForm.Field>

		<goalForm.Subscribe selector={(state) => state.isSubmitting}>
			{#snippet children(isSubmitting)}
				<Button type="submit" class="w-full" disabled={isSubmitting}>
					{isSubmitting ? 'Menyimpan...' : 'Simpan Target'}
				</Button>
			{/snippet}
		</goalForm.Subscribe>
	</form>
{/if}
