import {Component, ClassAttributes, Children} from "react";
import * as PropTypes from "prop-types";

interface HSReplayNetProviderProps extends ClassAttributes<HSReplayNetProvider> {

}

export default class HSReplayNetProvider extends Component<HSReplayNetProviderProps, {}> {
	static childContextTypes = {
	};

	getChildContext() {
		return {};
	}

	render() {
		return Children.only(this.props.children);
	}
}
