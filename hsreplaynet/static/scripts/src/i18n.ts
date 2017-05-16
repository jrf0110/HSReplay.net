import * as i18n from 'i18next'
import UserData from "./UserData";

const userData = new UserData();

const instance = i18n
	.init({
		// fall back to keys
		nsSeparator: false,
		keySeparator: false,
		fallbackLng: false,
		// translations
		resources: {
			"deDE": {
				translation: {
					"Cards": "Karten",
					"Gallery": "Gallerie",
					"Search…": "Suchen…",
				},
			},
		},
		lng: userData.getLocale(),
	});

export default instance;
