import * as React from "react";
import {fetchCSRF} from "../helpers";
import { ApiArchetype } from "../interfaces";

interface ArchetypeSelectorState {
	selectedArchetype?: number;
}

interface ArchetypeSelectorProps {
	archetypeData?: any;
	deckId?: string;
	defaultSelectedArchetype?: number;
	disabled?: boolean;
	onSelectedArchetypeChanged?: (id: number) => void;
	playerClass: string;
	selectedArchetype?: number;
}

export default class ArchetypeSelector extends React.Component<ArchetypeSelectorProps, ArchetypeSelectorState> {
	constructor(props: ArchetypeSelectorProps, state: ArchetypeSelectorState) {
		super(props, state);
		this.state = {
			selectedArchetype: null,
		};
	}

	render(): JSX.Element {
		if (!this.props.archetypeData) {
			return null;
		}

		const onArchetypeClick = (e, id) => {
			e.preventDefault();
			this.setState({selectedArchetype: id});
			if (this.props.onSelectedArchetypeChanged) {
				this.props.onSelectedArchetypeChanged(id);
			}
			else {
				const headers = new Headers();
				headers.set("content-type", "application/json");
				fetchCSRF("/api/v1/decks/" + this.props.deckId + "/", {
					body: JSON.stringify({archetype: id}),
					credentials: "same-origin",
					headers,
					method: "PATCH",
				});
			}
		};

		const playerClassArchetypes = this.props.archetypeData.filter((archetype: ApiArchetype) => {
			return archetype.player_class_name === this.props.playerClass;
		});

		let selectedArchetype = "No Archetype";
		const archetypeId = this.props.selectedArchetype ||
			(this.props.defaultSelectedArchetype && (this.state.selectedArchetype || this.props.defaultSelectedArchetype));
		if (archetypeId) {
			const archetype = playerClassArchetypes.find((x) => x.id === archetypeId);
			if (archetype && archetype.name) {
				selectedArchetype = archetype.name;
			}
		}
		const archetypes = playerClassArchetypes.map((x) => (
			<li><a href="#" onClick={(e) => onArchetypeClick(e, x.id)}>{x.name}</a></li>
		));

		return (
			<div className="dropdown">
				<button
					className="btn btn-default dropdown-toggle"
					type="button"
					id="dropdownMenu1"
					data-toggle="dropdown"
					aria-haspopup="true"
					aria-expanded="true"
					disabled={this.props.disabled}
				>
					{selectedArchetype}
					<span className="caret"/>
				</button>
				<ul className="dropdown-menu" aria-labelledby="dropdownMenu1">
					<li className="dropdown-header">Modify Archetype</li>
					{archetypes}
					<li role="separator" className="divider"/>
					<li><a href="#" onClick={(e) => onArchetypeClick(e, null)}>Remove Archetype</a></li>
					<li role="separator" className="divider"/>
					<li><a href="/admin/decks/archetype/">Edit Archetypes</a></li>
				</ul>
			</div>
		);
	}
}
