import * as React from "react";
import ArchetypeSelector from "../ArchetypeSelector";
import DataInjector from "../DataInjector";
import HideLoading from "../loading/HideLoading";
import {ApiArchetype} from "../../interfaces";
import {withLoading} from "../loading/Loading";

interface AdminDeckInfoProps extends React.ClassAttributes<AdminDeckInfo> {
	data?: any;
	playerClass: string;
}

class AdminDeckInfo extends React.Component<AdminDeckInfoProps, {}> {
	render(): JSX.Element {
		const {data, playerClass} = this.props;
		return (
			<ul>
				<li>
					<span>View in Admin</span>
					<span className="infobox-value">
						<a href={`/admin/decks/deck/${data.id}/change`}>Admin link</a>
					</span>
				</li>
				<li>
					<span>Archetype</span>
					<span className="infobox-value">
						<DataInjector
							query={[
								{key: "archetypeData", url: "/api/v1/archetypes/", params: {}},
							]}
							extract={{
								archetypeData: (archetypeData: ApiArchetype[]) => {
									const archetypes = archetypeData.filter((a) => a.player_class_name === playerClass);
									return {archetypes};
								},
							}}
						>
							<HideLoading>
								<ArchetypeSelector deckId={data.shortid} defaultSelectedArchetype={data.archetype} />
							</HideLoading>
						</DataInjector>
					</span>
				</li>
			</ul>
		);
	}
}

export default withLoading()(AdminDeckInfo);
