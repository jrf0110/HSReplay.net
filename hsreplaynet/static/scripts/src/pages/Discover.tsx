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

interface DiscoverProps extends React.ClassAttributes<Discover> {
	cardData: CardData;
	dataset?: string;
	format?: string;
	playerClass?: string;
	setDataset?: (dataset: string) => void;
	setFormat?: (format: string) => void;
	setPlayerClass?: (tab: string) => void;
	setTab?: (clusterTab: string) => void;
	tab?: string;
}

interface DiscoverState {
	deck: ClusterMetaData;
}

export default class Discover extends React.Component<DiscoverProps, DiscoverState> {
	constructor(props: DiscoverProps, state: DiscoverState) {
		super(props, state);
		this.state = {
			deck: null,
		};
	}

	render(): JSX.Element {
		const {cardData, tab, dataset, format, playerClass, setTab} = this.props;
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
						}}
					/>
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
