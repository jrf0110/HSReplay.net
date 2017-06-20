import {cookie} from "cookie_js";

interface UserDataProps {
	accounts: Account[];
	battletag: string;
	card_art_url: string;
	groups: string[];
	is_authenticated: boolean;
	premium: boolean;
	username: string;
	staff: boolean;
	locale: string;
	features: FeatureMap;
}

interface FeatureMap {
	[feature: string]: Feature;
}

interface Feature {
	enabled: boolean;
}

export interface Account {
	display: string;
	battletag: string;
	region: number;
	lo: number;
}

export default class UserData {
	private _userData: UserDataProps;
	constructor() {
		this._userData = Object.assign({}, window["_userdata"]);
	}

	hasFeature(feature: string): boolean {
		return !!(
			this._userData &&
			this._userData.features &&
			this._userData.features[feature] &&
			this._userData.features[feature].enabled
		);
	}

	isPremium(): boolean {
		return !!(this._userData && this._userData.premium);
	}

	isAuthenticated(): boolean {
		return !!(this._userData && this._userData.is_authenticated);
	}

	isStaff(): boolean {
		return !!(this._userData && this._userData.staff);
	}

	getUsername(): string|null {
		return this._userData ? this._userData.username : null;
	}

	getLocale(): string|null {
		return this._userData ? this._userData.locale : null;
	}

	getAccounts(): Account[] {
		if (!this._userData) {
			return [];
		}
		return this._userData.accounts || [];
	}

	getDefaultAccountKey(): string {
		const accounts = this.getAccounts();
		if (accounts.length === 0) {
			return null;
		}
		const fromCookie = cookie.get("default-account", null);
		return fromCookie || accounts[0].region + "-" + accounts[0].lo;
	}

	setDefaultAccount(key: string): void {
		cookie.set("default-account", key, {path: "/", expires: 365});
	}

}
