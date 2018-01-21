import React from "react";
import UserData from "../UserData";

interface FeatureProps {
	feature: string;
}

export default class Feature extends React.Component<FeatureProps, {}> {
	render(): JSX.Element {
		if (!this.props.children || !UserData.hasFeature(this.props.feature)) {
			return null;
		}
		const { feature, children, ...props } = this.props;
		return React.cloneElement(
			React.Children.only(this.props.children),
			props
		);
	}
}
