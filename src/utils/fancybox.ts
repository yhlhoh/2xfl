import { Fancybox } from "@fancyapps/ui";
import "@fancyapps/ui/dist/fancybox/fancybox.css";

const scrollLockHooks: {
	on: {
		ready: () => void;
		closing: () => void;
	};
} = {
	on: {
		ready: (): void => {
			document.documentElement.style.overflow = "scroll";
		},
		closing: (): void => {
			document.documentElement.style.removeProperty("overflow");
		},
	},
};

const fancyboxOptions: any = {
	wheel: "zoom",
	clickContent: "close",
	dblclickContent: "zoom",
	click: "close",
	dblclick: "zoom",
	Panels: {
		display: ["counter", "zoom"],
	},
	Images: {
		panning: true,
		zoom: true,
		protect: false,
	},
	...scrollLockHooks,
};

export function bindFancybox(selector: string): void {
	Fancybox.bind(selector, fancyboxOptions);
}

export function unbindFancybox(selector: string): void {
	Fancybox.unbind(selector);
}

export function closeFancybox(): void {
	try {
		Fancybox.close();
	} catch {}
}

export function cleanupFancybox(): void {
	closeFancybox();
	document
		.querySelectorAll(".fancybox__container")
		.forEach((el) => el.remove());
	document.documentElement.style.removeProperty("overflow");
	document.body.style.removeProperty("overflow");
}

export function restoreNativeScrollIfSafe(): void {
	const hasFancybox = !!document.querySelector(".fancybox__container");
	const hasCookieModal = !!document.querySelector(
		".cc_overlay, .cc_modal, .cc_preferences, .cc_dialog, .cc_cp, .cc_nb, .cc_banner",
	);
	if (hasFancybox || hasCookieModal) return;
	document.documentElement.style.removeProperty("overflow");
	document.body.style.removeProperty("overflow");
}

export { fancyboxOptions, scrollLockHooks };
