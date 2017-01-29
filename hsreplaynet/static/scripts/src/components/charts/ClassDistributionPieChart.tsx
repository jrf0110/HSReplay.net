import * as React from "react";
import { GameReplay } from "../../interfaces";
import { VictoryPie } from "victory";

interface ClassDistributionPieChartState {
	name?: string;
	value?: number;
	pct?: string;
}

export interface ClassDistributionPieChartProps extends React.ClassAttributes<ClassDistributionPieChart>{
	games: GameReplay[];
	loadingGames?: boolean;
	onPieceClicked?: (name: string) => void;
}

export default class ClassDistributionPieChart extends React.Component<ClassDistributionPieChartProps, ClassDistributionPieChartState> {
	constructor() {
		super();
		this.state = {
			name: "",
			value: 0,
			pct: "",
		}
	}
	render(): JSX.Element {
		let data = [];
		let numGames = this.props.games.length;
		if (numGames == 0) {
			data.push({x: " ", y: 1, name: null, color: "lightgrey"});
		}
		else {
			let distr = new Map<string, number>();
			this.props.games.forEach((game: GameReplay) => {
				if (game.friendly_player && game.friendly_player.hero_id.startsWith("HERO")) {
					let hero = game.friendly_player.hero_class_name;
					hero = hero.substr(0, 1).toUpperCase() + hero.substr(1, hero.length - 1).toLowerCase();
					distr.set(hero, (distr.get(hero) || 0) + 1);
				}
			});
			distr.forEach((value, key) => data.push({x: Math.round(100.0 * value/numGames) + "%", y: value, name: key, color: this.getColor(key)}));
			data = data.sort((a, b) => a.y > b.y ? 1 : -1);
		}
		return (
			<div>
				<VictoryPie
					data={data}
					style={{
						data: {fill: (d) => d.color, strokeWidth: 2, transition: "transform .2s ease-in-out"},
						labels: {fill: "#FFFFFF", fontSize: 20},
					}}
					padding={{top: 70, bottom: 10, left: 80, right: 80}}
					padAngle={2}
					innerRadius={10}
					events={[{
						target: "data",
						eventHandlers: {
							onMouseOver: () => {
								return [{
									mutation: (props) => {
										this.setState({name: props.style.name, value: props.slice.value, pct: props.style.xName});
										return {
											style: Object.assign({}, props.style, {stroke: "white", transform: "scale(1.05)"})
										};
									}
								}]
							},
							onMouseOut: () => {
								this.setState({name: null})
								return [{
									mutation: () => null
								}];
							},
							onClick: () => {
								if (this.props.onPieceClicked) {
									this.props.onPieceClicked(this.state.name.toLowerCase());
								}
								return [{
									mutation: () => null
								}];
							}
						}
					}]}
				/>
				<h5 style={{textAlign: "center", marginTop: "-20px"}}>
					{(numGames && this.state.name ? this.state.name + ": " + this.state.value : "Total: " + numGames) + " Games" + (this.props.loadingGames ? " [Loading...]" : "")}
				</h5>
			</div>
		);
	}

	private getColor(hero: string): string {
		switch(hero) {
			case "Druid": return "#FF7D0A";
			case "Hunter": return "#ABD473";
			case "Mage": return "#69CCF0";
			case "Paladin": return "#F58CBA";
			case "Priest": return "#D2D2D2";
			case "Rogue": return "#FFF569";
			case "Shaman": return "#0070DE";
			case "Warlock": return "#9482C9";
			case "Warrior": return "#C79C6E";
		}
	}
}
