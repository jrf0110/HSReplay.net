import shortuuid
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db.models import CharField, PositiveSmallIntegerField


class PlayerIDField(PositiveSmallIntegerField):
	def __init__(self, *args, **kwargs):
		kwargs["choices"] = ((1, 1), (2, 2))
		kwargs["validators"] = [MinValueValidator(1), MaxValueValidator(2)]
		super(PlayerIDField, self).__init__(*args, **kwargs)


class ShortUUIDField(CharField):
	def __init__(self, *args, **kwargs):
		kwargs.setdefault("max_length", 22)
		kwargs.setdefault("editable", False)
		kwargs.setdefault("blank", True)
		kwargs.setdefault("unique", True)
		super(ShortUUIDField, self).__init__(*args, **kwargs)

	def pre_save(self, model_instance, add):
		ret = super(ShortUUIDField, self).pre_save(model_instance, add)
		if not ret:
			ret = shortuuid.uuid()
			setattr(model_instance, self.attname, ret)
		return ret
