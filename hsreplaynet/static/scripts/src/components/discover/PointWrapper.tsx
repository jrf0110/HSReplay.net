import * as React from "react";
import * as _ from "lodash";
import {Point} from "victory";
import {ClusterMetaData} from "./ClassAnalysis";

interface PointWrapperProps extends React.ClassAttributes<PointWrapper> {
	selectedDatum: ClusterMetaData;
}

export default class PointWrapper extends React.Component<PointWrapperProps, {}> {
	shouldComponentUpdate(nextProps: PointWrapperProps) {
		const shortId  = this.props["datum"]["metadata"]["shortid"];
		const currentSelected = this.props.selectedDatum && this.props.selectedDatum.shortid;
		const nextSelected = nextProps.selectedDatum && nextProps.selectedDatum.shortid;
		return (
			shortId === currentSelected && shortId !== nextSelected
			|| shortId !== currentSelected && shortId === nextSelected
			|| this.props["x"] !== nextProps["x"]
			|| this.props["y"] !== nextProps["y"]
		);
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
