interface UserDataProps {
	accounts: Account[];
	battletag: string;
	card_art_url: string;
	groups: string[];
	is_authenticated: boolean;
	premium: boolean;
	username: string;
}

interface Account {
	display: string;
	battletag: string;
	region: number;
	lo: number;
}

export default class UserData {
	private _userData: UserDataProps;
	private _mockFree: boolean;
	constructor() {
		this._userData = Object.assign({}, window["_userdata"]);
		this._mockFree = document.cookie.indexOf("free-mode") !== -1;
	}

	hasFeature(feature: string): boolean {
		return this._userData && this._userData.groups && this._userData.groups.indexOf("feature:" + feature) !== -1;
	}

	isPremium(): boolean {
		return this._userData && this._userData.premium && !this._mockFree;
	}

	isAuthenticated(): boolean {
		return this._userData && this._userData.is_authenticated;
	}

	getAccounts(): Account[] {
		if (!this._userData) {
			return [];
		}
		return this._userData.accounts || [];
	}

}
