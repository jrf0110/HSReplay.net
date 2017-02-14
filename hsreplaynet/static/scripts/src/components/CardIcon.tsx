import * as React from "react";

interface CardIconProps extends React.ClassAttributes<CardIcon> {
	cardId: string;
}

export default class CardIcon extends React.Component<CardIconProps, any> {
	render(): JSX.Element {
		if (this.props.cardId) {
			const image = "url(https://art.hearthstonejson.com/v1/tiles/" + this.props.cardId + ".png)";
			return (
				<div
					className="card-icon"
					style={{backgroundImage: image}}
				/>
			);
		}
	}
}
