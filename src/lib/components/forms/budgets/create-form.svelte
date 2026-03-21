<script lang="ts">
	import { budgetSchema } from '$lib/schemas';
	import { toast } from 'svelte-sonner';

	let { open = $bindable(false) } = $props();

	const queryClient = useQueryClient();

	const categoriesQuery = createQuery(() => ({
		queryKey: ['categories'],
		queryFn: async () => {
			const { data, error } = await client.categories.get();
			if (error) throw error;
			return data;
		}
	}));

	const budgetForm = createForm(() => ({
		defaultValues: {
			amount: 0,
			period: 'monthly' as 'monthly' | 'yearly',
			categoryId: ''
		},
		validators: {
			onSubmit: budgetSchema,
			onChange: budgetSchema
		},
		onSubmit: async ({ value }) => {
			try {
				//@ts-ignore
				const res = await client.budgets.create.post(value);
				if (res.data?.success) {
					toast.success(res.data.message);
					await queryClient.invalidateQueries({ queryKey: ['budgets'] });
					open = false;
					budgetForm.reset();
				} else if (res.error) {
					toast.error('Terjadi kesalahan');
				}
			} catch (error) {
				console.error(error);
				toast.error('Terjadi kesalahan');
			}
		}
	}));

	let categories = $derived(categoriesQuery.data?.categoryList || []);
	let isLoadingData = $derived(categoriesQuery.isLoading);
	let expenseCategories = $derived(categories.filter((c) => c.type === 'expense'));

	const periodOptions = [
		{ value: 'monthly', label: 'Bulanan (Monthly)' },
		{ value: 'yearly', label: 'Tahunan (Yearly)' }
	] as const;

	let selectedCategory = $derived(
		categories.find((c) => c.id === budgetForm.state.values.categoryId)?.name || 'Pilih Kategori'
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
			budgetForm.handleSubmit();
		}}
	>
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

		<budgetForm.Field name="period">
			{#snippet children(field)}
				<div class="space-y-2">
					<Label>Periode</Label>
					<Select.Root
						type="single"
						value={field.state.value}
						onValueChange={(val) => field.handleChange(val as 'monthly' | 'yearly')}
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

		<budgetForm.Subscribe selector={(state) => state.isSubmitting}>
			{#snippet children(isSubmitting)}
				<Button type="submit" class="w-full" disabled={isSubmitting}>
					{isSubmitting ? 'Menyimpan...' : 'Simpan Anggaran'}
				</Button>
			{/snippet}
		</budgetForm.Subscribe>
	</form>
{/if}
