import * as React from "react";

interface IntensitySelectorProps extends React.ClassAttributes<IntensitySelector> {
	intensity: number;
	onChangeIntensity?: (sampleSize: number) => void;
}

export default class IntensitySelector extends React.Component<IntensitySelectorProps, void> {

	public render(): JSX.Element {
		return <div>
			<label>
				Intensity
				<input
					type="range"
					value={"" + this.props.intensity}
					min={0}
					max={100}
					disabled={!this.canChange}
					onChange={(e: any): void => {
						if(!this.canChange) {
							return;
						}
						this.props.onChangeIntensity(+e.target.value);
					}}
				/>
			</label>
		</div>;
	}

	protected get canChange(): boolean {
		return !!this.props.onChangeIntensity;
	}
}
