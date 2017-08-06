import * as React from "react";
import * as _ from "lodash";
import CardTile from "../CardTile";
import CardData from "../../CardData";
import AnimatedList from "./AnimatedList";
import DataManager from "../../DataManager";
import { getHeroCardId, toDynamicFixed, toTitleCase } from "../../helpers";

interface LiveDataState {
	cursor: number;
	arenaData: any[];
	standardData: any[];
	wildData: any[];
	doUpdate?: boolean;
}

interface LiveDataProps extends React.ClassAttributes<LiveData> {
	cardData: CardData;
}

export default class LiveData extends React.Component<LiveDataProps, LiveDataState> {
	constructor(props: LiveDataProps, state: LiveDataState) {
		super(props, state);
		this.state = {
			arenaData: [],
			cursor: 0,
			doUpdate: true,
			standardData: [],
			wildData: [],
		};

		this.fetchData();
		this.updateCursor();
	}

	fetchData() {
		[
			["BGT_ARENA", "arenaData"],
			["BGT_RANKED_STANDARD", "standardData"],
			["BGT_RANKED_WILD", "wildData"],
		].forEach(([gameType, stateName]) => {
			DataManager.get("/live/distributions/played_cards/" + gameType, undefined , true).then((response) => {
				const data = response.data;
				if (data.some((d) => _.isEmpty(d.data))) {
					this.setState({doUpdate: false});
					return;
				}
				data.sort((a, b) => a.ts - b.ts);
				const newState = {cursor: 0};
				newState[stateName] = data;
				this.setState(newState);
			});
		});
	}

	updateCursor() {
		if (!this.state.doUpdate) {
			return;
		}
		const {cursor, standardData} = this.state;
		if (standardData.length > cursor + 1) {
			this.setState({cursor: cursor + 1});
		}
		if (cursor === standardData.length - 2) {
			this.fetchData();
		}
		setTimeout(() => this.updateCursor(), 5000);
	}

	render(): JSX.Element {
		if (!this.state.doUpdate) {
			return null;
		}
		const standardItems = this.getListItems(this.state.standardData, "standard");
		const wildItems = this.getListItems(this.state.wildData, "wild");
		const arenaItems = this.getListItems(this.state.arenaData, "arena");
		return (
			<div className="container">
				<header>
					<h4><strong>Cards played</strong> by game mode over the last <strong>5 minutes</strong>:</h4>
				</header>
				<div className="row">
					<div className="col-sm-12 col-md-4">
						<h4>
							<strong>
								<img
									className="mode-icon"
									src={STATIC_URL + "images/standard_icon.svg"}
								/>
								&nbsp;Ranked Standard
							</strong>
						</h4>
						<AnimatedList rowHeight={34} items={standardItems} key="standard" />
					</div>
					<div className="col-sm-12 col-md-4">
						<h4>
							<strong>
								<img
									className="mode-icon"
									src={STATIC_URL + "images/wild_icon.svg"}
								/>
								&nbsp;Ranked Wild
							</strong>
						</h4>
						<AnimatedList rowHeight={34} items={wildItems} key="wild"/>
					</div>
					<div className="col-sm-12 col-md-4">
						<h4>
							<strong>
								<img
									className="mode-icon"
									src={STATIC_URL + "images/arena_icon.svg"}
								/>
								&nbsp;Arena
							</strong>
						</h4>
						<AnimatedList rowHeight={34} items={arenaItems} key="arena"/>
					</div>
				</div>
			</div>
		);
	}

	getListItems(queryData: any, id: string) {
		const items = [];
		if (this.props.cardData && queryData.length) {
			const data = queryData[this.state.cursor].data;
			const dataList = Object.keys(data).map((dbfId) => ({dbfId, games: data[dbfId]}));
			dataList.sort((a, b) => b.games - a.games);
			dataList.slice(0, 6).forEach(({dbfId, games}) => {
				const card = this.props.cardData.fromDbf(dbfId);
				items.push({
					item: [
						<CardTile card={card} height={34} count={games} countBoxSize={40} />,
					],
					key: "" + dbfId + id,
				});
			});
		}
		else {
			return Array.apply(null, {length: 6}).map(() => <div/>);
		}
		return items;
	}
}
