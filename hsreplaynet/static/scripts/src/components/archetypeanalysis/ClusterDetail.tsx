import * as React from "react";
import ArchetypeSignature from "../archetypedetail/ArchetypeSignature";
import CardData from "../../CardData";
import {ApiArchetypeSignature} from "../../interfaces";
import {ClusterData} from "./ClassAnalysis";

interface ClusterDetailProps extends React.ClassAttributes<ClusterDetail> {
	cardData: CardData;
	clusterId: string;
	data?: ClusterData;
}

export default class ClusterDetail extends React.Component<ClusterDetailProps, {}> {
	render(): JSX.Element {
		const {cardData, clusterId, data} = this.props;
		const signature: ApiArchetypeSignature = {
			as_of: null,
			components: data.signatures[clusterId],
			format: null,
		};
		return (
			<ArchetypeSignature
				cardData={cardData}
				showOccasional={true}
				showValues={true}
				signature={signature}
				bucketWrapperClassName="col-xs-12 col-md-4"
			/>
		);
	}
}
