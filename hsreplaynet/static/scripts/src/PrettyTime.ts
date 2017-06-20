import moment from "moment";

export function getDuration(from: Date, to: Date): string {
	return moment(from).from(moment(to), true);
}

export function getAge(since: Date, noSuffix?: boolean): string {
	return moment(since).utc().from(new Date(), noSuffix);
}
