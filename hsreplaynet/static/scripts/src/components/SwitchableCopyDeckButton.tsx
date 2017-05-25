import * as React from "react";
import HDTButton from "./HDTButton";
import UserData from "../UserData";
import Tooltip from "./Tooltip";
import CopyDeckButton from "./CopyDeckButton";

interface SwitchableCopyDeckButtonProps extends React.ClassAttributes<SwitchableCopyDeckButton> {
	name: string;
	cards: number[];
	heroes: number[];
	format: number;
	sourceUrl: string;
	disabled?: boolean;

	// to be removed
	id?: string;
	cardIds: string[];
	deckClass: string;
}

export default class SwitchableCopyDeckButton extends React.Component<SwitchableCopyDeckButtonProps, void> {
	render() {
		const userdata = new UserData();

		if (!userdata.hasFeature("deckstrings")) {
			return (
				<HDTButton
					card_ids={this.props.cardIds}
					deckClass={this.props.deckClass}
					disabled={this.props.disabled}
					id={1}
					name={this.props.name}
					sourceUrl={this.props.sourceUrl}
				/>
			);
		}

		return <CopyDeckButton
			cards={this.props.cards}
			heroes={this.props.heroes}
			format={this.props.format}
			sourceUrl={this.props.sourceUrl}
			disabled={this.props.disabled}
		/>;
	}
}
