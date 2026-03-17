<script lang="ts">
	import { budgetSchema } from '$lib/schemas';
	import { toast } from 'svelte-sonner';

	let { budget, open = $bindable(false) } = $props();

	const queryClient = useQueryClient();

	// Query categories
	const categoriesQuery = createQuery(() => ({
		queryKey: ['categories'],
		queryFn: async () => {
			const { data } = await client.categories.get();
			return data;
		}
	}));

	const budgetForm = createForm(() => ({
		defaultValues: {
			amount: budget.amount,
			period: budget.period,
			categoryId: budget.categoryId
		},
		validators: {
			onSubmit: budgetSchema,
			onChange: budgetSchema
		},
		onSubmit: async ({ value }) => {
			try {
				const res = await client.budgets.edit({ id: budget.id }).put(value);

				if (res.data?.message) {
					toast.success(res.data.message);
					await queryClient.invalidateQueries({ queryKey: ['budgets'] });
					open = false;
				} else if (res.error) {
					toast.error('Terjadi kesalahan');
				}
			} catch (error) {
				console.error(error);
				toast.error('Terjadi kesalahan');
			}
		}
	}));

	let stores = budgetForm.useStore();

	// Derived data from queries
	let categories = $derived(categoriesQuery.data?.categoryList || []);
	let isLoadingData = $derived(categoriesQuery.isLoading);

	// Derived values for selects
	let selectedCategory = $derived(
		categories.find((c) => c.id === stores.current.values.categoryId)?.name || 'Pilih Kategori'
	);

	let expenseCategories = $derived(categories.filter((c) => c.type === 'expense'));

	const periodOptions = [
		{ value: 'monthly', label: 'Bulanan (Monthly)' },
		{ value: 'yearly', label: 'Tahunan (Yearly)' }
	];
</script>

<SheetLayoutForm
	bind:open
	label={`Edit Anggaran`}
	descriptions={`Ubah anggaran untuk kategori ${budget.category.name}`}
>
	{#snippet form()}
		{#if isLoadingData}
			<div class="p-4 text-center text-muted-foreground">Memuat data...</div>
		{:else}
			<form
				class="space-y-4 p-4"
				onsubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					budgetForm.handleSubmit();
				}}
			>
				<!-- Amount -->
				<budgetForm.Field name="amount">
					{#snippet children(field)}
						<div class="space-y-2">
							<Label for="amount">Jumlah Anggaran</Label>
							<Input
								id="amount"
								type="number"
								value={field.state.value}
								onblur={field.handleBlur}
								oninput={(e: Event) => {
									const target = e.target as HTMLInputElement;
									field.handleChange(Number(target.value));
								}}
								placeholder="0"
								min="0"
							/>
							{#if field.state.meta.errors.length > 0}
								<p class="text-xs text-destructive">{field.state.meta.errors[0]?.message}</p>
							{/if}
						</div>
					{/snippet}
				</budgetForm.Field>

				<!-- Category Selection -->
				<budgetForm.Field name="categoryId">
					{#snippet children(field)}
						<div class="space-y-2">
							<Label>Kategori</Label>
							<Select.Root
								disabled={categoriesQuery.isPending}
								type="single"
								value={field.state.value}
								onValueChange={field.handleChange}
							>
								<Select.Trigger class="w-full">
									{selectedCategory}
								</Select.Trigger>
								<Select.Content>
									{#each expenseCategories as category (category.id)}
										<Select.Item value={category.id} label={category.name}>
											{category.icon || ''}
											{category.name}
										</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
							{#if field.state.meta.errors.length > 0}
								<p class="text-xs text-destructive">{field.state.meta.errors[0]?.message}</p>
							{/if}
						</div>
					{/snippet}
				</budgetForm.Field>

				<!-- Period Selection -->
				<budgetForm.Field name="period">
					{#snippet children(field)}
						<div class="space-y-2">
							<Label>Periode</Label>
							<Select.Root
								type="single"
								value={field.state.value}
								onValueChange={field.handleChange}
							>
								<Select.Trigger class="w-full">
									{periodOptions.find((p) => p.value === field.state.value)?.label}
								</Select.Trigger>
								<Select.Content>
									{#each periodOptions as option (option.value)}
										<Select.Item value={option.value} label={option.label}>
											{option.label}
										</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
							{#if field.state.meta.errors.length > 0}
								<p class="text-xs text-destructive">{field.state.meta.errors[0]?.message}</p>
							{/if}
						</div>
					{/snippet}
				</budgetForm.Field>

				<!-- Submit Button -->
				<budgetForm.Subscribe selector={(state) => state.isSubmitting}>
					{#snippet children(isSubmitting)}
						<Button type="submit" class="w-full" disabled={isSubmitting}>
							{isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
						</Button>
					{/snippet}
				</budgetForm.Subscribe>
			</form>
		{/if}
	{/snippet}
</SheetLayoutForm>
