import * as React from "react";
import ArchetypeSelector from "../ArchetypeSelector";
import ArchetypeTrainingSettings from "../ArchetypeTrainingSettings";
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
				<li>
					<DataInjector
						query={{key: "trainingData", url: "/api/v1/archetype-training/", params: {}}}
						extract={{
							trainingData: (trainingData) => {
								const trainingDeck = trainingData.find((d) => d.deck.shortid === data.shortid);
								if (trainingDeck) {
									return {
										trainingData: {
											deck: trainingDeck.deck.id,
											id: trainingDeck.id,
											is_validation_deck: trainingDeck.is_validation_deck,
										},
									};
								}
							},
						}}
					>
						<HideLoading>
							<ArchetypeTrainingSettings
								deckId={data.shortid}
								playerClass={playerClass}
							/>
						</HideLoading>
					</DataInjector>
				</li>
			</ul>
		);
	}
}

export default withLoading()(AdminDeckInfo);
