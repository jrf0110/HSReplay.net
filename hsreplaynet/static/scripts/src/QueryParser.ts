export interface QueryMap {
	[prop: string]: string;
}

export function parseQuery(query: string): QueryMap {
	if (!query) {
		return {};
	}
	const map = {} as QueryMap;
	query.split("&").forEach(v => {
		const kvp = v.split("=");
		if(kvp.length === 2 && kvp[0] && kvp[1]) {
			map[decodeURIComponent(kvp[0])] = decodeURIComponent(kvp[1]);
		}
	});
	return map;
}

export function toQueryString(map: QueryMap): string {
	const keys = Object.keys(map);
	if (!keys.length) {
		return "";
	}
	const terms = [];
	keys.forEach(key => {
		if (key && map[key]) {
			terms.push(encodeURIComponent(key) + "=" + encodeURIComponent(map[key]))
		}
	})
	return terms.join("&");
}

export function getQueryMapDiff(current: QueryMap, defaultMap: QueryMap): QueryMap {
	const queryMap = {};
	Object.keys(current).forEach(key => {
		const value = current[key];
		if (value !== defaultMap[key]) {
			queryMap[key] = value;
		}
	})
	return queryMap;
}

export function getQueryMapArray(queryMap: QueryMap, key: string): string[] {
	const value = queryMap[key];
	return value ? value.split(",") : [];
}

export function getQueryMapFromLocation(defaultQueryMap: QueryMap, allowsValues: any) : QueryMap {
	const queryMap = Object.assign({}, defaultQueryMap);
	const fromLocation = parseQuery(document.location.hash.substring(1));
	const restirctedKeys = Object.keys(allowsValues);
	Object.keys(fromLocation).forEach(key => {
		if (restirctedKeys.indexOf(key) === -1 || allowsValues[key].indexOf(fromLocation[key]) !== -1) {
			queryMap[key] = fromLocation[key];
		}
	})
	return queryMap;
}

export function setLocationQueryString(queryMap: QueryMap, defaultQueryMap: QueryMap): void {
	const queryString = toQueryString(getQueryMapDiff(queryMap, defaultQueryMap));
	//The trailing slash prevents the page from jumping up when removing all params
	const newLocation = "#" + (queryString || "/");
	if (location.hash !== newLocation) {
		location.replace(newLocation);
	}
}

export function queryMapHasChanges(queryMap: QueryMap, defaultQueryMap: QueryMap): boolean {
	return toQueryString(getQueryMapDiff(queryMap, defaultQueryMap)).length > 0;
}

export function setQueryMap(caller: any, key: string, value: string): void {
	const queryMap = Object.assign({}, caller.state.queryMap);
	queryMap[key] = value;
	caller.setState({queryMap});
}
