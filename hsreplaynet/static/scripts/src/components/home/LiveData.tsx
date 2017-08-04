import * as React from "react";
import CardTile from "../CardTile";
import CardData from "../../CardData";
import AnimatedList from "./AnimatedList";
import DataManager from "../../DataManager";
import { getHeroCardId, toDynamicFixed, toTitleCase } from "../../helpers";

const enum Step {
	WAITING,
	EXPAND,
	SORT,
	TRIM,
}

interface LiveDataState {
	cursor: number;
	arenaData: any[];
	standardData: any[];
	wildData: any[];
	arenaClasses: any[];
	standardClasses: any[];
	wildClasses: any[];
}

interface LiveDataProps extends React.ClassAttributes<LiveData> {
	cardData: CardData;
}

const TILE_HEIGHT = 34;
const ROW_PADDING = 2;
const ROW_HEIGHT = TILE_HEIGHT + ROW_PADDING;

export default class LiveData extends React.Component<LiveDataProps, LiveDataState> {
	constructor(props: LiveDataProps, state: LiveDataState) {
		super(props, state);
		this.state = {
			cursor: 0,
			arenaData: [],
			standardData: [],
			wildData: [],
			arenaClasses: [],
			standardClasses: [],
			wildClasses: [],
		};

		this.fetchData();
		this.updateCursor();
	}

	fetchData() {
		DataManager.get("/live/distributions/played_cards/BGT_RANKED_STANDARD").then((response) => {
			const standardData = response.data;
			standardData.sort((a, b) => a.ts - b.ts);
			this.setState({standardData, cursor: 0});
		});
		DataManager.get("/live/distributions/played_cards/BGT_RANKED_WILD").then((response) => {
			const wildData = response.data;
			wildData.sort((a, b) => a.ts - b.ts);
			this.setState({wildData, cursor: 0});
		});
		DataManager.get("/live/distributions/played_cards/BGT_ARENA").then((response) => {
			const arenaData = response.data;
			arenaData.sort((a, b) => a.ts - b.ts);
			this.setState({arenaData, cursor: 0});
		});
		DataManager.get("/live/distributions/player_class/BGT_ARENA").then((response) => {
			const arenaClasses = response.data;
			arenaClasses.sort((a, b) => a.ts - b.ts);
			this.setState({arenaClasses, cursor: 0});
		});
		DataManager.get("/live/distributions/player_class/BGT_RANKED_STANDARD").then((response) => {
			const standardClasses = response.data;
			standardClasses.sort((a, b) => a.ts - b.ts);
			this.setState({standardClasses, cursor: 0});
		});
		DataManager.get("/live/distributions/player_class/BGT_RANKED_WILD").then((response) => {
			const wildClasses = response.data;
			wildClasses.sort((a, b) => a.ts - b.ts);
			this.setState({wildClasses, cursor: 0});
		});
	}

	updateCursor() {
		const {cursor, standardData} = this.state;
		if (standardData.length > cursor + 1) {
			this.setState({cursor: cursor + 1});
		}
		setTimeout(() => this.updateCursor(), 2000);
	}

	render(): JSX.Element {
		const standardItems = this.getListObject(this.state.standardData);
		const wildItems = this.getListObject(this.state.wildData);
		const arenaItems = this.getListObject(this.state.arenaData);
		const arenaClasses = this.getClassListObject(this.state.arenaClasses);
		const standardClasses = this.getClassListObject(this.state.standardClasses);
		const wildClasses = this.getClassListObject(this.state.wildClasses);
		return (
			<div className="container">
				<div className="row">
					<div className="col-sm-12 col-md-4">
						<h4>Standard</h4>
						<AnimatedList rowHeight={34} items={standardItems}/>
					</div>
					<div className="col-sm-12 col-md-4">
						<h4>Wild</h4>
						<AnimatedList rowHeight={34} items={wildItems}/>
					</div>
					<div className="col-sm-12 col-md-4">
						<h4>Arena</h4>
						<AnimatedList rowHeight={34} items={arenaItems}/>
					</div>
				</div>
				<div className="row">
					<div className="col-sm-12 col-md-4">
						<h4>Standard</h4>
						<AnimatedList rowHeight={34} items={standardClasses}/>
					</div>
					<div className="col-sm-12 col-md-4">
						<h4>Wild</h4>
						<AnimatedList rowHeight={34} items={wildClasses}/>
					</div>
					<div className="col-sm-12 col-md-4">
						<h4>Arena</h4>
						<AnimatedList rowHeight={34} items={arenaClasses}/>
					</div>
				</div>
			</div>
		);
	}

	getListObject(queryData: any) {
		const items = [];
		if (this.props.cardData && queryData.length) {
			const data = queryData[this.state.cursor].data;
			const dataList = Object.keys(data).map((dbfId) => ({dbfId, games: data[dbfId]}));
			dataList.sort((a, b) => b.games - a.games);
			dataList.slice(0, 6).forEach(({dbfId, games}) => {
				const card = this.props.cardData.fromDbf(dbfId);
				items.push({
					item: [
						<CardTile card={card} height={34} count={1}/>,
						<span>{games} times played</span>,
					],
					key: "" + dbfId,
				});
			});
		}
		return items;
	}

	getClassListObject(queryData: any) {
		const items = [];
		if (this.props.cardData && queryData.length) {
			const data = queryData[this.state.cursor].data;
			const dataList = Object.keys(data).map((playerClass) => ({playerClass, games: data[playerClass].games, wins: data[playerClass].wins}));
			dataList.sort((a, b) => b.games - a.games);
			dataList.slice(0, 6).forEach(({playerClass, games, wins}) => {
				const card = this.props.cardData.fromCardId(getHeroCardId(playerClass, true));
				const winrate = toDynamicFixed(100 * wins / games);
				items.push({
					item: [
						// <span className={"player-class " + playerClass.toLowerCase()}>{toTitleCase(playerClass)}</span>,
						<CardTile card={card} height={34} count={1} customText={toTitleCase(playerClass)} hideGem disableTooltip/>,
						<span>{games} games</span>,
						<span>{winrate}%</span>,
					],
					key: playerClass,
				});
			});
		}
		return items;
	}
}
