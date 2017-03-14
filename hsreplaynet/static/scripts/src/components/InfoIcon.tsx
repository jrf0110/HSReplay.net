import * as React from "react";
import Tooltip from "./Tooltip";

interface InfoIconProps extends React.ClassAttributes<InfoIcon> {
	content?: string | JSX.Element;
	header?: string;
}

export default class InfoIcon extends React.Component<InfoIconProps, void> {
	render(): JSX.Element {
		return (
			<Tooltip className="info-icon" header={this.props.header} content={this.props.content}>
				<span className="glyphicon glyphicon-question-sign"/>
			</Tooltip>
		);
	}
}
