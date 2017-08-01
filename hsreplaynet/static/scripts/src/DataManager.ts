export default class DataManager {
	private static readonly cache = {};
	private static readonly responses = {};
	private static readonly running = {};

	private static genCacheKey(url: string, params: any): string {
		const paramStrings = [];
		Object.keys(params).forEach((key) => {
			const value = params[key];
			if (value !== undefined && value !== null) {
				paramStrings.push(key + value);
			}
		});
		return this.cleanUrl(url) + paramStrings.sort().join("");
	}

	private static fullUrl(url: string, params: any): string {
		url = this.cleanUrl(url);
		const keys = params ? Object.keys(params) : [];
		const query = keys.reduce((prev, key, i) => {
			return prev + (i > 0 ? "&" : "?") + encodeURIComponent(key) + "=" + encodeURIComponent(params[key]);
		}, "");

		return url + query;
	}

	private static cleanUrl(url: string): string {
		url = url.startsWith("/") ? url : "/analytics/query/" + url;
		if (!url.endsWith("/")) {
			url += "/";
		}
		return url;
	}

	static get(url: string, params?: any): Promise<any> {
		const cacheKey = this.genCacheKey(url, params || {});
		if (this.responses[cacheKey] === 200) {
			return Promise.resolve(this.cache[cacheKey]);
		}
		if (this.responses[cacheKey]) {
			return Promise.reject(this.responses[cacheKey]);
		}
		if (this.running[cacheKey]) {
			return this.running[cacheKey];
		}

		let fromLocalStorage = false;
		let hasLastModified = false;
		const promise = this.fetchOrLocalStorage(cacheKey, url, params)
			.then((response: Response|any) => {
				if (response instanceof Response) {
					if (response.status === 200) {
						hasLastModified = !!response.headers.get("last-modified");
						return response.json();
					}
					return Promise.reject(response.status);
				}
				fromLocalStorage = true;
				return Promise.resolve(response);
			}).then((json) => {
				this.cache[cacheKey] = json;
				if (!fromLocalStorage && hasLastModified) {
					this.toLocalStorage(cacheKey, json);
				}
				this.responses[cacheKey] = 200;
				this.running[cacheKey] = undefined;
				return Promise.resolve(json);
			}).catch((status) => {
				if (status !== 202) {
					this.responses[cacheKey] = status;
				}
				this.running[cacheKey] = undefined;
				return Promise.reject(status);
			});
		this.running[cacheKey] = promise;
		return promise;
	}

	static has(url: string, params?: any): boolean {
		return this.cache[this.genCacheKey(url, params || {})] !== undefined;
	}

	static fetchOrLocalStorage(cacheKey: string, url: string, params: any): Promise<Response|any> {
		const headers = new Headers();
		const localData = this.fromLocalStorage(cacheKey);
		if (localData) {
			headers.append("if-modified-since", localData.lastModified);
			return fetch(this.fullUrl(url, params || {}), {credentials: "include", headers}).then((response: Response) => {
				if (response.status === 304) {
					return Promise.resolve(localData.data);
				}
				return Promise.resolve(response);
			});
		}
		return fetch(this.fullUrl(url, params || {}), {credentials: "include"});
	}

	static toLocalStorage(cacheKey: string, data: any) {
		const json = JSON.stringify({data, lastModified: new Date().toUTCString()});
		window.localStorage["data-" + cacheKey] = json;
	}

	static fromLocalStorage(cacheKey: string): any {
		const json = window.localStorage["data-" + cacheKey];
		if (json) {
			return JSON.parse(json);
		}
		return undefined;
	}
}
