import * as React from "react";
import CardTile from "./CardTile";

interface TopCardsListState {
}

interface TopCardsListProps extends React.ClassAttributes<TopCardsList> {
	cardData: Map<string, any>;
	cardIds: string[];
	title: string;
}

export default class TopCardsList extends React.Component<TopCardsListProps, TopCardsListState> {
	constructor(props: TopCardsListProps, state: TopCardsListState) {
		super(props, state);
		this.state = {
		}
	}

	render(): JSX.Element {
		const cards = [];
		if (this.props.cardData.size) {
			this.props.cardIds.forEach((cardId, index) => {
				cards.push(
					<a href={"/cards/" + cardId}>
						<div style={{display: "flex"}}>
							<span style={{lineHeight: "34px", paddingRight: "10px", color: "black", fontWeight: "bold"}}>{"#" + (index + 1) + " (7%)"}</span>
							<div style={{width: 217}}>
								<CardTile
									card={this.props.cardData.get(cardId)}
									rarityColored
									height={34}
									count={1}
								/>
							</div>
						</div>
					</a>
				);
			});
		}
		return <div>
			<h4>{this.props.title}</h4>
			{cards}
		</div>
	}
}
