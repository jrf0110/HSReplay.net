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


// Freemode toggle
const freeMode = document.cookie.indexOf("free-mode") !== -1;
if (freeMode) {
	$("#free-mode").append("<span class='pull-right' style='color:red'>ACTIVE</span>")
}
document.getElementById("free-mode").onclick = function() {
	if (freeMode) {
		document.cookie = "free-mode=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/";
	}
	else {
		document.cookie = "free-mode=true; expires=Thu, 01 Jan 2018 00:00:00 UTC; path=/";
	}
};
