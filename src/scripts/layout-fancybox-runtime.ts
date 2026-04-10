import {
	bindFancybox,
	cleanupFancybox,
	restoreNativeScrollIfSafe,
	unbindFancybox,
} from "@utils/fancybox";

const SELECTOR = ".custom-md img, #post-cover img";

bindFancybox(SELECTOR);

const setup = () => {
	window.swup.hooks.on("page:view", () => {
		bindFancybox(SELECTOR);
	});

	window.swup.hooks.on(
		"content:replace",
		() => {
			cleanupFancybox();
			unbindFancybox(SELECTOR);
		},
		{ before: true },
	);

	window.swup.hooks.on(
		"visit:start",
		() => {
			cleanupFancybox();
		},
		{ before: true },
	);

	window.addEventListener("keydown", (e) => {
		if (e.key !== "Escape") return;
		setTimeout(restoreNativeScrollIfSafe, 0);
	});
	document.addEventListener(
		"click",
		() => {
			setTimeout(restoreNativeScrollIfSafe, 0);
		},
		true,
	);
};

const initSwup = () => {
	if (
		window.swup &&
		typeof window.swup.init === "function" &&
		!window.swup.initialized
	) {
		window.swup.init();
	}
};

const initSwupImmediately = () => {
	if (
		window.swup &&
		typeof window.swup.init === "function" &&
		!window.swup.initialized
	) {
		window.swup.init();
	}
};

if (window.swup) {
	if (typeof window.swup.init === "function" && !window.swup.initialized) {
		initSwup();
	}
	setup();
} else {
	document.addEventListener("swup:enable", () => {
		initSwupImmediately();
		setup();
	});
}
