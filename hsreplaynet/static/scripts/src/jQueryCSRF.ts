import * as $ from "jquery";
import {getCookie} from "./helpers";

export default class jQueryCSRF {

	/**
	 * Sets up the jQuery Ajax calls to use the CSRF token from django.
	 * Based on https://docs.djangoproject.com/en/1.10/ref/csrf/#ajax
	 */
	public static init(): void {
		let token = getCookie("csrftoken");
		$.ajaxSetup({
			beforeSend: function (xhr, settings) {
				if (!(/^(GET|HEAD|OPTIONS|TRACE)$/.test(settings.type)) && !this.crossDomain) {
					xhr.setRequestHeader("X-CSRFToken", token);
				}
			}
		});
	}



}
