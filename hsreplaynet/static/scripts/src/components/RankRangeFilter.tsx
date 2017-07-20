import * as React from "react";
import InfoboxFilter from "./InfoboxFilter";
import InfoboxFilterGroup from "./InfoboxFilterGroup";

interface RankRangeFilterProps extends React.ClassAttributes<RankRangeFilter> {
	rankRange: string;
	onChange: (rankRange: string) => void;
	locked?: boolean;
}

const rankMap = {
	0: "LEGEND",
	1: "ONE",
	5: "FIVE",
	10: "TEN",
	15: "FIFTEEN",
	20: "TWENTY",
	25: "TWENTYFIVE",
};

export default class RankRangeFilter extends React.Component<RankRangeFilterProps, {}> {
	render(): JSX.Element {
		const [minRank, maxRank] = this.decodeRankRange(this.props.rankRange);

		const minRanks = Object.keys(rankMap).map(Number).filter((i) => i < 25);
		const maxRanks = Object.keys(rankMap).map(Number).filter((i) => i > 1).reverse();

		const classNames = ["rank-range-filter-ranks"];

		if (minRanks.indexOf(minRank) === maxRanks.indexOf(maxRank)) {
			classNames.push("equal");
		}

		return (
			<div>
				<h2>Rank Range</h2>
				<div className={classNames.join(" ")}>
					<InfoboxFilterGroup
						selectedValue={this.encodeRank(minRank)}
						onClick={(value) => this.setRankRange(value, maxRank)}
						locked={this.props.locked}
					>
						{minRanks.map((key) => (
							<InfoboxFilter
								value={rankMap[key]}
								disabled={+key >= maxRank}
							>
								{this.getRank(+key)}
							</InfoboxFilter>
						))}
					</InfoboxFilterGroup>
					<InfoboxFilterGroup
						selectedValue={this.encodeRank(maxRank)}
						onClick={(value) => this.setRankRange(minRank, value)}
						locked={this.props.locked}
					>
						{maxRanks.map((key) => (
							<InfoboxFilter
								value={rankMap[key]}
								disabled={+key <= minRank}
							>
								{this.getRank(+key)}
							</InfoboxFilter>
						))}
					</InfoboxFilterGroup>
				</div>
			</div>
		);
	}

	private getRank(rank: number): string {
		if(rank === 0) {
			return "Legend";
		}

		return `Rank ${rank}`;
	}

	setRankRange(minRank: string|number, maxRank: string|number): void {
		this.props.onChange(this.encodeRankRange([minRank, maxRank]));
	}

	decodeRank(rank: string): number {
		for(let key of Object.keys(rankMap)) {
			if(rankMap[key] === rank) {
				return +key;
			}
		}
		return null;
	}

	encodeRank(rank: number): string {
		return rankMap[rank];
	}

	decodeRankRange(rankRange: string): number[] {
		switch(rankRange) {
			case "ALL":
				return [0, 25];
			case "LEGEND_ONLY":
				return [0, 0];
		}

		let decoded = this.decodeRank(rankRange);
		if (decoded) {
			return [decoded, decoded];
		}

		const matcher = /([A-Z]+)_THROUGH_([A-Z]+)/;
		const matches = matcher.exec(rankRange);

		if(matches) {
			return [matches[1], matches[2]].map((r) => this.decodeRank(r));
		}

		return [0, 25];
	}

	encodeRankRange(ranks): string {
		ranks = ranks.map((rank) => typeof rank !== "string" ? this.encodeRank(rank) : rank);
		const [minRank, maxRank] = ranks;

		if(minRank === maxRank) {
			if(minRank === "LEGEND") {
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
