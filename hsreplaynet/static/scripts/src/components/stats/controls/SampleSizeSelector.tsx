import * as React from "react";

interface SampleSizeSelectorProps {
	sampleSize: number;
	onChangeSampleSize?: (sampleSize: number) => void;
}

export default class SampleSizeSelector extends React.Component<SampleSizeSelectorProps, void> {

	public render(): JSX.Element {
		return <div className="control-sample-size-selector">
			<label className="control-label">
				<span>Sample Size</span>
				<input
					type="number"
					className="form-control"
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

	protected set sampleSize(sampleSize: number) {
		this.props.onChangeSampleSize(sampleSize);
	}

	protected get canChange(): boolean {
		return !!this.props.onChangeSampleSize;
	}
}
