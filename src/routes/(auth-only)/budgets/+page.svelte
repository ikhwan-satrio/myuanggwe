<script lang="ts">
	import BudgetForm from '$lib/components/forms/budgets/create-form.svelte';
	import BudgetsList from '$lib/components/tables/budgets/budgets-list.svelte';

	let open_dialog = $state(false);
</script>

<svelte:head>
	<title>Anggaran - MyUangGwe | Atur Batas Pengeluaran</title>
	<meta
		name="description"
		content="Kelola anggaran bulanan dan tahunan Anda untuk setiap kategori pengeluaran agar keuangan tetap terkendali."
	/>
</svelte:head>

<div class="space-y-6">
	<div class="flex flex-wrap items-center justify-between gap-2">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Anggaran</h1>
			<p class="text-sm text-muted-foreground">Atur batas pengeluaran untuk setiap kategori.</p>
		</div>

		<Dialog.Root bind:open={open_dialog}>
			<Dialog.Trigger>
				{#snippet child({ props })}
					<Button {...props} class="gap-2">
						<Lucide name="Plus" class="h-4 w-4" /> Tambah Anggaran
					</Button>
				{/snippet}
			</Dialog.Trigger>
			<Dialog.Content>
				<Dialog.Header>
					<Dialog.Title>Tambah Anggaran</Dialog.Title>
				</Dialog.Header>

				<BudgetForm bind:open={open_dialog} />
			</Dialog.Content>
		</Dialog.Root>
	</div>

	<BudgetsList />
</div>
