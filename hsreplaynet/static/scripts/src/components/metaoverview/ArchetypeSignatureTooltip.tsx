import React from "react";
import DataInjector from "../DataInjector";
import ArchetypeSignature from "../archetypedetail/ArchetypeSignature";
import CardData from "../../CardData";
import { ApiArchetypeSignature } from "../../interfaces";
import Tooltip from "../Tooltip";
import DataManager from "../../DataManager";
import LoadingSpinner from "../LoadingSpinner";

interface ArchetypeSignatureTooltipState {
	signature?: ApiArchetypeSignature;
}

interface ArchetypeSignatureTooltipProps
	extends React.ClassAttributes<ArchetypeSignatureTooltip> {
	cardData: CardData;
	archetypeName: string;
	archetypeId: number;
	gameType: string;
}

export default class ArchetypeSignatureTooltip extends React.Component<
	ArchetypeSignatureTooltipProps,
	ArchetypeSignatureTooltipState
> {
	constructor(
		props: ArchetypeSignatureTooltipProps,
		state: ArchetypeSignatureTooltipState
	) {
		super(props, state);
		this.state = {
			signature: null
		};
	}

	fetchArchetypeData() {
		if (this.state.signature) {
			return;
		}
		const { archetypeId, gameType } = this.props;
		DataManager.get("/api/v1/archetypes/" + archetypeId).then(data => {
			const signature =
				gameType === "RANKED_WILD"
					? data.wild_signature
					: data.standard_signature;
			this.setState({ signature });
		});
	}

	render(): JSX.Element {
		return (
			<Tooltip
				id="tooltip-archetype-signature"
				content={this.renderTooltip()}
				header={this.props.archetypeName}
				onHovering={() => this.fetchArchetypeData()}
				xOffset={50}
			>
				{this.props.children}
			</Tooltip>
		);
	}

	renderTooltip(): JSX.Element {
		if (!this.state.signature || !this.props.cardData) {
			return <LoadingSpinner active={true} />;
		}
		return (
			<div>
				<ArchetypeSignature
					cardData={this.props.cardData}
					signature={this.state.signature}
					maxCards={20}
				/>
				<p>Click to view archetype details</p>
			</div>
		);
	}
}
