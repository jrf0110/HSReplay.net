import * as React from "react";
import { LoadingStatus } from "../interfaces";
import { fetchCSRF, playerClassIds } from "../helpers";

interface ArchetypeSelectorState {
	selectedArchetype?: number;
}

interface ArchetypeSelectorProps {
	archetypeData?: any;
	deckData?: any;
	status?: LoadingStatus;
	playerClass: string;
}

export default class ArchetypeSelector extends React.Component<ArchetypeSelectorProps, ArchetypeSelectorState> {
	constructor(props: ArchetypeSelectorProps, state: ArchetypeSelectorState) {
		super(props, state);
		this.state = {
			selectedArchetype: null,
		};
	}

	render(): JSX.Element {
		if (this.props.status !== LoadingStatus.SUCCESS) {
			return null;
		}

		const onArchetypeClick = (e, id) => {
			e.preventDefault();
			this.setState({selectedArchetype: id});
			const headers = new Headers();
			headers.set("content-type", "application/json");
			fetchCSRF("/api/v1/decks/" + this.props.deckData.shortid + "/", {
				body: JSON.stringify({archetype: id}),
				credentials: "same-origin",
				headers,
				method: "PATCH",
			});
		};

		const numericPlayerClass = playerClassIds[this.props.playerClass];
		const playerClassArchetypes = this.props.archetypeData.results.filter((x) => x.player_class === numericPlayerClass);

		let selectedArchetype = "No Archetype";
		const archetypeId = this.state.selectedArchetype || this.props.deckData.archetype;
		if (archetypeId) {
			const archetype = playerClassArchetypes.find((x) => x.id === archetypeId);
			if (archetype && archetype.name) {
				selectedArchetype = archetype.name;
			}
		}
		const archetypes = playerClassArchetypes.map((x) => (
			<li><a href="#" onClick={(e) => onArchetypeClick(e, x.id)}>{x.name}</a></li>
		));

		return <div className="dropdown">
			<button
				className="btn btn-default dropdown-toggle"
				type="button"
				id="dropdownMenu1"
				data-toggle="dropdown"
				aria-haspopup="true"
				aria-expanded="true"
			>
				{selectedArchetype}
				<span className="caret"/>
			</button>
			<ul className="dropdown-menu" aria-labelledby="dropdownMenu1">
				<li className="dropdown-header">Modify Archetype</li>
				{archetypes}
				<li><a href="#" onClick={(e) => onArchetypeClick(e, null)}>Remove Archetype</a></li>
			</ul>
		</div>;
	}
}
