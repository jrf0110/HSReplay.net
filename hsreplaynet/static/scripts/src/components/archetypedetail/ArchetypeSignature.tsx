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
	showValues?: boolean;
	bucketWrapperClassName?: string;
	maxCards?: number;
}

export default class ArchetypeSignature extends React.Component<ArchetypeSignatureProps, {}> {
	shouldComponentUpdate(nextProps: ArchetypeSignatureProps) {
		return (
			!!this.props.cardData !== !!nextProps.cardData ||
			!_.isEqual(this.props.signature, nextProps.signature)
		);
	}

	render(): JSX.Element {
		const {cardData, signature, showValues} = this.props;
		if (!signature || !cardData) {
			return null;
		}

		const buckets: Bucket[] = [
			{title: "Core Cards", threshold: 0.9, cards: []},
			{title: "Popular Tech Cards", threshold: 0.5, cards: []},
		];

		if (this.props.showOccasional) {
			buckets.push({title: "Occasional Tech Cards", threshold: 0.1, cards: []});
		}

		let components = this.props.signature.components.slice().sort((a, b) => b[1] - a[1]);
		if (this.props.maxCards) {
			components = components.slice(0, this.props.maxCards);
		}

		const customCounts = {};
		components.forEach(([dbfId, prev]) => {
			const bucket = buckets.find((b) => prev >= b.threshold);
			if (bucket) {
				bucket.cards.push(dbfId);
			}
			customCounts[dbfId] = Math.floor(prev * 1000);
		});

		const cardLists = [];
		buckets.forEach((bucket) => {
			if (bucket.cards.length) {
				let content: any = [
					<h3 key="title">{bucket.title}</h3>,
					<CardList
						key="card-list"
						cardData={this.props.cardData}
						cardList={bucket.cards}
						name=""
						heroes={[]}
						customCounts={showValues && customCounts}
						sortByCount={showValues}
					/>,
				];
				if (this.props.bucketWrapperClassName) {
					content = (
						<div className={this.props.bucketWrapperClassName}>
							{content}
						</div>
					);
				}
				cardLists.push(content);
			}
		});

		return (
			<div className="card-list-wrapper archetype-signature">
				{cardLists}
			</div>
		);
	}
}
