export default class GoogleAnalytics {
	public static async event(
		category: string,
		action: string,
		label: string,
		params?: UniversalAnalytics.FieldsObject
	): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			if (typeof ga !== "function") {
				resolve();
				return;
			}
			const requiredParams: UniversalAnalytics.FieldsObject = {
				eventCategory: category,
				eventAction: action,
				eventLabel: label
			};
			const defaults: UniversalAnalytics.FieldsObject = {
				hitType: "event",
				hitCallback: () => resolve()
			};
			ga("send", "event", { ...defaults, ...requiredParams, ...params });
		});
	}
}

export class SubscriptionEvents extends GoogleAnalytics {
	public static onSubscribe(
		usdValue: number,
		location: string,
		params?: UniversalAnalytics.FieldsObject
	): Promise<void> {
		return this.event("Checkout", "subscribe", location, {
			...params,
			eventValue: Math.ceil(+usdValue / 100)
		});
	}
}

export class TwitchStreamPromotionEvents extends GoogleAnalytics {
	public static onClickLiveNow(
		deck: string,
		params?: UniversalAnalytics.FieldsObject
	): Promise<void> {
		return this.event("Twitch", "view", deck, params);
	}

	public static onVisitStream(
		stream: string,
		params?: UniversalAnalytics.FieldsObject
	): Promise<void> {
		return this.event("Twitch", "visit", stream, params);
	}
}

export class ReferralEvents extends GoogleAnalytics {
	public static onCopyRefLink(which: string): Promise<void> {
		return this.event("Referrals", "copy", which);
	}
}
