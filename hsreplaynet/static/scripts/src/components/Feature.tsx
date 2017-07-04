import * as React from "react";
import UserData from "../UserData";

interface FeatureProps {
	feature: string;
}

export default class Feature extends React.Component<FeatureProps, void> {
	render(): JSX.Element {
		if (!UserData.hasFeature(this.props.feature)) {
			return null;
		}
		return React.Children.only(this.props.children);
	}
}
