import * as React from "react";

interface SampleSizeSelectorProps extends React.ClassAttributes<SampleSizeSelector> {
	sampleSize: number;
	onChangeSampleSize?: (sampleSize: number) => void;
}

export default class SampleSizeSelector extends React.Component<SampleSizeSelectorProps, void> {

	public render(): JSX.Element {
		return <div>
			<label>
				Sample Size
				<input
					type="number"
					value={"" + this.props.sampleSize}
					disabled={!this.canChange}
					onChange={(e: any): void => {
						if(!this.canChange) {
							return;
						}
						this.props.onChangeSampleSize(+e.target.value);
					}}
				/>
			</label>
		</div>;
	}

	protected get canChange(): boolean {
		return !!this.props.onChangeSampleSize;
	}
}
