import * as React from "react";

interface ManaCurveProps extends React.ClassAttributes<ManaCurve> {
	cardData: Map<string, any>;
	cardIds: string[];
}

export default class ManaCurve extends React.Component<ManaCurveProps, any> {
	render(): JSX.Element {
		if (!this.props.cardData) {
			return null;
		}

		const bars = [];
		const costs = [0, 0, 0, 0, 0, 0, 0, 0];

		this.props.cardIds.forEach(id => costs[Math.min(this.props.cardData.get(''+id).cost, 7)] += 1);

		const maxCost = Math.max.apply(Math, costs);
		
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
