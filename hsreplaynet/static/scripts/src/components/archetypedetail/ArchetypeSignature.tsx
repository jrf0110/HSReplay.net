import * as React from "react";
import * as _ from "lodash";
import {ApiArchetypeSignature} from "../../interfaces";
import CardData from "../../CardData";
import CardList from "../CardList";

interface Bucket {
	cards: number[];
	threshold: number;
	title: string;
}

interface ArchetypeSignatureProps extends React.ClassAttributes<ArchetypeSignature> {
	cardData: CardData;
	signature?: ApiArchetypeSignature;
	showOccasional?: boolean;
}

export default class ArchetypeSignature extends React.Component<ArchetypeSignatureProps, void> {
	shouldComponentUpdate(nextProps: ArchetypeSignatureProps) {
		return (
			!this.props.cardData && nextProps.cardData
			|| !_.isEqual(this.props.signature, nextProps.signature)
		);
	}

	render(): JSX.Element {
		if (!this.props.signature || !this.props.cardData) {
			return null;
		}

		const buckets: Bucket[] = [
			{title: "Core Cards", threshold: 0.9, cards: []},
			{title: "Popular Tech Cards", threshold: 0.5, cards: []},
		];

		if (this.props.showOccasional) {
			buckets.push({title: "Occasional Tech Cards", threshold: 0, cards: []});
		}

		this.props.signature.components.forEach(([dbfId, prev]) => {
			const bucket = buckets.find((b) => prev >= b.threshold);
			if (bucket) {
				bucket.cards.push(dbfId);
			}
		});

		const cardLists = [];
		buckets.forEach((bucket) => {
			if (bucket.cards.length) {
				cardLists.push(
					<h3>{bucket.title}</h3>,
					<CardList
						cardData={this.props.cardData}
						cardList={bucket.cards}
						name=""
						heroes={[]}
					/>,
				);
			}
		});

		return (
			<div className="card-list-wrapper">
				{cardLists}
			</div>
		);
	}
}
