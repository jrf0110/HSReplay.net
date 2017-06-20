import * as React from "react";
import HideLoading from "./loading/HideLoading";
import DataInjector from "./DataInjector";
import DataManager from "../DataManager";
import PropRemapper from "./utils/PropRemapper";
import SemanticTimeFrame from "./SemanticTimeFrame";

interface InfoboxTimeFrameProps extends React.ClassAttributes<InfoboxTimeFrame> {
	dataManager: DataManager;
	fetchCondition?: boolean;
	params: any;
	url: string;
}

export default class InfoboxTimeFrame extends React.Component<InfoboxTimeFrameProps, void> {
	render(): JSX.Element {
		return (
			<li>
				Time frame
				<span className="infobox-value">
					<DataInjector
						dataManager={this.props.dataManager}
						fetchCondition={this.props.fetchCondition}
						query={{url: this.props.url, params: this.props.params}}
						modify={(data) => data && data.metadata && data.metadata.earliest_date ? new Date(data.metadata.earliest_date) : null}
					>
						<HideLoading>
							<PropRemapper map={{data: "date"}}>
								<SemanticTimeFrame />
							</PropRemapper>
						</HideLoading>
					</DataInjector>
				</span>
			</li>
		);
	}
}
