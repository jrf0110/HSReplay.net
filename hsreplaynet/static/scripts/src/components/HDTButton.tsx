import * as React from "react";
import Clipboard from "clipboard";

interface HDTButtonState {
	copied?: boolean;
}

interface HDTButtonProps extends React.ClassAttributes<HDTButton> {
	name: string;
	class: string;
	card_ids: string[];
	sourceUrl: string;
	id?: number;
}

export default class HDTButton extends React.Component<HDTButtonProps, HDTButtonState> {
	private clipboard: Clipboard;
	private timeout: number = null;

	constructor(props: HDTButtonProps, state: HDTButtonState) {
		super(props, state);
		this.state = {
			copied: false,
		}
	}

	render() {
		const textClassNames = [];
		if (this.state.copied) {
			textClassNames.push("highlight");
		}
		return (
			<div className="hdt-button-wrapper">
				<img src={STATIC_URL + "images/hdt_icon.png"} />
				<span className={textClassNames.join(" ")} id={"copy-deck-" + (this.props.id || 1)}>
					{this.state.copied ? "Press Ctrl-V in HDT" : "Copy deck to HDT"}
				</span>
			</div>
		);
	}

	componentDidMount(): void {
		this.clipboard = new Clipboard("#copy-deck-" + (this.props.id || 1), {
			text: (elem): string => this.getDeckJson()
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
			name: this.props.name,
			class: this.props.class,
			card_ids: this.props.card_ids,
			sourceUrl: this.props.sourceUrl
		});
	}
}
