import * as React from "react";
import ClassIcon from "../ClassIcon";
import { TableData, ChartSeries } from "../../interfaces";
import PopularityReportFilter from "./PopularityReportFilter";
import CardTile from "../CardTile";
import ClassFilter from "../ClassFilter";
import CardDetailPieChart from "../charts/CardDetailPieChart";
import CardDetailBarChart from "../charts/CardDetailBarChart";
import {setNames, toTitleCase} from "../../helpers";

interface PopularityReportState {
	topCardsIncluded?: TableData;
	topCardsPlayed?: TableData;
	selectedClasses?: Map<string, boolean>;
	numRowsVisible?: number;
	error?: boolean;
}

interface PopularityReportProps extends React.ClassAttributes<PopularityReport> {
	cardData: Map<string, any>;
}

export default class PopularityReport extends React.Component<PopularityReportProps, PopularityReportState> {
	constructor(props: PopularityReportProps, state: PopularityReportState) {
		super(props, state);
		this.state = {
			topCardsIncluded: null,
			topCardsPlayed: null,
			selectedClasses: null,
			numRowsVisible: 15,
			error: false,
		}
		this.fetch();
	}

	render(): JSX.Element {
		const showMoreButton = this.state.numRowsVisible >= 100 ? null
			: <button className="btn btn-default"
			type="button"
			onClick={() => this.setState({numRowsVisible: this.state.numRowsVisible * 2})}>
			{"Show more..."}
		</button>;

		const chartSeries = this.buildChartSeries();
		const rarityChart = chartSeries[0] && <CardDetailPieChart title="Rarity" data={[chartSeries[0]]}/>
		const typeChart = chartSeries[1] && <CardDetailPieChart title="Type" data={[chartSeries[1]]}/>
		const setChart = chartSeries[2] && <CardDetailPieChart title="Set" data={[chartSeries[2]]}/>
		const costChart = chartSeries[3] && <CardDetailPieChart title="Cost" data={[chartSeries[3]]}/>

		const content = [
			<div className="col-lg-4 col-md-3 col-sm-4 col-xs-12">
				<h2 stle={{textAlign: "center"}}>Breakdown</h2>
				<div className ="row">
					<div className="col-lg-6 col-md-12 col-sm-12 col-xs-12" style={{paddingLeft: 0, paddingRight: 0}}>
						<div style={{maxWidth: "250px", margin: "0 auto"}}>
							{rarityChart}
						</div>
					</div>
					<div className="col-lg-6 col-md-12 col-sm-12 col-xs-12" style={{paddingLeft: 0, paddingRight: 0}}>
						<div style={{maxWidth: "250px", margin: "0 auto"}}>
							{typeChart}
						</div>
					</div>
				</div>
				<div className ="row">
					<div className="col-lg-6 col-md-12 col-sm-12 col-xs-12" style={{paddingLeft: 0, paddingRight: 0}}>
						<div style={{maxWidth: "250px", margin: "0 auto"}}>
							{setChart}
						</div>
					</div>
					<div className="col-lg-6 col-md-12 col-sm-12 col-xs-12" style={{paddingLeft: 0, paddingRight: 0}}>
						<div style={{maxWidth: "250px", margin: "0 auto"}}>
							{costChart}
						</div>
					</div>
				</div>
			</div>,
			<div className="col-lg-8 col-md-9 col-sm-8 col-xs-12">
				<div className="row">
					<div className="col-lg-6 col-md-6 col-sm-12 col-xs-12">
						<h2 style={{textAlign: "center"}}>Most included cards</h2>
						<div>
							{this.buildTable(this.state.topCardsIncluded, this.state.topCardsPlayed)}
						</div>
					</div>
					<div className="col-lg-6 col-md-6 col-sm-12 col-xs-12">
						<h2 style={{textAlign: "center"}}>Most played cards</h2>
						<div>
							{this.buildTable(this.state.topCardsPlayed, this.state.topCardsIncluded)}
						</div>
					</div>
				</div>
				<div className="row" style={{display: "flex", justifyContent: "center"}}>
					{showMoreButton}
				</div>
			</div>
		];

		return <div className="report-container" id="card-popularity-report">
			<div className="row" style={{marginTop: "50px"}}>
				<div className="col-lg-12" style={{textAlign: "center"}}>
					<h1>Card Popularity: Ranked Standard</h1>
				</div>
				<div className="col-md-12" style={{display: "flex", justifyContent: "center"}}>
					<button type="button" className="btn btn-default" style={{height: "30px"}}>
						<span className="glyphicon glyphicon-backward"/>
					</button>
						<div style={{width: "200px", fontSize: "22px", lineHeight: "30px", textAlign: "center"}}>
							{new Date().toDateString()}
						</div>
					<button type="button" className="btn btn-default disabled" style={{height: "30px"}}>
						<span className="glyphicon glyphicon-forward"/>
					</button>
				</div>
				<div className="col-md-12" style={{display: "flex", justifyContent: "center", paddingTop: "5px"}}>
					<span>
						{this.state.topCardsPlayed ? ("Based on " + this.state.topCardsPlayed.series.metadata.total_games + " replays") : null}
					</span>
				</div>
				<div className="col-md-12" style={{display: "flex", justifyContent: "center", paddingTop: "5px"}}>
					<ClassFilter
						filters="AllNeutral"
						selectionChanged={(selected) => this.setState({selectedClasses: selected})}
						multiSelect={false}
						filterStyle="icon"
						/>
				</div>
			</div>
			<div className="row">
				{content}
			</div>
		</div>;
	}

	buildChartSeries(): ChartSeries[] {
		const chartSeries = [];

		if (this.props.cardData && this.state.topCardsIncluded) {
			const selectedClass = this.getSelectedClass();
			const rows = this.state.topCardsIncluded.series.data[selectedClass];
			const data = {rarity: {}, cardtype: {}, cardset: {}, cost: {}};
			const totals = {rarity: 0, cardtype: 0, cardset: 0, cost: 0};
			rows.forEach(row => {
				const card = this.props.cardData.get(row["card_id"])
				const value = +row["popularity"]
				data["rarity"][card.rarity] = (data["rarity"][card.rarity] || 0) + value;
				totals["rarity"] += value;
				data["cardtype"][card.type] = (data["cardtype"][card.type] || 0) + value;
				totals["cardtype"] += value;
				data["cardset"][card.set] = (data["cardset"][card.set] || 0) + value;
				totals["cardset"] += value;
				const cost = ""+Math.min(7, card.cost);
				data["cost"][cost] = (data["cost"][cost] || 0) + value;
				totals["cost"] += value;
			});
			Object.keys(data).forEach(name => {
				const series = {
					name: name,
					data: [],
					metadata: {
						chart_scheme: name
					}
				}
				Object.keys(data[name]).forEach(value => {
					series.data.push({x: value.toLowerCase(), y: Math.ceil(100.0 * data[name][value] / totals[name])});
				})
				chartSeries.push(series);
			})
		}
		return chartSeries;
	}

	buildTable(tableData: TableData, previous: TableData): JSX.Element {
		const cardRows = [];
		if (this.props.cardData) {
			if (tableData) {
				const selectedClass = this.getSelectedClass();
				const rows = tableData.series.data[selectedClass];
				const prevRows = previous && previous.series.data[selectedClass];
				if (rows) {
					rows.slice(0, this.state.numRowsVisible).forEach(row => {
						const card = this.props.cardData.get(row["card_id"])
						let tendency = 0;
						if (prevRows) {
							const prev = prevRows.find(prev => prev["card_id"] == row["card_id"]);
							if (prev) {
								tendency = +prev["rank"] - +row["rank"];
							}
						}
						cardRows.push(
							this.buildCardRow(card, row["popularity"], row["rank"], tendency)
						)
					})
				}
			}
		}
		return <table className="table table-striped">
			<thead>
			<tr>
				<th>Rank</th>
				<th>Card</th>
				<th>Popularity</th>
			</tr>
			</thead>
			<tbody>
				{cardRows}
			</tbody>
		</table>;
	}

	buildCardRow(card: any, popularity: string, rank: string, tendency: number): JSX.Element {
		const tendencyStr = tendency === 0 ? "    " : (tendency > 0 ? "▲" : "▼");
		const title = tendency === 0 ? "" : (tendency > 0 ? "up from yesterday" : "down from yesterday");
		const digits = Math.min(Math.max(0, Math.floor(Math.log10(1/+popularity))), 2) + 2;
		return <tr>
			<td style={{lineHeight: "19px", fontWeight: "bold"}} title={title}>
				<span style={{color:tendency === 0 ? "black" : (tendency > 0 ? "green" : "red"), whiteSpace: "pre"}}>
					{tendencyStr}
				</span>
				{"#" + rank}
			</td>
			<td style={{lineHeight: "19px"}}>
				<div style={{width: "217px", marginTop: "-9px", marginBottom: "-9px"}}>
					<CardTile height={34} card={card} count={1} rarityColored />
				</div>
			</td>
			<td style={{lineHeight: "19px", fontWeight: "bold"}}>
				{(+popularity).toFixed(digits) + "%"}
			</td>
		</tr>;
	}
	fetch(): void {
		fetch(
			"/analytics/report/card_included_popularity_report"
		).then((response) => {
			return response.json();
		}).then((json: any) => {
			this.setState({topCardsIncluded: json})
		});
		fetch(
			"/analytics/report/card_played_popularity_report"
		).then((response) => {
			return response.json();
		}).then((json: any) => {
			this.setState({topCardsPlayed: json})
		});
	}

	getSelectedClass(): string {
		let selectedClass = "ALL";
		this.state.selectedClasses.forEach((value, key) => {
			if(value) {
				selectedClass = key;
			}
		})
		return selectedClass;
	}

}
