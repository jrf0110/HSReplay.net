import {Component, ClassAttributes, Children} from "react";
import * as PropTypes from "prop-types";
import {getUser} from "../utils/user";

interface HSReplayNetProviderProps extends ClassAttributes<HSReplayNetProvider> {

}

export default class HSReplayNetProvider extends Component<HSReplayNetProviderProps, {}> {
	static childContextTypes = {
		user: PropTypes.object.isRequired,
	};

	getChildContext() {
		const user = getUser();
		return {user};
	}

	render() {
		return Children.only(this.props.children);
	}
}
