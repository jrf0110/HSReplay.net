import * as React from "react";
import HideLoading from "./loading/HideLoading";
import DataInjector from "./DataInjector";
import DataText from "./DataText";
import DataManager from "../DataManager";
import { getAge } from "../PrettyTime";
import Tooltip from "./Tooltip";

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
					<Tooltip
						header="Last updated"
						content="We try to keep the data as up to date as possible. Pages get updated as fresh data becomes available."
					>
						<DataInjector
							dataManager={this.props.dataManager}
							query={{url: this.props.url, params: this.props.params}}
							modify={(data) => data && data.as_of ? getAge(new Date(data.as_of)) : null}
						>
							<HideLoading><DataText p={false} /></HideLoading>
						</DataInjector>
					</Tooltip>
				</span>
			</li>
		);
	}
}
