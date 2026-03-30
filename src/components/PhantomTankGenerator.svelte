<script lang="ts">
	import { onDestroy } from "svelte";

	type LoadedImage = {
		file: File;
		name: string;
		width: number;
		height: number;
		url: string;
		image: HTMLImageElement;
	};

	let sourceImage: LoadedImage | null = null;
	let hiddenImage: LoadedImage | null = null;
	let outputCanvas: HTMLCanvasElement;
	let resultUrl = "";
	let resultWidth = 0;
	let resultHeight = 0;
	const DEFAULT_SOURCE_BRIGHTNESS = 100;
	const DEFAULT_SOURCE_CONTRAST = 20;
	const DEFAULT_HIDDEN_BRIGHTNESS = 90;
	const DEFAULT_HIDDEN_CONTRAST = 100;

	let sourceBrightness = DEFAULT_SOURCE_BRIGHTNESS;
	let sourceContrast = DEFAULT_SOURCE_CONTRAST;
	let hiddenBrightness = DEFAULT_HIDDEN_BRIGHTNESS;
	let hiddenContrast = DEFAULT_HIDDEN_CONTRAST;
	let errorMessage = "";
	let statusMessage = "请先上传原图与隐藏图，再生成输出 PNG。";
	let isGenerating = false;

	const generatedUrls = new Set<string>();
	const fileUrls = new Set<string>();

	const clamp = (value: number, min: number, max: number) =>
		Math.min(max, Math.max(min, value));

	function adjustPixelBrightnessContrast(
		r: number,
		g: number,
		b: number,
		brightnessFactor: number,
		contrastFactor: number,
	) {
		const brightR = r * brightnessFactor;
		const brightG = g * brightnessFactor;
		const brightB = b * brightnessFactor;

		const adjustContrast = (value: number) =>
			clamp((value - 128) * contrastFactor + 128, 0, 255);

		return [
			adjustContrast(brightR),
			adjustContrast(brightG),
			adjustContrast(brightB),
		] as const;
	}

	function revokeGeneratedUrls() {
		for (const url of generatedUrls) {
			URL.revokeObjectURL(url);
		}
		generatedUrls.clear();
	}

	function revokeFileUrl(url: string | undefined) {
		if (!url) return;
		URL.revokeObjectURL(url);
		fileUrls.delete(url);
	}

	async function loadImage(file: File): Promise<LoadedImage> {
		const url = URL.createObjectURL(file);
		fileUrls.add(url);

		return await new Promise((resolve, reject) => {
			const image = new Image();
			image.onload = () => {
				resolve({
					file,
					name: file.name,
					width: image.naturalWidth,
					height: image.naturalHeight,
					url,
					image,
				});
			};
			image.onerror = () => {
				revokeFileUrl(url);
				reject(new Error("图片读取失败，请更换文件后重试。"));
			};
			image.src = url;
		});
	}

	function clearResult() {
		errorMessage = "";
		revokeGeneratedUrls();
		resultUrl = "";
		resultWidth = 0;
		resultHeight = 0;
	}

	async function handleFileChange(event: Event, kind: "source" | "hidden") {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		clearResult();
		errorMessage = "";

		if (!file.type.startsWith("image/")) {
			errorMessage = "仅支持上传图片文件。";
			input.value = "";
			return;
		}

		try {
			const loaded = await loadImage(file);
			if (kind === "source") {
				revokeFileUrl(sourceImage?.url);
				sourceImage = loaded;
			} else {
				revokeFileUrl(hiddenImage?.url);
				hiddenImage = loaded;
			}

			statusMessage =
				sourceImage && hiddenImage
					? "参数已更新，可点击生成图像。"
					: "图片已加载，请继续上传另一张图片。";
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : "图片读取失败。";
		}
	}

	function resetControls() {
		sourceBrightness = DEFAULT_SOURCE_BRIGHTNESS;
		sourceContrast = DEFAULT_SOURCE_CONTRAST;
		hiddenBrightness = DEFAULT_HIDDEN_BRIGHTNESS;
		hiddenContrast = DEFAULT_HIDDEN_CONTRAST;
		clearResult();
		statusMessage = "参数已重置为默认值，可重新生成图像。";
	}

	function downloadResult() {
		if (!resultUrl) return;
		const link = document.createElement("a");
		link.href = resultUrl;
		link.download = "phantom-tank.png";
		link.click();
	}

	function generateImage() {
		if (!sourceImage || !hiddenImage) {
			errorMessage = "请先上传原图和隐藏图。";
			statusMessage = "未满足生成条件。";
			return;
		}

		isGenerating = true;
		errorMessage = "";
		clearResult();

		const width = sourceImage.width;
		const height = sourceImage.height;
		resultWidth = width;
		resultHeight = height;

		const originalBrightnessFactor = 1 + sourceBrightness / 100;
		const hiddenBrightnessFactor = 1 - hiddenBrightness / 100;
		const originalContrastFactor = sourceContrast / 100;
		const hiddenContrastFactor = hiddenContrast / 100;

		outputCanvas.width = width;
		outputCanvas.height = height;

		const outputContext = outputCanvas.getContext("2d");
		if (!outputContext) {
			errorMessage = "浏览器不支持当前 Canvas 能力。";
			statusMessage = "生成失败。";
			isGenerating = false;
			return;
		}

		const originalCanvas = document.createElement("canvas");
		originalCanvas.width = width;
		originalCanvas.height = height;
		const originalContext = originalCanvas.getContext("2d");

		const hiddenCanvas = document.createElement("canvas");
		hiddenCanvas.width = width;
		hiddenCanvas.height = height;
		const hiddenContext = hiddenCanvas.getContext("2d");

		if (!originalContext || !hiddenContext) {
			errorMessage = "浏览器不支持离屏 Canvas 处理。";
			statusMessage = "生成失败。";
			isGenerating = false;
			return;
		}

		originalContext.drawImage(sourceImage.image, 0, 0, width, height);
		hiddenContext.drawImage(hiddenImage.image, 0, 0, width, height);

		const originalData = originalContext.getImageData(0, 0, width, height);
		const hiddenData = hiddenContext.getImageData(0, 0, width, height);
		const result = outputContext.createImageData(width, height);

		for (let index = 0; index < originalData.data.length; index += 4) {
			const pixelIndex = index / 4;
			const x = pixelIndex % width;
			const y = Math.floor(pixelIndex / width);

			const originalR = originalData.data[index];
			const originalG = originalData.data[index + 1];
			const originalB = originalData.data[index + 2];

			const hiddenR = hiddenData.data[index];
			const hiddenG = hiddenData.data[index + 1];
			const hiddenB = hiddenData.data[index + 2];

			let r: number;
			let g: number;
			let b: number;

			if ((x + y) % 2 === 0) {
				const originalPixel = adjustPixelBrightnessContrast(
					originalR,
					originalG,
					originalB,
					originalBrightnessFactor,
					originalContrastFactor,
				);
				r = originalPixel[0];
				g = originalPixel[1];
				b = originalPixel[2];
			} else {
				const hiddenPixel = adjustPixelBrightnessContrast(
					hiddenR,
					hiddenG,
					hiddenB,
					hiddenBrightnessFactor,
					hiddenContrastFactor,
				);
				r = hiddenPixel[0];
				g = hiddenPixel[1];
				b = hiddenPixel[2];
			}

			result.data[index] = r;
			result.data[index + 1] = g;
			result.data[index + 2] = b;
			result.data[index + 3] = 255;
		}

		outputContext.putImageData(result, 0, 0);

		const url = outputCanvas.toDataURL("image/png");
		resultUrl = url;
		statusMessage =
			hiddenImage.width === sourceImage.width && hiddenImage.height === sourceImage.height
				? "生成完成：当前已按原始棋盘图算法输出 PNG。"
				: `生成完成：隐藏图已按原图尺寸 ${width} × ${height} 自动缩放，并按原始棋盘图算法输出 PNG。`;
		isGenerating = false;
	}

	onDestroy(() => {
		revokeGeneratedUrls();
		revokeFileUrl(sourceImage?.url);
		revokeFileUrl(hiddenImage?.url);
	});
</script>

<div class="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
	<section class="space-y-6">
		<div class="rounded-2xl border border-white/10 bg-white/5 p-5">
			<h2 class="mb-2 text-lg font-bold text-90">上传图片</h2>
			<p class="mb-5 text-sm leading-relaxed text-50">
				原图会作为输出尺寸基准；如果隐藏图尺寸不同，生成时会自动缩放到原图尺寸，全程仅在浏览器本地处理。
			</p>

			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<div class="space-y-3">
					<label class="block text-sm font-medium text-90" for="phantom-source-upload">原图</label>
					<input id="phantom-source-upload" type="file" accept="image/*" class="hidden" on:change={(event) => handleFileChange(event, "source")} />
					<label for="phantom-source-upload" class="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-black/20 px-4 py-5 text-center transition-all hover:border-[var(--primary)] hover:bg-[var(--primary)]/5">
						<span class="mb-2 text-sm font-medium text-90">{sourceImage ? "更换原图" : "点击上传原图"}</span>
						<span class="text-xs leading-relaxed text-white/45">支持常见图片格式，生成时将以这张图片的宽高作为最终输出尺寸。</span>
					</label>
					{#if sourceImage}
						<div class="rounded-xl border border-white/10 bg-black/20 p-3">
							<img src={sourceImage.url} alt="原图预览" class="mb-3 max-h-44 w-full rounded-lg object-contain" />
							<div class="space-y-1 text-xs text-50">
								<p class="break-all text-90">{sourceImage.name}</p>
								<p>{sourceImage.width} × {sourceImage.height}</p>
							</div>
						</div>
					{/if}
				</div>

				<div class="space-y-3">
					<label class="block text-sm font-medium text-90" for="phantom-hidden-upload">隐藏图</label>
					<input id="phantom-hidden-upload" type="file" accept="image/*" class="hidden" on:change={(event) => handleFileChange(event, "hidden")} />
					<label for="phantom-hidden-upload" class="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-black/20 px-4 py-5 text-center transition-all hover:border-[var(--primary)] hover:bg-[var(--primary)]/5">
						<span class="mb-2 text-sm font-medium text-90">{hiddenImage ? "更换隐藏图" : "点击上传隐藏图"}</span>
						<span class="text-xs leading-relaxed text-white/45">隐藏图会在生成时按原图尺寸统一缩放，并参与棋盘格交错合成。</span>
					</label>
					{#if hiddenImage}
						<div class="rounded-xl border border-white/10 bg-black/20 p-3">
							<img src={hiddenImage.url} alt="隐藏图预览" class="mb-3 max-h-44 w-full rounded-lg object-contain" />
							<div class="space-y-1 text-xs text-50">
								<p class="break-all text-90">{hiddenImage.name}</p>
								<p>{hiddenImage.width} × {hiddenImage.height}</p>
							</div>
						</div>
					{/if}
				</div>
			</div>
		</div>

		<div class="rounded-2xl border border-white/10 bg-white/5 p-5">
			<div class="mb-5 flex items-center justify-between gap-3">
				<div>
					<h2 class="text-lg font-bold text-90">参数调节</h2>
					<p class="mt-1 text-sm text-50">保留纯前端亮度 / 对比度预处理，并在像素级进行棋盘格交错合成。</p>
				</div>
				<button type="button" class="rounded-xl border border-white/10 px-4 py-2 text-sm text-50 transition-all hover:border-[var(--primary)] hover:text-90" on:click={resetControls}>重置参数</button>
			</div>

			<div class="grid grid-cols-1 gap-5 md:grid-cols-2">
				<div class="space-y-4 rounded-2xl border border-white/10 bg-black/20 p-4">
					<h3 class="text-sm font-semibold text-90">原图参数</h3>
					<div>
						<div class="mb-2 flex items-center justify-between text-sm text-50">
							<span>原图亮度提高 (%)</span>
							<span class="font-mono text-90">{sourceBrightness}</span>
						</div>
						<input bind:value={sourceBrightness} type="range" min="0" max="200" step="1" class="h-2 w-full cursor-pointer accent-[var(--primary)]" />
					</div>
					<div>
						<div class="mb-2 flex items-center justify-between text-sm text-50">
							<span>原图对比度 (%)</span>
							<span class="font-mono text-90">{sourceContrast}</span>
						</div>
						<input bind:value={sourceContrast} type="range" min="10" max="300" step="1" class="h-2 w-full cursor-pointer accent-[var(--primary)]" />
					</div>
				</div>

				<div class="space-y-4 rounded-2xl border border-white/10 bg-black/20 p-4">
					<h3 class="text-sm font-semibold text-90">隐藏图参数</h3>
					<div>
						<div class="mb-2 flex items-center justify-between text-sm text-50">
							<span>隐藏图亮度降低 (%)</span>
							<span class="font-mono text-90">{hiddenBrightness}</span>
						</div>
						<input bind:value={hiddenBrightness} type="range" min="0" max="100" step="1" class="h-2 w-full cursor-pointer accent-[var(--primary)]" />
					</div>
					<div>
						<div class="mb-2 flex items-center justify-between text-sm text-50">
							<span>隐藏图对比度 (%)</span>
							<span class="font-mono text-90">{hiddenContrast}</span>
						</div>
						<input bind:value={hiddenContrast} type="range" min="10" max="300" step="1" class="h-2 w-full cursor-pointer accent-[var(--primary)]" />
					</div>
				</div>
			</div>

			<div class="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
				<button type="button" class="inline-flex items-center justify-center rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[var(--primary)]/20 transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100" on:click={generateImage} disabled={!sourceImage || !hiddenImage || isGenerating}>
					{isGenerating ? "正在生成..." : "生成图像"}
				</button>
				{#if resultUrl}
					<button type="button" class="inline-flex items-center justify-center rounded-xl border border-white/10 px-5 py-3 text-sm font-medium text-90 transition-all hover:border-[var(--primary)] hover:text-white" on:click={downloadResult}>
						下载 PNG
					</button>
				{/if}
			</div>
		</div>
	</section>

	<section class="space-y-6">
		<div class="rounded-2xl border border-white/10 bg-white/5 p-5">
			<h2 class="mb-2 text-lg font-bold text-90">生成结果</h2>
			<p class="mb-5 text-sm leading-relaxed text-50">
				输出为 PNG 棋盘图。该工具采用你提供的原始幻影图算法，不提供黑白底切换预览。
			</p>

			{#if errorMessage}
				<div class="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{errorMessage}</div>
			{/if}

			<div class="mb-4 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-relaxed text-50">
				{statusMessage}
			</div>

			{#if sourceImage && hiddenImage && (sourceImage.width !== hiddenImage.width || sourceImage.height !== hiddenImage.height)}
				<div class="mb-4 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm leading-relaxed text-amber-100">
					检测到两张图片尺寸不一致：当前会按原图尺寸 {sourceImage.width} × {sourceImage.height} 统一缩放隐藏图后再生成。
				</div>
			{/if}

			<div class="space-y-4">
				<canvas bind:this={outputCanvas} class:hidden={!resultUrl} class="w-full rounded-2xl border border-white/10 bg-[linear-gradient(45deg,rgba(255,255,255,0.08)_25%,transparent_25%,transparent_75%,rgba(255,255,255,0.08)_75%),linear-gradient(45deg,rgba(255,255,255,0.08)_25%,transparent_25%,transparent_75%,rgba(255,255,255,0.08)_75%)] bg-[length:24px_24px] bg-[position:0_0,12px_12px]" />

				{#if resultUrl}
					<div class="rounded-2xl border border-white/10 bg-black/20 p-3">
						<p class="mb-3 text-sm font-medium text-90">输出预览</p>
						<img src={resultUrl} alt="输出预览" class="w-full rounded-lg border border-white/10 bg-[var(--card-bg)] object-contain" />
					</div>
					<p class="text-xs leading-relaxed text-white/45">输出尺寸：{resultWidth} × {resultHeight}。若想改变视觉效果，可继续调整四个参数后重新生成。</p>
				{:else}
					<div class="flex min-h-[22rem] items-center justify-center rounded-2xl border border-dashed border-white/15 bg-black/20 px-6 text-center text-sm leading-relaxed text-white/45">
						尚未生成结果。上传两张图片并调整参数后，点击“生成图像”即可在此处预览并下载 PNG。
					</div>
				{/if}
			</div>
		</div>

		<div class="rounded-2xl border border-white/10 bg-white/5 p-5">
			<h2 class="mb-3 text-lg font-bold text-90">使用说明</h2>
			<ul class="space-y-2 text-sm leading-relaxed text-50">
				<li>1. 上传原图与隐藏图；原图决定最终输出尺寸。</li>
				<li>2. 参数语义与原始算法保持一致：原图亮度提高、隐藏图亮度降低、以及双方对比度。</li>
				<li>3. 点击“生成图像”后，会按 `(x + y) % 2` 的奇偶像素规则交替写入原图像素与隐藏图像素。</li>
				<li>4. 该工具生成的是幻影图，不是黑白底切换预览的光棱坦克；想看到隐藏图，请在系统、相册或图片查看器中全局拉高亮度。</li>
				<li>5. 结果会以 PNG 无损格式生成，点击下载按钮即可保存。</li>
			</ul>
		</div>
	</section>
</div>
