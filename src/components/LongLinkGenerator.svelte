<script lang="ts">
import { onMount } from "svelte";

const LONG_DOMAIN =
	"https://iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii.iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii.in";

let targetUrl = "";
let generatedLink = "";
let isGenerating = false;
let errorMessage = "";

onMount(() => {});

function stringToBinary(str: string): string {
	return str
		.split("")
		.map((char) => char.charCodeAt(0).toString(2).padStart(8, "0"))
		.join("");
}

function binaryToiI(binary: string): string {
	return binary
		.split("")
		.map((bit) => (bit === "0" ? "i" : "I"))
		.join("");
}

function encodeUrl(url: string): string {
	const data = {
		url: url,
		created: Date.now(),
		expires: null,
		permanent: true,
	};
	const jsonData = JSON.stringify(data);
	const binary = stringToBinary(jsonData);
	return binaryToiI(binary);
}

function isValidUrl(url: string): boolean {
	if (!url || url.trim() === "") return false;
	try {
		const parsed = new URL(url);
		return parsed.protocol === "http:" || parsed.protocol === "https:";
	} catch {
		return false;
	}
}

function generateLongLink() {
	errorMessage = "";
	generatedLink = "";

	if (!isValidUrl(targetUrl)) {
		errorMessage = "请输入有效的 HTTP/HTTPS URL";
		return;
	}

	isGenerating = true;

	try {
		const encoded = encodeUrl(targetUrl);
		generatedLink = `${LONG_DOMAIN}/${encoded}`;
	} catch (e) {
		errorMessage = e instanceof Error ? e.message : "生成失败";
	} finally {
		isGenerating = false;
	}
}

async function copyToClipboard(text: string) {
	try {
		await navigator.clipboard.writeText(text);
		alert("已复制到剪贴板！");
	} catch {
		const textarea = document.createElement("textarea");
		textarea.value = text;
		textarea.style.position = "fixed";
		textarea.style.opacity = "0";
		document.body.appendChild(textarea);
		textarea.select();
		document.execCommand("copy");
		document.body.removeChild(textarea);
		alert("已复制到剪贴板！");
	}
}

function redirectToLongLink() {
	if (generatedLink) {
		window.open(generatedLink, "_blank");
	}
}
</script>

<div class="space-y-6">
	<div class="rounded-2xl border border-white/10 bg-white/5 p-5">
		<h2 class="mb-2 text-lg font-bold text-90">生成长链</h2>
		<p class="mb-5 text-sm leading-relaxed text-50">
			输入目标 URL，将使用 i/I 字符编码生成极长的链接。生成的链接可直接点击跳转。
		</p>

		{#if errorMessage}
			<div class="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
				{errorMessage}
			</div>
		{/if}

		<div class="space-y-4">
			<div>
				<label class="mb-2 block text-sm font-medium text-90" for="target-url">
					目标 URL
				</label>
				<input
					id="target-url"
					type="url"
					bind:value={targetUrl}
					placeholder="https://example.com"
					class="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-90 placeholder:text-white/30 focus:border-[var(--primary)] focus:outline-none"
				/>
			</div>

			<button
				type="button"
				on:click={generateLongLink}
				disabled={isGenerating || !targetUrl}
				class="inline-flex items-center justify-center rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[var(--primary)]/20 transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100"
			>
				{isGenerating ? "生成中..." : "生成长链"}
			</button>
		</div>
	</div>

	{#if generatedLink}
		<div class="rounded-2xl border border-white/10 bg-white/5 p-5">
			<h2 class="mb-4 text-lg font-bold text-90">生成结果</h2>
			<div class="space-y-4">
				<div>
					<p class="mb-1 text-xs text-50">原始 URL</p>
					<p class="break-all text-sm text-90">{targetUrl}</p>
				</div>
				<div>
					<p class="mb-1 text-xs text-50">生成的长链</p>
					<div class="max-w-full break-all rounded-lg border border-white/10 bg-black/20 p-3">
						<a
							href={generatedLink}
							target="_blank"
							rel="noopener noreferrer"
							class="font-mono text-xs text-90 hover:underline"
						>
							{generatedLink}
						</a>
					</div>
				</div>
				<div class="text-xs text-50">
					链接长度: {generatedLink.length} 字符
				</div>
				<div class="flex flex-wrap gap-2">
					<button
						type="button"
						on:click={() => copyToClipboard(generatedLink)}
						class="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-50 transition-all hover:border-[var(--primary)] hover:text-90"
					>
						复制链接
					</button>
					<button
						type="button"
						on:click={redirectToLongLink}
						class="rounded-lg border border-[var(--primary)] bg-[var(--primary)]/10 px-3 py-1.5 text-xs text-[var(--primary)] transition-all hover:bg-[var(--primary)]/20"
					>
						打开链接
					</button>
				</div>
			</div>
		</div>
	{/if}

	<div class="rounded-2xl border border-white/10 bg-white/5 p-5">
		<h2 class="mb-3 text-lg font-bold text-90">原理说明</h2>
		<ul class="space-y-3 text-sm leading-relaxed text-50">
			<li>
				<span class="font-medium text-90">编码原理：</span>
				将目标 URL 转换为二进制，再将二进制中的 0 替换为 i、1 替换为 I。
			</li>
<li>
					<span class="font-medium text-90">链接格式：</span>
					生成的链接格式为<br />
					<code class="rounded bg-black/20 px-1 break-all">{LONG_DOMAIN}/{`{i/I编码}`}</code>，
					链接长度取决于原始数据量。
				</li>
			<li>
				<span class="font-medium text-90">跳转方式：</span>
				点击链接后，目标服务器负责解码 i/I 编码并跳转到原始 URL。
			</li>
		</ul>
	</div>
</div>
