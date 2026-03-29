import { derived, get, writable } from "svelte/store";
import type { ForumApiEnv } from "@/forum/types/api";
import { readLocalStorage, writeLocalStorage } from "@/forum/utils/storage";

export const FORUM_API_ENV_STORAGE_KEY = "forum-api-env";
export const FORUM_API_CUSTOM_BASE_URL_STORAGE_KEY = "forum-api-custom-base-url";

export const FORUM_API_BASE_URLS: Record<ForumApiEnv, string> = {
	prod: "https://i.2x.nz",
	dev: "http://127.0.0.1:8787",
};

function normalizeBaseUrl(value: string) {
	return value.trim().replace(/\/+$/, "");
}

function normalizeEnv(value: ForumApiEnv | string | null | undefined): ForumApiEnv {
	return value === "dev" ? "dev" : "prod";
}

function sanitizeBaseUrl(value: string | null | undefined, env: ForumApiEnv) {
	const normalizedValue = normalizeBaseUrl(value || "");
	if (!normalizedValue) {
		return FORUM_API_BASE_URLS[env];
	}

	try {
		const url = new URL(normalizedValue);
		if (url.protocol !== "http:" && url.protocol !== "https:") {
			return FORUM_API_BASE_URLS[env];
		}
		return normalizeBaseUrl(url.toString());
	} catch {
		return FORUM_API_BASE_URLS[env];
	}
}

function createEnvStore() {
	const initialEnv = normalizeEnv(readLocalStorage<ForumApiEnv | string>(FORUM_API_ENV_STORAGE_KEY, "prod"));
	const initialCustomBaseUrl = sanitizeBaseUrl(
		readLocalStorage<string>(FORUM_API_CUSTOM_BASE_URL_STORAGE_KEY, FORUM_API_BASE_URLS[initialEnv]),
		initialEnv,
	);
	const envStore = writable<ForumApiEnv>(initialEnv);
	const customBaseUrlStore = writable<string>(initialCustomBaseUrl);

	customBaseUrlStore.subscribe((value) => {
		writeLocalStorage(FORUM_API_CUSTOM_BASE_URL_STORAGE_KEY, sanitizeBaseUrl(value, get(envStore)));
	});

	const baseUrl = derived([envStore, customBaseUrlStore], ([$env, $customBaseUrl]) => {
		return sanitizeBaseUrl($customBaseUrl, $env);
	});

	return {
		subscribe: envStore.subscribe,
		baseUrl,
		customBaseUrl: {
			subscribe: customBaseUrlStore.subscribe,
			set: (value: string) => customBaseUrlStore.set(sanitizeBaseUrl(value, get(envStore))),
			reset: (env: ForumApiEnv) => customBaseUrlStore.set(FORUM_API_BASE_URLS[env]),
		},
		set: (value: ForumApiEnv) => {
			const nextEnv = normalizeEnv(value);
			writeLocalStorage(FORUM_API_ENV_STORAGE_KEY, nextEnv);
			envStore.set(nextEnv);
			customBaseUrlStore.set(FORUM_API_BASE_URLS[nextEnv]);
		},
		toggle: () => {
			let nextEnv: ForumApiEnv = "prod";
			envStore.update((current) => {
				nextEnv = current === "prod" ? "dev" : "prod";
				writeLocalStorage(FORUM_API_ENV_STORAGE_KEY, nextEnv);
				return nextEnv;
			});
			customBaseUrlStore.set(FORUM_API_BASE_URLS[nextEnv]);
		},
		getBaseUrl: (env: ForumApiEnv) => FORUM_API_BASE_URLS[env],
	};
}

export const forumEnv = createEnvStore();
