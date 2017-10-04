import {cookie} from "cookie_js";
import * as React from "react";
import Settings from "../Settings";
import * as PropTypes from "prop-types";

interface UserData {
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

class User {
	private readonly _userdata: UserData;
	public settings: Settings;

	constructor(userdata: UserData, settings: Settings) {
		this._userdata = userdata;
		this.settings = settings;
	}

	hasFeature(name: string): boolean {
		const features = this._userdata.features || [];
		const feature = features[name];
		return feature && feature.enabled;
	}

	isAuthenticated(): boolean {
		return !!this._userdata.is_authenticated;
	}

	isPremium(): boolean {
		return !!this._userdata.premium;
	}

	isStaff(): boolean {
		return !!this._userdata.staff;
	}

	getUsername(): string | null {
		return this._userdata.username || null;
	}

	getLocale(): string | null {
		return this._userdata.locale || null;
	}

	getAccounts(): Account[] {
		return this._userdata.accounts || [];
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

	getSetting(key: string): any {
		return this.settings.get(key);
	}

	setSetting(key: string, value: any) {
		return this.settings.set(key, value);
	}
}

export const getUser = () => {
	const userdata = Object.assign({}, window["_userdata"]);
	return new User(userdata, new Settings());
};

export interface UserProps {
	user: User;
}

export const withUser = <TWrappedProps extends {}>(WrappedComponent: React.ComponentClass<TWrappedProps & UserProps>) => {
	return class UserProvider extends React.Component<TWrappedProps> {
		static contextTypes = {
			user: PropTypes.object.isRequired,
		};

		render() {
			const {user} = this.context;
			return <WrappedComponent {...this.props} user={user as User} />;
		}
	}
};
