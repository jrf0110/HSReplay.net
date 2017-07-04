import * as React from "react";
import InfoboxFilterGroup from "./InfoboxFilterGroup";
import InfoboxFilter from "./InfoboxFilter";

interface ArchetypeFilterProps extends React.ClassAttributes<ArchetypeFilter> {
	archetypes: any[];
	playerClasses: string[];
	selectedArchetypes: string[];
	archetypesChanged: (archetypes: string[]) => void;
	data?: any;
}

export default class ArchetypeFilter extends React.Component<ArchetypeFilterProps, void> {
	render(): JSX.Element {
		if (!this.props.data) {
			return null;
		}

		const data = this.props.data.results;
		const archetypes = [];
		if (this.props.archetypes) {
			this.props.archetypes.forEach((archetype) => {
				if (this.props.playerClasses.indexOf(archetype.playerClass) !== -1) {
					const archetypeData = data.find((a) => "" + a.id === archetype.id);
					archetypes.push(
						<InfoboxFilter value={"" + archetype.id} >
							<span className={`player-class ${archetype.playerClass.toLowerCase()}`}>
								{archetypeData && archetypeData.name}
							</span>
						</InfoboxFilter>,
					);
				}
			});
		}

		if (archetypes.length === 0) {
			return null;
		}

		return (
			<div className="archetype-filter-wrapper">
				<InfoboxFilterGroup
					deselectable
					selectedValue={this.props.selectedArchetypes.map(String)}
					onClick={(value, sender) => {
						if (value !== null && this.props.selectedArchetypes.indexOf(value) === -1) {
							this.props.archetypesChanged(this.props.selectedArchetypes.concat([value]));
						}
						else if (value === null) {
							this.props.archetypesChanged(this.props.selectedArchetypes.filter((x) => x !== sender));
						}
					}}
				>
					{archetypes}
				</InfoboxFilterGroup>
			</div>
		);
	}
}
