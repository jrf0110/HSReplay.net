import * as React from "react";
import {BnetGameType} from "./hearthstone";
import {ArchetypeData} from "./interfaces";
import {NumberRow} from "./components/stats/Matrix";
import {Matchup} from "./components/stats/Matrix";

interface QueryData {
	lookback: number;
	offset: number;
	gametypes: any[];
	minRank: number;
	maxRank: number;
}

export default class ArchetypeClient {

	public visibleNonce?: number = 0;
	private nonce: number = 0;

	public fetchDeckData(callback: (data) => void) {
		fetch("https://hsreplay.net/cards/canonicals/", {
			credentials: "include",
		}).then((response) => {
			return response.json();
		}).then((json: any) => {
			callback(json);
		});
	}

	private buildQueryUrl(queryData: QueryData): string {
		const baseUrl = "https://hsreplay.net/cards/winrates/";

		const params = [];
		params.push("game_types=" + (queryData.gametypes || [BnetGameType.BGT_RANKED_STANDARD]).join(","));
		params.push("lookback=" + queryData.lookback);
		params.push("offset=" + queryData.offset);
		params.push("min_rank=" + queryData.minRank);
		params.push("max_rank=" + queryData.maxRank);

		return baseUrl + "?" + params.join("&");
	}

	public fetchArchetypeData(lookback: number, offset: number, gametypes: any[], minRank: number, maxRank: number, callback: (data) => void) {
		let url = this.buildQueryUrl({lookback, offset, gametypes, minRank, maxRank})
		const nonce = ++this.nonce;
		const REASON_NONCE_OUTDATED = "Nonce outdated";

		let archeTypeData: ArchetypeData;
		fetch(url, {credentials: "include"}
		).then((response) => {
			if (nonce < this.visibleNonce) {
				return Promise.reject(REASON_NONCE_OUTDATED);
			}
			return response.json();
		}).then((json: any) => {

			const winrates = json.win_rates || [];
			let games = {};
			let max = {};
			console.log(winrates);
			Object.keys(winrates).forEach(key => {
				let winrate = 0.0;
				let wins = 0;
				let matches = 0;
				Object.keys(winrates[key]).forEach(innerKey => {
					let arch = winrates[key][innerKey];
					winrate += arch.f_wr_vs_o;
					wins += arch.friendly_wins;
					matches += arch.match_count;
				});
				games[key] = matches;
			});
			// winrates.forEach((row: any, archetype: string): void => {
			// 	if (typeof games[archetype] === "undefined") {
			// 		games[archetype] = 0;
			// 		max[archetype] = 0;
			// 	}
			// 	row.forEach((matchup: any): void => {
			// 		games[archetype] = matchup.match_count + games[archetype];
			// 		max[archetype] = Math.max(matchup.match_count, games[archetype]);
			// 	});
			// });
			this.visibleNonce = nonce;
			archeTypeData = {
				popularities: json.frequencies || {},
				winrates,
				expected_winrates: json.expected_winrates || {},
				games_per_archetype: games,
				max_games_per_archetype: max
			};
			console.log(archeTypeData)
			callback(archeTypeData);
		}).catch((reason: any) => {
			if (reason === REASON_NONCE_OUTDATED) {
				return; // noop
			}
			return Promise.reject(reason);
		});
	}
}
