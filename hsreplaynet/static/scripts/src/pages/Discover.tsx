import * as React from "react";
import * as _ from "lodash";
import AdminDeckInfo from "../components/discover/AdminDeckInfo";
import CardData from "../CardData";
import ClassFilter, {FilterOption} from "../components/ClassFilter";
import ClassAnalysis, {ClusterMetaData} from "../components/discover/ClassAnalysis";
import DataInjector from "../components/DataInjector";
import DataManager from "../DataManager";
import InfoboxFilter from "../components/InfoboxFilter";
import InfoboxFilterGroup from "../components/InfoboxFilterGroup";
import UserData from "../UserData";
import InfoIcon from "../components/InfoIcon";
import InfoboxLastUpdated from "../components/InfoboxLastUpdated";
import HideLoading from "../components/loading/HideLoading";
import ClusterChart from "../components/d3/ClusterChart";
import CardSearch from "../components/CardSearch";
import { Limit } from "../components/ObjectSearch";
import { cardSorting, isCollectibleCard, isWildSet } from "../helpers";

interface DiscoverProps extends React.ClassAttributes<Discover> {
	cardData: CardData;
	dataset?: string;
	format?: string;
	includedCards?: string[];
	setIncludedCards?: (includedCards: string[]) => void;
	playerClass?: string;
	setDataset?: (dataset: string) => void;
	setFormat?: (format: string) => void;
	setPlayerClass?: (tab: string) => void;
	setTab?: (clusterTab: string) => void;
	tab?: string;
}

interface DiscoverState {
	cards?: any[];
	deck: ClusterMetaData;
}

export default class Discover extends React.Component<DiscoverProps, DiscoverState> {
	constructor(props: DiscoverProps, state: DiscoverState) {
		super(props, state);
		this.state = {
			cards: null,
			deck: null,
		};
	}

	componentWillReceiveProps(nextProps: DiscoverProps) {
		if (!this.state.cards && nextProps.cardData) {
			const cards = [];
			nextProps.cardData.all().forEach((card) => {
				if (card.name && isCollectibleCard(card)) {
					cards.push(card);
				}
			});
			cards.sort(cardSorting);
			this.setState({cards});
		}
	}

	render(): JSX.Element {
		const {cardData, tab, dataset, format, includedCards, playerClass, setTab} = this.props;
		const adminControls = [];
		if (UserData.hasFeature("archetypes-gamemode-filter")) {
			adminControls.push(
				<InfoboxFilterGroup
					key="format-filter"
					header="Format"
					selectedValue={format}
					onClick={(value) => this.props.setFormat(value)}
					collapsible={true}
					collapsed={true}
				>
					<InfoboxFilter value="FT_STANDARD">Standard</InfoboxFilter>
					<InfoboxFilter value="FT_WILD">Wild</InfoboxFilter>
				</InfoboxFilterGroup>,
			);
		}
		if (UserData.hasFeature("archetype-training")) {
			adminControls.push(
				<InfoboxFilterGroup
					key="cluster-data-filter"
					header="Dataset"
					selectedValue={dataset}
					onClick={(value) => this.props.setDataset(value)}
				>
					<InfoboxFilter value="live">Live</InfoboxFilter>
					<InfoboxFilter value="latest">Latest</InfoboxFilter>
				</InfoboxFilterGroup>,
			);
		}

		const dataUrl = `/analytics/clustering/data/${dataset}/${format}/`;

		let filteredCards = Array.isArray(this.state.cards) ? this.state.cards : [];
		if (format.endsWith("_STANDARD")) {
			filteredCards = filteredCards.filter((card) => !isWildSet(card.set));
		}
		filteredCards = filteredCards.filter((card) => {
			const cardClass = card.cardClass;
			return cardClass === "NEUTRAL" || playerClass === cardClass;
		});

		let selectedCards = null;
		if (cardData && includedCards) {
			selectedCards = includedCards.map((dbfId) => cardData.fromDbf(dbfId)).filter((card) => !!card);
		}

		return (
			<div className="discover-container">
				<aside className="infobox">
					<h1>Discover</h1>
					<h2>Class</h2>
					<ClassFilter
						minimal={true}
						filters="ClassesOnly"
						selectedClasses={[playerClass as FilterOption]}
						selectionChanged={(playerClasses) => {
							this.props.setPlayerClass(playerClasses[0]);
							this.props.setIncludedCards([]);
						}}
					/>
					<section id="include-cards-filter">
						<h2 id="card-search-include-label">Included Cards</h2>
						<CardSearch
							id="card-search-include"
							label="card-search-include-label"
							availableCards={filteredCards}
							onCardsChanged={(cards) => this.props.setIncludedCards(cards.map((card) => card.dbfId))}
							selectedCards={selectedCards}
							cardLimit={Limit.SINGLE}
						/>
					</section>
					{adminControls}
					<h2>Data</h2>
					<ul>
						<InfoboxLastUpdated
							url={dataUrl}
							params={{}}
							modify={(data) => data.length && data[0].as_of && new Date(data[0].as_of)}
						/>
					</ul>
				</aside>
				<main>
					<DataInjector
						query={{url: dataUrl, params: {}}}
						extract={{
							data: (clusterData) => {
								let maxGames = 0;
								let data = null;

								clusterData.forEach((classData) => {
									if (classData.player_class === playerClass) {
										data = classData;
									}
									classData.data.forEach((deckData) => {
										if (deckData.metadata.games > maxGames) {
											maxGames = deckData.metadata.games;
										}
									});
								});

								return {data, maxGames};
							},
						}}
					>
						<ClassAnalysis
							cardData={cardData}
							clusterTab={tab}
							setClusterTab={setTab}
							format={format}
							highlightCards={includedCards}
							onSelectedDeckChanged={(deck) => this.setState({deck})}
							playerClass={playerClass}
							canModifyArchetype={dataset === "latest"}
						/>
					</DataInjector>
				</main>
			</div>
		);
	}
}
