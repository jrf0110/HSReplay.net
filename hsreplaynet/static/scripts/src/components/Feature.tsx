import * as React from "react";
import UserData from "../UserData";

interface FeatureProps extends React.ClassAttributes<Feature> {
	feature: string;
	userData: UserData;
}

export default class Feature extends React.Component<FeatureProps, void> {
	render(): JSX.Element {
		if (!this.props.userData.hasFeature(this.props.feature)) {
			return null;
		}
		return React.Children.only(this.props.children);
	}
}
