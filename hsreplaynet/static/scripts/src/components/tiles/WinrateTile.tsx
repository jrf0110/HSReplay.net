import * as React from "react";
import {AutoSizer} from "react-virtualized";
import WinrateLineChart from "./WinrateLineChart";
import {commaSeparate, winrateData} from "../../helpers";

interface WinrateTileProps extends React.ClassAttributes<WinrateTile> {
	chartData?: any;
	games?: number;
	href: string;
	onClick?: () => void;
	winrate?: number;
}

export default class WinrateTile extends React.Component<WinrateTileProps, void> {
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

		let content = null;
		if (this.props.winrate !== undefined && this.props.games !== undefined) {
			const wrData = winrateData(50, this.props.winrate, 3);
			content = [
				<h1 style={{color: wrData.color}}>
					{this.props.winrate}%
				</h1>,
				<h3>over {commaSeparate(this.props.games)} games</h3>,
			];
		}

		return (
			<div className="col-xs-12 col-sm-6 col-md-4 col-lg-3">
				<a
					className="tile winrate-tile"
					href={this.props.href}
					onClick={(event) => {
						if (this.props.onClick) {
							event.preventDefault();
							this.props.onClick();
						}
					}}
				>
					<div className="tile-title">
						Winrate
					</div>
					<div className="tile-content">
						{content}
					</div>
					<div className="tile-chart">
						{chart}
					</div>
				</a>
			</div>
		);
	}
}
