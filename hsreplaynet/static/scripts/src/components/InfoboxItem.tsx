import React from "react";

interface InfoboxItemProps extends React.ClassAttributes<InfoboxItem> {
	header: string;
	value?: any;
}

export default class InfoboxItem extends React.Component<InfoboxItemProps, {}> {
	render(): JSX.Element {
		return (
			<li>
				{this.props.header}
				<span className="infobox-value">{this.props.value}</span>
			</li>
		);
	}
}
