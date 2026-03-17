<script lang="ts">
	import RecurringForm from '$lib/components/forms/recurring/create-form.svelte';
	import RecurringList from '$lib/components/tables/recurring/recurring-list.svelte';

	let open_dialog = $state(false);
</script>

<svelte:head>
	<title>Transaksi Rutin - MyUangGwe | Otomatisasi Pencatatan Keuangan</title>
	<meta
		name="description"
		content="Kelola transaksi berulang Anda seperti tagihan, langganan, atau gaji agar pencatatan keuangan menjadi otomatis dan tidak terlewat."
	/>
</svelte:head>

<div class="space-y-6">
	<div class="flex flex-wrap items-center justify-between gap-2">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Transaksi Rutin</h1>
			<p class="text-sm text-muted-foreground">Otomatisasi transaksi yang terjadi berulang kali.</p>
		</div>

		<Dialog.Root bind:open={open_dialog}>
			<Dialog.Trigger>
				{#snippet child({ props })}
					<Button {...props} class="gap-2">
						<Lucide name="Plus" class="h-4 w-4" /> Tambah Transaksi Rutin
					</Button>
				{/snippet}
			</Dialog.Trigger>
			<Dialog.Content>
				<Dialog.Header>
					<Dialog.Title>Tambah Transaksi Rutin</Dialog.Title>
				</Dialog.Header>

				<RecurringForm bind:open={open_dialog} />
			</Dialog.Content>
		</Dialog.Root>
	</div>

	<RecurringList />
</div>
