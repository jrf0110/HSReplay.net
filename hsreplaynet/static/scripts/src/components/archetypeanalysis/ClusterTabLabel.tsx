import * as React from "react";
import DataInjector from "../DataInjector";
import ClusterArchetypeSelector from "./ClusterArchetypeSelector";
import UserData from "../../UserData";
import {ApiArchetype} from "../../interfaces";

interface ClusterTabLabelProps extends React.ClassAttributes<ClusterTabLabel> {
	active?: boolean;
	clusterId: string;
	clusterName: string;
	color: string;
	playerClass: string;
}

const EXPERIMENTAL_CLUSTER_ID = "-1";

export default class ClusterTabLabel extends React.Component<ClusterTabLabelProps, {}> {
	render(): JSX.Element {
		const {active, clusterId, clusterName, color, playerClass} = this.props;
		let selector = null;
		const hasFeature = UserData.hasFeature("archetype-selection");
		if (hasFeature && clusterId !== EXPERIMENTAL_CLUSTER_ID && active) {
			selector = (
				<DataInjector
					query={[
						{key: "archetypeData", url: "/api/v1/archetypes/", params: {}},
					]}
					extract={{
						archetypeData: (data: ApiArchetype[]) => {
							const archetypes = data.filter((a) => a.player_class_name === playerClass);
							return {archetypes};
						},
					}}
				>
					<ClusterArchetypeSelector
						clusterId={clusterId}
						playerClass={playerClass}
					/>
				</DataInjector>
			);
		}
		return (
			<span>
				<span className="signature-label" style={{backgroundColor: color}} />
				{clusterName}
				{selector}
			</span>
		);
	}
}
