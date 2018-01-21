import * as moment from "moment";

export function getDuration(from: Date, to: Date): string {
	return moment(from).from(moment(to), true);
}

/**
 * @deprecated Use SemanticAge component instead
 */
export function getAge(since: Date, noSuffix?: boolean): string {
	return moment(since)
		.utc()
		.from(new Date(), noSuffix);
}
