import * as React from "react";
import HideLoading from "./loading/HideLoading";
import DataInjector from "./DataInjector";
import DataText from "./DataText";
import DataManager from "../DataManager";
import { getAge } from "../PrettyTime";

interface InfoboxLastUpdatedProps extends React.ClassAttributes<InfoboxLastUpdated> {
	dataManager: DataManager;
	params: any;
	url: string;
}

export default class InfoboxLastUpdated extends React.Component<InfoboxLastUpdatedProps, void> {
	render(): JSX.Element {
		return (
			<li>
				Last updated
				<span className="infobox-value">
					<DataInjector
						dataManager={this.props.dataManager}
						query={{url: this.props.url, params: this.props.params}}
						modify={(data) => data && data.as_of ? getAge(new Date(data.as_of)) : null}
					>
						<HideLoading><DataText /></HideLoading>
					</DataInjector>
				</span>
			</li>
		);
	}
}
