
function humanTime(seconds) {
	// TODO: use something better
	var days = Math.floor((seconds % 31536000) / 86400);
	var hours = Math.floor(((seconds % 31536000) % 86400) / 3600);
	var mins = Math.floor((((seconds % 31536000) % 86400) % 3600) / 60);
	if (days) {
		return days + " days";
	}
	if (hours) {
		return hours + " hours";
	}
	return mins + " minutes";
}

export function getDuration(from: Date, to: Date): string {
	var seconds = to.getTime() - from.getTime();
	return humanTime(seconds / 1000);
}

export function getAge(since: Date): string {
	var seconds = new Date().getTime() - since.getTime();
	return humanTime(seconds / 1000) + " ago";
}
