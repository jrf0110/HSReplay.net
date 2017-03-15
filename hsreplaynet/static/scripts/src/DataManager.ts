import { toQueryString } from "./QueryParser";

export default class DataManager {
	private readonly cache = {};
	private readonly running = {};

	private genCacheKey(url: string, params: any): string {
		const paramStrings = [];
		Object.keys(params).forEach((key) => {
			const value = params[key];
			if (value !== undefined && value !== null) {
				paramStrings.push(key + value);
			}
		});

		return url + paramStrings.sort().join("");
	}

	private fullUrl(url: string, params: any): string {
		url = url.startsWith("/") ? url : "/analytics/query/" + url;
		return url + "?" + toQueryString(params);
	}

	get(url: string, params?: any): Promise<any> {
		const cacheKey = this.genCacheKey(url, params || {});
		if (this.cache[cacheKey]) {
			return Promise.resolve(this.cache[cacheKey]);
		}
		if (this.running[cacheKey]) {
			return this.running[cacheKey];
		}
		const promise = fetch(this.fullUrl(url, params || {}), {credentials: "include"})
			.then((response: Response) => {
				if (response.ok && response.status !== 202) {
					this.cache[cacheKey] = response.json();
				}
				this.running[cacheKey] = undefined;
				return this.cache[cacheKey] || Promise.reject(response.status);
			});
		this.running[cacheKey] = promise;
		return promise;
	}

	has(url: string, params?: any): boolean {
		return this.cache[this.genCacheKey(url, params || {})] !== undefined;
	}
}
