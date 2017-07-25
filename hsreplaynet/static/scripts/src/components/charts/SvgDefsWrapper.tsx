import * as React from "react";
import * as _ from "lodash";

interface SvgDefsWrapperProps extends React.ClassAttributes<SvgDefsWrapper> {
	defs: any;
}

export default class SvgDefsWrapper extends React.Component<SvgDefsWrapperProps, void> {
	render(): JSX.Element {
		const childProps: any = _.omit(this.props, ["defs", "children"]);
		const children = React.Children.map(this.props.children, (child: any) => {
			const props = Object.assign({}, childProps, child["props"]);
			return React.cloneElement(child, props);
		});
		return (
			<g>
				<defs>
					{this.props.defs}
				</defs>
				{children}
			</g>
		);
	}
}
