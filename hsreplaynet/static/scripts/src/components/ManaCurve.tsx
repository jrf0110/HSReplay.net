import * as React from "react";
import {CardObj} from "../interfaces";

interface ManaCurveProps extends React.ClassAttributes<ManaCurve> {
	cards: CardObj[];
}

export default class ManaCurve extends React.Component<ManaCurveProps, any> {

	render(): JSX.Element {
		const bars = [];
		const costs = [0, 0, 0, 0, 0, 0, 0, 0];

		(this.props.cards || []).forEach(cardObj => costs[Math.min(cardObj.card.cost, 7)] += cardObj.count);

		const maxCost = Math.max.apply(Math, costs) || 1;
		
		costs.forEach(cost => {
			bars.push(
				<li>
					<span style={{height: (100 * cost / maxCost) + "%"}} />
				</li>
			);
		});

		return (
			<ul className="mana-curve">
				{bars}
			</ul>
		);
	}
}
