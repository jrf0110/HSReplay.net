import * as React from "react";

interface SampleSizeSelectorProps extends React.ClassAttributes<SampleSizeSelector> {
	sampleSize: number;
	onChangeSampleSize?: (sampleSize: number) => void;
}

export default class SampleSizeSelector extends React.Component<SampleSizeSelectorProps, void> {

	public render(): JSX.Element {
		return <div className="control-sample-size-selector">
			<label className="control-label">
				<span>Sample Size</span>
				<div className="input-group">
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
					<span className="input-group-btn">
						<button
							className="btn btn-default"
							disabled={!this.canChange}
							onClick={() => this.sampleSize = 0}
						>
							Any
						</button>
					</span>
					<span className="input-group-btn hidden-md hidden-lg">
						<button
							className="btn btn-default"
							disabled={!this.canChange}
							onClick={() => this.sampleSize = 50}
						>
							50
						</button>
					</span>
					<span className="input-group-btn hidden-md">
						<button
							className="btn btn-default"
							disabled={!this.canChange}
							onClick={() => this.sampleSize = 100}
						>
							100
						</button>
					</span>
				</div>
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
