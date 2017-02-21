import * as React from "react";
import {cookie} from "cookie_js";
import {GameReplay, CardArtProps, ImageProps, GlobalGamePlayer} from "../interfaces";
import GameHistorySearch from "../components/gamehistory/GameHistorySearch";
import GameHistorySelectFilter from "../components/gamehistory/GameHistorySelectFilter";
import GameHistoryList from "../components/gamehistory/GameHistoryList";
import GameHistoryTable from "../components/gamehistory/GameHistoryTable";
import InfoBoxSection from "../components/InfoBoxSection";
import Pager from "../components/Pager";
import {parseQuery, toQueryString} from "../QueryParser"
import {formatMatch, modeMatch, nameMatch, resultMatch, heroMatch, opponentMatch} from "../GameFilters"
import ClassDistributionPieChart from "../components/charts/ClassDistributionPieChart";
import ClassFilter, {FilterOption} from "../components/ClassFilter";


type ViewType = "tiles" | "list";

interface MyReplaysProps extends ImageProps, CardArtProps, React.ClassAttributes<MyReplays> {
	username: string;
}

interface MyReplaysState {
	count?: number;
	currentLocalPage?: number;
	gamesPages?: Map<number, GameReplay[]>;
	next?: string,
	pageSize?: number;
	queryMap?: Map<string, string>;
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
			gamesPages: new Map<number, GameReplay[]>(),
			next: null,
			pageSize: 1,
			queryMap: parseQuery(document.location.hash.substr(1)),
			receivedPages: 0,
			showFilters: false,
			viewType: viewType,
			working: true,
		};
		this.query("/api/v1/games/");
	}

	protected query(url: string) {
		this.setState({
			working: true
		});
		$.getJSON(url, {username: this.props.username}, (data) => {
			let games = [];
			if (data.count) {
				if(!!this.state.count && this.state.count !== data.count) {
					this.setState({
						receivedPages: 0,
						gamesPages: new Map<number, GameReplay[]>(),
						count: data.count
					});
					this.query("/api/v1/games/");
					return;
				}
				games = data.results;
				if (!this.state.gamesPages.has(this.state.receivedPages)) {
					this.state.gamesPages = this.state.gamesPages.set(this.state.receivedPages, games);
					this.state.receivedPages++;
					if(games.length > this.state.pageSize) {
						this.state.pageSize = games.length;
					}
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
		if (this.state.queryMap.size > 0) {
			let name = this.state.queryMap.get("name");
			let mode = this.state.queryMap.get("mode");
			let format = this.state.queryMap.get("format");
			let result = this.state.queryMap.get("result");
			let hero = this.state.queryMap.get("hero");
			let opponent = this.state.queryMap.get("opponent");
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
		let hasFilters = false;
		this.state.queryMap.forEach(v => hasFilters = hasFilters || !!v && v.length > 0);

		let page = 0;
		if(this.state.gamesPages.has(page)) {
			games = this.filterGames(this.state.gamesPages.get(page));
			//we load one more than we need so we know whether there is next page
			while (games.length < (this.state.pageSize * (this.state.currentLocalPage + 1) + 1)) {
				page++;
				if (!this.state.gamesPages.has(page)) {
					if (this.state.next && !this.state.working && (hasFilters || page == this.state.currentLocalPage)) {
						this.query(this.state.next);
					}
					break;
				}
				games = games.concat(this.filterGames(this.state.gamesPages.get(page)));
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
						   onClick={(e) => {e.preventDefault(); this.setState({queryMap: new Map<string, string>()})}}>Reset search</a>
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
				<button className="btn btn-danger btn-full" onClick={(e) => {e.preventDefault(); this.setState({queryMap: new Map<string, string>()})}}>
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
					<h2>Hero</h2>
					<ClassFilter 
						filters="All"
						hideAll
						key={"playerfilter" + 0}
						minimal
						multiSelect={false}
						selectedClasses={[(this.state.queryMap.get("hero") || "ALL").toUpperCase() as FilterOption]}
						selectionChanged={(selection) => {
								const selected = selection.find(x => x !== "ALL") || null;
								this.setState({queryMap: this.state.queryMap.set("hero", selected && selected.toLowerCase()), currentLocalPage: 0});
							}
						}
					/>
					<h2>Opponent</h2>
					<ClassFilter 
						filters="All"
						hideAll
						key={"opponentfilter" + 0}
						minimal
						multiSelect={false}
						selectedClasses={[(this.state.queryMap.get("opponent") || "ALL").toUpperCase() as FilterOption]}
						selectionChanged={(selection) => {
								const selected = selection.find(x => x !== "ALL") || null;
								this.setState({queryMap: this.state.queryMap.set("opponent", selected && selected.toLowerCase()), currentLocalPage: 0});
							}
						}
					/>
					<h2>Player</h2>
					<GameHistorySearch
						query={this.state.queryMap.get("name")}
						setQuery={(value: string) => this.setState({queryMap: this.state.queryMap.set("name", value), currentLocalPage: 0})}
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
					{content}
					<div className="pull-right">
						<Pager next={next} previous={previous}/>
					</div>
				</div>
			</div>
		);
	}

	buildFilter(prop: string, key: string, displayValue: string): JSX.Element {
		const selected = this.state.queryMap.get(prop) === key;
		const onClick = () => {
			this.setState({queryMap: this.state.queryMap.set(prop, selected ? null : key), currentLocalPage: 0});
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
			queryMap: this.state.queryMap.set("hero", this.state.queryMap.get("hero") === hero ? null : hero),
			currentLocalPage: 0
		});
	}
}
