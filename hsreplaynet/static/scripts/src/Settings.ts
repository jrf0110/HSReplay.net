import { cookie } from "cookie_js";

const cookiePrefix = "setting-";

export default class Settings {
	get(key: string): any {
		return this.fromCookie(key);
	}

	set(key: string, value: any) {
		this.toCookie(key, value);
	}

	private fromCookie(key: string): any {
		const json = cookie.get(cookiePrefix + key, undefined);
		if (json) {
			return JSON.parse(json);
		}
	}

	private toCookie(key: string, value: any) {
		const json = JSON.stringify(value);
		cookie.set(cookiePrefix + key, json, { path: "/", expires: 365 });
	}
}
