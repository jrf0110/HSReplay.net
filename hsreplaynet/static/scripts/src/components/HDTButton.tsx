import * as React from "react";
import Clipboard from "clipboard";
import { toTitleCase } from "../helpers";
import Tooltip from "./Tooltip";

interface HDTButtonState {
	copied?: boolean;
}

interface HDTButtonProps extends React.ClassAttributes<HDTButton> {
	card_ids: string[];
	deckClass: string;
	disabled?: boolean;
	id?: number;
	name: string;
	sourceUrl: string;
}

export default class HDTButton extends React.Component<HDTButtonProps, HDTButtonState> {
	private clipboard: Clipboard;
	private timeout: number = null;

	constructor(props: HDTButtonProps, state: HDTButtonState) {
		super(props, state);
		this.state = {
			copied: false,
		};
	}

	render() {
		const classNames = ["hdt-button hidden-xs"];
		if (this.state.copied) {
			classNames.push("highlight");
		}
		if (this.props.disabled) {
			classNames.push("disabled");
		}

		const tooltipContent = (
			<p>
				<br/>
				1. Open HDT and press CTRL-V in the main window.
				<br/><br/>
				2. You're done! You can now save the deck or directly export it to Hearthstone.
			</p>
		);

		return (
			<div className={classNames.join(" ")}>
				<Tooltip header="After you click:" content={tooltipContent} centered>
					<span id={"copy-deck-" + (this.props.id || 1)}>
						{this.state.copied ? "Copied to clipboard" : "Copy deck to HDT"}
					</span>
				</Tooltip>
			</div>
		);
	}

	componentDidMount(): void {
		this.clipboard = new Clipboard("#copy-deck-" + (this.props.id || 1), {
			text: (elem): string => this.getDeckJson(),
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

	componentWillUnmount(): void {
		this.clipboard.destroy();
		window.clearTimeout(this.timeout);
	}

	getDeckJson(): string {
		return JSON.stringify({
			card_ids: this.props.card_ids,
			class: toTitleCase(this.props.deckClass),
			name: this.props.name,
			sourceUrl: this.props.sourceUrl,
		});
	}
}
