from django import forms
from django.contrib.admin import ACTION_CHECKBOX_NAME
from django.http import HttpResponseRedirect
from django.shortcuts import render


def set_field_admin_action(qs, field_name):
	class SetFieldForm(forms.Form):
		_selected_action = forms.CharField(widget=forms.MultipleHiddenInput)
		field = forms.ModelChoiceField(qs, required=False)

	def set_field(self, request, queryset):
		form = None

		if "apply" in request.POST:
			form = SetFieldForm(request.POST)

			if form.is_valid():
				value = form.cleaned_data["field"]
				count = queryset.count()
				for obj in queryset:
					setattr(obj, field_name, value)
					obj.save()

				self.message_user(request, "%i changes applied." % (count))
				return HttpResponseRedirect(request.get_full_path())

		if not form:
			action = request.POST.getlist(ACTION_CHECKBOX_NAME)
			form = SetFieldForm(initial={"_selected_action": action})

		context = {"objects": queryset, "form": form, "action_name": "set_field"}
		return render(request, "admin/set_field.html", context)
	set_field.short_description = "Set %s to..." % (field_name)

	return set_field
