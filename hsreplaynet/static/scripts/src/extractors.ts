
import * as _ from "lodash";
import { ApiArchetype, ApiArchetypeSignature } from "./interfaces";
import { FormatType } from "./hearthstone";

export function extractSignature(
	data: ApiArchetype[],
	archetypeId: number,
	gameType: string,
): { signature: ApiArchetypeSignature } {
	const archetype = data.find((a) => a.id === archetypeId);
	if (archetype) {
		const format = gameType === "RANKED_WILD" ? FormatType.FT_WILD : FormatType.FT_STANDARD;
		const formatComponents = archetype.signatures.filter((x) => x.format === format);
		const signature = _.maxBy(formatComponents, (x) => x.as_of);
		return {signature};
	}
}
