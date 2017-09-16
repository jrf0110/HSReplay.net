# -*- coding: utf-8 -*-
# Generated by Django 1.10.5 on 2017-01-27 20:03
from __future__ import unicode_literals

import django_intenum
from django.db import migrations, models

import hsreplaynet.uploads.models


class Migration(migrations.Migration):

    dependencies = [
        ('uploads', '0006_auto_20170125_2001'),
    ]

    operations = [
        migrations.AddField(
            model_name='redshiftstagingtrack',
            name='refreshing_view_end_at',
            field=models.DateTimeField(null=True),
        ),
        migrations.AddField(
            model_name='redshiftstagingtrack',
            name='refreshing_view_start_at',
            field=models.DateTimeField(null=True),
        ),
        migrations.AddField(
            model_name='redshiftstagingtracktable',
            name='is_materialized_view',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='redshiftstagingtracktable',
            name='refreshing_view_end_at',
            field=models.DateTimeField(null=True),
        ),
        migrations.AddField(
            model_name='redshiftstagingtracktable',
            name='refreshing_view_handle',
            field=models.CharField(blank=True, max_length=15),
        ),
        migrations.AddField(
            model_name='redshiftstagingtracktable',
            name='refreshing_view_start_at',
            field=models.DateTimeField(null=True),
        ),
        migrations.AlterField(
            model_name='redshiftstagingtrack',
            name='stage',
            field=django_intenum.IntEnumField(choices=[(0, 'ERROR'), (1, 'CREATED'), (2, 'INITIALIZING'), (3, 'INITIALIZED'), (4, 'ACTIVE'), (5, 'IN_QUIESCENCE'), (6, 'READY_TO_LOAD'), (7, 'GATHERING_STATS'), (8, 'GATHERING_STATS_COMPLETE'), (9, 'DEDUPLICATING'), (10, 'DEDUPLICATION_COMPLETE'), (11, 'INSERTING'), (12, 'INSERT_COMPLETE'), (13, 'REFRESHING_MATERIALIZED_VIEWS'), (14, 'REFRESHING_MATERIALIZED_VIEWS_COMPLETE'), (15, 'VACUUMING'), (16, 'VACUUM_COMPLETE'), (17, 'ANALYZING'), (18, 'ANALYZE_COMPLETE'), (19, 'CLEANING_UP'), (20, 'FINISHED')], default=1, validators=[django_intenum.IntEnumValidator(hsreplaynet.uploads.models.RedshiftETLStage)]),
        ),
        migrations.AlterField(
            model_name='redshiftstagingtracktable',
            name='stage',
            field=django_intenum.IntEnumField(choices=[(0, 'ERROR'), (1, 'CREATED'), (2, 'INITIALIZING'), (3, 'INITIALIZED'), (4, 'ACTIVE'), (5, 'IN_QUIESCENCE'), (6, 'READY_TO_LOAD'), (7, 'GATHERING_STATS'), (8, 'GATHERING_STATS_COMPLETE'), (9, 'DEDUPLICATING'), (10, 'DEDUPLICATION_COMPLETE'), (11, 'INSERTING'), (12, 'INSERT_COMPLETE'), (13, 'REFRESHING_MATERIALIZED_VIEWS'), (14, 'REFRESHING_MATERIALIZED_VIEWS_COMPLETE'), (15, 'VACUUMING'), (16, 'VACUUM_COMPLETE'), (17, 'ANALYZING'), (18, 'ANALYZE_COMPLETE'), (19, 'CLEANING_UP'), (20, 'FINISHED')], default=1, validators=[django_intenum.IntEnumValidator(hsreplaynet.uploads.models.RedshiftETLStage)]),
        ),
    ]
