import * as React from "react";
import ClassDistributionPieChart from "../components/charts/ClassDistributionPieChart";
import ClassFilter, {FilterOption} from "../components/ClassFilter";
import GameHistoryList from "../components/gamehistory/GameHistoryList";
import GameHistorySearch from "../components/gamehistory/GameHistorySearch";
import GameHistorySelectFilter from "../components/gamehistory/GameHistorySelectFilter";
import GameHistoryTable from "../components/gamehistory/GameHistoryTable";
import InfoBoxSection from "../components/InfoBoxSection";
import Pager from "../components/Pager";
import {GameReplay, CardArtProps, ImageProps, GlobalGamePlayer} from "../interfaces";
import {cookie} from "cookie_js";
import {formatMatch, modeMatch, nameMatch, resultMatch, heroMatch, opponentMatch} from "../GameFilters"
import {parseQuery, toQueryString, QueryMap} from "../QueryParser"

type ViewType = "tiles" | "list";

interface GamesPage {
	[index: number]: GameReplay[];
}

interface MyReplaysProps extends ImageProps, CardArtProps, React.ClassAttributes<MyReplays> {
	username: string;
}

interface MyReplaysState {
	count?: number;
	currentLocalPage?: number;
	gamesPages?: GamesPage;
	next?: string,
	pageSize?: number;
	queryMap?: QueryMap;
	receivedPages?: number;
	showFilters?: boolean;
	viewType?: ViewType;
	working?: boolean;
}

export default class MyReplays extends React.Component<MyReplaysProps, MyReplaysState> {
	readonly viewCookie: string = "myreplays_viewtype";

	constructor(props: MyReplaysProps, context: any) {
		super(props, context);
		let viewType = cookie.get(this.viewCookie, "tiles") as ViewType;
		this.state = {
			count: 0,
			currentLocalPage: 0,
			gamesPages: {} as GamesPage,
			next: null,
			pageSize: 1,
			queryMap: parseQuery(document.location.hash.substr(1)),
			receivedPages: 0,
			showFilters: false,
			viewType: viewType,
			working: true,
		};
		this.query("/api/v1/games/?username=" + encodeURIComponent(props.username));
	}

	protected query(url: string) {
		this.setState({
			working: true
		});
		fetch(
			url,
			{
				headers: new Headers({"accept": "application/json"}),
				credentials: "same-origin",
			}
		).then((response) => response.json()).then((data: any) => {
			let games = [];
			if (data.count) {
				if (this.state.count && this.state.count !== data.count) {
					this.setState({
						receivedPages: 0,
						gamesPages: [],
						count: data.count,
					});
					this.query("/api/v1/games/");
					return;
				}
				games = data.results;

				if (Object.keys(this.state.gamesPages).indexOf("" + this.state.receivedPages) === -1) {
					const pages = Object.assign({}, this.state.gamesPages);
					pages[this.state.receivedPages] = games;
					this.setState({
						count: data.count,
						gamesPages: pages,
						next: data.next,
						pageSize: Math.max(this.state.pageSize, games.length),
						receivedPages: this.state.receivedPages + 1,
						working: false,
					});
					return;
				}
			}
			this.setState({
				working: false,
				count: data.count,
				next: data.next
			});
		});
	}

	componentDidUpdate(prevProps: MyReplaysProps, prevState: MyReplaysState, prevContext: any): void {
		location.replace("#" + toQueryString(this.state.queryMap));
	}

	filterGames(input: GameReplay[]): GameReplay[] {
		let games = input;
		if (Object.keys(this.state.queryMap).length) {
			let name = this.state.queryMap["name"];
			let mode = this.state.queryMap["mode"];
			let format = this.state.queryMap["format"];
			let result = this.state.queryMap["result"];
			let hero = this.state.queryMap["hero"];
			let opponent = this.state.queryMap["opponent"];
			games = games.filter(game => {
				if(name && !nameMatch(game, name.toLowerCase())) {
					return false;
				}
				if(mode && !modeMatch(game, mode)) {
					return false;
				}
				if(format && !formatMatch(game, format, mode)) {
					return false;
				}
				if(result && !resultMatch(game, result)) {
					return false;
				}
				if(hero && !heroMatch(game, hero)) {
					return false;
				}
				if(opponent && !opponentMatch(game, opponent)) {
					return false;
				}
				return true;
			});
		}
		return games;
	}

	render(): JSX.Element {
		let games = [];
		const hasFilters = Object.keys(this.state.queryMap).some(key => {
			const value = this.state.queryMap[key];
			return value && value.length > 0;
		});

		let page = 0;
		const firstPage = this.state.gamesPages[page];
		if(firstPage) {
			games = this.filterGames(firstPage);
			//we load one more than we need so we know whether there is next page
			while (games.length < (this.state.pageSize * (this.state.currentLocalPage + 1) + 1)) {
				const nextPage = this.state.gamesPages[++page];
				if (!nextPage) {
					if (this.state.next && !this.state.working && (hasFilters || page == this.state.currentLocalPage)) {
						this.query(this.state.next);
					}
					break;
				}
				games = games.concat(this.filterGames(nextPage));
			}
			//slice off everything before the currentLocalPage
			games = games.slice(this.state.pageSize * (this.state.currentLocalPage));
		}

		let hasNext = !hasFilters && this.state.next || games.length > this.state.pageSize;
		if (hasNext) {
			games = games.slice(0, this.state.pageSize);
		}

		let content = null;
		if (games.length) {
			content =  (this.state.viewType === "list" ?
			<GameHistoryTable
				image={this.props.image}
				cardArt={this.props.cardArt}
				games={games}
			/> :
			<GameHistoryList
				image={this.props.image}
				cardArt={this.props.cardArt}
				games={games}
			/>);
		}
		else {
			let message = null;
			if (this.state.working) {
				message = <p>Loading replays…</p>;
			}
			else {
				message = <div>
					<h2>No replay found</h2>
					{!!this.state.queryMap ? <p>
						<a href="#"
						   onClick={(e) => {e.preventDefault(); this.setState({queryMap: {}})}}>Reset search</a>
					</p> : null}
				</div>;
			}
			content = <div className="list-message">{message}</div>;
		}

		const filterClassNames = ["infobox full-sm"];
		const contentClassNames = ["replay-list"]
		if (!this.state.showFilters) {
			filterClassNames.push("hidden-xs hidden-sm");
		}
		else {
			contentClassNames.push("hidden-xs hidden-sm");
		}


		let next = hasNext && !this.state.working ? () => {
			this.setState({currentLocalPage: this.state.currentLocalPage + 1});
		} : null;

		let previous = this.state.currentLocalPage > 0 ? () => {
			this.setState({currentLocalPage: this.state.currentLocalPage - 1});
		} : null;

		let resetButton = null;
		if (toQueryString(this.state.queryMap).length) {
			resetButton = (
				<button className="btn btn-danger btn-full" onClick={(e) => {e.preventDefault(); this.setState({queryMap: {}})}}>
					Reset all filters
				</button>
			);
		}

		const backButton = (
			<button className="btn btn-primary btn-full visible-sm visible-xs" type="button" onClick={() => this.setState({showFilters: false})}>
				Back to card list
			</button>
		);

		return (
			<div className="my-replays-content">
				<div className={filterClassNames.join(" ")} id="myreplays-infobox">
					<h1>My Replays</h1>
					{backButton}
					{resetButton}
					<h2>Classes Played</h2>
					<ClassDistributionPieChart
						games={games}
						loadingGames={this.state.working}
						onPieceClicked={(hero: string) => this.onPiePieceClicked(hero)}
					/>
					<h2>Player class</h2>
					<ClassFilter
						filters="All"
						hideAll
						minimal
						multiSelect={false}
						selectedClasses={[(this.state.queryMap["hero"] || "ALL").toUpperCase() as FilterOption]}
						selectionChanged={(selection) => {
							const selected = selection.find(x => x !== "ALL") || null;
							this.setState({queryMap: this.setQueryMap("hero", selected && selected.toLowerCase()), currentLocalPage: 0});
						}}
					/>
					<h2>Opponent class</h2>
					<ClassFilter
						filters="All"
						hideAll
						minimal
						multiSelect={false}
						selectedClasses={[(this.state.queryMap["opponent"] || "ALL").toUpperCase() as FilterOption]}
						selectionChanged={(selection) => {
							const selected = selection.find(x => x !== "ALL") || null;
							this.setState({queryMap: this.setQueryMap("opponent", selected && selected.toLowerCase()), currentLocalPage: 0});
						}}
					/>
					<h2>Find players</h2>
					<GameHistorySearch
						query={this.state.queryMap["name"]}
						setQuery={(value: string) => this.setState({queryMap: this.setQueryMap("name", value), currentLocalPage: 0})}
					/>
					<h2>Mode</h2>
					<ul>
						{this.buildFilter("mode", "arena", "Arena")}
						{this.buildFilter("mode", "ranked", "Ranked")}
						{this.buildFilter("mode", "casual", "Casual")}
						{this.buildFilter("mode", "brawl", "Brawl")}
						{this.buildFilter("mode", "friendly", "Friendly")}
						{this.buildFilter("mode", "adventure", "Adventure")}
					</ul>
					<h2>Format</h2>
					<ul>
						{this.buildFilter("format", "standard", "Standard")}
						{this.buildFilter("format", "wild", "Wild")}
					</ul>
					<h2>Result</h2>
					<ul>
						{this.buildFilter("result", "won", "Won")}
						{this.buildFilter("format", "lost", "Lost")}
					</ul>
					<h2>Display</h2>
					<ul>
						<li className={"selectable no-deselect" + (this.state.viewType === "list" ? " selected" : "")} onClick={() => this.setView("list")}>
							List view
						</li>
						<li className={"selectable no-deselect" + (this.state.viewType === "tiles" ? " selected" : "")} onClick={() => this.setView("tiles")}>
							Tile view
						</li>
					</ul>
					{backButton}
				</div>
				<div className={contentClassNames.join(" ")}>
					<div className="header-buttons">
						<button className="btn btn-default pull-left visible-xs visible-sm" type="button" onClick={() => this.setState({showFilters: true})}>
							<span className="glyphicon glyphicon-filter"/>
							Filters
						</button>
						<div className="pull-right">
							<Pager next={next} previous={previous}/>
						</div>
						<div className="clearfix" />
					</div>
					<div className="container-fluid">
						{content}
					</div>
					<div className="pull-right">
						<Pager next={next} previous={previous}/>
					</div>
				</div>
			</div>
		);
	}

	setQueryMap(key: string, value: string): QueryMap {
		const queryMap = Object.assign({}, this.state.queryMap);
		queryMap[key] = value;
		return queryMap;
	}

	buildFilter(prop: string, key: string, displayValue: string): JSX.Element {
		const selected = this.state.queryMap[prop] === key;
		const onClick = () => {
			this.setState({queryMap: this.setQueryMap(prop, selected ? null : key), currentLocalPage: 0});
		}

		const classNames = ["selectable"];
		if (selected) {
			classNames.push("selected");
		}

		return (
			<li onClick={onClick} className={classNames.join(" ")}>
				{displayValue}
			</li>
		);

	}

	private setView(view: ViewType) {
		if (this.state.viewType !== view) {
			cookie.set(this.viewCookie, view, {expires: 365});
			this.setState({viewType: view});
		}
	}

	private onPiePieceClicked(hero: string) {
		this.setState({
			queryMap: this.setQueryMap("hero", this.state.queryMap["hero"] === hero ? null : hero),
			currentLocalPage: 0
		});
	}
}
