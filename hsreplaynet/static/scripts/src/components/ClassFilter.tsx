import * as React from "react";
import {getHeroColor, toTitleCase} from "../helpers";
import ClassIcon from "./ClassIcon";

type FilterOption = "ALL" | "DRUID" | "HUNTER" | "MAGE"
	| "PALADIN" | "PRIEST" | "ROGUE" | "SHAMAN"
	| "WARLOCK" | "WARRIOR" | "NEUTRAL";

type FilterPreset = "All" | "AllNeutral" | "Neutral" | "ClassesOnly";

interface ClassFilterState {
	selectedClasses?: Map<string, boolean>;
}

interface ClassFilterProps extends React.ClassAttributes<ClassFilter> {
	filters: FilterOption[] | FilterPreset;
	selectionChanged: (selected: Map<string, boolean>) => void;
	multiSelect: boolean;
}

export default class ClassFilter extends React.Component<ClassFilterProps, ClassFilterState> {
	private readonly classes: FilterOption[] = [
		"DRUID", "HUNTER", "MAGE",
		"PALADIN", "PRIEST", "ROGUE",
		"SHAMAN", "WARLOCK", "WARRIOR"
	];

	private readonly presets = new Map<FilterPreset, FilterOption[]>([
		["All", ["ALL"].concat(this.classes) as FilterOption[]],
		["AllNeutral", ["ALL"].concat(this.classes).concat(["NEUTRAL"]) as FilterOption[]],
		["Neutral", this.classes.concat(["NEUTRAL"]) as FilterOption[]],
		["ClassesOnly", this.classes]
	]);

	constructor(props: ClassFilterProps, state: ClassFilterState) {
		super(props, state);
		const selectedClasses = new Map<string, boolean>();
		if (this.props.multiSelect) {
			this.getAvailableFilters().forEach(c => selectedClasses.set(c, true));
		}
		else {
			selectedClasses.set(this.getAvailableFilters()[0], true);
		}
		this.state = {
			selectedClasses: selectedClasses,
		}
		this.props.selectionChanged(this.state.selectedClasses)
	}

	getAvailableFilters(): FilterOption[] {
		const fromPreset = this.presets.get(this.props.filters as FilterPreset);
		return fromPreset || this.props.filters as FilterOption[];
	}

	render(): JSX.Element {
		const filters = [];
		this.getAvailableFilters().forEach(key => {
			const selected = this.state.selectedClasses.get(key);
			filters.push(this.buildIcon(key, selected));

		})
		return <div className="class-filter-wrapper">
			{filters}
		</div>;
	}

	buildIcon(className: string, selected: boolean): JSX.Element {
		const isSelected = selected || this.allSelected();
		const wrapperClassName = "class-icon-label-wrapper" + (isSelected ? "" : " deselected");
		const labelClassName = "class-label hidden-xs " + (isSelected ? className.toLowerCase() : "deselected");

		return <span className={wrapperClassName} onClick={() => this.onLabelClick(className, selected)}>
			<ClassIcon heroClassName={className} small />
			<div className={labelClassName}>{toTitleCase(className)}</div>
		</span>;
	}

	onLabelClick(className: string, selected: boolean) {
		let newState = this.state.selectedClasses;

		const currentSelection = [];
		this.state.selectedClasses.forEach((value, key) => {
			if (value) {
				currentSelection.push(key);
			}
		});
		const clickedLastSelected = currentSelection.length == 1 && currentSelection[0] === className;

		if(this.props.multiSelect) {
			if (clickedLastSelected) {
				this.getAvailableFilters().forEach(key => newState.set(key, true));
			}
			else {
				newState.set(className, !selected)
			}
		}
		else {
			if (clickedLastSelected && this.getAvailableFilters().indexOf("ALL") !== -1) {
				newState = new Map<string, boolean>([["ALL", true]])
			}
			else {
				newState = new Map<string, boolean>([[className, true]])
			}
		}

		this.setState({selectedClasses: newState});
		this.props.selectionChanged(newState);
	}

	allSelected(): boolean {
		return this.state.selectedClasses.get("ALL");
	}
}
