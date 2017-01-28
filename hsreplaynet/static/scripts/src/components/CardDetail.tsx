import * as React from "react";
import CardDetailLineChart from "./charts/CardDetailLineChart";
import CardDetailBarChart from "./charts/CardDetailBarChart";
import CardDetailGauge from "./charts/CardDetailGauge";
import CardDetailValue from "./charts/CardDetailValue";
import CardDetailPieChart from "./charts/CardDetailPieChart";
import CardDetailFilter from "./CardDetailFilter";
import LoadingIndicator from "./LoadingIndicator";
import TopCardsList from "./TopCardsList";
import {
	FilterData, Filter, FilterElement, FilterDefinition, KeyValuePair,
	Query, RenderData, ChartSeries, ChartSeriesMetaData, DataPoint} from "../interfaces";
import HearthstoneJSON from "hearthstonejson";

interface CardDetailState {
	queries?: Query[];
	renders?: Map<string, RenderData>;
	filterData?: FilterData;
	selectedFilters?: Map<string, string>;
	queryTime?: Date;
	fetching?: boolean;
	cardData?: Map<string, any>;
	card?: any;
}

interface CardDetailProps extends React.ClassAttributes<CardDetail> {
	cardId: string;
	isPremium: boolean;
}

export default class CardDetail extends React.Component<CardDetailProps, CardDetailState> {
	constructor(props: CardDetailProps, state: CardDetailState) {
		super(props, state);
		this.state = {
			queries: null,
			renders: new Map<string, RenderData>(),
			filterData: null,
			selectedFilters: new Map<string, string>(),
			queryTime: null,
			fetching: true,
			cardData: new Map<string, any>(),
			card: null,
		}

		this.fetchFilters();

		new HearthstoneJSON().getLatest((data) => {
			const map = new Map<string, any>();
			let thisCard = null;
			data.forEach(card => {
				map.set(card.id, card);
				if (card.id == this.props.cardId) {
					thisCard = card;
				}
			});
			this.setState({cardData: map, card: thisCard});
		});
	}

	mockCharts(): JSX.Element[] {
		return [
			<div style={{width: "250px", background: "rgba(0,0,255,0.1)", border: "2px solid rgba(0,0,255,0.5)", margin: "5px"}}>
				<CardDetailGauge
					data={[{data: [{x: "data", y: 2}, {x: "empty", y: 80}], name:"Used to kill Jaraxxus"}]}
					title="Used to kill Jaraxxus"
					/>
			</div>
		]
	}

	largeMockCharts(): JSX.Element[] {
		return [
			<div style={{background: "rgba(0,0,255,0.1)", border: "2px solid rgba(0,0,255,0.5)", margin: "5px", display: "flex", justifyContent: "center", padding: "5px", width: "500px"}}>
				<TopCardsList
					title="Top cards played on same turn"
					cardData={this.state.cardData}
					cardIds={["KAR_077", "KAR_075", "EX1_166"]}
				/>
			</div>,
			<div style={{background: "rgba(0,0,255,0.1)", border: "2px solid rgba(0,0,255,0.5)", margin: "5px", display: "flex", justifyContent: "center", padding: "5px", width: "500px"}}>
				<TopCardsList
					title="Most popular targets"
					cardData={this.state.cardData}
					cardIds={["KAR_077", "KAR_075", "EX1_166"]}
				/>
			</div>
		]
	}

	componentDidUpdate() {
		if (this.state.fetching) {
			window.setTimeout(() => this.forceUpdate(), 1000);
		}
	}

	render(): JSX.Element {
		const charts = [];
		const smallCharts = [];
		smallCharts.push(this.mockCharts());

		this.state.renders.forEach((data: RenderData, name: string) => {
			switch(data.render_as) {
				case "gauge":
					smallCharts.push(
						<div style={{width: "250px", background: "rgba(0,0,255,0.1)", border: "2px solid rgba(0,0,255,0.5)", margin: "5px"}}>
							<CardDetailGauge
								data={data.series}
								title={data.title}
							/>
						</div>
					);
					break;
				case "single_value":
					smallCharts.push(
						<div style={{width: "250px", background: "rgba(0,0,255,0.1)", border: "2px solid rgba(0,0,255,0.5)", margin: "5px"}}>
							<CardDetailValue
								data={data.series}
								title={data.title}
							/>
						</div>
					);
					break;
				case "class_pie_chart":
					smallCharts.push(
						<div style={{width: "250px", background: "rgba(0,0,255,0.1)", border: "2px solid rgba(0,0,255,0.5)", margin: "5px"}}>
							<CardDetailPieChart
								data={data.series}
								title={data.title}
							/>
						</div>
					);
					break;
				case "bar_chart":
					charts.push(<div style={{background: "rgba(0,0,255,0.1)", border: "2px solid rgba(0,0,255,0.5)", margin: "5px"}}>
						<CardDetailBarChart
							data={data.series}
							title={data.title}
							domainY={data.domain_y}
							domainX={data.domain_x}
							labelY={data.label_y}
							labelX={data.label_x}
					/></div>)
					break;
				case "line_chart":
					if (data.series[0].data.length === 0) {
						charts.push(<div style={{background: "rgba(0,0,255,0.1)", border: "2px solid rgba(0,0,255,0.5)", margin: "5px"}}>"Not enough data"</div>);
						break;
					}
					charts.push(<div style={{background: "rgba(0,0,255,0.1)", border: "2px solid rgba(0,0,255,0.5)", margin: "5px"}}>
						<CardDetailLineChart
							data={data.series}
							title={data.title}
							domainY={data.domain_y}
							domainX={data.domain_x}
							labelY={data.label_y}
							labelX={data.label_x}
					/></div>)
					break;
				case "list":
					const lines = [];
					lines.push(<h4>{data.title}</h4>)
					data.series[0].data.forEach(dataPoint => {
						lines.push(<span>{dataPoint.x + ": " + dataPoint.y}</span>)
					})
					charts.push(<div style={{border: "1px solid black"}}>{lines}</div>);
					break;
			}
		});


		charts.unshift(<div style={{display: "flex", justifyContent: "center"}}>
				{this.largeMockCharts()}
			</div>);
		if(smallCharts) {
			charts.unshift(<div style={{display: "flex", justifyContent: "center"}}>
				{smallCharts}
			</div>);
		}

		return <div className="row">
			<div className="col-lg-4" style={{textAlign: "center"}}>
				<img src={"http://media.services.zam.com/v1/media/byName/hs/cards/enus/" + this.props.cardId + ".png"} />
				<div className="row">
					<div className="col-lg-8 col-lg-offset-2" style={{paddingBottom: "20px", fontStyle: "italic"}}>
						{this.state.card ? this.state.card.flavor : ""}
					</div>
				</div>
				<div className="row">
					<div className="col-lg-10 col-lg-offset-1">
						<CardDetailFilter
							filterData={this.state.filterData}
							defaultSelection={this.state.selectedFilters}
							selectionChanged={(key, value) => {
								console.warn("RE-IMPLEMENT ME")
							}}
							premiumAvailable={this.props.isPremium}
						/>
					</div>
				</div>
			</div>
			<div className="col-lg-8" style={{paddingRight: "100px"}}>
				{this.buildLoadingBar()}
				{charts}
				<div style={{display: "flex", justifyContent: "center", paddingTop: "30px"}}>
					<LoadingIndicator height={20}/>
				</div>
			</div>
		</div>
	}

	buildLoadingBar(): JSX.Element {
		if (!this.state.fetching) {
			return null;
		}

		const duration = this.state.queries && this.state.queries[0].avg_query_duration_seconds || 60;
		const remaining =  this.state.queries && this.state.queryTime && duration - (new Date().getTime() - this.state.queryTime.getTime()) / 1000;

		if (!remaining || duration - remaining < 1) {
			return null;
		}
		if (!this.state.queries) {
			return <h2>Loading...</h2>;
		}

		const percent = remaining && Math.round((duration - remaining) / duration * 100);

		return <div>
			<h2>{"Loading... (" + percent + "%)"}</h2>
			<div className="progress">
				<div className="progress-bar" role="progressbar" aria-valuenow={percent} aria-valuemin="0" aria-valuemax="100" style={{width:percent + "%"}}>
					<span className="sr-only">foo</span>
				</div>
			</div>
		</div>;
	}

	fetchFilters(): void {
		fetch("https://dev.hsreplay.net/analytics/filters", {
			credentials: "include",
		}).then((response) => {
			return response.json();
		}).then((json: any) => {
			const defaultFilters = new Map<string, string>();
			const data = json as FilterData;
			data.filters.forEach(filter => {
				defaultFilters.set(filter.name, filter.elements.find(x => x.is_default).name);
			})
			defaultFilters.set("TimeRange", "CURRENT_SEASON");
			this.setState({filterData: json, selectedFilters: defaultFilters})
			this.fetchQueries();
		});
	}

	fetchQueries(): void {
		fetch("https://dev.hsreplay.net/analytics/inventory/card/" + this.props.cardId, {
			credentials: "include",
		}).then((response) => {
			return response.json();
		}).then((json: any) => {
			console.log("received queries for", this.props.cardId, ":", json.map(x => x.endpoint));
			this.state.queries = json;
			this.setState({fetching: true, queryTime: new Date()})
			this.state.queries.filter(x => x.avg_query_duration_seconds).forEach(query => {
				this.fetchQuery(query);
			})
			this.state.queries.filter(x => !x.avg_query_duration_seconds).forEach(query => {
				this.fetchQuery(query);
			})
		});
	}

	fetchQuery(query: Query): void {
		if (query.endpoint === "/analytics/query/single_card_winrate_when_drawn_by_turn") {
			console.warn("SKIPPING", query.endpoint)
			return;
		}
		let url = "https://dev.hsreplay.net" + query.endpoint + "?"
			+ query.params.map(param => param+ "=" + this.resolveParam(param))
				.reduce((prev, curr) => prev + "&" + curr);
		console.log("Fetching", query.endpoint);
		fetch(url, {
			credentials: "include"
		}).then((response) => {
			return response.json();
		}).then((json: any) => {
			this.setState({
				renders: this.state.renders.set(query.endpoint, json),
				fetching: false
			});
		}).catch(() => {
			this.setState({fetching: false})
		});
	}

	resolveParam(param: string): string {
		if (param === "card_id") {
			return this.props.cardId;
		}
		return this.state.selectedFilters.get(param);
	}
}
