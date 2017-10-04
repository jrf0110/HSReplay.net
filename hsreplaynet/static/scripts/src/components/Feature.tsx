import * as React from "react";
import {UserProps, withUser} from "../utils/user";

interface FeatureProps extends React.Props<Feature> {
	feature: string;
}

class Feature extends React.Component<FeatureProps & UserProps, {}> {
	render(): JSX.Element {
		if (!this.props.user.hasFeature(this.props.feature)) {
			return null;
		}
		return React.Children.only(this.props.children);
	}
}

export default withUser(Feature);
