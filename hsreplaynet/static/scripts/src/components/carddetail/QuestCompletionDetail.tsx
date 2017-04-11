import * as React from "react";
import UserData from "../../UserData";
import PremiumWrapper from "../PremiumWrapper";
import ClassFilter, { FilterOption } from "../ClassFilter";
import InfoIcon from "../InfoIcon";
import DataInjector, { Query } from "../DataInjector";
import ChartLoading from "../loading/ChartLoading";
import WinrateByTurnLineChart from "../charts/WinrateByTurnLineChart";
import TurnPlayedBarChart from "../charts/TurnPlayedBarChart";
import DataManager from "../../DataManager";

interface QuestCompletionDetailProps extends React.ClassAttributes<QuestCompletionDetail> {
	opponentClass: string;
	setOpponentClass: (opponentClass: string) => void;
	userData: UserData;
	query: Query | Query[];
	dataManager: DataManager;
}

export default class QuestCompletionDetail extends React.Component<QuestCompletionDetailProps, void> {
	render(): JSX.Element {
		return (
			<div className="container-fluid">
				<div className="row">
					<div className="opponent-filter-wrapper">
						<PremiumWrapper name="Quest completion opponent selection" isPremium={this.props.userData.isPremium()}>
							<h3>Opponent class</h3>
							<ClassFilter
								filters="All"
								hideAll
								minimal
								selectedClasses={[this.props.opponentClass as FilterOption]}
								selectionChanged={(selected) => this.props.userData.isPremium() && this.props.setOpponentClass(selected[0])}
							/>
						</PremiumWrapper>
					</div>
				</div>
				<div className="row">
					<div className="col-lg-6 col-md-6">
						<div className="chart-wrapper">
							<DataInjector
								dataManager={this.props.dataManager}
								query={this.props.query}
							>
								<ChartLoading>
									<TurnPlayedBarChart
										opponentClass={this.props.opponentClass}
										widthRatio={2}
									/>
								</ChartLoading>
							</DataInjector>
							<InfoIcon
								header="Popularity by turn completed"
								content="Percentage of the time this Quest is completed on a given turn."
							/>
						</div>
					</div>
					<div className="col-lg-6 col-md-6">
						<div className="chart-wrapper">
							<DataInjector
								dataManager={this.props.dataManager}
								query={this.props.query}
							>
								<ChartLoading>
									<WinrateByTurnLineChart
										opponentClass={this.props.opponentClass}
										widthRatio={2}
									/>
								</ChartLoading>
							</DataInjector>
							<InfoIcon
								header="Winrate by turn completed"
								content="Percentage of games won when this Quest is completed on a given turn."
							/>
						</div>
					</div>
				</div>
			</div>
		);
	}
}
