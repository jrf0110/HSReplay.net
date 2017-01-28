import * as React from "react";
import InfoBoxSection from "../InfoBoxSection";
import Selection from "../Selection";
import {Filter, FilterData, FilterDefinition} from "../../interfaces";

interface PopularityReportFilterState {
}

interface PopularityReportFilterProps extends React.ClassAttributes<PopularityReportFilter> {
	selectionChanged: (filterKey: string, value: string) => void;
	cardData: Map<string, any>;
}

export default class PopularityReportFilter extends React.Component<PopularityReportFilterProps, PopularityReportFilterState> {

	constructor(props: PopularityReportFilterProps, state: PopularityReportFilterState) {
		super(props, state);
		this.state = {
			selectedFilters: [].map.call(this.filterDef, (value, key) => value.visible[0]),
		}
	}

	render(): JSX.Element {
		const filters = [];
		this.filterDef.forEach((filter, key) => {
			filters.push(<li key={filter.name}>{this.buildFilter(key, filter)}</li>);
		})

		return <div className="infobox" id="myreplays-infobox">
			<InfoBoxSection header="Filters" collapsedSizes={["xs", "sm"]} headerStyle="h1">
				<ul>
					{filters}
				</ul>
			</InfoBoxSection>
		</div>
	}

	buildFilter(key: string, def: FilterDefinition): JSX.Element {
		const visible = [];
		const collapsed = [];
		let defaultValue = "";
		const buildOption = (e) => {
			return {key: e.key, name: def.elementNames.get(e.name)};
		}
		def.elementNames.forEach((name, key) => {
			if (def.visible.indexOf(key) !== -1) {
				visible.push({key: key, name: name});
			}
			else {
				collapsed.push({key: key, name: name});
			}
		})
		return <Selection
			name={def.name}
			visible={visible}
			collapsed={collapsed}
			default={defaultValue}
			selectionChanged={(value) => this.props.selectionChanged(key, value)}
		/>;
	}

	private readonly filterDef = new Map<string, FilterDefinition>([
		["playerClass", {
			name: "Class",
			elementNames: new Map<string, string>([
				["ALL", "All"],
				["NEUTRAL", "Neutral"],
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
			visible: ["ALL", "NEUTRAL"]
		}],
		["rarity", {
			name: "Rarity",
			elementNames: new Map<string, string>([
				["", "All"],
				["FREE", "Free"],
				["COMMON", "Common"],
				["RARE", "Rare"],
				["EPIC", "Epic"],
				["LEGENDARY", "Legendary"],
			]),
			visible: ["", "LEGENDARY"]
		}],
		["type", {
			name: "Type",
			elementNames: new Map<string, string>([
				["", "All"],
				["MINION", "Minion"],
				["SPELL", "Spell"],
				["WEAPON", "Weapon"],
			]),
			visible: ["", "MINION"]
		}],
		["set", {
			name: "Set",
			elementNames: new Map<string, string>([
				["", "All"],
				["CORE", "Basic"],
				["EXPERT1", "Classic"],
				["BRM", "Blackrock Mountain"],
				["TGT", "The Grand Tournament"],
				["LOE", "League of Explorers"],
				["OG", "Whispers of the Old Gods"],
				["KARA", "One Night in Karazhan"],
				["GANGS", "Mean Streets of Gadgetzan"],
			]),
			visible: ["", "EXPERT1"]
		}],
	]);
}
