import * as React from "react";
import * as _ from "lodash";
import {AutoSizer} from "react-virtualized";
import WinrateLineChart from "./WinrateLineChart";
import { commaSeparate, winrateData } from "../../helpers";

interface WinrateTileState {
	games?: number;
	winrate?: number;
}

interface WinrateTileProps extends React.ClassAttributes<WinrateTile> {
	archetypeId: number;
	chartData?: any;
	matchupData?: any;
	onClick?: () => void;
	tabName?: string;
}

export default class WinrateTile extends React.Component<WinrateTileProps, WinrateTileState> {
	constructor(props: WinrateTileProps, state: WinrateTileState) {
		super(props, state);
		this.state = {
			games: null,
			winrate: null,
		};
	}

	componentWillReceiveProps(nextProps: WinrateTileProps) {
		if (nextProps.matchupData && !_.isEqual(this.props.matchupData, nextProps.matchupData)) {
			const data = nextProps.matchupData.series.metadata["" + this.props.archetypeId];
			if (data) {
				this.setState({games: data.total_games, winrate: data.win_rate});
			}
		}
	}

	render(): JSX.Element {
		let chart = null;
		if (this.props.chartData) {
			chart = (
				<AutoSizer>
					{({width}) => (
						<WinrateLineChart
							data={this.props.chartData}
							height={50}
							width={width}
						/>
					)}
				</AutoSizer>
			);
		}

		let winrate = null;
		if (this.state.winrate !== null) {
			const wrData = winrateData(50, this.state.winrate, 3);
			winrate = (
				<h1 style={{color: wrData.color}}>
					{this.state.winrate}%
				</h1>
			);
		}

		let games = null;
		if (this.state.games !== null) {
			games = <h3>over {commaSeparate(this.state.games)} games</h3>;
		}

		return (
			<div className="col-xs-12 col-sm-6 col-md-4 col-lg-3">
				<a
					className="tile winrate-tile"
					href={"#tab=" + this.props.tabName}
					onClick={(event) => {
						event.preventDefault();
						this.props.onClick();
					}}
				>
					<div className="tile-title">
						Winrate
					</div>
					<div className="tile-content">
						{winrate}
						{games}
					</div>
					<div className="tile-chart">
						{chart}
					</div>
				</a>
			</div>
		);
	}
}
