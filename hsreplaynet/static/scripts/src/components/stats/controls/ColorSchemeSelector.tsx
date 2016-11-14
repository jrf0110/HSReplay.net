import * as React from "react";
import {Colors} from "../../../Colors";

interface ColorSchemeSelectorProps extends React.ClassAttributes<ColorSchemeSelector> {
	colorScheme: Colors;
	onChangeColorScheme?: (colorScheme: Colors) => void;
}

export default class ColorSchemeSelector extends React.Component<ColorSchemeSelectorProps, void> {

	public render(): JSX.Element {
		return <div>
			<label>
				Colors
				<select
					value={"" + this.props.colorScheme}
					disabled={!this.canChange}
					onChange={(e: any) => {
						if(!this.canChange) {
							return;
						}
						this.props.onChangeColorScheme(+e.target.value);
					}
				}>
					<option value={"" + Colors.HSREPLAY}>HSReplay</option>
					<option value={"" + Colors.REDGREEN}>Red/Green</option>
					<option value={"" + Colors.REDGREEN2}>Red/Green alternate</option>
					<option value={"" + Colors.ORANGEBLUE}>Orange/Blue</option>
				</select>
			</label>
		</div>;
	}

	protected get canChange(): boolean {
		return !!this.props.onChangeColorScheme;
	}
}
