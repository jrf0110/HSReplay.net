import * as React from "react";
import {AutoSizer} from "react-virtualized";
import WinrateLineChart from "./WinrateLineChart";
import { winrateData } from "../../helpers";

interface WinrateTileState {
}

interface WinrateTileProps extends React.ClassAttributes<WinrateTile> {
	chartData?: any;
	onClick?: () => void;
	tabName?: string;
	winrate: number;
}

export default class WinrateTile extends React.Component<WinrateTileProps, WinrateTileState> {
	constructor(props: WinrateTileProps, state: WinrateTileState) {
		super(props, state);
		this.state = {
		};
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
		if (this.props.winrate) {
			const wrData = winrateData(50, this.props.winrate, 3);
			winrate = (
				<h1 style={{color: wrData.color}}>
					{this.props.winrate}%
				</h1>
			);
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
					</div>
					<div className="tile-chart">
						{chart}
					</div>
				</a>
			</div>
		);
	}
}
