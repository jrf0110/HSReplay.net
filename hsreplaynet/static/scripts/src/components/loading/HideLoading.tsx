import React from "react";
import CardData from "../../CardData";
import { cloneComponent } from "../../helpers";
import { LoadingStatus } from "../../interfaces";

interface HideLoadingProps {
	cardData?: CardData;
	data?: any;
	status?: LoadingStatus;
}

export default class HideLoading extends React.Component<HideLoadingProps, {}> {
	render(): JSX.Element {
		if (
			this.props.status !== LoadingStatus.SUCCESS ||
			this.props.cardData === null
		) {
			return null;
		}
		return cloneComponent(this.props.children, this.props);
	}
}
