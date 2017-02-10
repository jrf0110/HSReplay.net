import os
import time
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "hsreplaynet.settings")
os.environ.setdefault("PROD", "1")

django.setup()

from hsreplaynet.uploads.models import RedshiftStagingTrack  # noqa

# from hsreplaynet.uploads.models import RedshiftETLStage
# RedshiftStagingTrack.objects.get(id=44).reset_to_stage(RedshiftETLStage.READY_TO_LOAD)

start_time = time.time()
RedshiftStagingTrack.objects.do_maintenance()
end_time = time.time()
duration = end_time - start_time
print("Duration Seconds: %s" % (round(duration, 2)))
