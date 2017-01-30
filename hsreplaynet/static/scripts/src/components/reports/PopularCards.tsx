import * as React from "react";
import ClassIcon from "../ClassIcon";
import { TableData, ChartSeries } from "../../interfaces";
import CardTile from "../CardTile";
import ClassFilter from "../ClassFilter";
import CardDetailPieChart from "../charts/CardDetailPieChart";
import CardDetailBarChart from "../charts/CardDetailBarChart";
import LoadingIndicator from "../LoadingIndicator";
import {setNames, toTitleCase} from "../../helpers";

interface PopularCardsState {
	topCardsIncluded?: Map<string, TableData>;
	topCardsPlayed?: Map<string, TableData>;
	selectedClasses?: Map<string, boolean>;
	numRowsVisible?: number;
	error?: string;
	availableIncludedDates?: string[];
	availablePlayedDates?: string[];
	availableDates?: string[]
	index?: number;
}

interface PopularCardsProps extends React.ClassAttributes<PopularCards> {
	cardData: Map<string, any>;
}

export default class PopularCards extends React.Component<PopularCardsProps, PopularCardsState> {
	constructor(props: PopularCardsProps, state: PopularCardsState) {
		super(props, state);
		this.state = {
			topCardsIncluded: new Map<string, TableData>(),
			topCardsPlayed: new Map<string, TableData>(),
			selectedClasses: null,
			numRowsVisible: 12,
			error: null,
			availableIncludedDates: null,
			availablePlayedDates: null,
			availableDates: [],
			index: 0,
		}
		this.fetchAvailableDates();
	}

	fetchAvailableDates() {
		fetch(
			"https://dev.hsreplay.net/analytics/available-data/card_played_popularity_report"
		).then((response) => {
			return response.json();
		}).then((json: any) => {
			this.state.availablePlayedDates = json;
			this.buildAvailableDates();
		}).catch((reason: any) => this.fetchingError());
		fetch(
			"https://dev.hsreplay.net/analytics/available-data/card_included_popularity_report"
		).then((response) => {
			return response.json();
		}).then((json: any) => {
			this.state.availableIncludedDates = json;
			this.buildAvailableDates();
		}).catch((reason: any) => this.fetchingError());
	}

	buildAvailableDates() {
		if (this.state.availableIncludedDates && this.state.availablePlayedDates) {
			const availableDates = this.state.availableIncludedDates.filter(x => this.state.availablePlayedDates.indexOf(x) !== -1);
			if (availableDates.length === 0) {
				this.setState({error: "No data available. Please check back later."});
			}
			else {
				this.state.availableDates = availableDates;
				this.loadDate(0);
			}
		}
	}

	loadDate(index: number) {
		const date = this.state.availableDates.length > index && this.state.availableDates[index];
		const prevDate = this.state.availableDates.length + 1 > index && this.state.availableDates[index + 1];
		const hasDate = this.state.topCardsPlayed.has(date) || this.state.topCardsIncluded.has(date);
		const hasPrevDate = this.state.topCardsPlayed.has(prevDate) || this.state.topCardsIncluded.has(prevDate);
		if (!hasDate) {
			this.fetchDate(index);
		}
		if (!hasPrevDate) {
			this.fetchDate(index + 1);
		}
	}

	fetchDate(index: number) {
		if (this.state.availableDates.length <= index) {
			return;
		}
		const date = this.state.availableDates[index];

		fetch(
			"https://dev.hsreplay.net/analytics/query/card_played_popularity_report?query_date=" + date
		).then((response) => {
			return response.json();
		}).then((json: any) => {
			this.setState({topCardsPlayed: this.state.topCardsPlayed.set(date, json)})
		}).catch((reason: any) => this.fetchingError());
		fetch(
			"https://dev.hsreplay.net/analytics/query/card_included_popularity_report?query_date=" + date
		).then((response) => {
			return response.json();
		}).then((json: any) => {
			this.setState({topCardsIncluded: this.state.topCardsIncluded.set(date, json)})
		}).catch((reason: any) => this.fetchingError());
	}

	fetchingError() {
		this.setState({error: "Oops. We seem to be having some technical difficulties. Please try again later."});
	}

	render(): JSX.Element {
		const showMoreButton = this.state.numRowsVisible >= 100 ? null
			: <button className="btn btn-default"
			type="button"
			onClick={() => this.setState({numRowsVisible: Math.max(15, this.state.numRowsVisible) * 2})}>
			{"Show more..."}
		</button>;

		const date = this.state.availableDates.length > this.state.index &&  this.state.availableDates[this.state.index];
		const prevDate = this.state.availableDates.length + 1 > this.state.index && this.state.availableDates[this.state.index + 1];
		const topCardsIncluded = date && this.state.topCardsIncluded.get(date);
		const topCardsPlayed = date && this.state.topCardsPlayed.get(date);
		const prevTopCardsIncluded = prevDate && this.state.topCardsIncluded.get(prevDate);
		const prevTopCardsPlayed = prevDate && this.state.topCardsPlayed.get(prevDate);
		const loaded = topCardsIncluded && topCardsPlayed;

		let content = null;

		if (this.state.error) {
			content = <div className="error-message">
				<h3>{this.state.error}</h3>
			</div>;
		}
		else if (!loaded) {
			content = <div className="loading-message">
				<h3>Loading...</h3>
				<div className="loading-wrapper">
					<LoadingIndicator height={20}/>
				</div>
			</div>;
		}
		else {
			const chartSeries = this.buildChartSeries(topCardsIncluded);
			const rarityChart = chartSeries[0] && <CardDetailPieChart title="Rarity" data={[chartSeries[0]]}/>
			const typeChart = chartSeries[1] && <CardDetailPieChart title="Type" data={[chartSeries[1]]}/>
			const setChart = chartSeries[2] && <CardDetailPieChart title="Set" data={[chartSeries[2]]}/>
			const costChart = chartSeries[3] && <CardDetailPieChart title="Cost" data={[chartSeries[3]]}/>
			content = [
				<div className ="row">
					<div className="chart-column col-lg-3 col-md-3 col-sm-6 col-xs-6">
						<div className="chart-wrapper">
							{rarityChart}
						</div>
					</div>
					<div className="chart-column col-lg-3 col-md-3 col-sm-6 col-xs-6">
						<div className="chart-wrapper">
							{typeChart}
						</div>
					</div>
					<div className="chart-column col-lg-3 col-md-3 col-sm-6 col-xs-6">
						<div className="chart-wrapper">
							{setChart}
						</div>
					</div>
					<div className="chart-column col-lg-3 col-md-3 col-sm-6 col-xs-6">
						<div className="chart-wrapper">
							{costChart}
						</div>
					</div>
				</div>,
				<div className="row">
					<div className="table-wrapper col-lg-6 col-md-6 col-sm-12 col-xs-12">
						<h2>Most included cards</h2>
						<div>
							{this.buildTable(topCardsIncluded, prevTopCardsIncluded)}
						</div>
					</div>
					<div className="table-wrapper col-lg-6 col-md-6 col-sm-12 col-xs-12">
						<h2>Most played cards</h2>
						<div>
							{this.buildTable(topCardsPlayed, prevTopCardsPlayed)}
						</div>
					</div>
				</div>,
				<div className="button-more-wrapper row">
					{showMoreButton}
				</div>
			];
		}

		let numGames = 0;
		if (topCardsPlayed) {
			numGames = topCardsPlayed.series.metadata.total_games;
			const divisor = 10 ** (Math.floor(Math.log10(numGames)) - 1);
			numGames = Math.floor(numGames / divisor) * divisor;
		}

		const hasNext = this.state.index > 0;
		const hasPrevious = this.state.index < this.state.availableDates.length - 1;
		const previousClassName = "btn btn-default" + (hasPrevious ? "" : " disabled");
		const nextClassName = "btn btn-default" + (hasNext ? "" : " disabled");

		const loadPrevious = () => {
			if (hasPrevious) {
				const nextIndex = this.state.index + 1;
				this.setState({index: nextIndex});
				this.loadDate(nextIndex);
				this.loadDate(nextIndex + 1);
			}
		}
		const loadNext = () => {
			if (hasNext) {
				const nextIndex = this.state.index - 1;
				this.setState({index: nextIndex});
				this.loadDate(nextIndex);
			}
		}

		return <div className="report-container" id="card-popularity-report">
			<div className="row">
				<div className="info-column col-lg-4">
					<img className="title-card" src={STATIC_URL + "images/title-cards/ranked-standard-popularity.png"}/>
					<div className="controls-wrapper row">
						<div className="date-control-wrapper col-md-12">
							<button type="button" className={previousClassName} onClick={loadPrevious}>
								<span className="glyphicon glyphicon-chevron-left"/>
							</button>
							<div>
								{date}
							</div>
							<button type="button" className={nextClassName} onClick={loadNext}>
								<span className="glyphicon glyphicon-chevron-right"/>
							</button>
						</div>
						<div className="col-md-12">
							{!this.state.error && loaded ? ("Based on " + this.commaSeparate(numGames) + " replays") : null}
						</div>
						<div className="col-md-12">
							<ClassFilter
								filters="AllNeutral"
								selectionChanged={(selected) => this.setState({selectedClasses: selected})}
								multiSelect={false}
								filterStyle="icon"
								/>
						</div>
					</div>
					<div className="ad-wrapper">
					</div>
				</div>
				<div className="content-wrapper col-lg-8">
					{content}
				</div>
			</div>
			<div className="row">
			</div>
		</div>;
	}

	commaSeparate(num: number): string {
		return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
	}

	buildChartSeries(topCardsIncluded: TableData): ChartSeries[] {
		const chartSeries = [];

		if (this.props.cardData && this.state.topCardsIncluded) {
			const selectedClass = this.getSelectedClass();
			const rows = topCardsIncluded.series.data[selectedClass];
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
						const card = this.props.cardData.get(row["card_id"]);
						let tendency = 0;
						if (prevRows) {
							const prev = prevRows.find(prev => prev["card_id"] == row["card_id"]);
							if (prev) {
								tendency = +prev["rank"] - +row["rank"];
							}
						}
						cardRows.push(
							this.buildCardRow(card, row["popularity"], row["rank"], tendency)
						);
					})
				}
			}
		}
		return <table className="table table-striped">
			<thead>
			<tr>
				<th>Rank</th>
				<th>Card</th>
				<th className="hidden-xs">Popularity</th>
				<th className="visible-xs">Pop.</th>
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
		return <tr className="card-table-row">
			<td className="rank-cell">
				<span style={{color:tendency === 0 ? "black" : (tendency > 0 ? "green" : "red")}}>
					{tendencyStr}
				</span>
				{"#" + rank}
			</td>
			<td>
				<div className="card-wrapper">
					<CardTile height={34} card={card} count={1} rarityColored />
				</div>
			</td>
			<td style={{lineHeight: "19px", fontWeight: "bold"}}>
				{(+popularity).toFixed(digits) + "%"}
			</td>
		</tr>;
	}

	getSelectedClass(): string {
		let selectedClass = "ALL";
		this.state.selectedClasses.forEach((value, key) => {
			if(value) {
				selectedClass = key;
			}
		});
		return selectedClass;
	}
}
