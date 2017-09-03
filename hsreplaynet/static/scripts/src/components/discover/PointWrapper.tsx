import * as React from "react";
import * as _ from "lodash";
import {Point} from "victory";
import {ClusterMetaData} from "./ClassAnalysis";

interface PointWrapperProps extends React.ClassAttributes<PointWrapper> {
	selectedDatum: ClusterMetaData;
}

export default class PointWrapper extends React.Component<PointWrapperProps, {}> {

	componentShouldUpdate(nextProps: PointWrapperProps) {
		return nextProps.selectedDatum !== this.props.selectedDatum;
	}

	render(): JSX.Element {
		const {selectedDatum} = this.props;
		const selected = selectedDatum && (this.props["datum"]["metadata"]["shortid"] === selectedDatum.shortid);
		const props = _.omit(this.props, "selectedDatum") as any;
		const style = Object.assign({}, props.style);
		if (selected) {
			style["strokeWidth"] = 3;
		}
		return (
			<Point
				{...props}
				style={style}
			/>
		);
	}
}
