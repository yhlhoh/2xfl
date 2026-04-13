import { bindFancybox } from "@utils/fancybox";

const SELECTOR = ".custom-md img, #post-cover img";

bindFancybox(SELECTOR);

window.addEventListener("keydown", (e) => {
	if (e.key !== "Escape") return;
});
