import * as React from "react";
import ArchetypeSignature from "../archetypedetail/ArchetypeSignature";
import CardData from "../../CardData";
import {ApiArchetypeSignature} from "../../interfaces";
import {ClusterData, ClusterMetaData, DeckData} from "./ClassAnalysis";
import * as _ from "lodash";
import CardList from "../CardList";
import ClusterSignature from "./ClusterSignature";

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
		if (!_.isEmpty(data.ccp_signatures) && !_.isEmpty(data.ccp_signatures[clusterId])) {
			const cppSignature: ApiArchetypeSignature = {
				as_of: null,
				components: data.ccp_signatures[clusterId],
				format: null,
			};
			cppData = (
				<div className="col-xs-12 col-sm-6 col-md-4" style={{maxWidth: 400}}>
					<h2>Weighted Signature</h2>
					<ClusterSignature
						cardData={cardData}
						signature={cppSignature}
					/>
				</div>
			);
		}

		const clusterDecks = data.data.filter((d) => "" + d.metadata.cluster_id === clusterId);
		const deck = _.maxBy(clusterDecks, (x: DeckData) => x.metadata.games);
		const cardList = [];
		if (deck) {
			JSON.parse(deck.metadata.deck_list).forEach((c: any[]) => {
				for (let i = 0; i < c[1]; i++) {
					cardList.push(c[0]);
				}
			});
		}

		return (
			<div>
				<div className="col-xs-12 col-sm-6 col-md-4" style={{maxWidth: 400}}>
					<h2>Signature</h2>
					<ClusterSignature
						cardData={cardData}
						signature={signature}
					/>
				</div>
				{cppData}
				<div className="col-xs-12 col-sm-6 col-md-4" style={{maxWidth: 300}}>
					<h2>Most Popular Deck</h2>
					<p className="text-center">{deck.metadata.games} games</p>
					<CardList
						cardData={cardData}
						cardList={cardList}
						name=""
						heroes={[]}
					/>
				</div>
			</div>
		);
	}
}
