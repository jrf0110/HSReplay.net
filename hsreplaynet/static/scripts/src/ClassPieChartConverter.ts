import {GameReplay} from "./interfaces";

export default class ClassPieChartConverter {
	public barDataFromArchetypeData(archetypeData: any[], deckData: Map<string, any>): any[] {
		let data = [];
		let keys = Object.keys(archetypeData);
		keys.forEach(key => {
			if (archetypeData[key].match_count)	{
				let winrate = Math.round(100.0 * archetypeData[key].f_wr_vs_o);
				let dd = deckData.get(key);
				if (dd) {
					let className = dd.player_class_name;
					let color = this.getColor(className.substring(0, 1) + className.substring(1, className.length).toLowerCase());
					data.push({baseWinrate: Math.min(winrate, 50), winrateDiff: winrate - 50, name: key, count: archetypeData[key].match_count, color: color});
				}
			}
		})
		data = data.sort((a, b) => a.count > b.count ? -1 : 1);
		return data;
	}

	public fromGameReplays(games: GameReplay[]) : any[] {
		let data = [];
		let numGames = games.length;
		if (numGames == 0) {
			data.push({x: " ", y: 1, name: null, color: "lightgrey"});
		}
		else {
			let distr = new Map<string, number>();
			games.forEach((game: GameReplay) => {
				if (game.friendly_player.hero_id.startsWith("HERO")) {
					let hero = game.friendly_player.hero_class_name;
					hero = hero.substr(0, 1).toUpperCase() + hero.substr(1, hero.length - 1).toLowerCase();
					distr.set(hero, (distr.get(hero) || 0) + 1);
				}
			});
			distr.forEach((value, key) => data.push({x: Math.round(100.0 * value/numGames) + "%", y: value, name: key, color: this.getColor(key)}));
			data = data.sort((a, b) => a.y > b.y ? 1 : -1);
		}
		return data;
	}

	public fromArchetypeData(archetypeData: any[], deckData: Map<string, any>): any[] {
		let data = [];
		let keys = Object.keys(archetypeData);
		let total = 0;
		keys.forEach(key => total += archetypeData[key].match_count);
		keys.forEach(key => {
			let value = archetypeData[key].match_count;
			if (value > 0 ) {
				let className = deckData.get(key).player_class_name;
				let color = this.getColor(className.substring(0, 1) + className.substring(1, className.length).toLowerCase());
				data.push({x: Math.round(100.0 * value/total) + "%", y: value, name: key, color: color})
			}
		});
		data = data.sort((a, b) => a.y > b.y ? 1 : -1);
		let truncated = [];
		if (data.length > 10) {
			const reverse = data.reverse();
			truncated = truncated.concat(reverse.slice(0, 8));
			let remaining = 0;
			reverse.slice(8, reverse.length).forEach(d => remaining += d.y);
			truncated.push({x: Math.round(100.0 * remaining/total) + "%", y: remaining, name: "Other", color: "#786D5F"});
			truncated = truncated.reverse();
		}
		else {
			truncated = data;
		}
		return truncated;
	}

	private getColor(hero: string): string {
		switch(hero) {
			case "Druid": return "#FF7D0A";
			case "Hunter": return "#ABD473";
			case "Mage": return "#69CCF0";
			case "Paladin": return "#F58CBA";
			case "Priest": return "#D2D2D2";
			case "Rogue": return "#FFF569";
			case "Shaman": return "#0070DE";
			case "Warlock": return "#9482C9";
			case "Warrior": return "#C79C6E";
		}
	}
}
