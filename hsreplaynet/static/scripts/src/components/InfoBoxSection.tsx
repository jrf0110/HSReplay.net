import * as React from "react";

interface InfoBoxSectionState {
	collapsed?: boolean;
}

export interface InfoBoxSectionProps extends React.ClassAttributes<InfoBoxSection> {
	header: string;
	collapsable?: boolean;
	defaultCollapsed?: boolean;
}

export default class InfoBoxSection extends React.Component<InfoBoxSectionProps, InfoBoxSectionState> {
	constructor(props: InfoBoxSectionProps, state: InfoBoxSectionState) {
		super(props, state);
		this.state = {
			collapsed: props.defaultCollapsed,
		}
	}
	render(): JSX.Element {
		return (
			<div>
				<h2>
					{this.props.header}
					{this.props.collapsable ?
						<a href="#" div className="infobox-value" onClick={() => this.setState({collapsed: !this.state.collapsed})}>
							{this.state.collapsed ? "show" : "hide"}
						</a> :
						null
					}
				</h2>
				{this.state.collapsed ? null : this.props.children}
			</div>
		);
	}
}
