<script lang="ts">
export let type: "post" | "comment" | "profile" | "list" | "me" = "list";
</script>

{#if type === "post"}
	<div class="space-y-5">
		<article class="card-base border border-white/10 p-6 md:p-8">
			<div class="mb-6 flex flex-col gap-4 border-b border-white/10 pb-6">
				<div class="flex flex-wrap items-center justify-between gap-3">
					<div class="flex flex-wrap items-center gap-3">
						<div class="h-6 w-16 rounded-full bg-white/8"></div>
						<div class="h-5 w-24 rounded bg-white/5"></div>
					</div>
					<div class="h-8 w-24 rounded-xl bg-white/8"></div>
				</div>
				<div class="h-8 w-3/4 rounded bg-white/10"></div>
			</div>
			<div class="space-y-4">
				<div class="h-4 w-full rounded bg-white/8"></div>
				<div class="h-4 w-full rounded bg-white/8"></div>
				<div class="h-4 w-2/3 rounded bg-white/8"></div>
			</div>
		</article>
		<div class="card-base border border-white/10 p-4 md:p-5">
			<div class="mb-4 h-6 w-24 rounded bg-white/10"></div>
			<div class="h-32 w-full rounded bg-white/5"></div>
		</div>
	</div>
{:else if type === "comment"}
	<div class="space-y-4">
		{#each Array(3) as _, i}
			<div class="card-base border border-white/10 p-4">
				<div class="mb-3 flex items-center gap-3">
					<div class="h-10 w-10 rounded-full bg-white/8"></div>
					<div class="flex-1">
						<div class="mb-1 h-4 w-24 rounded bg-white/8"></div>
						<div class="h-3 w-32 rounded bg-white/5"></div>
					</div>
				</div>
				<div class="space-y-2">
					<div class="h-4 w-full rounded bg-white/8"></div>
					<div class="h-4 w-3/4 rounded bg-white/8"></div>
				</div>
			</div>
		{/each}
	</div>
{:else if type === "me"}
	<div class="space-y-6">
		<div class="card-base p-6 md:p-8">
			<div class="mb-6 flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-start sm:justify-between">
				<div class="flex items-center gap-4">
					<div class="flex h-20 w-20 items-center justify-center rounded-full bg-white/8"></div>
					<div class="space-y-2">
						<div class="h-6 w-32 rounded bg-white/10"></div>
						<div class="h-4 w-48 rounded bg-white/5"></div>
					</div>
				</div>
				<div class="flex gap-3">
					<div class="h-10 w-24 rounded-xl bg-white/8"></div>
				</div>
			</div>
		</div>
		<div class="grid gap-6 lg:grid-cols-2">
			<div class="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
				<div class="h-5 w-20 rounded bg-white/10"></div>
				<div class="rounded-xl border border-white/10 bg-black/20 p-4">
					<div class="flex flex-col gap-4 sm:flex-row sm:items-center">
						<div class="h-20 w-20 rounded-full bg-white/8"></div>
						<div class="min-w-0 flex-1 space-y-2">
							<div class="h-4 w-24 rounded bg-white/8"></div>
							<div class="h-10 w-full rounded-xl bg-white/5"></div>
						</div>
					</div>
				</div>
				<div class="space-y-2">
					<div class="h-4 w-16 rounded bg-white/8"></div>
					<div class="h-10 w-full rounded-xl bg-white/5"></div>
				</div>
				<div class="space-y-2">
					<div class="h-4 w-20 rounded bg-white/8"></div>
					<div class="h-10 w-full rounded-xl bg-white/5"></div>
				</div>
				<div class="h-10 w-32 rounded-xl bg-white/8"></div>
			</div>
			<div class="space-y-4">
				<div class="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
					<div class="h-5 w-32 rounded bg-white/10"></div>
					<div class="space-y-3">
						<div class="h-4 w-full rounded bg-white/8"></div>
						<div class="h-4 w-3/4 rounded bg-white/8"></div>
					</div>
				</div>
				<div class="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
					<div class="h-5 w-24 rounded bg-white/10"></div>
					<div class="h-10 w-full rounded-xl bg-white/8"></div>
				</div>
			</div>
		</div>
	</div>
{:else if type === "profile"}
	<div class="card-base p-6 md:p-8 space-y-6">
		<div class="flex items-center gap-6">
			<div class="h-24 w-24 rounded-full bg-white/8"></div>
			<div class="flex-1">
				<div class="mb-2 h-6 w-32 rounded bg-white/10"></div>
				<div class="h-4 w-48 rounded bg-white/5"></div>
			</div>
		</div>
		<div class="flex gap-4">
			<div class="h-10 w-24 rounded-xl bg-white/8"></div>
			<div class="h-10 w-24 rounded-xl bg-white/8"></div>
		</div>
	</div>
{:else}
	<div class="space-y-4">
		{#each Array(3) as _, i}
			<div class="card-base p-5">
				<div class="mb-4 flex items-start justify-between gap-4">
					<div class="min-w-0 flex-1">
						<div class="mb-3 flex items-center gap-2">
							<div class="h-6 w-48 rounded bg-white/10"></div>
						</div>
						<div class="mb-2 h-4 w-full rounded bg-white/8"></div>
						<div class="h-4 w-3/4 rounded bg-white/8"></div>
					</div>
					<div class="h-6 w-16 shrink-0 rounded-full bg-white/8"></div>
				</div>
				<div class="mb-4 h-40 w-full rounded-2xl bg-white/5"></div>
				<div class="mb-4 flex items-center gap-3">
					<div class="h-9 w-9 rounded-full bg-white/8"></div>
					<div class="min-w-0 flex-1">
						<div class="mb-1 h-4 w-24 rounded bg-white/8"></div>
						<div class="h-3 w-32 rounded bg-white/5"></div>
					</div>
				</div>
				<div class="flex items-center gap-4">
					<div class="h-4 w-16 rounded bg-white/5"></div>
					<div class="h-4 w-16 rounded bg-white/5"></div>
					<div class="h-4 w-16 rounded bg-white/5"></div>
				</div>
			</div>
		{/each}
	</div>
{/if}