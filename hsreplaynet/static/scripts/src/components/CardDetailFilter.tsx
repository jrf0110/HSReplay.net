import * as React from "react";
import InfoBoxSection from "./InfoBoxSection";
import Selection from "./Selection";
import {Filter, FilterData, FilterDefinition} from "../interfaces";

interface CardDetailFilterState {
}

interface CardDetailFilterProps extends React.ClassAttributes<CardDetailFilter> {
	filterData: FilterData;
	defaultSelection: Map<string, string>;
	premiumAvailable: boolean;
	selectionChanged: (filterKey: string, value: string) => void;
}

export default class CardDetailFilter extends React.Component<CardDetailFilterProps, CardDetailFilterState> {

	constructor(props: CardDetailFilterProps, state: CardDetailFilterState) {
		super(props, state);
		this.state = {
			selectedFilters: this.props.defaultSelection,
		}
	}

	render(): JSX.Element {
		const filters = [];
		if (this.props.filterData && this.props.filterData.filters) {
			this.props.filterData.filters.forEach(filter => {
				filters.push(<li key={filter.name}>{this.buildFilter(filter)}</li>);
			});
		}

		return <div className="infobox" id="myreplays-infobox">
			<InfoBoxSection header="Premium Filters" collapsedSizes={["xs", "sm"]} headerStyle="h1">
				<ul>
					{filters}
					<li>
						<button type="button" className="btn btn-primary">{"Apply"}</button>
					</li>
				</ul>
			</InfoBoxSection>
		</div>
	}

	buildFilter(filter: Filter): JSX.Element {
		const def = this.filterDef.get(filter.name);
		const visible = [];
		const collapsed = [];
		let defaultValue = "";
		const buildOption = (e) => {
			return {key: e.name, name: def.elementNames.get(e.name), premium: e.is_premium};
		}
		filter.elements.filter(x => x.is_implemented).forEach(element => {
			if (element.is_default) {
				defaultValue = element.name;
			}
			if (def.visible.indexOf(element.name) !== -1) {
				visible.push(buildOption(element));
			}
			else {
				collapsed.push(buildOption(element));
			}
		})
		return <Selection
			name={def.name}
			visible={visible}
			collapsed={collapsed}
			default={defaultValue}
			selectionChanged={(key) => this.props.selectionChanged(filter.name, key)}
			premiumAvailable={this.props.premiumAvailable}
		/>;
	}

	private readonly filterDef = new Map<string, FilterDefinition>([
		["TimeRange", {
			name: "Time",
			elementNames: new Map<string, string>([
				["LAST_1_DAY", "Today"],
				["LAST_3_DAYS", "Last 3 days"],
				["LAST_7_DAYS", "Last 7 days"],
				["LAST_14_DAYS", "Last 14 days"],
				["LAST_30_DAYS", "Last 30 days"],
				["CURRENT_SEASON", "Current season"],
				["PREVIOUS_SEASON", "Last season"],
				["TWO_SEASONS_AGO", "{2}"],
				["THREE_SEASONS_AGO", "{3}"],
			]),
			visible: ["PREVIOUS_SEASON"]
		}],
		["RankRange", {
			name: "Rank",
			elementNames: new Map<string, string>([
				["ALL", "All Ranks"],
				["LEGEND_THROUGH_TEN", "Legend - 10"],
				["ELEVEN_THROUGH_TWENTYFIVE", "11 - 25"],
				["LEGEND_ONLY", "Legend"],
				["ONE_THROUGH_FIVE", "1 - 5"],
				["SIX_THROUGH_TEN", "6 - 10"],
				["ELEVEN_THROUGH_FIFTEEN", "11 - 15"],
				["SIXTEEN_THROUGH_TWENTY", "16 - 20"],
				["TWENTYONE_THROUGH_TWENTYFIVE", "21 - 25"],
			]),
			visible: ["ALL", "LEGEND_THROUGH_TEN"]
		}],
		["PlayerClass", {
			name: "Class",
			elementNames: new Map<string, string>([
				["ALL", "All Classes"],
				["DRUID", "Druid"],
				["HUNTER", "Hunter"],
				["MAGE", "Mage"],
				["PALADIN", "Paladin"],
				["PRIEST", "Priest"],
				["ROGUE", "Rogue"],
				["SHAMAN", "Shaman"],
				["WARLOCK", "Warlock"],
				["WARRIOR", "Warrior"],
			]),
			visible: ["ALL", "DRUID"]
		}],
		["Region", {
			name: "Region",
			elementNames: new Map<string, string>([
				["ALL", "All Regions"],
				["REGION_US", "US"],
				["REGION_EU", "EU"],
				["REGION_KR", "Asia"],
				["REGION_CN", "China"],
			]),
			visible: ["ALL", "REGION_US"]
		}],
		["GameType", {
			name: "Mode",
			elementNames: new Map<string, string>([
				["RANKED_STANDARD", "Ranked"],
				["ARENA", "Arena"],
				["VS_AI", "Adventure"],
				["CASUAL_STANDARD", "Casual"],
				["TAVERNBRAWL", "Tavern Brawl"],
				["RANKED_WILD", "Ranked (Wild)"],
				["CASUAL_WILD", "Casual (Wild)"],
			]),
			visible: ["RANKED_STANDARD", "ARENA"]
		}],
	]);
}
