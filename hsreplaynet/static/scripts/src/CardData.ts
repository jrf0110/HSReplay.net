import HearthstoneJSON from "hearthstonejson";

export default class CardData {
	private readonly byDbfId = {};
	private readonly byCardId = {};
	private readonly cards = [];

	constructor(private modify?: (card: any) => void) {
	}

	public load(cb: (cardData: CardData) => void) {
		const hsjson = new HearthstoneJSON();
		hsjson.getLatest().then((data: any[]) => {
			data.forEach(card => {
				this.modify && this.modify(card);
				this.byDbfId[card.dbfId] = card;
				this.byCardId[card.id] = card;
				this.cards.push(card);
			});
			cb(this);
		});
	}

	public fromDbf(dbfId: number|string) {
		return this.byDbfId[+dbfId];
	}

	public fromCardId(cardId: string) {
		return this.byCardId[cardId];
	}

	public all(): any[] {
		return this.cards;
	}
}
