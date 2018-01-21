import { cookie } from "cookie_js";
import HearthstoneJSON from "hearthstonejson";
import UserData from "./UserData";

export default class CardData {
	private readonly byDbfId = {};
	private readonly byCardId = {};
	private readonly cards = [];

	constructor(private modify?: (card: any) => void) {}

	public load(cb: (cardData: CardData) => void) {
		UserData.create();
		const locale = cookie.get("joust_locale", UserData.getLocale());
		const hsjson = new HearthstoneJSON();
		hsjson.getLatest(locale).then((data: any[]) => {
			data.forEach(card => {
				this.modify && this.modify(card);
				this.byDbfId[card.dbfId] = card;
				this.byCardId[card.id] = card;
				this.cards.push(card);
			});
			cb(this);
		});
	}

	public fromDbf(dbfId: number | string) {
		return this.byDbfId[+dbfId];
	}

	public fromCardId(cardId: string) {
		return this.byCardId[cardId];
	}

	public all(): any[] {
		return this.cards;
	}
}
