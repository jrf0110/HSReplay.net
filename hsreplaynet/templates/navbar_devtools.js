function getCookie(name) {
	let cookieValue = null;
	if (document.cookie && document.cookie !== "") {
		const cookies = document.cookie.split(";");
		for (let i = 0; i < cookies.length; i++) {
			const cookie = cookies[i].trim();
			if (cookie.substring(0, name.length + 1) === (name + "=")) {
				cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
				break;
			}
		}
	}
	return cookieValue;
}

const csrftoken = getCookie("csrftoken");

// Features
function toggle(name, enabled) {
	$.ajax({
		type: "POST",
		headers: {"X-CSRFToken": csrftoken},
		url: `/api/v1/features/${name}/`,
		data: {enabled: !enabled},
	})
}

function add(feature) {
	if (feature.status !== "OFF") {
		$("#devtools-features-header").after(`
			<li>
				<a href="" class="set-feature" onclick="toggle('${feature.name}', ${feature.enabled_for_user})">
					${feature.enabled_for_user ? "✔" : ""}
					${feature.name}
					<span class="pull-right" style="color:lightgray">
						${feature.status}
					</span>
				</a>
			</li>
		`);
	}
}

$.get("/api/v1/features/", (data) => data.results.forEach(add));

