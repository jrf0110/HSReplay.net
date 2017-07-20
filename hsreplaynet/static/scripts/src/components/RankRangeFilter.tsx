import * as React from "react";
import * as _ from "lodash";
import InfoboxFilter from "./InfoboxFilter";
import InfoboxFilterGroup from "./InfoboxFilterGroup";

interface RankRangeFilterProps extends React.ClassAttributes<RankRangeFilter> {
	rankRange: string;
	onChange: (rankRange: string) => void;
	disabled?: boolean;
	locked?: boolean;
}

interface RankRangeFilterState {
	lastSingleRank?: number;
	lastRankRange?: number[];
}

const rankMap = {
	0: "LEGEND",
	1: "ONE",
	2: "TWO",
	3: "THREE",
	4: "FOUR",
	5: "FIVE",
	6: "SIX",
	7: "SEVEN",
	8: "EIGHT",
	9: "NINE",
	10: "TEN",
	11: "ELEVEN",
	12: "TWELVE",
	13: "THIRTEEN",
	14: "FOURTEEN",
	15: "FIFTEEN",
	16: "SIXTEEN",
	17: "SEVENTEEN",
	18: "EIGHTEEN",
	19: "NINETEEN",
	20: "TWENTY",
	21: "TWENTYONE",
	22: "TWENTYTWO",
	23: "TWENTYTHREE",
	24: "TWENTYFOUR",
	25: "TWENTYFIVE",
};

export default class RankRangeFilter extends React.Component<RankRangeFilterProps, RankRangeFilterState> {
	constructor(props, context) {
		super(props, context);

		let singleRank = this.decodeRank(props.rankRange);
		let rankRange = this.decodeRankRange(props.rankRange, true);

		this.state = {
			lastSingleRank: singleRank !== null ? singleRank : 15,
			lastRankRange: rankRange ? rankRange : [10, 15],
		}
	}

	componentDidUpdate(prevProps, prevState) {
		const decodedSingleRank = this.decodeRank(this.props.rankRange);
		if (decodedSingleRank !== null && decodedSingleRank !== this.state.lastSingleRank) {
			this.setState({
				lastSingleRank: decodedSingleRank,
			})
		}

		const decodedRankRange = this.decodeRankRange(this.props.rankRange, true);
		if (decodedRankRange !== null && !_.isEqual(decodedRankRange, this.state.lastRankRange)) {
			this.setState({
				lastRankRange: decodedRankRange,
			})
		}
	}

	render(): JSX.Element {
		const classNames = ["rank-range-filter-ranks"];

		// default preset
		const presets = [
			<InfoboxFilter value="ALL"><span>Legend–25</span></InfoboxFilter>,
		];

		// rank range
		let selectedRankRange = this.state.lastRankRange;

		const decodedRankRange = this.decodeRankRange(this.props.rankRange, true);
		if (decodedRankRange !== null) {
			selectedRankRange = decodedRankRange;
		}

		let selectedRankWidth = selectedRankRange[1] - selectedRankRange[0];

		presets.push(
			<InfoboxFilter value={this.encodeRankRange(selectedRankRange)}>
				<span>
					{selectedRankRange[0] > 0 ? "Ranks " : ""}
					{selectedRankRange.map((r) => this.getRank(r, true)).join("–")}
				</span>
				<div>
					<button
						className="btn btn-primary"
						disabled={selectedRankWidth <= 5}
						onClick={(e) => {
							e.stopPropagation();
							let [min, max] = selectedRankRange;
							max -= 5;
							let newKey = this.encodeRankRange([min, max]);
							this.props.onChange(newKey);
						}}
					>
						<span className="glyphicon glyphicon-minus" />
					</button>
					<button
						className="btn btn-primary"
						disabled={selectedRankWidth >= 25}
						onClick={(e) => {
							e.stopPropagation();
							let [min, max] = selectedRankRange;
							if (max < 25) {
								max += 5;
							}
							else if (min > 5) {
								min -= 5;
							}
							else if (min > 1) {
								min -= 4;
							}
							else {
								min -= 1;
							}
							let newKey = this.encodeRankRange([min, max]);
							this.props.onChange(newKey);
						}}
					>
						<span className="glyphicon glyphicon-plus" />
					</button>
					<button
						className="btn btn-primary"
						disabled={selectedRankRange[0] <= 0}
						onClick={(e) => {
							e.stopPropagation();
							let [min, max] = selectedRankRange;
							if (min === 1) {
								min -= 1;
							}
							else if (min === 5) {
								min -= 4;
								max -= 5;
							}
							else {
								min -= 5;
								max -= 5;
							}
							let newKey = this.encodeRankRange([min, max]);
							this.props.onChange(newKey);
						}}
					>
						<span className="glyphicon glyphicon-arrow-left" />
					</button>
					<button
						className="btn btn-primary"
						disabled={selectedRankRange[1] >= 25}
						onClick={(e) => {
							e.stopPropagation();
							let [min, max] = selectedRankRange;
							if (min === 0) {
								min += 1;
							}
							else if (min === 1) {
								min += 4;
								max += 5;
							}
							else {
								min += 5;
								max += 5;
							}
							let newKey = this.encodeRankRange([min, max]);
							this.props.onChange(newKey);
						}}
					>
						<span className="glyphicon glyphicon-arrow-right" />
					</button>
				</div>
			</InfoboxFilter>
		);

		// single rank
		let selectedRank = this.state.lastSingleRank;

		const decodedSingleRank = this.decodeRank(this.props.rankRange);
		if (decodedSingleRank !== null) {
			selectedRank = decodedSingleRank;
		}

		presets.push(
			<InfoboxFilter value={this.encodeRank(selectedRank, true)}>
				<span>{this.getRank(selectedRank)} only</span>
				<div>
					<button
						className="btn btn-primary"
						disabled={this.props.disabled || selectedRank <= 0}
						onClick={(e) => {
							e.stopPropagation();
							let newKey = this.encodeRank(selectedRank - 1, true);
							this.props.onChange(newKey);
						}}
					>
						<span className="glyphicon glyphicon-arrow-left" />
					</button>
					<button
						className="btn btn-primary"
						disabled={this.props.disabled || selectedRank >= 25}
						onClick={(e) => {
							e.stopPropagation();
							let newKey = this.encodeRank(selectedRank + 1, true);
							this.props.onChange(newKey);
						}}
					>
						<span className="glyphicon glyphicon-arrow-right" />
					</button>
				</div>
			</InfoboxFilter>
		);

		return (
			<div>
				<h2>Rank Range</h2>
				<div className={classNames.join(" ")}>
					<InfoboxFilterGroup
						selectedValue={this.props.rankRange}
						onClick={(value) => this.props.onChange(value)}
						locked={this.props.locked}
						disabled={this.props.disabled}
					>
						{presets}
					</InfoboxFilterGroup>
				</div>
			</div>
		);
	}

	private getRank(rank: number, short?: boolean): string {
		if (rank === 0) {
			return "Legend";
		}

		if (short) {
			return "" + rank;
		}

		return `Rank ${rank}`;
	}

	setRankRange(minRank: string | number, maxRank: string | number): void {
		this.props.onChange(this.encodeRankRange([minRank, maxRank]));
	}

	decodeRank(rank: string): number {
		if (rank === "LEGEND_ONLY") {
			return 0;
		}

		for (let key of Object.keys(rankMap)) {
			if (rankMap[key] === rank) {
				return +key;
			}
		}
		return null;
	}

	encodeRank(rank: number, singleRank?: boolean): string {
		let result = rankMap[rank];
		if (singleRank && rank === 0) {
			result += "_ONLY";
		}
		return result;
	}

	decodeRankRange(rankRange: string, excludeAll?: boolean): number[] {
		if (!excludeAll && rankRange === "ALL") {
			return [0, 25];
		}

		const matcher = /([A-Z]+)_THROUGH_([A-Z]+)/;
		const matches = matcher.exec(rankRange);

		if (matches) {
			return [matches[1], matches[2]].map((r) => this.decodeRank(r));
		}

		return null;
	}

	encodeRankRange(ranks): string {
		ranks = ranks.map((rank) => typeof rank !== "string" ? this.encodeRank(rank) : rank);
		const [minRank, maxRank] = ranks;

		if (minRank === maxRank) {
			if (minRank === "LEGEND") {
				return "LEGEND_ONLY";
			}
			return minRank;
		}

		let result = `${minRank}_THROUGH_${maxRank}`;

		if (result === "LEGEND_THROUGH_TWENTYFIVE") {
			return "ALL";
		}

		return result;
	}
}
