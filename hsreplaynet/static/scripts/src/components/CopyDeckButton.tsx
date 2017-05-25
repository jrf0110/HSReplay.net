import * as React from "react";
import {encode as encodeDeckstring} from "deckstrings";
import Tooltip from "./Tooltip";
import * as _ from "lodash";
import Clipboard from "clipboard";

interface CopyDeckButtonProps extends React.ClassAttributes<CopyDeckButton> {
	name?: string;
	cards: number[];
	heroes: number[];
	format: number;
	sourceUrl?: string;
	disabled?: boolean;
}

interface CopyDeckButtonState {
	copied?: boolean;
	elementId?: string;
}

export default class CopyDeckButton extends React.Component<CopyDeckButtonProps, CopyDeckButtonState> {
	private clipboard: Clipboard;
	private timeout: number;

	constructor(props: CopyDeckButtonProps, context: any) {
		super(props, context);
		this.state = {
			copied: false,
			elementId: _.uniqueId("copy-deck-button-"),
		};
	}

	render() {
		const classNames = ["copy-deck-button hidden-xs btn"];
		if (this.state.copied) {
			classNames.push("btn-success");
		}
		else {
			classNames.push("btn-primary");
		}
		if (this.props.disabled) {
			classNames.push("disabled");
		}

		return (
			<Tooltip
				header="After you click:"
				content={"Create a new deck in Hearthstone or Hearthstone Deck Tracker."}
				centered
			>
				<span
					id={this.state.elementId}
					className={classNames.join(" ")}
				>
					{!this.state.copied ? <span><span className="glyphicon glyphicon-copy"></span>&nbsp;</span> : null}
					{this.state.copied ? "Deck copied!" : "Copy Deck to Hearthstone"}
				</span>
			</Tooltip>
		);
	}

	componentDidMount(): void {
		this.clipboard = new Clipboard("#" + this.state.elementId, {
			text: (elem): string => this.buildCopieableString(),
		});
		this.clipboard.on("success", () => {
			this.setState({copied: true});
			window.clearTimeout(this.timeout);
			this.timeout = window.setTimeout(() => {
				this.setState({copied: false});
				this.timeout = null;
			}, 10000);
		});
	}

	buildCopieableString(): string {
		const dbfs = {};
		for (let card of this.props.cards) {
			if (typeof dbfs[card] === "undefined") {
				dbfs[card] = 1;
			}
			else {
				dbfs[card]++;
			}
		}
		const tuples = Object.keys(dbfs).map((dbfId) => {
			return [+dbfId, +dbfs[dbfId]];
		});
		let format = this.props.format ? this.props.format : 1; // default to wild
		const deckstring = encodeDeckstring({
			cards: tuples,
			heroes: this.props.heroes,
			format: format,
		});
		return [
			`### ${this.props.name || "HSReplay.net Deck"}`,
			//`# Class:  ???`,
			`# Format: ${format === 2 ? "Standard" : "Wild"}`,
			"#",
			//"# Deck list here",
			//"#",
			deckstring,
			"#",
			"# To use this deck, copy it to your clipboard and create a new deck in Hearthstone",
		].join("\n");
	}
}
