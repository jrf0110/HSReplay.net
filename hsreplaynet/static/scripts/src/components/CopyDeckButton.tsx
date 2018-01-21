import React from "react";
import { encode as encodeDeckstring } from "deckstrings";
import Tooltip from "./Tooltip";
import * as _ from "lodash";
import Clipboard from "clipboard";
import CardData from "../CardData";
import { toTitleCase } from "../helpers";

interface CopyDeckButtonProps extends React.ClassAttributes<CopyDeckButton> {
	cardData: CardData;
	name?: string;
	deckClass?: string;
	cards: number[] | string[];
	heroes: number[];
	format: number;
	sourceUrl?: string;
	simple?: boolean;
}

interface CopyDeckButtonState {
	copied?: boolean;
	elementId?: string;
}

export default class CopyDeckButton extends React.Component<
	CopyDeckButtonProps,
	CopyDeckButtonState
> {
	private clipboard: Clipboard;
	private timeout: number;

	constructor(props: CopyDeckButtonProps, context: any) {
		super(props, context);
		this.state = {
			copied: false,
			elementId: _.uniqueId("copy-deck-button-")
		};
	}

	render() {
		const classNames = ["copy-deck-button btn"];
		if (this.state.copied) {
			classNames.push("btn-success");
		} else {
			classNames.push("btn-primary");
		}
		if (this.props.simple) {
			classNames.push("glyphicon glyphicon-copy");
			return (
				<Tooltip
					content={this.state.copied ? "Copied!" : "Copy Deck Code"}
					simple={true}
				>
					<span
						id={this.state.elementId}
						className={classNames.join(" ")}
					/>
				</Tooltip>
			);
		}

		return (
			<Tooltip
				header="After you click:"
				content={
					<p>
						Create a new deck in Hearthstone, or paste it into our
						own Hearthstone&nbsp;Deck&nbsp;Tracker.
					</p>
				}
				belowCursor
				centered
				yOffset={20}
			>
				<span
					id={this.state.elementId}
					className={classNames.join(" ")}
				>
					{!this.state.copied ? (
						<span>
							<span className="glyphicon glyphicon-copy" />&nbsp;
						</span>
					) : null}
					{this.state.copied
						? "Deck copied!"
						: "Copy Deck to Hearthstone"}
				</span>
			</Tooltip>
		);
	}

	componentDidMount(): void {
		this.clipboard = new Clipboard("#" + this.state.elementId, {
			text: (elem): string => this.buildCopieableString()
		});
		this.clipboard.on("success", () => {
			this.setState({ copied: true });
			window.clearTimeout(this.timeout);
			this.timeout = window.setTimeout(() => {
				this.setState({ copied: false });
				this.timeout = null;
			}, 10000);
		});
	}

	buildCopieableString(): string {
		const dbfs = {};
		let cards = this.props.cards;
		if (cards.length > 0 && typeof cards[0] === "string") {
			cards = (cards as string[]).map(
				cardId => this.props.cardData.fromCardId(cardId).dbfId
			);
		}
		for (const card of cards) {
			if (typeof dbfs[card] === "undefined") {
				dbfs[card] = 1;
			} else {
				dbfs[card]++;
			}
		}
		const tuples = Object.keys(dbfs).map(dbfId => {
			return [+dbfId, +dbfs[dbfId]];
		});
		tuples.sort(([a, x], [b, y]) => (a === b ? 0 : a > b ? 1 : -1));
		const format = this.props.format ? this.props.format : 1; // default to wild
		const deckstring = encodeDeckstring({
			cards: tuples,
			heroes: this.props.heroes,
			format
		});

		const standard = format === 2;

		let prettyDeckList = null;
		if (this.props.cardData) {
			const dataCountTuples = tuples.map(([dbfId, count]) => {
				return [this.props.cardData.fromDbf(dbfId), count];
			});
			dataCountTuples.sort(
				([a, x], [b, y]) => (a["name"] > b["name"] ? 1 : -1)
			);
			dataCountTuples.sort(
				([a, x], [b, y]) => (a["cost"] > b["cost"] ? 1 : -1)
			);
			prettyDeckList = dataCountTuples.map(
				([card, count]) => `${count}x (${card.cost}) ${card.name}`
			);
		}

		return [
			`### ${this.props.name || "HSReplay.net Deck"}`,
			...(this.props.deckClass
				? [`# Class: ${toTitleCase(this.props.deckClass)}`]
				: []),
			`# Format: ${standard ? "Standard" : "Wild"}`,
			...(standard ? ["# Year of the Mammoth"] : []),
			...(prettyDeckList
				? ["#", ...prettyDeckList.map(line => "# " + line)]
				: []),
			"#",
			deckstring,
			"#",
			"# To use this deck, copy it to your clipboard and create a new deck in Hearthstone",
			...(this.props.sourceUrl
				? [`# Find the deck on ${this.props.sourceUrl}`]
				: [])
		].join("\n");
	}
}
