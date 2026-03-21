<script lang="ts">
	import { recurringTransactionSchema } from '$lib/schemas';
	import { toast } from 'svelte-sonner';

	let { open = $bindable(false) } = $props();

	const queryClient = useQueryClient();

	const walletsQuery = createQuery({
		queryKey: ['wallets'],
		queryFn: async () => {
			const { data, error } = await client.wallets.index.get();
			if (error) throw error;
			return data;
		}
	});

	const categoriesQuery = createQuery({
		queryKey: ['categories'],
		queryFn: async () => {
			const { data, error } = await client.categories.index.get();
			if (error) throw error;
			return data;
		}
	});

	const recurringForm = createForm(() => ({
		defaultValues: {
			amount: 0,
			type: 'expense' as 'income' | 'expense' | 'transfer',
			description: null as string | null,
			frequency: 'monthly' as 'daily' | 'weekly' | 'monthly' | 'yearly',
			startDate: '',
			walletId: '',
			toWalletId: null as string | null,
			categoryId: null as string | null
		},
		validators: {
			onSubmit: recurringTransactionSchema,
			onChange: recurringTransactionSchema
		},
		onSubmit: async ({ value }) => {
			try {
				const res = await client.recurring.create.post(value);
				if (res.data?.success) {
					toast.success(res.data.message);
					await queryClient.invalidateQueries({ queryKey: ['recurring'] });
					open = false;
					recurringForm.reset();
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
	let categories = $derived(categoriesQuery.data?.categoryList || []);
	let isLoadingData = $derived(walletsQuery.isLoading || categoriesQuery.isLoading);

	const frequencyOptions = [
		{ value: 'daily', label: 'Harian' },
		{ value: 'weekly', label: 'Mingguan' },
		{ value: 'monthly', label: 'Bulanan' },
		{ value: 'yearly', label: 'Tahunan' }
	] as const;

	const typeOptions = [
		{ value: 'income', label: 'Pemasukan' },
		{ value: 'expense', label: 'Pengeluaran' },
		{ value: 'transfer', label: 'Transfer' }
	] as const;

	let selectedWallet = $derived(
		wallets.find((w) => w.id === recurringForm.state.values.walletId)?.name || 'Pilih Dompet'
	);
	let selectedToWallet = $derived(
		wallets.find((w) => w.id === recurringForm.state.values.toWalletId)?.name ||
			'Pilih Dompet Tujuan'
	);
	let selectedCategory = $derived(
		categories.find((c) => c.id === recurringForm.state.values.categoryId)?.name || 'Pilih Kategori'
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
			recurringForm.handleSubmit();
		}}
	>
		<recurringForm.Field name="amount">
			{#snippet children(field)}
				<div class="space-y-2">
					<Label for="amount">Jumlah</Label>
					<Input
						id="amount"
						type="number"
						value={field.state.value}
						oninput={(e: Event) => field.handleChange(Number((e.target as HTMLInputElement).value))}
						placeholder="0"
					/>
					{#if field.state.meta.errors.length > 0}
						<p class="text-xs text-destructive">{field.state.meta.errors[0]?.message}</p>
					{/if}
				</div>
			{/snippet}
		</recurringForm.Field>

		<recurringForm.Field name="type">
			{#snippet children(field)}
				<div class="space-y-2">
					<Label>Tipe</Label>
					<Select.Root
						type="single"
						value={field.state.value}
						onValueChange={(val) => field.handleChange(val as 'income' | 'expense' | 'transfer')}
					>
						<Select.Trigger class="w-full">
							{typeOptions.find((t) => t.value === field.state.value)?.label}
						</Select.Trigger>
						<Select.Content>
							{#each typeOptions as option (option.value)}
								<Select.Item value={option.value} label={option.label}>
									{option.label}
								</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
			{/snippet}
		</recurringForm.Field>

		<recurringForm.Field name="frequency">
			{#snippet children(field)}
				<div class="space-y-2">
					<Label>Frekuensi</Label>
					<Select.Root
						type="single"
						value={field.state.value}
						onValueChange={(val) =>
							field.handleChange(val as 'daily' | 'weekly' | 'monthly' | 'yearly')}
					>
						<Select.Trigger class="w-full">
							{frequencyOptions.find((f) => f.value === field.state.value)?.label}
						</Select.Trigger>
						<Select.Content>
							{#each frequencyOptions as option (option.value)}
								<Select.Item value={option.value} label={option.label}>
									{option.label}
								</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
			{/snippet}
		</recurringForm.Field>

		<recurringForm.Field name="startDate">
			{#snippet children(field)}
				<div class="space-y-2">
					<Label for="startDate">Tanggal Mulai</Label>
					<Input
						id="startDate"
						type="date"
						value={field.state.value}
						oninput={(e: Event) => field.handleChange((e.target as HTMLInputElement).value)}
					/>
					{#if field.state.meta.errors.length > 0}
						<p class="text-xs text-destructive">{field.state.meta.errors[0]?.message}</p>
					{/if}
				</div>
			{/snippet}
		</recurringForm.Field>

		<recurringForm.Field name="walletId">
			{#snippet children(field)}
				<div class="space-y-2">
					<Label>Dompet</Label>
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
				</div>
			{/snippet}
		</recurringForm.Field>

		{#if recurringForm.state.values.type === 'transfer'}
			<recurringForm.Field name="toWalletId">
				{#snippet children(field)}
					<div class="space-y-2">
						<Label>Dompet Tujuan</Label>
						<Select.Root
							type="single"
							value={field.state.value || ''}
							onValueChange={field.handleChange}
						>
							<Select.Trigger class="w-full">
								{selectedToWallet}
							</Select.Trigger>
							<Select.Content>
								{#each wallets as wallet (wallet.id)}
									<Select.Item value={wallet.id} label={wallet.name}>
										{wallet.name}
									</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>
				{/snippet}
			</recurringForm.Field>
		{:else}
			<recurringForm.Field name="categoryId">
				{#snippet children(field)}
					<div class="space-y-2">
						<Label>Kategori</Label>
						<Select.Root
							type="single"
							value={field.state.value || ''}
							onValueChange={field.handleChange}
						>
							<Select.Trigger class="w-full">
								{selectedCategory}
							</Select.Trigger>
							<Select.Content>
								{#each categories.filter((c) => c.type === recurringForm.state.values.type) as category (category.id)}
									<Select.Item value={category.id} label={category.name}>
										{category.name}
									</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>
				{/snippet}
			</recurringForm.Field>
		{/if}

		<recurringForm.Field name="description">
			{#snippet children(field)}
				<div class="space-y-2">
					<Label for="description">Keterangan (Opsional)</Label>
					<Input
						id="description"
						value={field.state.value || ''}
						oninput={(e: Event) => field.handleChange((e.target as HTMLInputElement).value)}
						placeholder="Misal: Bayar Listrik, Langganan Netflix"
					/>
				</div>
			{/snippet}
		</recurringForm.Field>

		<recurringForm.Subscribe selector={(state) => state.isSubmitting}>
			{#snippet children(isSubmitting)}
				<Button type="submit" class="w-full" disabled={isSubmitting}>
					{isSubmitting ? 'Menyimpan...' : 'Simpan Transaksi Rutin'}
				</Button>
			{/snippet}
		</recurringForm.Subscribe>
	</form>
{/if}
