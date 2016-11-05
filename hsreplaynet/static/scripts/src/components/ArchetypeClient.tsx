import * as React from "react";
import Distribution from "./Distribution";
import {BnetGameType} from "../hearthstone";

interface ArchetypeClientProps extends React.ClassAttributes<ArchetypeClient> {
}

interface ArchetypeClientState {
	popularities?: any;
}

export default class ArchetypeClient extends React.Component<ArchetypeClientProps, ArchetypeClientState> {

	constructor(props: ArchetypeClientProps, context: any) {
		super(props, context);
		fetch(
			"/cards/winrates/?lookback=7&game_types=" + BnetGameType.BGT_RANKED_STANDARD,
			{
				credentials: "include",
			}
		).then((response) => {
			return response.json();
		}).then((json: any) => {
			this.setState({popularities: json.frequencies});
		});
		this.state = {
			popularities: {},
		};
	}

	public render(): JSX.Element {
		return (
			<div>
				<Distribution
					distributions={this.state.popularities}
					title="Archetype"
					value="Popularity"
				/>
			</div>
		);
	}
}
