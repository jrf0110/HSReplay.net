interface UserDataProps {
	accounts: Account[];
	battletag: string;
	card_art_url: string;
	groups: string[];
	is_authenticated: boolean;
	premium: boolean;
	username: string;
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
		return this._userData && this._userData.groups && this._userData.groups.indexOf("feature:" + feature) !== -1;
	}

	isPremium(): boolean {
		return this._userData && this._userData.premium;
	}

	isAuthenticated(): boolean {
		return this._userData && this._userData.is_authenticated;
	}

	getUsername(): string|null {
		return this._userData ? this._userData.username : null;
	}

	getAccounts(): Account[] {
		if (!this._userData) {
			return [];
		}
		return this._userData.accounts || [];
	}

}
