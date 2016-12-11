import * as React from "react";
import {GlobalGamePlayer} from "../interfaces";
import {BnetGameType} from "../hearthstone";

export interface GameModeIconProps extends React.ClassAttributes<GameModeIcon>{
	player: GlobalGamePlayer;
	gameType: BnetGameType;
	disconnected: boolean;
	scenarioId: number;
	className: string;
}

interface IconInfo {
	imgPath: string,
	text: string
}

export default class GameModeIcon extends React.Component<GameModeIconProps, any> {

	isHeroicTavernBrawl(): boolean {
		return this.props.scenarioId == 2109;
	}

	render(): JSX.Element {
		if (this.props.disconnected) {
			return <img src={STATIC_URL + "images/dc.png"} className={this.props.className} alt="Disconnected"/>;
		}
		let info = this.getIconInfo(this.props.gameType);
		if (!info) {
			return null;
		}
		return <img src={info.imgPath} alt={info.text} title={info.text} className={this.props.className} />;
	}

	private getIconInfo(gameType: BnetGameType): IconInfo {
		let imgPath = null;
		let text = null;
		switch (gameType) {
			case BnetGameType.BGT_ARENA:
				let wins = this.props.player ? this.props.player.wins + 1 : 1;
				imgPath = "images/arena-medals/Medal_Key_" + wins + ".png";
				text = "Arena";
				break;
			case BnetGameType.BGT_RANKED_STANDARD:
			case BnetGameType.BGT_RANKED_WILD:
				if (this.props.player) {
					if (this.props.player.rank) {
						imgPath = "images/ranked-medals/Medal_Ranked_" + this.props.player.rank + ".png";
						text = "Ranked";
						break;
					}
					if (this.props.player.legend_rank) {
						imgPath = "images/ranked-medals/Medal_Ranked_Legend.png";
						text = "Legend";
					}
				}
				break;
			case BnetGameType.BGT_TAVERNBRAWL_1P_VERSUS_AI:
			case BnetGameType.BGT_TAVERNBRAWL_2P_COOP:
			case BnetGameType.BGT_TAVERNBRAWL_PVP:
				if (this.isHeroicTavernBrawl()) {
					imgPath = "images/brawl_skull.png";
					text = "Heroic Tavern Brawl";
					break;
				}
				imgPath = "images/modeID_Brawl.png";
				text = "Tavern Brawl";
				break;
			case BnetGameType.BGT_CASUAL_STANDARD:
				imgPath = "images/casual.png";
				text = "Casual";
				break;
			case BnetGameType.BGT_CASUAL_WILD:
				imgPath = "images/casual-wild.png";
				text = "Casual (Wild)";
				break;
			case BnetGameType.BGT_VS_AI:
				imgPath = "images/mode_ai.png";
				text = "Adventure";
				break;
			case BnetGameType.BGT_FRIENDS:
				imgPath = "images/mode_friendly.png";
				text = "Friendly Challange";
				break;
		}
		if (!imgPath) {
			return null;
		}
		imgPath = STATIC_URL + imgPath;
		return {imgPath, text};
	}
}
