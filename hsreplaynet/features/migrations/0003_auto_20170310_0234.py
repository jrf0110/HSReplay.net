# -*- coding: utf-8 -*-
# Generated by Django 1.10.6 on 2017-03-10 02:34
from __future__ import unicode_literals

import django.db.models.deletion
import django_intenum
from django.db import migrations, models

import hsreplaynet.features.models


class Migration(migrations.Migration):

    dependencies = [
        ('djstripe', '0001_initial'),
        ('features', '0002_auto_20170303_0721'),
    ]

    operations = [
        migrations.AddField(
            model_name='featureinvite',
            name='subscribe_to',
            field=models.ForeignKey(blank=True, help_text='Auto subscribe to this Stripe Plan', null=True, on_delete=django.db.models.deletion.SET_NULL, to='djstripe.Plan'),
        ),
        migrations.AlterField(
            model_name='feature',
            name='status',
            field=django_intenum.IntEnumField(choices=[(0, 'OFF'), (1, 'STAFF_ONLY'), (2, 'AUTHORIZED_ONLY'), (3, 'LOGGED_IN_USERS'), (4, 'PUBLIC')], default=0, validators=[django_intenum.IntEnumValidator(hsreplaynet.features.models.FeatureStatus)]),
        ),
    ]
