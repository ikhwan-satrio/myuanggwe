<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import GoalsList from '$lib/components/tables/goals/goals-list.svelte';
	import GoalsCreateForm from '$lib/components/forms/goals/create-form.svelte';
	import SheetLayoutForm from '$lib/components/utils/SheetLayoutForm.svelte';

	let open = $state(false);
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Target Menabung</h1>
			<p class="text-muted-foreground">Atur dan pantau target keuangan Anda.</p>
		</div>
		<Button onclick={() => (open = true)}>
			<Lucide name="Plus" class="mr-2 h-4 w-4" />
			Tambah Target
		</Button>
	</div>

	<GoalsList />

	<SheetLayoutForm
		bind:open
		label="Tambah Target Menabung"
		descriptions="Tentukan target tabungan Anda dan pilih dompet sumbernya."
	>
		{#snippet form()}
			<GoalsCreateForm bind:open />
		{/snippet}
	</SheetLayoutForm>
</div>
