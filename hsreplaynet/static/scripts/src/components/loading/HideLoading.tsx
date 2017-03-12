import * as React from "react";
import CardData from "../../CardData";
import { cloneComponent } from "../../helpers";
import { LoadingStatus } from "../../interfaces";

interface HideLoadingProps extends React.ClassAttributes<HideLoading> {
	cardData?: CardData;
	data?: any;
	status?: LoadingStatus;
}

export default class HideLoading extends React.Component<HideLoadingProps, void> {
	render(): JSX.Element {
		if (this.props.status !== "success" || this.props.cardData === null) {
			return null;
		}
		return cloneComponent(this.props.children, this.props);
	}
}
