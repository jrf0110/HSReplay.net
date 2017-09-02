import * as React from "react";
import ArchetypeSignature from "../archetypedetail/ArchetypeSignature";
import CardData from "../../CardData";
import {ApiArchetypeSignature} from "../../interfaces";
import {ClusterData} from "./ClassAnalysis";
import * as _ from "lodash";

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
		let cppData = null;
		if (!_.isEmpty(data.ccp_signatures)) {
			const cppSignature: ApiArchetypeSignature = {
				as_of: null,
				components: data.ccp_signatures[clusterId],
				format: null,
			};
			cppData = (
				<div className="col-xs-12 col-sm-6" style={{maxWidth: 300}}>
					<h2>CCP Signature</h2>
					<ArchetypeSignature
						cardData={cardData}
						showOccasional={true}
						showValues={true}
						signature={cppSignature}
					/>
				</div>
			);
		}

		return (
			<div>
				<div className="col-xs-12 col-sm-6" style={{maxWidth: 300}}>
					<h2>Signature</h2>
					<ArchetypeSignature
						cardData={cardData}
						showOccasional={true}
						showValues={true}
						signature={signature}
					/>
				</div>
				{cppData}
			</div>
		);
	}
}
